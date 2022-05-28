import { defineStore } from "pinia"
import type { Kit, Song, Sound } from "./core"
import { parseKitv1, parseSoundv1 } from "./v1-2"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3"

export interface ParsedFile {
  name: string,
  path: string,
  file: File,
  firmware: string,
  url: string,
  type: FileType,
  data: Song | Sound | Kit,
  usage: {
    songs: { [key: string]: boolean },
    sounds: { [key: string]: boolean },
    kits: { [key: string]: boolean },
    total: number,
  },
  xml: string,
}

export enum FileType {
  Song,
  Sound,
  Kit,
}

export interface ParsedSongFile extends ParsedFile {
  type: FileType.Song,
  data: Song
}

export interface ParsedSoundFile extends ParsedFile {
  type: FileType.Sound,
  data: Sound
}

export interface ParsedKitFile extends ParsedFile {
  type: FileType.Kit,
  data: Kit
}

export interface SampleFile {
  name: string,
  path: string,
  file: File,
  url: string,
  id: Number,
  usage: {
    songs: { [key: string]: boolean },
    sounds: { [key: string]: boolean },
    kits: { [key: string]: boolean },
    total: number,
  },
}

export interface SkippedFile {
  name: string,
  path: string,
  reason: string,
}

const songs: ParsedSongFile[] = []
const sounds: ParsedSoundFile[] = []
const kits: ParsedKitFile[] = []
const samples: SampleFile[] = []
const skippedFiles: SkippedFile[] = []
const missingSamples: string[] = []

let id = 0
export async function parseFolder(folder: FileSystemDirectoryHandle, path: string, saveAfterDone: boolean = false) {
  const store = useStore()
  if (saveAfterDone && store.filesScanned > 0) store.filesScanned = 0

  // For each XML or wav file in the folder structure, parse it and add it to the store
  for await (const entry of folder.values()) {
    if (entry.kind === 'directory') {
      const folder = entry as FileSystemDirectoryHandle
      await parseFolder(folder, path + entry.name + '/')
    } else if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle
      const name = fileHandle.name
      const fullPath = path + fileHandle.name
      
      // Parse XML
      if (fileHandle.name.toLowerCase().endsWith('.xml')) {
        // console.log('Parsing XML file', fileHandle.name)
        const file = await fileHandle.getFile()
        const parsedFile = await parseFile(file, fullPath)
        
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
      // Parse WAV
      } else if (fileHandle.name.toLowerCase().endsWith('.wav')) {
        const file = await fileHandle.getFile()
        samples.push({
          name,
          path: fullPath,
          file,
          id,
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
      } else if (fileHandle.name !== '.DS_Store') {
        skippedFiles.push({
          name,
          path: fullPath,
          reason: 'Not a supported file type',
        })
      }

      store.filesScanned++
    }
  }

  // Save results to the store
  // Note: these are done here instead of in the loops to save on Pinia's dev tools events
  if (saveAfterDone) {
    computeUsage()

    store.songs = songs.sort((a, b) => a.name.localeCompare(b.name))
    store.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name))
    store.kits = kits.sort((a, b) => a.name.localeCompare(b.name))
    store.samples = samples.sort((a, b) => a.name.localeCompare(b.name))
    store.skippedFiles = skippedFiles
    store.missingSamples = missingSamples.sort((a, b) => a.localeCompare(b))
    store.parsed = true
  }

}

