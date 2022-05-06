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
    instruments: Array<Sound | Kit> // TODO: audio tracks?
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
  defaultParams: {
    [key: string]: FixPos50
  },
  env1?: Envelope,
  env2?: Envelope,
  patchCables?: PatchCable[],
  
  // Not in old files
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
  problem?: boolean
}

export interface Kit {
  name: string,

  lpfMode: string,
  modFXType: string,
  modFXCurrentParam: string,
  currentFilterType: string,
  delay: Delay,
  compressor: Compressor,
  defaultParams: {
    [key: string]: FixPos50,
  },
  equalizer?: Equalizer, // TODO: is this a default param or what?
  soundSources: { [key: string]: Sound },
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
  type: string, // 'square' | 'saw' | 'sine' | 'sample'
  transpose: Number,
  cents: Number,
  retrigPhase: Number,
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
export function getInstrumentName(xml: Element): string {
  // Newer instruments have a presetName attribute
  let presetName = xml.getAttribute('presetName') || ''
  // Old instruments had slot numbers instead of names
  if (xml.hasAttribute('presetSlot')) {
    const prefix = xml.tagName === 'sound' ? 'SYNT' : 'KIT'
    const slot = Number(xml.getAttribute('presetSlot'))
    if (slot < 10) presetName = `${prefix}00${slot}`
    else if (slot < 99) presetName = `${prefix}0${slot}`
    else presetName = `${prefix}${slot}`
  }
  return presetName
}

export function parseCompressor(xml: Element): Compressor {
  const syncLevel = xml.getAttribute('syncLevel')
  const attack = xml.getAttribute('attack')
  const release = xml.getAttribute('release')

  if (syncLevel === null || attack === null || release === null) {
    throw new Error(`Compressor missing attributes! XML: ${xml.outerHTML}`)
  }
  return {
    syncLevel: Number(syncLevel),
    attack: Number(attack),
    release: Number(release),
  }
}

export function parseArpeggiator(xml: Element): Arpeggiator {
  const mode = xml.getAttribute('mode')
  const numOctaves = xml.getAttribute('numOctaves')
  const syncLevel = xml.getAttribute('syncLevel')

  if (mode === null || numOctaves === null || syncLevel === null) {
    throw new Error(`Arpeggiator missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
    mode: String(mode),
    numOctaves: Number(numOctaves),
    syncLevel: Number(syncLevel),
  }
}

export function parseOscillator(xml: Element): Oscillator {
  const type = xml.getAttribute('type')
  const transpose = xml.getAttribute('transpose')
  const cents = xml.getAttribute('cents')
  const retrigPhase = xml.getAttribute('retrigPhase')

  if (type === null || transpose === null || cents === null || retrigPhase === null) {
    throw new Error(`Oscillator missing attributes! XML: ${xml.outerHTML}`)
  }

  const osc: Oscillator = {
    type: String(type),
    transpose: Number(transpose),
    cents: Number(cents),
    retrigPhase: Number(retrigPhase),
  }

  if (xml.hasAttribute('oscillatorSync')) osc.oscillatorSync = Number(xml.getAttribute('oscillatorSync'))
  if (xml.hasAttribute('fileName')) osc.fileName = String(xml.getAttribute('fileName'))
  if (xml.hasAttribute('loopMode')) osc.loopMode = Number(xml.getAttribute('loopMode'))
  if (xml.hasAttribute('reversed')) osc.reversed = Number(xml.getAttribute('reversed'))
  if (xml.hasAttribute('timeStretchAmount')) osc.timeStretchAmount = Number(xml.getAttribute('timeStretchAmount'))
  if (xml.hasAttribute('timeStretchEnable')) osc.timeStretchEnable = Number(xml.getAttribute('timeStretchEnable'))

  return osc
}

// TODO: more parameters
export function parseLfo(xml: Element): Lfo {
  const type = xml.getAttribute('type')

  if (type === null) {
    throw new Error(`Lfo missing attributes! XML: ${xml.outerHTML}`)
  }

  const lfo: Lfo = {
    type: String(type),
  }

  if (xml.hasAttribute('syncLevel')) lfo.syncLevel = Number(xml.getAttribute('syncLevel'))

  return lfo
}

export function parseDelay(xml: Element): Delay {
  const pingPong = xml.getAttribute('pingPong')
  const analog = xml.getAttribute('analog')
  const syncLevel = xml.getAttribute('syncLevel')

  if (pingPong === null || analog === null || syncLevel === null) {
    throw new Error(`Delay missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
    pingPong: Number(pingPong),
    analog: Number(analog),
    syncLevel: Number(syncLevel),
  }
}

export function parseUnison(xml: Element): Unison {
  const num = xml.getAttribute('num')
  const detune = xml.getAttribute('detune')

  if (num === null || detune === null) {
    throw new Error(`Unison missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
    num: Number(num),
    detune: Number(detune),
  }
}

// TODO: check the types
export function parseEnvelope(xml: Element): Envelope {
  const attack = xml.getAttribute('attack')
  const decay = xml.getAttribute('decay')
  const sustain = xml.getAttribute('sustain')
  const release = xml.getAttribute('release')

  if (attack === null || decay === null || sustain === null || release === null) {
    throw new Error(`Envelope missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
    attack: new FixPos50(String(attack)),
    decay: new FixPos50(String(decay)),
    sustain: new FixPos50(String(sustain)),
    release: new FixPos50(String(release)),
  }
}

export function parseEqualizer(xml: Element): Equalizer {
  const bass = xml.getAttribute('bass')
  const treble = xml.getAttribute('treble')
  const bassFrequenzy = xml.getAttribute('bassFrequenzy')
  const trebleFrequenzy = xml.getAttribute('trebleFrequenzy')

  if (bass === null || treble === null || bassFrequenzy === null || trebleFrequenzy === null) {
    throw new Error(`Equalizer missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
      bass: new FixPos50(String(bass)),
      treble: new FixPos50(String(treble)),
      bassFrequenzy: new FixPos50(String(bassFrequenzy)),
      trebleFrequenzy: new FixPos50(String(trebleFrequenzy)),
  }
}

export function parsePatchCables(xml: Element): PatchCable[] {
  const cables = xml.childNodes
  if (cables.length === 0) return []

  return Array.from(cables).filter((node) => node.nodeType == 1).map((node) => {
    const element = node as Element

    const source = element.getAttribute('source')
    const destination = element.getAttribute('destination')
    const amount = element.getAttribute('amount')

    if (source === null || destination === null || amount === null) {
      throw new Error(`Patch cable missing attributes! XML: ${xml.outerHTML}`)
    }

    const obj: PatchCable = {
      source: String(source),
      destination: String(destination),
      amount: new FixPos50(String(amount)),
    }

    if (element.hasAttribute('rangeAdjustable')) {
      obj.rangeAdjustable = String(element.getAttribute('rangeAdjustable'))
    }
    return obj
  })
}

export function parseModKnobs(xml: Element): ModKnob[] {
  const knobs = xml.childNodes
  if (knobs.length === 0) return []

  return Array.from(knobs).filter((knob) => knob.nodeType == 1).map((knob) => {
    const element = knob as Element

    const controlsParam = element.getAttribute('controlsParam')

    if (controlsParam === null) {
      throw new Error(`Mod knob missing attributes! XML: ${xml.outerHTML}`)
    }

    const obj: ModKnob = {
      controlsParam: String(controlsParam),
    }
    if (element.hasAttribute('patchAmountFromSource')) {
      obj.patchAmountFromSource = String(element.getAttribute('patchAmountFromSource'))
    }
    return obj
  })
}