import { defineStore } from 'pinia'
import { Kit, ListItem, Song, Synth } from './types'

export interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    navigationList: ListItem[],
    files: {
      [key: string]: Song
    }
  } | null,
  synths: {
    fsHandle: FileSystemDirectoryHandle,
    navigationList: ListItem[],
    files: {
      [key: string]: Synth
    },
    usage: { [key: string]: string[] }
  } | null,
  kits: {
    fsHandle: FileSystemDirectoryHandle,
    navigationList: ListItem[],
    files: {
      [key: string]: Kit
    },
    usage: { [key: string]: string[] }
  } | null
}

export const useStore = defineStore('main', {
  state: (): DelugrState => {
    return {
      folderName: null,
      songs: null,
      synths: null,
      kits: null
    }
  }
})