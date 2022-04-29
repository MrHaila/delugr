import { DateTime } from 'luxon'
import { FixPos50 } from './delugeUtils'

export interface Kit {
  fsFile: File,
  document: Document,
  parsedKit: {
    name: string,
    firmwareVersion: string,
    earliestCompatibleFirmware: string,
    lpfMode: string,
    modFXType: string,
    modFXCurrentParam: string,
    currentFilterType: string,
    delay: Delay,
    compressor: Compressor,
    defaultParams: {
      [key: string]: FixPos50,
    },
    equalizer: Equalizer,
    soundSources: { [key: string]: Sound },
  }
}

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

export interface Sound {
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
  // Lots of stuff here. Not even looking into it right now.
  defaultParams: {
    [key: string]: FixPos50
  },
  env1: Envelope,
  env2: Envelope,
  patchCables: PatchCable[],
  
  // Not in old files
  firmwareVersion?: string,
  earliestCompatibleFirmware?: string,
  compressor?: Compressor,
  polyphonic?: string,
  voicePriority?: Number,
  transpose?: Number,
  modFXType?: string,
  clippingAmount?: Number,
  equalizer?: Equalizer,
  arpeggiator?: Arpeggiator,
  modKnobs?: ModKnob[]

  // Not part of the spec
  name: string,
  problem?: boolean
}

export interface Arpeggiator {
  mode: string,
  numOctaves: Number,
  syncLevel: Number
}

// There are unknown amounts of different synth versions. Should look into how to map them.
export interface Synth {
  fsFile: File,
  document: Document,
  parsedSynth?: Sound
}

export interface Sample {
  name: string,
  path: string,
  usage: {
    sourceName: string,
    sourceType: 'kit' | 'synth' | 'song',
   }[],
  fsFile: File
}

export interface Oscillator {
  type?: 'square' | 'saw' | 'sine' | 'sample',
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

export interface Envelope {
  attack: FixPos50,
  decay: FixPos50,
  sustain: FixPos50,
  release: FixPos50
}

export interface Instrument {
  tag: string,
  presetName: string | null,
  problem: boolean
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

export interface ListItem {
  name: string,
  date: DateTime,
  url: string,
  problem: boolean,
}