import { defineStore } from "pinia"
import { getFirmwareVersion, Kit, Song, Sound } from "./core"
import { parseKitv3, parseSongv3, parseSoundv3 } from "./v3"

export interface ParsedFile {
  name: string,
  path: string,
  file: File,
  firmware: string,
  type: string, // 'song' | 'sound' | 'kit',
  data: Song | Sound | Kit,
}

export interface SampleFile {
  name: string,
  path: string,
  file: File,
  usage?: {
    sourceName: string,
    sourceType: 'kit' | 'sound' | 'song',
  }[],
  type: 'sample',
}

const songs: ParsedFile[] = []
const sounds: ParsedFile[] = []
const kits: ParsedFile[] = []
const samples: SampleFile[] = []

export async function parseFolder(folder: FileSystemDirectoryHandle, path: string) {
  // For each XML or wav file in the folder structure, parse it and add it to the store
  for await (const entry of folder.values()) {
    if (entry.kind === 'directory') {
      const folder = entry as FileSystemDirectoryHandle
      parseFolder(folder, path + '/' + entry.name)
    } else if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle
      // Parse XML and WAV files
      if (fileHandle.name.toLowerCase().endsWith('.xml')) {
        console.log('Parsing XML file', fileHandle.name)
        const file = await fileHandle.getFile()
        const parsedFile = await parseFile(file)
        
        // Store results into arrays
        if (parsedFile.type === 'song') songs.push(parsedFile)
        else if (parsedFile.type === 'sound') sounds.push(parsedFile)
        else if (parsedFile.type === 'kit') kits.push(parsedFile)
        else throw new Error('Unknown file type: ' + parsedFile.type)
      } else if (fileHandle.name.toLowerCase().endsWith('.wav')) {
        const file = await fileHandle.getFile()
        samples.push({
          name: fileHandle.name,
          path: path + '/' + fileHandle.name,
          file,
          type: 'sample',
        })
      }
    }
  }

  // Save results to the store
  // Note: these are done here instead of in the loops to save on Pinia's dev tools events
  const store = useStore()
  store.songs = songs
  store.sounds = sounds
  store.kits = kits
  store.samples = samples

  // computeUsage()
}

const parser = new DOMParser()

export async function parseFile(file: File): Promise<ParsedFile | SampleFile> {
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
  const path = file.webkitRelativePath

  if (['song', 'sound', 'kit'].includes(root.nodeName)) {
    let data
    if (root.nodeName === 'song') {
      if (firmware.startsWith('1')) throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
      else if (firmware.startsWith('2')) throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
      else if (firmware.startsWith('3')) data = parseSongv3(root)
      else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
      else throw Error(`Firmware version ${firmware} is not supported for song file ${name}`)
    }
    else if (root.nodeName === 'sound') {
      if (firmware.startsWith('1')) throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
      else if (firmware.startsWith('2')) throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
      else if (firmware.startsWith('3')) data = parseSoundv3(root)
      else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
      else throw Error(`Firmware version ${firmware} is not supported for sound file ${name}`)
    }
    else if (root.nodeName === 'kit') {
      if (firmware.startsWith('1')) throw Error(`Firmware version ${firmware} is not supported for kit file ${name}`)
      else if (firmware.startsWith('2')) throw Error(`Firmware version ${firmware} is not supported for kit file ${name}`)
      else if (firmware.startsWith('3')) data = parseKitv3(root)
      else if (firmware.startsWith('4')) throw Error(`Firmware version ${firmware} is not supported for kit file ${name}`)
      else throw Error(`Firmware version ${firmware} is not supported for kit file ${name}`)
    }
    else throw new Error(`Unknown node type '${root.nodeName}' in file '${name}' (was expecting 'song', 'sound', or 'kit')`)
    
    const parsedFile: ParsedFile = {
      name,
      path,
      file,
      firmware,
      data,
      type: root.nodeName,
    }

    return parsedFile
  } else if (root.nodeName === 'sample') {
    const sampleFile: SampleFile = {
      name,
      path,
      file,
      type: 'sample',
    }
    return sampleFile
  } else {
    throw new Error(`Unknown node type '${root.nodeName}' in file '${name}'`)
  }
}

export interface DelugrFileStore {
  songs: ParsedFile[],
  sounds: ParsedFile[],
  kits: ParsedFile[],
  samples: SampleFile[],
  folderName: string,
  folderHandle: FileSystemDirectoryHandle | null,
}

export const useStore = defineStore('files', {
  state: (): DelugrFileStore => {
    return {
      songs: [],
      sounds: [],
      kits: [],
      samples: [],
      folderName: '',
      folderHandle: null,
    }
  }
})
