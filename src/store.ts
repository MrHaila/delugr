import { defineStore } from 'pinia'

interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: {
        file: File,
        content: any,
      }
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