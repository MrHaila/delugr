import { Delay, Lfo, Oscillator, Sound, Unison } from "./core"

export function parseSoundv1 (xml: Element, fileName?: string, songName?: string): Sound {
  let presetName = 'Unknown v1 Song 🤔'

  // TODO: evaluate if there should be multi-fw support in this function?
  if (xml.querySelector('name')?.textContent) presetName = String(xml.querySelector('name')?.textContent)
  else if (fileName) presetName = fileName

  // Child elements
  const mode = xml.querySelector('mode')?.textContent
  const lpfMode = xml.querySelector('lpfMode')?.textContent
  const modFXType = xml.querySelector('modFXType')?.textContent
  const polyphonic = xml.querySelector('polyphonic')?.textContent
  const voicePriority = xml.querySelector('voicePriority')?.textContent
  const clippingAmount = xml.querySelector('clippingAmount')?.textContent
  const osc1 = xml.querySelector('osc1')
  const osc2 = xml.querySelector('osc2')
  const lfo1 = xml.querySelector('lfo1')
  const lfo2 = xml.querySelector('lfo2')
  const unison = xml.querySelector('unison')
  const delay = xml.querySelector('delay')
  const defaultParams = xml.querySelector('defaultParams')
  const compressor = xml.querySelector('compressor')
  const arpeggiator = xml.querySelector('arpeggiator')
  const modKnobs = xml.querySelector('modKnobs')
  const modulator1 = xml.querySelector('modulator1')
  const modulator2 = xml.querySelector('modulator2')

  if (!mode) throw new Error('Missing mode attribute on sound ' + presetName)
  if (!lpfMode) throw new Error('Missing lpfMode attribute on sound ' + presetName)
  if (!modFXType) throw new Error('Missing modFXType attribute on sound ' + presetName)
  if (!osc1) throw new Error('Missing osc1 element on sound ' + presetName)
  if (!osc2) throw new Error('Missing osc2 element on sound ' + presetName)
  if (!lfo1) throw new Error('Missing lfo1 element on sound ' + presetName)
  if (!lfo2) throw new Error('Missing lfo2 element on sound ' + presetName)
  if (!unison) throw new Error('Missing unison element on sound ' + presetName)
  if (!delay) throw new Error('Missing delay element on sound ' + presetName)

  const sound: Sound = {
    presetName,
    mode,
    lpfMode,
    modFXType,
    osc1: parseOscillator(osc1),
    osc2: parseOscillator(osc2),
    lfo1: parseLfo(lfo1),
    lfo2: parseLfo(lfo2),
    unison: parseUnison(unison),
    delay: parseDelay(delay),
  }

  if (polyphonic) sound.polyphonic = polyphonic
  if (voicePriority) sound.voicePriority = Number(voicePriority)
  if (clippingAmount) sound.clippingAmount = Number(clippingAmount)
  // if (defaultParams) sound.defaultParams = parseAllAttributes(defaultParams)
  // if (compressor) sound.compressor = parseCompressor(compressor)
  // if (arpeggiator) sound.arpeggiator = parseArpeggiator(arpeggiator)
  // if (modKnobs) sound.modKnobs = parseModKnobs(modKnobs)
  // if (modulator1) sound.modulator1 = parseModulator(modulator1)
  // if (modulator1) sound.modulator1 = parseModulator(modulator2)

  return sound
}

function parseOscillator (xml: Element): Oscillator {
  const type = xml.querySelector('type')?.textContent
  const transpose = xml.querySelector('transpose')?.textContent
  const cents = xml.querySelector('cents')?.textContent

  const oscillator: Oscillator = {}

  if (type) oscillator.type = type
  if (transpose) oscillator.transpose = Number(transpose)
  if (cents) oscillator.cents = Number(cents)

  return oscillator
}

function parseLfo (xml: Element): Lfo {
  const type = xml.querySelector('type')?.textContent
  const syncLevel = xml.querySelector('syncLevel')?.textContent

  if (!type) throw new Error('Missing type attribute on lfo')

  const lfo: Lfo = {
    type,
  }

  if (syncLevel) lfo.syncLevel = Number(syncLevel)

  return lfo
}

function parseUnison (xml: Element): Unison {
  const num = xml.querySelector('num')?.textContent
  const detune = xml.querySelector('detune')?.textContent

  if (!num) throw new Error('Missing num attribute on unison')
  if (!detune) throw new Error('Missing detune attribute on unison')

  const unison: Unison = {
    num: Number(num),
    detune: Number(detune),
  }

  return unison
}

function parseDelay (xml: Element): Delay {
  const pingPong = xml.querySelector('pingPong')?.textContent
  const analog = xml.querySelector('analog')?.textContent
  const syncLevel = xml.querySelector('syncLevel')?.textContent

  if (!pingPong) throw new Error('Missing pingPong attribute on delay')
  if (!analog) throw new Error('Missing analog attribute on delay')
  if (!syncLevel) throw new Error('Missing syncLevel attribute on delay')

  const delay: Delay = {
    pingPong: Number(pingPong),
    analog: Number(analog),
    syncLevel: Number(syncLevel),
  }

  return delay
}
