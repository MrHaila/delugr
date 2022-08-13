import { Delay, findDirectChildNodeByTagName, getInstrumentName, Kit, Lfo, Oscillator, Sound, Unison } from "./core"
import { defaultSynthPatch } from "./defaultSynthPatchv4"

export function parseKitv1 (xml: Element, fileName?: string, songName?: string): Kit {
  let presetName = getInstrumentName(xml)
  let problem = false
  if (!presetName) {
    if (fileName) presetName = fileName.slice(0, -4)
    else {
      presetName = 'Unknown v1-2 kit 🤔'
      problem = true
    }
  }

  // Child elements
  const lpfMode = findDirectChildNodeByTagName(xml, 'lpfMode')?.textContent
  const modFXType = findDirectChildNodeByTagName(xml, 'modFXType')?.textContent
  const modFXCurrentParam = findDirectChildNodeByTagName(xml, 'modFXCurrentParam')?.textContent
  const currentFilterType = findDirectChildNodeByTagName(xml, 'currentFilterType')?.textContent
  const delay = findDirectChildNodeByTagName(xml, 'delay')
  
  const soundSources = (() => {
    const sounds: { [key: string]: Sound } = {}
    const soundNodes = xml.querySelectorAll('sound')
    for (let i = 0; i < soundNodes.length; i++) {
      const xmlSound = soundNodes.item(i)
      if (xmlSound) {
        const sound = parseSoundv1(xmlSound)
        sounds[sound.presetName] = sound
      }
    }
    return sounds
  })()

  if (!lpfMode) throw new Error(`Missing lpfMode attribute on kit '${presetName}'`)
  if (!modFXType) throw new Error('Missing modFXType attribute on kit ' + presetName)
  if (!modFXCurrentParam) throw new Error('Missing modFXCurrentParam attribute on kit ' + presetName)
  if (!currentFilterType) throw new Error('Missing currentFilterType attribute on kit ' + presetName)

  const kit: Kit = {
    presetName,
    lpfMode,
    modFXType,
    modFXCurrentParam,
    currentFilterType,
    soundSources,
    instrumentType: 'kit',
    problem: false,
    isInstance: songName !== undefined,
  }

  if (delay) kit.delay = parseDelay(delay, fileName)

  return kit
}

export function parseSoundv1 (xml: Element, fileName?: string, songName?: string, kitName?: string): Sound {
  let presetName = getInstrumentName(xml)
  let problem = false
  if (!presetName) {
    if (fileName) presetName = fileName.slice(0, -4)
    else {
      presetName = 'Unknown v1-2 sound 🤔'
      problem = true
    }
  }

  // Init to default values
  const sound: Sound = defaultSynthPatch
  
  // Override defaults for the stuff we understand
  const polyphonic = findDirectChildNodeByTagName(xml, 'polyphonic')?.textContent
  if (polyphonic) sound.polyphonic = polyphonic
  
  const voicePriority = findDirectChildNodeByTagName(xml, 'voicePriority')?.textContent
  if (voicePriority) sound.voicePriority = Number(voicePriority)
  
  const mode = findDirectChildNodeByTagName(xml, 'mode')?.textContent
  if (mode) sound.mode = mode

  const lpfMode = findDirectChildNodeByTagName(xml, 'lpfMode')?.textContent
  if (lpfMode) sound.lpfMode = lpfMode

  const modFXType = findDirectChildNodeByTagName(xml, 'modFXType')?.textContent
  if (modFXType) sound.modFXType = modFXType

  const osc1 = findDirectChildNodeByTagName(xml, 'osc1')
  if (osc1) sound.osc1 = parseOscillator(osc1)

  const osc2 = findDirectChildNodeByTagName(xml, 'osc2')
  if (osc2) sound.osc2 = parseOscillator(osc2)

  const lfo1 = findDirectChildNodeByTagName(xml, 'lfo1')
  if (lfo1) sound.lfo1 = parseLfo(lfo1)

  const lfo2 = findDirectChildNodeByTagName(xml, 'lfo2')
  if (lfo2) sound.lfo2 = parseLfo(lfo2)

  const unison = findDirectChildNodeByTagName(xml, 'unison')
  if (unison) sound.unison = parseUnison(unison)

  const delay = findDirectChildNodeByTagName(xml, 'delay')
  if (delay) sound.delay = parseDelay(delay, fileName)

  // const compressor = findDirectChildNodeByTagName(xml, 'compressor')
  // if (compressor) sound.compressor = parseCompressor(compressor)

  // const defaultParams = findDirectChildNodeByTagName(xml, 'defaultParams')
  // if (defaultParams) sound.defaultParams = parseAllAttributes(defaultParams)

  // TODO - envelopes, patch cables, eq, etc.
  
  // const arpeggiator = findDirectChildNodeByTagName(xml, 'arpeggiator')
  // if (arpeggiator) sound.arpeggiator = parseArpeggiator(arpeggiator)

  // const modKnobs = findDirectChildNodeByTagName(xml, 'modKnobs')
  // if (modKnobs) sound.modKnobs = parseModKnobs(modKnobs)

  // Optional params
  const clippingAmount = findDirectChildNodeByTagName(xml, 'clippingAmount')?.textContent
  if (clippingAmount) sound.clippingAmount = Number(clippingAmount)

  // const modulator1 = findDirectChildNodeByTagName(xml, 'modulator1')
  // const modulator2 = findDirectChildNodeByTagName(xml, 'modulator2')

  // Non-spec params
  sound.problem = problem
  sound.isInstance = true

  return sound
}

