import { Store } from 'pinia'
import { Song, Instrument, DelugrState, Synth } from './store'

let store: Store<"main", DelugrState, {}, {}>
const parser = new DOMParser()

export async function parseRootFolder(s: Store<"main", DelugrState, {}, {}>, folder: FileSystemDirectoryHandle) {
  store = s
  for await (const entry of folder.values()) {
    // Skip evaluating files instead of folders
    if (entry.kind === 'file') return

    switch (entry.name.toUpperCase()) {
      case 'SONGS':
        await parseSongFolder(entry)
        break
      case 'SYNTHS':
        await parseSynthsFolder(entry)
        break

      default:
        console.log('Unknown folder: ' + entry.name)
        break
    }
  }
}

async function parseSongFolder (folder: FileSystemDirectoryHandle) {
  const files: { [key: string]: Song } = {}

  for await (const song of folder.values()) {
    if (song.kind === 'file') {
      // Parse song file
      const fsFile = await song.getFile()
      if (!fsFile || fsFile.type !== 'text/xml') return

      const name = fsFile.name.slice(0, -4)
      const xml = await fsFile.text()
      const document = parser.parseFromString(xml, "text/xml")
      const xmlInstruments = document.querySelector('song > instruments')?.children
      let instruments: Instrument[] = []

      if (xmlInstruments) {
        instruments = Array.from(xmlInstruments).map(i => {
          return {
            tag: i.tagName,
            presetSlot: i.hasAttribute('presetSlot') ? Number(i.getAttribute('presetSlot')) : null,
            presetName: i.getAttribute('presetName'),
            //polyphonic: i.getAttribute('polyphonic'),
            //attributes: Array.from(i.attributes).map(a => `${a.name}: ${a.value}`)
          }
        })
      }

      files[name] = {
        fsFile,
        document,
        parsedSong: {
          name,
          firmwareVersion: String(document.querySelector('song')?.getAttribute('firmwareVersion')),
          earliestCompatibleFirmware: String(document.querySelector('song')?.getAttribute('earliestCompatibleFirmware')),
          instruments
        }
      }
    }
  }

  // Save to store
  store.songs = {
    fsHandle: folder as FileSystemDirectoryHandle,
    files
  }
}

async function parseSynthsFolder(folder: FileSystemDirectoryHandle) {
  const files: { [key: string]: Synth } = {}

  for await (const file of folder.values()) {
    if (file.kind === 'file') {
      const fsFile = await file.getFile()
      if (!fsFile || fsFile.type !== 'text/xml') return

      const name = fsFile.name.slice(0, -4)
      const xml = await fsFile.text()
      const document = parser.parseFromString(xml, "text/xml")

      // What's what?
      // const xmlInstruments = document.querySelector('song > instruments')?.children
      // let instruments: Instrument[] = []

      // if (xmlInstruments) {
      //   instruments = Array.from(xmlInstruments).map(i => {
      //     return {
      //       tag: i.tagName,
      //       presetSlot: i.hasAttribute('presetSlot') ? Number(i.getAttribute('presetSlot')) : null,
      //       presetName: i.getAttribute('presetName'),
      //       //polyphonic: i.getAttribute('polyphonic'),
      //       //attributes: Array.from(i.attributes).map(a => `${a.name}: ${a.value}`)
      //     }
      //   })
      // }

      files[name] = {
        fsFile,
        document,
        parsedSynth: {
          name,
          // firmwareVersion: String(document.querySelector('song')?.getAttribute('firmwareVersion')),
          // earliestCompatibleFirmware: String(document.querySelector('song')?.getAttribute('earliestCompatibleFirmware')),
          // instruments
        }
      }
    }
  }

  // Save to store
  store.synths = {
    fsHandle: folder as FileSystemDirectoryHandle,
    files
  }
}
