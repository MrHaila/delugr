import type { XmlElement } from './xml'
import type { FixPos50 } from "./dataTypes"

// Types ---------------------------------------------------------------------

export interface Song {
    name: string,
    // TODO: the rest of the owl
    instruments: Array<Sound | Kit | AudioTrack | MidiChannel | CvChannel>,
    recordings: Recording[],
}

/**
 * An audio clip in a Song's audio track (`<audioClip>`), wherever it sits in the song.
 */
export type Recording = {
  trackName: string,
  /** Sample reference. `null` for an armed clip with nothing recorded (empty `filePath`). */
  filePath: string | null,
  startSamplePos: number,
  endSamplePos: number,
}

export interface Sound {
  presetName: string,

  polyphonic: 'poly' | string,
  voicePriority: number,
  mode: 'substractive' | string,
  lpfMode: '24dB' | string,

  osc1: Oscillator,
  osc2: Oscillator,
  lfo1: Lfo,
  lfo2: Lfo,
  unison: {
    num: Number,
    detune: Number,
  },
  delay: Delay,
  compressor: Compressor,
  arpeggiator: Arpeggiator,
  modKnobs: ModKnob[],

  // TODO: How do defaults work? Duplicate info in the XML?
  defaultParams?: {
    [key: string]: FixPos50
  },
  env1?: Envelope,
  env2?: Envelope,
  patchCables?: PatchCable[],
  equalizer?: Equalizer,
  
  // Not in old files
  oscillatorReset?: number
  transpose?: number,
  modFXType?: string,
  clippingAmount?: number,
  modulator1?: Modulator,
  modulator2?: Modulator,

  // Not part of the spec
  problem: boolean,
  instrumentType: 'sound',
  isInstance: boolean,
}

export type Kit = {
  presetName: string,

  lpfMode: string,
  modFXType: string,
  modFXCurrentParam: string,
  currentFilterType: string,
  delay?: Delay,
  compressor?: Compressor,
  defaultParams?: {
    [key: string]: FixPos50,
  },
  equalizer?: Equalizer, // TODO: is this a default param or what?
  soundSources: { [key: string]: Sound },

  // Not part of the spec
  problem: boolean,
  instrumentType: 'kit',
  isInstance: boolean,
}

export type AudioTrack = {
  presetName: string,

  echoingInput?: number,
  inputChannel: string,
  isArmedForRecording: number,
  activeModFunction: number,
  lpfMode: string,
  modFxType: string,
  modFxCurrentParam: string,
  currentFilterType: string,
  delay: Delay,
  compressor?: Compressor,

  // Community spec
  audioCompressor?: AudioCompressor,
  sidechain?: Sidechain,

  // Not part of the spec
  problem: boolean,
  instrumentType: 'audio track'
}

/**
 * A song's MIDI track: `<midiChannel>` (official firmware) or `<midi>` (community firmware).
 */
export type MidiChannel = {
  /** 0-based. Absent when the track goes to an internal destination instead. */
  channel?: number,
  /** Community: internal destination instead of a MIDI channel, e.g. `transpose`. */
  internalDest?: string,
  suffix?: string,
  defaultVelocity?: number,
  isArmedForRecording?: number,
  activeModFunction?: number,

  // Not part of the spec
  instrumentType: 'midi track'
}

/**
 * A song's CV/gate track (`<cvChannel>`).
 */
export type CvChannel = {
  /** 0-based CV output. */
  channel?: number,
  defaultVelocity?: number,
  isArmedForRecording?: number,
  activeModFunction?: number,
  /** Community: what drives CV output 2. */
  cv2Source?: number,

  // Not part of the spec
  instrumentType: 'cv track'
}

export type Modulator = {
  transpose: number,
  cents: number,
  toModulator1?: number,
}

export type Arpeggiator = {
  mode: string,
  numOctaves: Number,
  syncLevel: Number
}

export type Delay = {
  pingPong: Number,
  analog: Number,
  syncLevel: Number
}

export type Compressor = {
  syncLevel: Number,
  attack: Number,
  release: Number
}

export type AudioCompressor = {
  attack: FixPos50,
  release: FixPos50,
  thresh: FixPos50,
  ratio: FixPos50,
  compHPF: FixPos50
}

export type Sidechain = {
  attack: FixPos50,
  release: FixPos50,
  syncLevel: FixPos50,
  syncType: Number
}

export type Equalizer = {
  bass: FixPos50,
  treble: FixPos50,
  bassFrequency: FixPos50,
  trebleFrequency: FixPos50
}

export type Oscillator = {
  type?: string, // 'square' | 'saw' | 'sine' | 'sample'
  transpose?: Number,
  cents?: Number,
  retrigPhase?: Number,
  oscillatorSync?: Number,
  loopMode?: Number,
  reversed?: Number,
  timeStretchAmount?: Number,
  timeStretchEnable?: Number,
  fileName?: string,
  zone?: Zone,
  sampleRanges?: SampleRange[],
}

export type SampleRange = {
  rangeTopNote?: Number,
  fileName: string,
  transpose?: Number,
  cents?: Number,
  zone: Zone
}

export type Zone = {
  startSamplePos: Number,
  endSamplePos: Number,
  startLoopPos?: Number,
  endLoopPos?: Number
}

export type Lfo = {
  type: string,
  syncLevel?: Number
}

export type Unison = {
  num: Number,
  detune: Number,
}

export type Envelope = {
  attack: FixPos50,
  decay: FixPos50,
  sustain: FixPos50,
  release: FixPos50
}

export type PatchCable = {
  source: string,
  destination: string,
  amount: FixPos50,
  rangeAdjustable?: string
}