function parseOscillator (xml: Element): Oscillator {
  const type = findDirectChildNodeByTagName(xml, 'type')?.textContent
  const transpose = findDirectChildNodeByTagName(xml, 'transpose')?.textContent
  const cents = findDirectChildNodeByTagName(xml, 'cents')?.textContent
  const retrigPhase = findDirectChildNodeByTagName(xml, 'retrigPhase')?.textContent
  const oscillatorSync = findDirectChildNodeByTagName(xml, 'oscillatorSync')?.textContent
  const fileName = findDirectChildNodeByTagName(xml, 'fileName')?.textContent
  const loopMode = findDirectChildNodeByTagName(xml, 'loopMode')?.textContent
  const reversed = findDirectChildNodeByTagName(xml, 'reversed')?.textContent
  const timeStretchAmount = findDirectChildNodeByTagName(xml, 'timeStretchAmount')?.textContent
  const timeStretchEnable = findDirectChildNodeByTagName(xml, 'timeStretchEnabled')?.textContent

  // TODO:
  // zone?: {
  //   startSamplePos: Number,
  //   endSamplePos: Number
  // }

  const oscillator: Oscillator = {}

  if (type) oscillator.type = type
  if (transpose) oscillator.transpose = Number(transpose)
  if (cents) oscillator.cents = Number(cents)
  if (retrigPhase) oscillator.retrigPhase = Number(retrigPhase)
  if (oscillatorSync) oscillator.oscillatorSync = Number(oscillatorSync)
  if (fileName) oscillator.fileName = fileName
  if (loopMode) oscillator.loopMode = Number(loopMode)
  if (reversed) oscillator.reversed = Number(reversed)
  if (timeStretchAmount) oscillator.timeStretchAmount = Number(timeStretchAmount)
  if (timeStretchEnable) oscillator.timeStretchEnable = Number(timeStretchEnable)

  return oscillator
}

function parseLfo (xml: Element): Lfo {
  const type = findDirectChildNodeByTagName(xml, 'type')?.textContent
  const syncLevel = findDirectChildNodeByTagName(xml, 'syncLevel')?.textContent

  if (!type) throw new Error('Missing type attribute on lfo')

  const lfo: Lfo = {
    type,
  }

  if (syncLevel) lfo.syncLevel = Number(syncLevel)

  return lfo
}

function parseUnison (xml: Element): Unison {
  const num = findDirectChildNodeByTagName(xml, 'num')?.textContent
  const detune = findDirectChildNodeByTagName(xml, 'detune')?.textContent

  if (!num) throw new Error('Missing num attribute on unison')
  if (!detune) throw new Error('Missing detune attribute on unison')

  const unison: Unison = {
    num: Number(num),
    detune: Number(detune),
  }

  return unison
}

function parseDelay (xml: Element, fileName: string | undefined): Delay {
  const syncLevel = findDirectChildNodeByTagName(xml, 'syncLevel')?.textContent
  const pingPong = findDirectChildNodeByTagName(xml, 'pingPong')?.textContent
  const analog = findDirectChildNodeByTagName(xml, 'analog')?.textContent

  if (!syncLevel) throw new Error(`Missing 'syncLevel' attribute on delay in file '${fileName}': ${xml.textContent}`)

  const delay: Delay = {
    syncLevel: Number(syncLevel),
    pingPong: Number(pingPong),
    analog: Number(analog),
  }

  return delay
}