// TODO: consider in-song usage vs preset usage. Possibly break into smaller functions.
function computeUsage () {
  // Compute usage
  for (const song of songs) {
    const songName = song.name.slice(0, -4) // Drop .xml from the name
    for (const instrument of song.data.instruments) {
      // Sounds
      if (instrument.instrumentType === 'sound') {
        const sound = sounds.find(sound => sound.data.presetName === instrument.presetName)
        if (sound) {
          countSoundUsageInSong(sound, songName)
          computeSampleUsage(sound)
        }

        // Kits
      } else if (instrument.instrumentType === 'kit') {
        const kit = kits.find(kit => kit.data.presetName === instrument.presetName)
        if (kit) {
          kit.usage.songs[songName] = true
          kit.usage.total++

          // Sounds inside kits
          for (const soundSource of Object.values(kit.data.soundSources)) {
            const sound = sounds.find(sound => sound.data.presetName === soundSource.presetName)
            if (sound) {
              countSoundUsageInKit(kit, songName)
              computeSampleUsage(sound)
            }
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

  function computeSampleUsage(sound: ParsedSoundFile) {
    // Individual samples
    if (sound.data.osc1.fileName) {
      const sample = samples.find(sample => sample.path == sound.data.osc1.fileName)
      if (sample)
        countSampleUsageInSound(sample, sound.data.presetName)
    }
    if (sound.data.osc2.fileName) {
      const sample = samples.find(sample => sample.path == sound.data.osc2.fileName)
      if (sample)
        countSampleUsageInSound(sample, sound.data.presetName)
    }
    // Multisamples
    if (sound.data.osc1.sampleRanges) {
      for (const sampleRange of sound.data.osc1.sampleRanges) {
        if (sampleRange.fileName) {
          const sample = samples.find(sample => sample.path == sampleRange.fileName)
          if (sample)
            countSampleUsageInSound(sample, sound.data.presetName)
          else
            addMissingSample(sampleRange.fileName)
        }
      }
    }
  }

  function addMissingSample(samplePath: string) {
    if (!missingSamples.includes(samplePath)) missingSamples.push(samplePath)
  }
  
  function countSampleUsageInSound(sample: SampleFile, name: string) {
    if (sample.usage.sounds[name]) return
    sample.usage.sounds[name] = true
    sample.usage.total++
  }
  
  function countSoundUsageInKit(sound: ParsedFile, name: string) {
    if (sound.usage.kits[name]) return
    sound.usage.kits[name] = true
    sound.usage.total++
  }
  
  function countSoundUsageInSong(sound: ParsedFile, name: string) {
    if (sound.usage.songs[name]) return
    sound.usage.songs[name] = true
    sound.usage.total++
  }
}

const parser = new DOMParser()

export async function parseFile(file: File, path: string): Promise<ParsedSongFile | ParsedSoundFile | ParsedKitFile | SampleFile | string> {
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
  // 3.x has a firmwareVersion attribute on the root node
  else if (xml.includes('firmwareVersion="')) {
    const from = xml.indexOf('firmwareVersion="')
    const to = xml.indexOf('"', from + 17)
    firmware = xml.substring(from + 17, to)
  } else throw Error(`Failed to decide what firware version to use for file ${file.name}`)
  
  // Parse the file
  const xmlDoc = parser.parseFromString(xml, 'text/xml')
  //console.log(xmlDoc)
  const root = xmlDoc.documentElement as Element

  const name = file.name

  if (['song', 'sound', 'kit'].includes(root.nodeName)) {
    let data
    if (root.nodeName === 'song') {
      //if (firmware.startsWith('1') || firmware.startsWith('2')) return `Firmware version ${firmware} is not supported for songs.`
      if (firmware.startsWith('3')) data = parseSongv3(root, name)
      //else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
      else return `Firmware version ${firmware} is not supported for songs.`

      return {
        name, path, file, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0 },
        type: FileType.Song,
        url: encodeURI(`/songs/${name.slice(0, -4)}`)
      }
    }
    else if (root.nodeName === 'sound') {
      if (firmware.startsWith('1')) data = parseSoundv1(root, name)
      else if (firmware.startsWith('2')) data = parseSoundv1(root, name)
      else if (firmware.startsWith('3')) data = parseSoundv3(root, name)
      //else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
      else return `Firmware version ${firmware} is not supported for sounds.`

      return {
        name, path, file, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0 },
        type: FileType.Sound,
        url: encodeURI(`/synths/${name.slice(0, -4)}`)
      }
    }
    else if (root.nodeName === 'kit') {
      if (firmware.startsWith('1')) data = parseKitv1(root, name)
      else if (firmware.startsWith('2')) data = parseKitv1(root, name)
      else if (firmware.startsWith('3')) data = parseKitv3(root, name)
      //else if (firmware.startsWith('4')) return `Firmware version ${firmware} is not supported for kits.`
      else return `Firmware version ${firmware} is not supported for kits.`

      return {
        name, path, file, firmware, data, xml, usage: { songs: {}, sounds: {}, kits: {}, total: 0},
        type: FileType.Kit,
        url: encodeURI(`/kits/${name.slice(0, -4)}`)
      }
    }
    else throw new Error(`Unknown node type '${root.nodeName}' in file '${name}' (was expecting 'song', 'sound', or 'kit')`)
  } else {
    throw new Error(`Unknown node type '${root.nodeName}' in file '${name}'`)
  }
}

export interface DelugrFileStore {
  parsed: boolean,
  parseError: string | null,
  filesScanned: number,
  songs: ParsedSongFile[],
  sounds: ParsedSoundFile[],
  kits: ParsedKitFile[],
  samples: SampleFile[],
  skippedFiles: SkippedFile[],
  missingSamples: string[],
  folderName: string,
  folderHandle: FileSystemDirectoryHandle | null,
}

export const useStore = defineStore('files', {
  state: (): DelugrFileStore => {
    return {
      parsed: false,
      parseError: null,
      filesScanned: 0,
      songs: [],
      sounds: [],
      kits: [],
      samples: [],
      skippedFiles: [],
      missingSamples: [],
      folderName: '',
      folderHandle: null,
    }
  }
})
