import { defineStore } from "pinia"
import type { Kit, Song, Sound } from "./core"
import { parseKitv1, parseSoundv1 } from "./v1-2"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3-4"

/**
 * Base type for all parsed XML files.
 */
export type ParsedFile = {
  /**
   * File name. For example, "KIT001.xml" or "Some Song Name.xml".
   */
  name: string,
  /**
   * Path to the file relative to the selected root folder.
   */
  path: string,
  /**
   * File system handle to access the file.
   */
  fileHandle: FileSystemFileHandle,
  /**
   * Last modified date of the file.
   */
  lastModified: number,
  /**
   * Detected firmware version of the file.
   */
  firmware: string,
  /**
   * URL to the file's details page.
   */
  url: string,
  /**
   * Type of the file. Helps with type narrowing.
   */
  type: FileType,
  /**
   * Parsed file contents.
   */
  data: Song | Sound | Kit,
  /**
   * Usage stats for the file.
   */
  usage: {
    songs: { [key: string]: boolean },
    sounds: { [key: string]: boolean },
    kits: { [key: string]: boolean },
    total: number,
  },
  /**
   * Raw XML text contents. Kinda redundant, but helps a lot with debugging parsing errors or missing data.
   */
  xml: string,
}

/**
 * Type of the file. Helps with type narrowing.
 */
export enum FileType {
  Song,
  Sound,
  Kit,
}

/**
 * Parsed song file.
 */
export interface ParsedSongFile extends ParsedFile {
  type: FileType.Song,
  data: Song
}

/**
 * Parsed sound file.
 */
export interface ParsedSoundFile extends ParsedFile {
  type: FileType.Sound,
  data: Sound
}

/**
 * Parsed kit file.
 */
export interface ParsedKitFile extends ParsedFile {
  type: FileType.Kit,
  data: Kit
}

/**
 * Detected sample file.
 */
export type SampleFile = {
  /**
   * File name. For example, "Super Clap.wav".
   */
  name: string,
  /**
   * Path to the file relative to the selected root folder.
   */
  path: string,
  /**
   * File system handle to access the file.
   */
  fileHandle: FileSystemFileHandle,
  /**
   * Size of the file in bytes.
   */
  size: Number,
  /**
   * Last modified date of the file.
   */
  lastModified: number,
  /**
   * URL to the file's details page.
   */
  url: string,
  /**
   * Unique ID for the file. Used in URLs.
   */
  id: Number,
  /**
   * Usage stats for the file.
   */
  usage: {
    songs: { [key: string]: UsageReference },
    sounds: { [key: string]: UsageReference },
    kits: { [key: string]: UsageReference },
    total: number,
  },
}

export type UsageReference = {
  instrumentType: string,
  instrumentName: string,
}

/**
 * Info about a file that could not be parsed.
 */
export type SkippedFile = {
  name: string,
  path: string,
  reason: string,
}