export type ModKnob = {
  controlsParam: string,
  patchAmountFromSource?: string
}

// Core Functions ---------------------------------------------------------------------

/**
 * Read every `<audioClip>` in a song (session clips and arrangement-only clips alike).
 * @param xml The song's root element.
 */
export function parseRecordings(xml: XmlElement): Recording[] {
  return Array.from(xml.getElementsByTagName('audioClip')).map(clip => ({
    trackName: clip.getAttribute('trackName') ?? '',
    filePath: clip.getAttribute('filePath') || null,
    startSamplePos: Number(clip.getAttribute('startSamplePos') ?? 0),
    endSamplePos: Number(clip.getAttribute('endSamplePos') ?? 0),
  }))
}

/** Song instrument tags for MIDI tracks: official firmware writes `midiChannel`, community firmware `midi`. */
export const MIDI_TRACK_TAGS = ['midiChannel', 'midi']
export const CV_TRACK_TAGS = ['cvChannel']

/** Numeric attribute, or undefined when absent. */
function numberAttribute(xml: XmlElement, name: string): number | undefined {
  const value = xml.getAttribute(name)
  return value === null || value === '' ? undefined : Number(value)
}

/**
 * Parse a song's MIDI track. Every attribute is optional: the firmware falls back to defaults, and community firmware
 * writes `internalDest` instead of `channel` for internal destinations.
 */
export function parseMidiChannel(xml: XmlElement): MidiChannel {
  const track: MidiChannel = { instrumentType: 'midi track' }
  const channel = numberAttribute(xml, 'channel')
  if (channel !== undefined) track.channel = channel
  const internalDest = xml.getAttribute('internalDest')
  if (internalDest) track.internalDest = internalDest
  const suffix = xml.getAttribute('suffix')
  if (suffix !== null) track.suffix = suffix
  const defaultVelocity = numberAttribute(xml, 'defaultVelocity')
  if (defaultVelocity !== undefined) track.defaultVelocity = defaultVelocity
  const isArmedForRecording = numberAttribute(xml, 'isArmedForRecording')
  if (isArmedForRecording !== undefined) track.isArmedForRecording = isArmedForRecording
  const activeModFunction = numberAttribute(xml, 'activeModFunction')
  if (activeModFunction !== undefined) track.activeModFunction = activeModFunction
  return track
}

/** Parse a song's CV/gate track. Every attribute is optional, see `parseMidiChannel`. */
export function parseCvChannel(xml: XmlElement): CvChannel {
  const track: CvChannel = { instrumentType: 'cv track' }
  const channel = numberAttribute(xml, 'channel')
  if (channel !== undefined) track.channel = channel
  const defaultVelocity = numberAttribute(xml, 'defaultVelocity')
  if (defaultVelocity !== undefined) track.defaultVelocity = defaultVelocity
  const isArmedForRecording = numberAttribute(xml, 'isArmedForRecording')
  if (isArmedForRecording !== undefined) track.isArmedForRecording = isArmedForRecording
  const activeModFunction = numberAttribute(xml, 'activeModFunction')
  if (activeModFunction !== undefined) track.activeModFunction = activeModFunction
  const cv2Source = numberAttribute(xml, 'cv2Source')
  if (cv2Source !== undefined) track.cv2Source = cv2Source
  return track
}

export function getFirmwareVersion(xml: XmlElement): string {
  let version: string = '1'
  if (xml.hasAttribute('firmwareVersion')) {
    // v3 or v4 file
    version = String(xml.getAttribute('firmwareVersion'))
    return version
  }
  else console.log(xml)

  if (version === null) {
    throw new Error('Firmware version not found')
  }
  return version
}

/**
 * A helper to get a display name for a sound or a kit of any firmware version.
 * @param xml The instrument's root element.
 */
export function getInstrumentName(xml: XmlElement): string | null {
  // Newer instruments have a presetName attribute
  let presetName = xml.getAttribute('presetName') || null

  // Sounds inside kits may have a name element in v1 and v2 files
  if (findDirectChildNodeByTagName(xml, 'name')) presetName = String(findDirectChildNodeByTagName(xml, 'name')?.textContent)

  // Sounds inside kits may have a name attribute in v3 and v4 files
  if (xml.hasAttribute('name')) presetName = xml.getAttribute('name')

  // Old instruments had slot numbers instead of names
  if (xml.hasAttribute('presetSlot') || presetName?.match(/^\d{3}$/)) {
    const prefix = xml.tagName === 'sound' ? 'SYNT' : 'KIT'
    const slot = presetName || Number(xml.getAttribute('presetSlot'))
    if (typeof slot === 'number' && slot < 10) presetName = `${prefix}00${slot}`
    else if (typeof slot === 'number' && slot < 99) presetName = `${prefix}0${slot}`
    else presetName = `${prefix}${slot}`

    // Also might have a sub slot
    if (xml.hasAttribute('presetSubSlot')) {
      const presetSubSlot = Number(xml.getAttribute('presetSubSlot'))
      if (presetSubSlot >= 0) presetName += ` ${presetSubSlot}`
    }
  }
  return presetName
}

/**
 * A helper to get an immediate child Element of an Element by its tag name.
 * @param xml Element to search in.
 * @param tagName Name of the child element to find.
 * @returns The child element, or null if not found.
 */
export function findDirectChildNodeByTagName (xml: XmlElement, tagName: string): XmlElement | null {
  const children = xml.children
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName === tagName) return children[i]
  }
  return null
}

/**
 * A helper function to return a given file name without the file type extension.
 * @param fileName The file name to remove the extension from.
 * @returns The file name without the extension.
 */
export function getFileNameWithoutExtension (fileName: string) {
  return fileName.split('.')[0]
}
