import { defineStore } from 'pinia'

export interface Song {
  fsFile: File,
  document: Document,
  parsedSong: {
    name: string,
    firmwareVersion: string,
    earliestCompatibleFirmware: string,
    instruments: Instrument[]
  }
}

export interface Synth {
  fsFile: File,
  document: Document,
  parsedSynth: any
}

export interface Instrument {
  tag: string,
  presetSlot: number | null,
  presetName: string | null,
}

export interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: Song
    }
  } | null,
  synths: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: Synth
    }
  } | null
}

export const useStore = defineStore('main', {
  state: (): DelugrState => {
    return {
      folderName: null,
      songs: null,
      synths: null
    }
  }
})