import { useFileStore, type ParsedKitFile, type ParsedSongFile, type ParsedSoundFile, type SampleFile, type SkippedFile } from "../composables/useFileStore"
import type { Sound } from "./core"
import { parseKitv1, parseSoundv1 } from "./v1-2"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3-4"
import { parseKitvCommunity, parseSongvCommunity, parseSoundvCommunity } from "./vCommunity"

/**
 * One-stop-shop for parsing a folder of files. Intended for the root folder of a Deluge SD card.
 * @param folder The folder to parse.
 */
export async function parseFolderIntoFileStore(folder: FileSystemDirectoryHandle) {
  if (!(await verifyFolderPermission(folder))) throw new Error('Permission denied')

  const songs: ParsedSongFile[] = []
  const sounds: ParsedSoundFile[] = []
  const kits: ParsedKitFile[] = []
  const samples: SampleFile[] = []
  const skippedFiles: SkippedFile[] = []
  const missingSamples: string[] = []
  let id = 0

  const { fileStore } = useFileStore()
  
  if (fileStore.filesScanned > 0) fileStore.filesScanned = 0
  if (fileStore.isParsed) fileStore.isParsed = false
  fileStore.isParsing = true
  
  // For each XML or wav/aiff file in the folder structure, process it and add it to the store
  async function scanFolder(folder: FileSystemDirectoryHandle, path: string) {
    // Iterate over the folder contents
    for await (const entry of folder.values()) {
      // Recurse into directories
      if (entry.kind === 'directory') {
        const folder = entry as FileSystemDirectoryHandle
        await scanFolder(folder, path + entry.name + '/')

      // Parse files
      } else if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle

         // Skip all dot files
        if (fileHandle.name.startsWith('.')) continue

        const name = fileHandle.name
        const fullPath = path + fileHandle.name

        // Parse XML
        if (fileHandle.name.toLowerCase().endsWith('.xml')) {
          // TODO: add support for special config files

          await parseAssetXml(fileHandle, fullPath)

        // Parse WAV and AIFF
        } else if (fileHandle.name.toLowerCase().endsWith('.wav') || fileHandle.name.toLowerCase().endsWith('.aiff')) {
          await processAudioFile(fileHandle, fullPath)

        // Skip unsupported file types
        } else {
          skippedFiles.push({
            name,
            path: fullPath,
            reason: 'Not a supported file type.',
            fileHandle,
          })
        }

        fileStore.filesScanned++
      }
    }
  }

  // Scan the selected folder
  fileStore.parsingMessage = 'Parsing the folder contents...'
  await scanFolder(folder, '/')
  
  // Compute usage
  fileStore.parsingMessage = 'Computing usage stats...'
  computeUsageStats()

  // Save results to the store
  fileStore.parsingMessage = 'Saving...'
  // Note: Saving to the reactive store is done here instead of in the loops to save on mutations.
  fileStore.songs = songs.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.kits = kits.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.samples = samples.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.skippedFiles = skippedFiles
  fileStore.missingSamples = missingSamples.sort((a, b) => a.localeCompare(b))

  fileStore.parsingMessage = 'Done!'
  fileStore.isParsed = true
  fileStore.isParsing = false

  // Processing utilities ---------------------------------------------------------------------------------------------

  function computeUsageStats() {
    // For every song...
    for (const song of songs) {
      const songName = song.name.split('.')[0] // Drop .xml from the name

      // For every instrument in the song...
      for (const instrument of song.data.instruments) {
        // Sounds
        if (instrument.instrumentType === 'sound') {
          const sound = sounds.find(sound => sound.data.presetName === instrument.presetName)
          if (sound) {
            // Count sound/synth usage in the song if not already counted
            if (!sound.usage.songs.includes(songName)) {
              sound.usage.songs.push(songName)
            }

            computeSampleUsageInSound(sound.data, undefined, songName)
          }

          // Kits
        } else if (instrument.instrumentType === 'kit') {
          // TODO: consider kit instances vs presets
          const kit = kits.find(kit => kit.data.presetName === instrument.presetName)
          if (kit) {
            // Count kit usage in the song if not already counted
            if (!kit.usage.songs.includes(songName)) {
              kit.usage.songs.push(songName)
            }

            // Sounds inside kits
            for (const soundSource of Object.values(kit.data.soundSources)) {
              // Each kit sound is an instance that may or may not relate to a preset
              const sound = sounds.find(sound => sound.data.presetName === soundSource.presetName)
              if (sound) {
                // Found a preset with the same name. Let's assume it's the same sound.
                // Count sound usage in the kit if not already counted
                if (!sound.usage.kits.includes(kit.data.presetName)) {
                  sound.usage.kits.push(kit.data.presetName)
                }
              }

              // Count sample usage regardless of whether we found a preset or not
              computeSampleUsageInSound(soundSource, kit.data.presetName, songName)
            }
          }
          // Audio tracks
        } else if (instrument.instrumentType === 'audio track') {
          // console.log('TODO: audio track usage for', instrument.presetName)
          // const sample = samples.find(sample => sample.name === instrument.presetName)
          // if (sample) {
          //   sample.usage.songs[song.name] = true
          // }
        }
      }
    }
  }

  async function processAudioFile(fileHandle: FileSystemFileHandle, fullPath: string) {
    const file = await fileHandle.getFile()
    const size = file.size
    const lastModified = file.lastModified
    samples.push({
      name: fileHandle.name,
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
        getTotal() {
          return Object.keys(this.songs).length + Object.keys(this.sounds).length + Object.keys(this.kits).length
        },
      }
    })
    id++
  }

  async function parseAssetXml(fileHandle: FileSystemFileHandle, fullPath: string) {
    try {
      const parsedFile = await parseAssetFile(fileHandle, fullPath)

      // Store results into arrays
      if (typeof parsedFile !== 'string') {
        if ('type' in parsedFile) {
          if (parsedFile.type === 'song') {
            songs.push(parsedFile)
          } else if (parsedFile.type === 'sound') {
            sounds.push(parsedFile)
          } else if (parsedFile.type === 'kit') {
            kits.push(parsedFile)
          }
        } else skippedFiles.push({
          name: fileHandle.name,
          path: fullPath,
          reason: 'Unknown file type. Was expecting a song, sound, or kit.',
          fileHandle,
        })
      } else skippedFiles.push({
        name: fileHandle.name,
        path: fullPath,
        reason: parsedFile,
        fileHandle,
      })
    } catch (e) {
      // Failed to parse the file. Add it to the skipped files.
      skippedFiles.push({
        name: fileHandle.name,
        path: fullPath,
        reason: String(e),
        fileHandle,
      })
    }
  }

  function computeSampleUsageInSound(sound: Sound, kitName?: string, songName?: string) {
    const fileNames = []
    
    // Individual samples
    if (sound.osc1.fileName) fileNames.push(sound.osc1.fileName)
    if (sound.osc2.fileName) fileNames.push(sound.osc2.fileName)

    // Multi samples
    if (sound.osc1.sampleRanges) {
      for (const sampleRange of sound.osc1.sampleRanges) {
        fileNames.push(sampleRange.fileName)
      }
    }
    if (sound.osc2.sampleRanges) {
      for (const sampleRange of sound.osc2.sampleRanges) {
        fileNames.push(sampleRange.fileName)
      }
    }

    // Find the samples in the store and count usage
    for (const fileName of fileNames) {
      const sample = samples.find(sample => sample.path.toLowerCase() === '/' + fileName.toLowerCase())

      // If sample is found in the store, count usage.
      // This is complex because we keep track of attribution for UI purposes.
      if (sample) {
        // Always count usage in the sound (synth)
        countSampleUsageInSound(sample, sound.presetName, sound.presetName, 'synth')

        // If this was in a kit that was in a song, count usage in the kit and song
        if (kitName && songName) {
          // TODO: how to check if the the specific sound was actually used in the song?
          countSampleUsageInKit(sample, kitName, sound.presetName, 'synth')
          countSampleUsageInSong(sample, songName, kitName, 'kit')
        }
        // If this was in a song, but not in a kit, count usage in the song in addition to the sound
        else if (!kitName && songName) {
          countSampleUsageInSong(sample, songName, sound.presetName, 'synth')
        }
        // If this was in a kit, but not in a song, count usage in the kit in addition to the sound
        else if (kitName && !songName) {
          countSampleUsageInKit(sample, kitName, sound.presetName, 'synth')
        }
      }

      // Count missing samples
      else if (!missingSamples.includes(fileName)) missingSamples.push(fileName)
    }
  }

  function countSampleUsageInSong(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.songs[name]) {
      sample.usage.songs[name] = {
        instrumentName,
        instrumentType,
      }
    }
  }

  function countSampleUsageInKit(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.kits[name]) {
      sample.usage.kits[name] = {
        instrumentName,
        instrumentType,
      }
    }
  }
  
  function countSampleUsageInSound(sample: SampleFile, name: string, instrumentName: string, instrumentType: string) {
    if (!sample.usage.sounds[name]) {
      sample.usage.sounds[name] = {
        instrumentName,
        instrumentType,
      }
    }
  }
}

