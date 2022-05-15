import { Arpeggiator, AudioTrack, Compressor, Delay, Envelope, Equalizer, findDirectChildNodeByTagName, getInstrumentName, Kit, Lfo, ModKnob, Oscillator, PatchCable, Song, Sound, Unison } from "./core";
import { FixPos50 } from "./dataTypes";

export function parseSongv3(xml: Element, songName: string): Song {
  // Only parse the instruments node for now. Could do more later.
  const xmlInstruments = findDirectChildNodeByTagName(xml, 'instruments')?.children
  
  if (!xmlInstruments) throw new Error(`No instruments node found in '${xml.tagName}'`)
  
  let problem = false
  
  const instruments = Array.from(xmlInstruments).map(i => {
    let instrumentProblem = false

    // Old patches had slot numbers instead of names
    let presetName = getInstrumentName(i)

    // TODO audio tracks? Is that a thing?
    if (i.tagName === 'sound') {
      return parseSoundv3(i, undefined, songName)
    } else if (i.tagName === 'kit') {
      return parseKitv3(i, undefined, songName)
    } else if (i.tagName === 'audioTrack') {
      return parseAudioTrackv3(i, songName)
    } else {
      throw new Error(`Unknown instrument type '${i.tagName}' in instrument '${presetName}' of '${songName}'`)
    }
  })

  const song: Song = {
    name: 'TODO',
    instruments,
  }

  return song
}

export function parseKitv3 (xml: Element, fileName?: string, songName?: string): Kit {
  let presetName = 'Unknown 🤔'

  // TODO: evaluate if there should be multi-fw support in this function?
  if (xml.hasAttribute('name')) presetName = String(xml.getAttribute('name'))
  else if (findDirectChildNodeByTagName(xml, 'name')?.textContent) presetName = String(findDirectChildNodeByTagName(xml, 'name')?.textContent)
  else if (xml.hasAttribute('presetSlot')) {
    presetName = 'KIT' + String(xml.getAttribute('presetSlot'))
    if (xml.hasAttribute('presetSubSlot')) {
      const presetSubSlot = Number(xml.getAttribute('presetSubSlot'))
      if (presetSubSlot >= 0) presetName += ` ${presetSubSlot}`
    }
  }
  else if (fileName) presetName = fileName

  // Attributes
  const lpfMode = xml.getAttribute('lpfMode')
  const modFXType = xml.getAttribute('modFXType')
  const modFXCurrentParam = xml.getAttribute('modFXCurrentParam')
  const currentFilterType = xml.getAttribute('currentFilterType')
  
  // Child elements
  const xmlDelay = findDirectChildNodeByTagName(xml, 'delay')
  const xmlCompressor = findDirectChildNodeByTagName(xml, 'compressor')
  const xmlDefaultParams = findDirectChildNodeByTagName(xml, 'defaultParams')
  const soundSources = (() => {
    const sounds: { [key: string]: Sound } = {}
    const soundNodes = xml.querySelectorAll('sound')
    for (let i = 0; i < soundNodes.length; i++) {
      const xmlSound = soundNodes.item(i)
      if (xmlSound) {
        const song = parseSoundv3(xmlSound, fileName)
        sounds[song.presetName] = song
      }
    }
    return sounds
  })()

  if (!lpfMode) throw new Error(`Missing lpfMode attribute on kit '${presetName}'` + (songName ? ` of ${songName}` : ''))
  if (!modFXType) throw new Error('Missing modFXType attribute on kit ' + presetName)
  if (!modFXCurrentParam) throw new Error('Missing modFXCurrentParam attribute on kit ' + presetName)
  if (!currentFilterType) throw new Error('Missing currentFilterType attribute on kit ' + presetName)

  const kit: Kit = {
    presetName,
    lpfMode,
    modFXType,
    modFXCurrentParam,
    currentFilterType,
    soundSources
  }

  if (xmlDefaultParams) kit.defaultParams = parseAllAttributes(xmlDefaultParams)
  if (xmlDelay) kit.delay = parseDelay(xmlDelay)
  if (xmlCompressor) kit.compressor = parseCompressor(xmlCompressor)

  return kit
}

export function parseSoundv3 (xml: Element, fileName?: string, songName?: string): Sound {
  let presetName = 'Unknown 🤔'

  // TODO: evaluate if there should be multi-fw support in this function?
  if (xml.hasAttribute('name')) presetName = String(xml.getAttribute('name'))
  else if (findDirectChildNodeByTagName(xml, 'name')?.textContent) presetName = String(findDirectChildNodeByTagName(xml, 'name')?.textContent)
  else if (fileName) presetName = fileName

  // Attributes
  const mode = xml.getAttribute('mode')
  const lpfMode = xml.getAttribute('lpfMode')
  const modFXType = xml.getAttribute('modFXType')
  const polyphonic = xml.getAttribute('polyphonic')
  const voicePriority = xml.getAttribute('voicePriority')
  const clippingAmount = xml.getAttribute('clippingAmount')

  // Child elements
  const osc1 = findDirectChildNodeByTagName(xml, 'osc1')
  const osc2 = findDirectChildNodeByTagName(xml, 'osc2')
  const lfo1 = findDirectChildNodeByTagName(xml, 'lfo1')
  const lfo2 = findDirectChildNodeByTagName(xml, 'lfo2')
  const unison = findDirectChildNodeByTagName(xml, 'unison')
  const delay = findDirectChildNodeByTagName(xml, 'delay')
  const defaultParams = findDirectChildNodeByTagName(xml, 'defaultParams')
  const compressor = findDirectChildNodeByTagName(xml, 'compressor')
  const arpeggiator = findDirectChildNodeByTagName(xml, 'arpeggiator')
  const modKnobs = findDirectChildNodeByTagName(xml, 'modKnobs')

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
  if (defaultParams) sound.defaultParams = parseAllAttributes(defaultParams)
  if (compressor) sound.compressor = parseCompressor(compressor)
  if (arpeggiator) sound.arpeggiator = parseArpeggiator(arpeggiator)
  if (modKnobs) sound.modKnobs = parseModKnobs(modKnobs)

  return sound
}

