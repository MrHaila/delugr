import type { FixPos50 } from "./dataTypes"

// Types ---------------------------------------------------------------------

export interface Song {
    name: string,
    // TODO: the rest of the owl
    instruments: Array<Sound | Kit | AudioTrack | MidiChannel>,
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
  compressor: Compressor,

  // Not part of the spec
  problem: boolean,
  instrumentType: 'audio track'
}

export type MidiChannel = {
  channel: number,
  suffix: string,
  defaultVelocity: number,
  isArmedForRecording: number,
  activeModFunction: number,

  // Not part of the spec
  instrumentType: 'midi track'
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
  rangeTopNote: Number,
  fileName: string,
  transpose: Number,
  zone: Zone
}

export type Zone = {
  startSamplePos: Number,
  endSamplePos: Number,
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

export function getFirmwareVersion(xml: Element): string {
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
export function getInstrumentName(xml: Element): string | null {
  // Newer instruments have a presetName attribute
  let presetName = xml.getAttribute('presetName') || null

  // Sounds inside kits may have a name element in v1 and v2 files
  if (findDirectChildNodeByTagName(xml, 'name')) presetName = String(findDirectChildNodeByTagName(xml, 'name')?.textContent)

  // Sounds inside kits may have a name attribute in v3 and v4 files
  if (xml.hasAttribute('name')) presetName = xml.getAttribute('name')

  // Old instruments had slot numbers instead of names
  if (xml.hasAttribute('presetSlot')) {
    const prefix = xml.tagName === 'sound' ? 'SYNT' : 'KIT'
    const slot = Number(xml.getAttribute('presetSlot'))
    if (slot < 10) presetName = `${prefix}00${slot}`
    else if (slot < 99) presetName = `${prefix}0${slot}`
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
export function findDirectChildNodeByTagName (xml: Element, tagName: string): Element | null {
  return Array.from(xml.children).find(child => child.tagName === tagName) || null
}

/**
 * A helper function to return a given file name without the file type extension.
 * @param fileName The file name to remove the extension from.
 * @returns The file name without the extension.
 */
export function getFileNameWithoutExtension (fileName: string) {
  return fileName.split('.')[0]
}
