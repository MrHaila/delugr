import { DateTime } from 'luxon'
import { FixPos50 } from './delugeUtils'

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

// There are unknown amounts of different synth versions. Should look into how to map them.
export interface Synth {
  fsFile: File,
  document: Document,
  parsedSynth?: {
    name: string,
    firmwareVersion: string,
    earliestCompatibleFirmware: string,
    polyphonic: string,
    voicePriority: Number,
    mode: string,
    lpfMode: string,
    modFXType: string,
    clippingAmount: Number,
    osc1: Oscillator,
    osc2: Oscillator,
    lfo1: Lfo,
    lfo2: Lfo,
    unison: {
      num: Number,
      detune: Number,
    },
    compressor: {
      syncLevel: Number,
      attack: Number,
      release: Number
    },
    delay: {
      pingPong: Number,
      analog: Number,
      syncLevel: Number
    },
    defaultParams: {
      [key: string]: FixPos50
    },
    env1: Envelope,
    env2: Envelope,
    patchCables: PatchCable[],
    equalizer: {
      bass: FixPos50,
      treble: FixPos50,
      bassFrequenzy: FixPos50,
      trebleFrequenzy: FixPos50
    },
    arpeggiator: {
      mode: string,
      numOctaves: Number,
      syncLevel: Number
    },
    modKnobs: ModKnob[]
  }
}

export interface Oscillator {
  type?: string,
  transpose?: Number,
  cents?: Number,
  retrigPhase?: Number,
  oscillatorSync?: Number,
}

export interface Lfo {
  type?: string,
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