async function verifyFolderPermission(folderHandle: FileSystemDirectoryHandle, write = false) {
  // Check if permission was already granted. If so, return true.
  if ((await folderHandle.queryPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // Request permission. If the user grants permission, return true.
  if ((await folderHandle.requestPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // The user didn't grant permission, so return false.
  return false
}

/**
 * One-stop-shop for parsing a folder of files. Saves the results into the Pinia store.
 * @param folder The folder to parse.
 */
export async function parseFolder(folder: FileSystemDirectoryHandle) {
  if (!(await verifyFolderPermission(folder))) throw new Error('Permission denied')

  const songs: ParsedSongFile[] = []
  const sounds: ParsedSoundFile[] = []
  const kits: ParsedKitFile[] = []
  const samples: SampleFile[] = []
  const skippedFiles: SkippedFile[] = []
  const missingSamples: string[] = []
  let id = 0
  
  const store = useStore()
  if (store.filesScanned > 0) store.filesScanned = 0

  store.parsingMessage = 'Parsing the folder contents...'
  await scanFolder(folder, '/')
  async function scanFolder(folder: FileSystemDirectoryHandle, path: string) {
    // For each XML or wav file in the folder structure, parse it and add it to the store
    for await (const entry of folder.values()) {
      if (entry.kind === 'directory') {
        const folder = entry as FileSystemDirectoryHandle
        await scanFolder(folder, path + entry.name + '/')
      } else if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle
        const name = fileHandle.name
        const fullPath = path + fileHandle.name
        
        // Parse XML
        if (fileHandle.name.startsWith('.')) continue // Skip all dot files
        else if (fileHandle.name.toLowerCase().endsWith('.xml')) {
          // console.log('Parsing XML file', fileHandle.name)
          try {
            const parsedFile = await parseFile(fileHandle, fullPath)
            
            // Store results into arrays
            if (typeof parsedFile !== 'string') {
              if ('type' in parsedFile) {
                if (parsedFile.type === FileType.Song) {
                  songs.push(parsedFile)
                } else if (parsedFile.type === FileType.Sound) {
                  sounds.push(parsedFile)
                } else if (parsedFile.type === FileType.Kit) {
                  kits.push(parsedFile)
                }
              } else skippedFiles.push({
                name,
                path: fullPath,
                reason: 'Unknown file type. Was expecting a song, sound, or kit.',
              })
            } else skippedFiles.push({
              name,
              path: fullPath,
              reason: parsedFile,
            })
          } catch (e) {
            skippedFiles.push({
              name,
              path: fullPath,
              reason: String(e),
            })
          }
        // Parse WAV
        } else if (fileHandle.name.toLowerCase().endsWith('.wav')) {
          const file = await fileHandle.getFile()
          const size = file.size
          const lastModified = file.lastModified
          samples.push({
            name,
            path: fullPath,
            fileHandle,
            size,
            id,
            lastModified,
            url: encodeURI(`/samples/${id}`),
            usage: {
              songs: {},
              sounds: {},
              kits: {},
              total: 0,
            }
          })
          id++
        // Ignore .DS_Store quietly, log everything else
        } else {
          skippedFiles.push({
            name,
            path: fullPath,
            reason: 'Not a supported file type',
          })
        }

        store.filesScanned++
      }
    }
  }
  
  // Compute usage
  store.parsingMessage = 'Computing usage stats...'
  for (const song of songs) {
    const songName = song.name.slice(0, -4) // Drop .xml from the name
    for (const instrument of song.data.instruments) {
      // Sounds
      if (instrument.instrumentType === 'sound') {
        const sound = sounds.find(sound => sound.data.presetName === instrument.presetName)
        if (sound) {
          countSoundUsageInSong(sound, songName)
          computeSampleUsageinSound(sound.data)
        }

      // Kits
      } else if (instrument.instrumentType === 'kit') {
        // TODO: consider kit instances vs presets
        const kit = kits.find(kit => kit.data.presetName === instrument.presetName)
        if (kit) {
          countKitUsageInSong(kit, songName)

          // Sounds inside kits
          for (const soundSource of Object.values(kit.data.soundSources)) {
            // Each kit sound is an instance that may or may not relate to a preset
            const sound = sounds.find(sound => sound.data.presetName === soundSource.presetName)
            if (sound) {
              // Found a preset with the same name. Let's assume it's the same sound.
              countSoundUsageInKit(kit, kit.data.presetName)
            }

            // Count sample usage regardless of whether we found a preset or not
            computeSampleUsageinSound(soundSource, kit.data.presetName, songName)
          }
        }
      // Audio tracks
      } else if (instrument.instrumentType === 'audio track') {
        console.log('TODO: audio track usage for', instrument.presetName)
        // const sample = samples.find(sample => sample.name === instrument.presetName)
        // if (sample) {
        //   sample.usage.songs[song.name] = true
        // }
      }
    }
  }

  function computeSampleUsageinSound(sound: Sound, kitName?: string, songName?: string) {
    // Individual samples
    const fileNames = []
    if (sound.osc1.fileName) fileNames.push(sound.osc1.fileName)
    if (sound.osc2.fileName) fileNames.push(sound.osc2.fileName)
    for (const fileName of fileNames) {
      const sample = samples.find(sample => sample.path.toLowerCase() === '/' + fileName.toLocaleLowerCase())
      if (sample) {
        countSampleUsageInSound(sample, sound.presetName, sound.presetName, 'synth')
        if (kitName && songName) {
          countSampleUsageInKit(sample, kitName, sound.presetName, 'synth')
          countSampleUsageInSong(sample, songName, kitName, 'kit')
        }
        else if (!kitName && songName) {
          countSampleUsageInSong(sample, songName, sound.presetName, 'synth')
        }
        else if (kitName && !songName) {
          countSampleUsageInKit(sample, kitName, sound.presetName, 'synth')
        }
      }
      else addMissingSample(fileName)
    }

    // Multisamples
    const sampleRanges = []
    if (sound.osc1.sampleRanges) sampleRanges.push(...sound.osc1.sampleRanges)
    if (sound.osc2.sampleRanges) sampleRanges.push(...sound.osc2.sampleRanges)
    for (const sampleRange of sampleRanges) {
      if (sampleRange.fileName) {
        const sample = samples.find(sample => sample.path.toLowerCase() === '/' + sampleRange.fileName?.toLocaleLowerCase())
        if (sample) {
          countSampleUsageInSound(sample, sound.presetName, sound.presetName, 'synth')
          if (kitName) countSampleUsageInKit(sample, kitName, sound.presetName, 'synth')
          if (songName) countSampleUsageInSong(sample, songName, sound.presetName, 'synth')
        }
        else addMissingSample(sampleRange.fileName)
      }
    }
  }

  function addMissingSample(samplePath: string) {
    if (!missingSamples.includes(samplePath)) missingSamples.push(samplePath)
  }

  function countSampleUsageInSong(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.songs[name]) {
      sample.usage.songs[name] = {
        instrumentName,
        instrumentType,
      }
      sample.usage.total++
    }
  }

  function countSampleUsageInKit(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.kits[name]) {
      sample.usage.kits[name] = {
        instrumentName,
        instrumentType,
      }
      sample.usage.total++
    }
  }
  
  function countSampleUsageInSound(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.sounds[name]) {
      sample.usage.sounds[name] = {
        instrumentName,
        instrumentType,
      }
      sample.usage.total++
    }
  }
  
  function countSoundUsageInKit(sound: ParsedFile, name: string) {
    if (!sound.usage.kits[name]) {
      sound.usage.kits[name] = true
    }
  }
  
  function countSoundUsageInSong(sound: ParsedFile, name: string) {
    if (!sound.usage.songs[name]) {
      sound.usage.songs[name] = true
      sound.usage.total++
    }
  }

  function countKitUsageInSong(kit: ParsedFile, name: string) {
    if (!kit.usage.songs[name]) {
      kit.usage.songs[name] = true
      kit.usage.total++
    }
  }

  // Save results to the store
  store.parsingMessage = 'Saving...'
  // Note: these are done here instead of in the loops to save on Pinia's dev tools events
  store.songs = songs.sort((a, b) => a.name.localeCompare(b.name))
  store.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name))
  store.kits = kits.sort((a, b) => a.name.localeCompare(b.name))
  store.samples = samples.sort((a, b) => a.name.localeCompare(b.name))
  store.skippedFiles = skippedFiles
  store.missingSamples = missingSamples.sort((a, b) => a.localeCompare(b))

  store.parsingMessage = 'Done!'
  store.parsed = true
}

