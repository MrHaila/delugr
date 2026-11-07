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
   * Set when the XML is malformed. `data` then holds whatever parsed before the error, since DOMParser stops there.
   * Original Deluge firmwares wrote some malformed files that the device still loads, so these are kept, not skipped.
   */
  xmlError: string | null,
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
   * Original file text, byte-identical to the file on disk. Used for writes and debugging.
   */
  xml: string,
  /**
   * True when the file is not inside an Asset folder (`SONGS/`, `SYNTHS/`, `KITS/`). It still counts toward Usage.
   */
  outsideAssetFolders: boolean,
}

/**
 * Where an instrument sits: a file, and within it an Instance (songs) and/or a Drum (kits).
 */
export type InstrumentOwner = {
  filePath: string,
  fileName: string,
  fileUrl: string,
  fileType: 'song' | 'sound' | 'kit',
  /** Song Instance or Recording track name. `null` for a Preset file's own instrument. */
  instrumentName: string | null,
  /** Drum name, when inside a Kit. */
  drumName: string | null,
}

/**
 * A path inside a Preset, Instance, Drum or Recording that points to a Sample.
 */
export type SampleReference = {
  /** Path as written in the file. */
  samplePath: string,
  owner: InstrumentOwner,
  /** Where in the instrument, e.g. `osc1`, `osc2 sample range 3`, `recording 1`. */
  location: string,
}

/**
 * A Sample reference path that matches no Sample on the card, with every reference pointing to it.
 */
export type MissingSample = {
  path: string,
  references: SampleReference[],
}

/**
 * An XML file in an Asset folder that wasn't fully read, making Usage possibly incomplete.
 */
export type IncompleteUsageFile = {
  name: string,
  path: string,
  reason: string,
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
   * Instances and Drums Derived from this Preset (same name). Informational only.
   */
  derivedInstances: InstrumentOwner[],
}

/**
 * Parsed kit file.
 */
export interface ParsedKitFile extends ParsedAssetFile {
  type: 'kit',
  data: Kit,
  /**
   * Instances Derived from this Preset (same name). Informational only.
   */
  derivedInstances: InstrumentOwner[],
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
   * Usage: every Sample reference on the card pointing to this Sample. Empty for an Unused sample.
   */
  usage: SampleReference[],
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
  missingSamples: MissingSample[],
  /** Asset folder XML files that weren't fully read. Non-empty means Incomplete usage. */
  incompleteUsage: IncompleteUsageFile[],
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
  incompleteUsage: [],
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