async function verifyFolderPermission(folderHandle: FileSystemDirectoryHandle, write = false) {
  // Check if permission was already granted. If so, return true.
  if ((await folderHandle.queryPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // Request permission. If the user grants permission, return true.
  if ((await folderHandle.requestPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // The user didn't grant permission, so return false.
  return false
}

// XML parsing --------------------------------------------------------------------------------------------------------

const parser = new DOMParser()

/**
 * Parse any Deluge XML file into data. Returns an error message if the file is not valid.
 * @param fileHandle The file to parse.
 * @param path Full path to the file.
 * @returns The parsed file, or an error message.
 */
async function parseAssetFile(fileHandle: FileSystemFileHandle, path: string): Promise<ParsedSongFile | ParsedSoundFile | ParsedKitFile | SampleFile | string> {
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
  } else throw Error(`Failed to decide what firmware version to use for file ${fileHandle.name}`)
  
  // Parse the file
  const xmlDoc = parser.parseFromString(xml, 'text/xml')
  //console.log(xmlDoc)
  const root = xmlDoc.documentElement as Element

  const name = fileHandle.name

  if (['song', 'sound', 'kit'].includes(root.nodeName)) {
    let data
    if (root.nodeName === 'song') {
      if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseSongv3(root, name)
      else if (firmware.startsWith('c1')) data = parseSongvCommunity(root, name)
      else return `Firmware version ${firmware} is not supported for songs.`

      return {
        name, path, fileHandle, lastModified, firmware, data, xml,
        type: 'song',
        url: encodeURI(`/songs/${name.split('.')[0]}`)
      }
    }
    else if (root.nodeName === 'sound') {
      if (firmware.startsWith('1') || firmware.startsWith('2')) data = parseSoundv1(root, name)
      else if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseSoundv3(root, name)
      else if (firmware.startsWith('c1')) data = parseSoundvCommunity(root, name)
      else return `Firmware version ${firmware} is not supported for sounds.`

      return {
        name,
        path,
        fileHandle,
        lastModified,
        firmware,
        data,
        xml,
        type: 'sound',
        url: encodeURI(`/synths/${name.split('.')[0]}`),
        usage: {
          songs: [],
          kits: [],
          getTotal() {
            return Object.keys(this.songs).length + Object.keys(this.kits).length
          },
        },
      }
    }
    else if (root.nodeName === 'kit') {
      if (firmware.startsWith('1') || firmware.startsWith('2')) data = parseKitv1(root, name)
      else if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseKitv3(root, name)
      else if (firmware.startsWith('c1')) data = parseKitvCommunity(root, name)
      else return `Firmware version ${firmware} is not supported for kits.`

      return {
        name,
        path,
        fileHandle,
        lastModified,
        firmware,
        data,
        xml,
        type: 'kit',
        url: encodeURI(`/kits/${name.split('.')[0]}`),
        usage: {
          songs: [],
          getTotal() {
            return Object.keys(this.songs).length
          },
        },
      }
    }
    else throw new Error(`Unknown root node '${root.nodeName}' in '${name}' (was expecting 'song', 'sound', or 'kit')`)
  } else {
    throw new Error(`Unknown root node '${root.nodeName}' in '${name}'. Not sure what to do with this file 🤷‍♂️`)
  }
}