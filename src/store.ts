import { defineStore } from 'pinia'

export interface Song {
  fsFile: File,
  document: Document,
  parsedSong: {
    name: string,
    firmwareVersion: string,
    earliestCompatibleFirmware: string,
    instruments: Instrument[],
  }
}

export interface Instrument {
  tag: string,
  presetSlot: number,
  presetName: string
}

interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: Song
    }
  } | null
}

export const useStore = defineStore('main', {
  state: (): DelugrState => {
    return {
      folderName: null,
      songs: null,
    }
  }
})