const parser = new DOMParser()

/**
 * Parse any Deluge XML file into data. Returns an error message if the file is not valid.
 * @param fileHandle The file to parse.
 * @param path Full path to the file.
 * @returns The parsed file, or an error message.
 */
export async function parseFile(fileHandle: FileSystemFileHandle, path: string): Promise<ParsedSongFile | ParsedSoundFile | ParsedKitFile | SampleFile | string> {
  const file = await fileHandle.getFile()
  const lastModified = file.lastModified
  let xml = await file.text()
  let firmware

  // Old firmware versions don't have the firmware version in the XML file
  if (!xml.includes('firmwareVersion')) {
    firmware = '1'
  }
  // 2.x has a firmwareVersion node with the value as a payload
  else if (xml.includes('<firmwareVersion>')) {
    const from = xml.indexOf('<firmwareVersion>')
    let to = xml.indexOf('</firmwareVersion>')
    firmware = xml.substring(from + 17, to)

    // Fix the XML to make it valid
    to = xml.indexOf('</earliestCompatibleFirmware>') + 30
    xml = xml.substring(0, from) + xml.substring(to)
  }
  // 3.x and 4.x have a firmwareVersion attribute on the root node
  else if (xml.includes('firmwareVersion="')) {
    const from = xml.indexOf('firmwareVersion="')
    const to = xml.indexOf('"', from + 17)
    firmware = xml.substring(from + 17, to)
  } else throw Error(`Failed to decide what firware version to use for file ${fileHandle.name}`)
  
  // Parse the file
  const xmlDoc = parser.parseFromString(xml, 'text/xml')
  //console.log(xmlDoc)
  const root = xmlDoc.documentElement as Element

  const name = fileHandle.name

  if (['song', 'sound', 'kit'].includes(root.nodeName)) {
    let data
    if (root.nodeName === 'song') {
      //if (firmware.startsWith('1') || firmware.startsWith('2')) return `Firmware version ${firmware} is not supported for songs.`
      if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseSongv3(root, name)
      //else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
      else return `Firmware version ${firmware} is not supported for songs.`

      return {
        name, path, fileHandle, lastModified, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0 },
        type: FileType.Song,
        url: encodeURI(`/songs/${name.slice(0, -4)}`)
      }
    }
    else if (root.nodeName === 'sound') {
      if (firmware.startsWith('1')) data = parseSoundv1(root, name)
      else if (firmware.startsWith('2')) data = parseSoundv1(root, name)
      else if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseSoundv3(root, name)
      //else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
      else return `Firmware version ${firmware} is not supported for sounds.`

      return {
        name, path, fileHandle, lastModified, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0 },
        type: FileType.Sound,
        url: encodeURI(`/synths/${name.slice(0, -4)}`)
      }
    }
    else if (root.nodeName === 'kit') {
      if (firmware.startsWith('1')) data = parseKitv1(root, name)
      else if (firmware.startsWith('2')) data = parseKitv1(root, name)
      else if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseKitv3(root, name)
      //else if (firmware.startsWith('4')) return `Firmware version ${firmware} is not supported for kits.`
      else return `Firmware version ${firmware} is not supported for kits.`

      return {
        name, path, fileHandle, lastModified, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0},
        type: FileType.Kit,
        url: encodeURI(`/kits/${name.slice(0, -4)}`)
      }
    }
    else throw new Error(`Unknown node type '${root.nodeName}' in file '${name}' (was expecting 'song', 'sound', or 'kit')`)
  } else {
    throw new Error(`Unknown node type '${root.nodeName}' in file '${name}'`)
  }
}

export type DelugrFileStore = {
  parsed: boolean,
  parseError: string | null,
  parsingMessage: string,
  filesScanned: number,
  songs: ParsedSongFile[],
  sounds: ParsedSoundFile[],
  kits: ParsedKitFile[],
  samples: SampleFile[],
  skippedFiles: SkippedFile[],
  missingSamples: string[],
  folderHandle: FileSystemDirectoryHandle | null,
}

/**
 * The main state of the app.
 */
export const useStore = defineStore('files', {
  state: (): DelugrFileStore => {
    return {
      parsed: false,
      parseError: null,
      parsingMessage: '',
      filesScanned: 0,
      songs: [],
      sounds: [],
      kits: [],
      samples: [],
      skippedFiles: [],
      missingSamples: [],
      folderHandle: null,
    }
  }
})

/**
 * Get the stored URL of a sample based on its path. Also good for checking if the sample exists.
 * @param path Sample path.
 * @returns The URL to the sample's details page or null if not found.
 */
export function getSampleUrlbyPath(path: string | null | undefined) {
  if (!path) return null
  if (path[0] !== '/') path = '/' + path
  const file = useStore().samples.find(f => f.path.toLowerCase() === path?.toLowerCase())
  if (file) return file.url
  else return null
}
