import { useFileStore, type ParsedAssetFile, type ParsedKitFile, type ParsedSongFile, type ParsedSoundFile, type SampleFile, type SkippedFile } from "../composables/useFileStore"
import type { Kit, Song, Sound } from "./core"
import { parseKitv1, parseSoundv1 } from "./v1-2"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3-4"

const { fileStore } = useFileStore()

async function verifyFolderPermission(folderHandle: FileSystemDirectoryHandle, write = false) {
  // Check if permission was already granted. If so, return true.
  if ((await folderHandle.queryPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // Request permission. If the user grants permission, return true.
  if ((await folderHandle.requestPermission({ mode: write ? 'readwrite' : 'read' })) === 'granted') return true
  // The user didn't grant permission, so return false.
  return false
}

/**
 * One-stop-shop for parsing a folder of files.
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
  
  if (fileStore.filesScanned > 0) fileStore.filesScanned = 0
  if (fileStore.isParsed) fileStore.isParsed = false
  fileStore.isParsing = true
  
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
                if (parsedFile.type === 'song') {
                  songs.push(parsedFile)
                } else if (parsedFile.type === 'sound') {
                  sounds.push(parsedFile)
                } else if (parsedFile.type === 'kit') {
                  kits.push(parsedFile)
                }
              } else skippedFiles.push({
                name,
                path: fullPath,
                reason: 'Unknown file type. Was expecting a song, sound, or kit.',
                fileHandle,
              })
            } else skippedFiles.push({
              name,
              path: fullPath,
              reason: parsedFile,
              fileHandle,
            })
          } catch (e) {
            skippedFiles.push({
              name,
              path: fullPath,
              reason: String(e),
              fileHandle,
            })
          }
        // Parse WAV and AIFF
        } else if (fileHandle.name.toLowerCase().endsWith('.wav') || fileHandle.name.toLowerCase().endsWith('.aiff')) {
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

  // For every song...
  for (const song of songs) {
    const songName = song.name.split('.')[0] // Drop .xml from the name

    // For every instrument in the song...
    for (const instrument of song.data.instruments) {
      // Sounds
      if (instrument.instrumentType === 'sound') {
        const sound = sounds.find(sound => sound.data.presetName === instrument.presetName)
        if (sound) {
          countSoundUsageInSong(sound, songName)
          computeSampleUsageInSound(sound.data, undefined, songName)
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
            computeSampleUsageInSound(soundSource, kit.data.presetName, songName)
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
  
  function countSoundUsageInKit(sound: ParsedAssetFile, name: string) {
    if (!sound.usage.kits[name]) {
      sound.usage.kits[name] = true
    }
  }
  
  function countSoundUsageInSong(sound: ParsedAssetFile, name: string) {
    if (!sound.usage.songs[name]) {
      sound.usage.songs[name] = true
      sound.usage.total++
    }
  }

  function countKitUsageInSong(kit: ParsedAssetFile, name: string) {
    if (!kit.usage.songs[name]) {
      kit.usage.songs[name] = true
      kit.usage.total++
    }
  }

  // Save results to the store
  fileStore.parsingMessage = 'Saving...'
  // Note: these are done here instead of in the loops to save on mutations in the reactive store.
  fileStore.songs = songs.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.kits = kits.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.samples = samples.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.skippedFiles = skippedFiles
  fileStore.missingSamples = missingSamples.sort((a, b) => a.localeCompare(b))

  fileStore.parsingMessage = 'Done!'
  fileStore.isParsed = true
  fileStore.isParsing = false
}

export async function reParseFileStore() {
  if (fileStore.folderHandle) {
    await parseFolder(fileStore.folderHandle)
  }
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
  } else throw Error(`Failed to decide what firmware version to use for file ${fileHandle.name}`)
  
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
        type: 'song',
        url: encodeURI(`/songs/${name.split('.')[0]}`)
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
        type: 'sound',
        url: encodeURI(`/synths/${name.split('.')[0]}`)
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
        type: 'kit',
        url: encodeURI(`/kits/${name.split('.')[0]}`)
      }
    }
    else throw new Error(`Unknown node type '${root.nodeName}' in file '${name}' (was expecting 'song', 'sound', or 'kit')`)
  } else {
    throw new Error(`Unknown node type '${root.nodeName}' in file '${name}'`)
  }
}

/**
 * Get the stored URL of a sample based on its path. Also good for checking if the sample exists.
 * @param path Sample path.
 * @returns The URL to the sample's details page or null if not found.
 */
export function getSampleUrlByPath(path: string | null | undefined) {
  if (!path) return null
  if (path[0] !== '/') path = '/' + path
  const file = fileStore.samples.find(f => f.path.toLowerCase() === path?.toLowerCase())
  if (file) return file.url
  else return null
}

/**
 * Get the stored sample based on its path. Also good for checking if the sample exists.
 * @param path Sample path.
 * @returns Sample details or null if not found.
 */
export function getSampleByPath(path: string | null | undefined) {
  if (!path) return null
  if (path[0] !== '/') path = '/' + path
  const file = fileStore.samples.find(f => f.path.toLowerCase() === path?.toLowerCase())
  if (file) return file
  else return null
}

/**
 * Look through all known samples and find the one that most closely matches the given path. Assumes that the file name is the same.
 * @param movedPath 
 */
export function findLikeliestMatchForMisplacedSample(movedPath: string) {
  const movedFileName = movedPath.split('/').pop()
  const movedFolderName = movedPath.substring(0, movedPath.lastIndexOf('/'))

  let bestMatch: SampleFile | null = null
  let bestScore = 0

  for (const sample of fileStore.samples) {
    const existingFileName = sample.path.split('/').pop()
    const existingFolderName = sample.path.substring(0, sample.path.lastIndexOf('/'))

    if (existingFileName !== movedFileName) {
      continue
    }

    const score = similarityScore(existingFolderName, movedFolderName)
    if (score > bestScore) {
      bestScore = score
      bestMatch = sample
    }
  }

  return bestMatch!
}

/**
 * Based on the Levenshtein distance algorithm.
 */
function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) {
    return 0;
  }

  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        const deletion = matrix[i - 1][j] + 1;
        const insertion = matrix[i][j - 1] + 1;
        const substitution = matrix[i - 1][j - 1] + 1;
        matrix[i][j] = Math.min(deletion, insertion, substitution);
      }
    }
  }

  const maxScore = Math.max(len1, len2);
  const score = 1 - matrix[len1][len2] / maxScore;

  return score;
}

export async function remapSampleInParsedFile(parsedFile: ParsedAssetFile, oldPath: string, newPath: string) {
  newPath = newPath.replace(/\\/g, '/') // Normalize path separators. Deluge does not start with a backslash, while the file system does.

  console.log(`Remapping sample in ${parsedFile.name}: ${oldPath} -> ${newPath}`)

  // Find instances of the old path in the parsed file and replace them with the new path
  const newXml = parsedFile.xml.replace(new RegExp(oldPath, 'g'), newPath)

  // Write the new XML to the file
  const writeStream = await parsedFile.fileHandle.createWritable()
  await writeStream.write(newXml)
  await writeStream.close()

  // Update the parsed file
  parsedFile.xml = newXml

  // TODO: Update the sample usage. Maybe show a notification to trigger re-scanning all files at once to avoid monkeying around with individual files?
}

