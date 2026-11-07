import { useFileStore, type ParsedKitFile, type ParsedSongFile, type ParsedSoundFile, type SampleFile, type SkippedFile } from "../composables/useFileStore"
import { computeIncompleteUsage, computeUsage, isInAssetFolder } from "./usage"
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
          if (name.toLowerCase() === 'communityfeatures.xml') continue
          if (name.toLowerCase() === 'midifollow.xml') continue

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
  const missingSamples = computeUsage({ songs, sounds, kits, samples })
  const incompleteUsage = computeIncompleteUsage([...songs, ...sounds, ...kits], skippedFiles)

  // Save results to the store
  fileStore.parsingMessage = 'Saving...'
  // Note: Saving to the reactive store is done here instead of in the loops to save on mutations.
  fileStore.songs = songs.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.kits = kits.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.samples = samples.sort((a, b) => a.name.localeCompare(b.name))
  fileStore.skippedFiles = skippedFiles
  fileStore.missingSamples = missingSamples
  fileStore.incompleteUsage = incompleteUsage

  fileStore.parsingMessage = 'Done!'
  fileStore.isParsed = true
  fileStore.isParsing = false

  // Processing utilities ---------------------------------------------------------------------------------------------

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
      usage: [],
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
export async function parseAssetFile(fileHandle: FileSystemFileHandle, path: string): Promise<ParsedSongFile | ParsedSoundFile | ParsedKitFile | SampleFile | string> {
  const file = await fileHandle.getFile()
  const lastModified = file.lastModified
  // Keep the original text for writes; parse from a copy that may be fixed up below.
  const xml = await file.text()
  let parseableXml = xml
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

    // Drop the extra top-level nodes so the parsing copy has a single root element
    to = xml.indexOf('</earliestCompatibleFirmware>') + 30
    parseableXml = xml.substring(0, from) + xml.substring(to)
  }
  // 3.x and 4.x have a firmwareVersion attribute on the root node
  else if (xml.includes('firmwareVersion="')) {
    const from = xml.indexOf('firmwareVersion="')
    const to = xml.indexOf('"', from + 17)
    firmware = xml.substring(from + 17, to)
  } else throw Error(`Failed to decide what firmware version to use for file ${fileHandle.name}`)
  
  // Parse the file
  const xmlDoc = parser.parseFromString(parseableXml, 'text/xml')

  // DOMParser does not throw on malformed XML. Instead it inserts a <parsererror> element (Chrome: inside the partial
  // document, Firefox: as the root) and the document only contains what was parsed before the error.
  // Keep the partial data but record the error, and hide the error element from the parsers.
  let xmlError: string | null = null
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0]
  if (parserError) {
    const text = parserError.textContent ?? ''
    xmlError = text.match(/error on line \d+ at column \d+:[^\n]*/)?.[0].trim() ?? (text.trim().split('\n')[0] || 'Malformed XML')
    if (parserError !== xmlDoc.documentElement) parserError.remove()
  }

  const root = xmlDoc.documentElement as Element

  const name = fileHandle.name
  const outsideAssetFolders = !isInAssetFolder(path)

  if (['song', 'sound', 'kit'].includes(root.nodeName)) {
    let data
    if (root.nodeName === 'song') {
      if (firmware.startsWith('3') || firmware.startsWith('4')) data = parseSongv3(root, name)
      else if (firmware.startsWith('c1')) data = parseSongvCommunity(root, name)
      else return `Firmware version ${firmware} is not supported for songs.`

      return {
        name, path, fileHandle, lastModified, firmware, xmlError, data, xml, outsideAssetFolders,
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
        xmlError,
        data,
        xml,
        type: 'sound',
        url: encodeURI(`/synths/${name.split('.')[0]}`),
        outsideAssetFolders,
        derivedInstances: [],
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
        xmlError,
        data,
        xml,
        type: 'kit',
        url: encodeURI(`/kits/${name.split('.')[0]}`),
        outsideAssetFolders,
        derivedInstances: [],
      }
    }
    else throw new Error(`Unknown root node '${root.nodeName}' (was expecting 'song', 'sound', or 'kit')`)
  } else {
    throw new Error(`Unknown root node '${root.nodeName}'. Don't know what to do with this file 🤷‍♂️`)
  }
}