import { defineStore } from 'pinia'

// XML format: https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit

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
  presetSlot: number | null,
  presetName: string | null,
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

export class FixPos50 {
  private _fixh: string
  private _decimal: number

  constructor(value: string) {
    this._fixh = value
    this._decimal = mapNumber(Number(value), 0, 50, -2147483648, 2147483647)
  }

  public get decimal() {
    return this._decimal
  }

  public get fixh() {
    return this._fixh
  }
}

function mapNumber (num: number, in_min: number, in_max: number, out_min: number, out_max: number) {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
}

export interface DelugrState {
  folderName: string | null,
  songs: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: Song
    }
  } | null,
  synths: {
    fsHandle: FileSystemDirectoryHandle,
    files: {
      [key: string]: Synth
    }
  } | null
}

export const useStore = defineStore('main', {
  state: (): DelugrState => {
    return {
      folderName: null,
      songs: null,
      synths: null
    }
  }
})