function parseAudioTrackv3 (xml: Element, songName: string): AudioTrack {
  // Attributes
  const name = xml.getAttribute('name')
  const echoingInput = xml.getAttribute('echoingInput')
  const inputChannel = xml.getAttribute('inputChannel')
  const isArmedForRecording = xml.getAttribute('isArmedForRecording')
  const activeModFunction = xml.getAttribute('activeModFunction')
  const lpfMode = xml.getAttribute('lpfMode')
  const modFxType = xml.getAttribute('modFXType')
  const modFxCurrentParam = xml.getAttribute('modFXCurrentParam')
  const currentFilterType = xml.getAttribute('currentFilterType')

  // Child elements
  const delay = findDirectChildNodeByTagName(xml, 'delay')
  const compressor = findDirectChildNodeByTagName(xml, 'compressor')

  if (!name) throw new Error(`Missing 'name' attribute on audio track of song '${songName}'`)
  if (!echoingInput) throw new Error(`Missing 'echoingInput' attribute on audio track of song '${songName}'`)
  if (!inputChannel) throw new Error(`Missing 'inputChannel' attribute on audio track of song '${songName}'`)
  if (!isArmedForRecording) throw new Error(`Missing 'isArmedForRecording' attribute on audio track of song '${songName}'`)
  if (!activeModFunction) throw new Error(`Missing 'activeModFunction' attribute on audio track of song '${songName}'`)
  if (!lpfMode) throw new Error(`Missing 'lpfMode' attribute on audio track of song '${songName}'`)
  if (!modFxType) throw new Error(`Missing 'modFXType' attribute on audio track of song '${songName}'`)
  if (!modFxCurrentParam) throw new Error(`Missing 'modFXCurrentParam' attribute on audio track of song '${songName}'`)
  if (!currentFilterType) throw new Error(`Missing 'currentFilterType' attribute on audio track of song '${songName}'`)
  if (!delay) throw new Error(`Missing 'delay' element on audio track of song '${songName}'`)
  if (!compressor) throw new Error(`Missing 'compressor' element on audio track of song '${songName}'`)

  const audioTrack: AudioTrack = {
    name: String(name),
    echoingInput: Number(echoingInput),
    inputChannel: String(inputChannel),
    isArmedForRecording: Number(isArmedForRecording),
    activeModFunction: Number(activeModFunction),
    lpfMode: String(lpfMode),
    modFxType: String(modFxType),
    modFxCurrentParam: String(modFxCurrentParam),
    currentFilterType: String(currentFilterType),
    delay: parseDelay(delay),
    compressor: parseCompressor(compressor)
  }

  return audioTrack
}

// TODO: remove the rest

function parseAllAttributes(xmlElement: Element | null): { [key: string]: FixPos50 } {
  return Object.fromEntries(Object.entries(getAttributesAsObject(xmlElement)).map((p: string[]) => [p[0], new FixPos50(p[1])]))
  // const attributes = xml.attributes
  // const result: { [key: string]: string } = {}
  // for (let i = 0; i < attributes.length; i++) {
  //   const attribute = attributes[i]
  //   result[attribute.name] = attribute.value
  // }
  // return result
}

function getAttributesAsObject(element: Element | null) {
  if (!element) return {}

  const attributes = Array.from(element.attributes)
  const obj: { [key: string]: string } = {}
  attributes.forEach(a => {
    obj[a.name] = a.value
  })
  return obj
}

function parseCompressor(xml: Element): Compressor {
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

function parseArpeggiator(xml: Element): Arpeggiator {
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

function parseOscillator(xml: Element): Oscillator {

  const osc: Oscillator = {}

  if (xml.hasAttribute('type')) osc.type = String(xml.getAttribute('type'))
  if (xml.hasAttribute('transpose')) osc.transpose = Number(xml.getAttribute('transpose'))
  if (xml.hasAttribute('cents')) osc.cents = Number(xml.getAttribute('cents'))
  if (xml.hasAttribute('retrigPhase')) osc.retrigPhase = Number(xml.getAttribute('retrigPhase'))
  if (xml.hasAttribute('oscillatorSync')) osc.oscillatorSync = Number(xml.getAttribute('oscillatorSync'))
  if (xml.hasAttribute('fileName')) osc.fileName = String(xml.getAttribute('fileName'))
  if (xml.hasAttribute('loopMode')) osc.loopMode = Number(xml.getAttribute('loopMode'))
  if (xml.hasAttribute('reversed')) osc.reversed = Number(xml.getAttribute('reversed'))
  if (xml.hasAttribute('timeStretchAmount')) osc.timeStretchAmount = Number(xml.getAttribute('timeStretchAmount'))
  if (xml.hasAttribute('timeStretchEnable')) osc.timeStretchEnable = Number(xml.getAttribute('timeStretchEnable'))

  return osc
}

// TODO: more parameters
function parseLfo(xml: Element): Lfo {
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

function parseDelay(xml: Element): Delay {
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

function parseUnison(xml: Element): Unison {
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
function parseEnvelope(xml: Element): Envelope {
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

function parseEqualizer(xml: Element): Equalizer {
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

function parsePatchCables(xml: Element): PatchCable[] {
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

function parseModKnobs(xml: Element): ModKnob[] {
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