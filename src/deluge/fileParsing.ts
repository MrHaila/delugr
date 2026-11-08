import { useFileStore, type ParsedKitFile, type ParsedSongFile, type ParsedSoundFile, type SampleFile, type SkippedFile } from "../composables/useFileStore"
import { computeIncompleteUsage, computeUsage, isInAssetFolder } from "./usage"
import { parseKitv1, parseSoundv1 } from "./v1-2"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3-4"
import { parseKitvCommunity, parseSongvCommunity, parseSoundvCommunity } from "./vCommunity"
import { parseXml, type XmlElement } from "./xml"

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
  
  // Walk first (directories recursed concurrently), then read/parse files through a bounded pool.
  // Results are collected in walk order, so ids and array order match a sequential scan.
  fileStore.parsingMessage = 'Finding files...'
  const items = await walkFolder(folder, '/')
  fileStore.parsingMessage = 'Parsing the folder contents...'
  const results: ScanResult[] = new Array(items.length)
  let nextItem = 0
  let scanned = 0
  async function worker() {
    while (nextItem < items.length) {
      const i = nextItem++
      results[i] = await scanItem(items[i])
      fileStore.filesScanned = ++scanned
    }
  }
  await Promise.all(Array.from({ length: Math.min(SCAN_CONCURRENCY, items.length) }, worker))

  for (let i = 0; i < items.length; i++) {
    const { fileHandle, path } = items[i]
    const r = results[i]
    if (r.kind === 'song') songs.push(r.file)
    else if (r.kind === 'sound') sounds.push(r.file)
    else if (r.kind === 'kit') kits.push(r.file)
    else if (r.kind === 'skipped') skippedFiles.push({ name: fileHandle.name, path, reason: r.reason, fileHandle })
    else {
      samples.push({
        name: fileHandle.name,
        path,
        fileHandle,
        id,
        url: encodeURI(`/samples/${id}`),
        usage: [],
      })
      id++
    }
  }

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
}

/**
 * Files read and parsed at once. Overlaps I/O waits (every file is a separate File System Access call).
 * Benchmarked on OPFS: gains level off at 8–16. See docs/research/parse-performance.md.
 */
const SCAN_CONCURRENCY = 16

type ScanItem = { kind: 'xml' | 'audio' | 'other', fileHandle: FileSystemFileHandle, path: string }
type ScanResult =
  | { kind: 'song', file: ParsedSongFile }
  | { kind: 'sound', file: ParsedSoundFile }
  | { kind: 'kit', file: ParsedKitFile }
  | { kind: 'sample' }
  | { kind: 'skipped', reason: string }

/** Lists every relevant file under a folder in iteration order. Subfolders are listed concurrently. */
async function walkFolder(folder: FileSystemDirectoryHandle, path: string): Promise<ScanItem[]> {
  const parts: (ScanItem | Promise<ScanItem[]>)[] = []
  for await (const entry of folder.values()) {
    if (entry.kind === 'directory') {
      parts.push(walkFolder(entry as FileSystemDirectoryHandle, path + entry.name + '/'))
    } else if (entry.kind === 'file') {
      const name = entry.name
      // Skip all dot files
      if (name.startsWith('.')) continue
      const lower = name.toLowerCase()
      let kind: ScanItem['kind'] = 'other'
      if (lower.endsWith('.xml')) {
        // TODO: add support for special config files
        if (lower === 'communityfeatures.xml' || lower === 'midifollow.xml') continue
        kind = 'xml'
      } else if (lower.endsWith('.wav') || lower.endsWith('.aiff')) kind = 'audio'
      parts.push({ kind, fileHandle: entry as FileSystemFileHandle, path: path + name })
    }
  }
  const out: ScanItem[] = []
  for (const part of await Promise.all(parts)) {
    if (Array.isArray(part)) for (const item of part) out.push(item)
    else out.push(part)
  }
  return out
}

async function scanItem({ kind, fileHandle, path }: ScanItem): Promise<ScanResult> {
  if (kind === 'audio') {
    // No getFile() here: size and date load lazily in the views (useSampleMeta).
    return { kind: 'sample' }
  }
  if (kind === 'other') return { kind: 'skipped', reason: 'Not a supported file type.' }
  try {
    const parsedFile = await parseAssetFile(fileHandle, path)
    if (typeof parsedFile === 'string') return { kind: 'skipped', reason: parsedFile }
    if ('type' in parsedFile) {
      if (parsedFile.type === 'song') return { kind: 'song', file: parsedFile }
      if (parsedFile.type === 'sound') return { kind: 'sound', file: parsedFile }
      if (parsedFile.type === 'kit') return { kind: 'kit', file: parsedFile }
    }
    return { kind: 'skipped', reason: 'Unknown file type. Was expecting a song, sound, or kit.' }
  } catch (e) {
    // Failed to parse the file. Add it to the skipped files.
    return { kind: 'skipped', reason: String(e) }
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
 * Detect the firmware version from raw file text, and return the text to parse: 2.x files have extra top-level
 * nodes that are dropped so the parsing copy has a single root element. Returns null if undecidable.
 */
export function detectFirmware(xml: string): { firmware: string, parseableXml: string } | null {
  // Old firmware versions don't have the firmware version in the XML file
  if (!xml.includes('firmwareVersion')) return { firmware: '1', parseableXml: xml }

  // 2.x has a firmwareVersion node with the value as a payload
  if (xml.includes('<firmwareVersion>')) {
    const from = xml.indexOf('<firmwareVersion>')
    const firmware = xml.substring(from + 17, xml.indexOf('</firmwareVersion>'))
    const to = xml.indexOf('</earliestCompatibleFirmware>') + 30
    return { firmware, parseableXml: xml.substring(0, from) + xml.substring(to) }
  }

  // 3.x and 4.x have a firmwareVersion attribute on the root node
  if (xml.includes('firmwareVersion="')) {
    const from = xml.indexOf('firmwareVersion="')
    return { firmware: xml.substring(from + 17, xml.indexOf('"', from + 17)), parseableXml: xml }
  }
  return null
}

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
  const detected = detectFirmware(xml)
  if (!detected) throw Error(`Failed to decide what firmware version to use for file ${fileHandle.name}`)
  const { firmware, parseableXml } = detected

  const name = fileHandle.name
  const meta = { name, path, fileHandle, lastModified, firmware, xml }

  // Fast path: strict DOM-free parser. Malformed or unusual files return null and go through DOMParser, which keeps
  // its partial-document behavior and error text. If a versioned parser throws, the DOMParser path re-runs it so the
  // error message (which may embed outerHTML) is identical.
  const fastRoot = parseXml(parseableXml)
  if (fastRoot) {
    try {
      return interpretRoot(fastRoot, meta, null)
    } catch {
      // Fall through
    }
  }

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

  return interpretRoot(xmlDoc.documentElement as Element, meta, xmlError)
}

type FileMeta = { name: string, path: string, fileHandle: FileSystemFileHandle, lastModified: number, firmware: string, xml: string }

function interpretRoot(root: XmlElement, { name, path, fileHandle, lastModified, firmware, xml }: FileMeta, xmlError: string | null): ParsedSongFile | ParsedSoundFile | ParsedKitFile | string {
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