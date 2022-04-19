import { defineStore } from 'pinia'

interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    files: File[]
  } | null
}

interface SongsFolder {
  fsHandle: FileSystemDirectoryHandle,
  files: File[]
}

export const useStore = defineStore('main', {
  state: (): DelugrState => {
    return {
      folderName: null,
      songs: null,
    }
  }
})