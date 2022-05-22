import { FixPos50 } from "./dataTypes"

// Types ---------------------------------------------------------------------
export interface DelugeParser {
  parseSong(xml: Element): Song
  parseSound(xml: Element): Sound
  parseKit(xml: Element): Kit
}

export interface Song {
    name: string,
    // TODO: all the rest
    instruments: Array<Sound | Kit | AudioTrack> // TODO: audio tracks?
}

export interface Sound {
  presetName: string,

  mode: string,
  lpfMode: string,
  osc1: Oscillator,
  osc2: Oscillator,
  lfo1: Lfo,
  lfo2: Lfo,
  unison: {
    num: Number,
    detune: Number,
  },
  delay: Delay,
  // TODO: How do defaults work? Duplicate info in the XML?
  defaultParams?: {
    [key: string]: FixPos50
  },
  env1?: Envelope,
  env2?: Envelope,
  patchCables?: PatchCable[],
  
  // Not in old files
  compressor?: Compressor,
  polyphonic?: string,
  oscillatorReset?: number
  voicePriority?: number,
  transpose?: number,
  modFXType?: string,
  clippingAmount?: number,
  equalizer?: Equalizer,
  arpeggiator?: Arpeggiator,
  modKnobs?: ModKnob[],
  modulator1?: Modulator,
  modulator2?: Modulator,

  // Not part of the spec
  problem: boolean,
  instrumentType: 'sound',
}

export interface Kit {
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
  instrumentType: 'kit'
}

export interface AudioTrack {
  presetName: string,

  echoingInput: number,
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

export interface Modulator {
  transpose: number,
  cents: number,
  toModulator1?: number,
}

export interface Arpeggiator {
  mode: string,
  numOctaves: Number,
  syncLevel: Number
}

export interface Delay {
  pingPong: Number,
  analog: Number,
  syncLevel: Number
}

export interface Compressor {
  syncLevel: Number,
  attack: Number,
  release: Number
}

export interface Equalizer {
  bass: FixPos50,
  treble: FixPos50,
  bassFrequenzy: FixPos50,
  trebleFrequenzy: FixPos50
}

export interface Oscillator {
  type?: string, // 'square' | 'saw' | 'sine' | 'sample'
  transpose?: Number,
  cents?: Number,
  retrigPhase?: Number,
  oscillatorSync?: Number,
  fileName?: string,
  loopMode?: Number,
  reversed?: Number,
  timeStretchAmount?: Number,
  timeStretchEnable?: Number
  zone?: {
    startSamplePos: Number,
    endSamplePos: Number
  }
}

export interface Lfo {
  type: string,
  syncLevel?: Number
}

export interface Unison {
  num: Number,
  detune: Number,
}

export interface Envelope {
  attack: FixPos50,
  decay: FixPos50,
  sustain: FixPos50,
  release: FixPos50
}

export interface PatchCable {
  source: string,
  destination: string,
  amount: FixPos50,
  rangeAdjustable?: string
}

export interface ModKnob {
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
 * @param xml The intrument's root element.
 */
export function getInstrumentName(xml: Element): string | null {
  // Newer instruments have a presetName attribute
  let presetName = xml.getAttribute('presetName') || null

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