import { shallowReactive, type ShallowReactive } from "vue"
import type { Kit, Song, Sound } from "../deluge/core"
import { parseFolderIntoFileStore } from "../deluge/fileParsing"

/**
 * Base type for all parsed asset (song/kit/synth) XML files.
 */
export type ParsedAssetFile = {
  /**
   * File name.
   * @example 'KIT001.xml' or 'Some Song Name.xml'
   */
  name: string,
  /**
   * Path to the file relative to the selected root folder.
   */
  path: string,
  /**
   * File system handle to access the file.
   */
  fileHandle: FileSystemFileHandle,
  /**
   * Last modified date of the file.
   */
  lastModified: number,
  /**
   * Detected firmware version of the file.
   */
  firmware: string,
  /**
   * URL to the file's details page.
   */
  url: string,
  /**
   * Type of the file. Helps with type narrowing.
   */
  type: 'song' | 'sound' | 'kit',
  /**
   * Parsed file contents.
   */
  data: Song | Sound | Kit,
  /**
   * Raw XML text contents. Kinda redundant, but helps a lot with debugging parsing errors or missing data.
   */
  xml: string,
}

/**
 * Parsed song file.
 */
export interface ParsedSongFile extends ParsedAssetFile {
  type: 'song',
  data: Song,
}

/**
 * Parsed sound file.
 */
export interface ParsedSoundFile extends ParsedAssetFile {
  type: 'sound',
  data: Sound,
  /**
   * Usage stats for the synth.
   */
  usage: {
    songs: string[],
    kits: string[],
    getTotal(): number,
  },
}

/**
 * Parsed kit file.
 */
export interface ParsedKitFile extends ParsedAssetFile {
  type: 'kit',
  data: Kit,
  /**
   * Usage stats for the kit.
   */
  usage: {
    songs: string[],
    getTotal(): number,
  },
}

/**
 * Detected sample file.
 */
export type SampleFile = {
  /**
   * File name. For example, "Super Clap.wav".
   */
  name: string,
  /**
   * Path to the file relative to the selected root folder.
   */
  path: string,
  /**
   * File system handle to access the file.
   */
  fileHandle: FileSystemFileHandle,
  /**
   * Size of the file in bytes.
   */
  size: number,
  /**
   * Last modified date of the file.
   */
  lastModified: number,
  /**
   * URL to the file's details page.
   */
  url: string,
  /**
   * Unique ID for the file. Used in URLs.
   */
  id: Number,
  /**
   * Usage stats for the sample.
   */
  usage: {
    /**
     * Used as audio clips in songs.
     */
    songs: { [key: string]: SampleUsageRecord },
    /**
     * Used as samples or multi samples in synths.
     */
    sounds: { [key: string]: SampleUsageRecord },
    /**
     * Used in individual instruments (synths) in kits.
     */
    kits: { [key: string]: SampleUsageRecord },
    getTotal(): number,
  },
}

export type SampleUsageRecord = {
  instrumentType: string,
  instrumentName: string,
}

/**
 * Info about a file that could not be parsed.
 */
export type SkippedFile = {
  name: string,
  path: string,
  reason: string,
  fileHandle: FileSystemFileHandle,
}

export type DelugrFileStore = {
  isParsed: boolean,
  isParsing: boolean,
  parseError: string | null,
  parsingMessage: string,
  filesScanned: number,
  songs: ParsedSongFile[],
  sounds: ParsedSoundFile[],
  kits: ParsedKitFile[],
  samples: SampleFile[],
  skippedFiles: SkippedFile[],
  missingSamples: string[],
  folderHandle?: FileSystemDirectoryHandle,
}

/**
 * Reactive store for all parsed files and samples.
 */
const fileStore: ShallowReactive<DelugrFileStore> = shallowReactive({
  isParsed: false,
  isParsing: false,
  parseError: null,
  parsingMessage: '',
  filesScanned: 0,
  songs: [],
  sounds: [],
  kits: [],
  samples: [],
  skippedFiles: [],
  missingSamples: [],
  folderHandle: undefined,
})

/**
 * Re-parse the current folder. Used for refreshing the file store when we know files have changed on disk.
 */
async function reParseFileStore() {
  if (fileStore.folderHandle) {
    await parseFolderIntoFileStore(fileStore.folderHandle)
  }
}


export function useFileStore() {
  return {
    fileStore,
    reParseFileStore
  }
}