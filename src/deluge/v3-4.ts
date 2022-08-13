import { Arpeggiator, AudioTrack, Compressor, Delay, Envelope, Equalizer, findDirectChildNodeByTagName, getInstrumentName, Kit, Lfo, ModKnob, Oscillator, PatchCable, Song, Sound, Unison, Zone } from "./core"
import { FixPos50 } from "./dataTypes"
import { defaultSynthPatch } from "./defaultSynthPatchv4"

export function parseSongv3(xml: Element, songName: string): Song {
  // Only parse the instruments node for now. Could do more later.
  const xmlInstruments = findDirectChildNodeByTagName(xml, 'instruments')?.children
  
  if (!xmlInstruments) throw new Error(`No instruments node found in '${xml.tagName}'`)
  
  let problem = false
  
  const instruments = Array.from(xmlInstruments).map(i => {
    let instrumentProblem = false

    // Old patches had slot numbers instead of names
    const presetName = getInstrumentName(i)

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
  // TODO: default kit -> overrides
  
  let presetName = getInstrumentName(xml)
  let problem = false
  if (!presetName) {
    if (fileName) presetName = fileName.slice(0, -4)
    else {
      presetName = 'Unknown v3 kit 🤔'
      problem = true
    }
  }

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
        const sound = parseSoundv3(xmlSound, fileName, songName, presetName)
        sounds[sound.presetName] = sound
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
    soundSources,
    instrumentType: 'kit',
    problem,
    isInstance: songName !== undefined,
  }

  if (xmlDefaultParams) kit.defaultParams = parseAllAttributes(xmlDefaultParams)
  if (xmlDelay) kit.delay = parseDelay(xmlDelay)
  if (xmlCompressor) kit.compressor = parseCompressor(xmlCompressor)

  return kit
}

export function parseSoundv3 (xml: Element, fileName?: string, songName?: string, kitName?: string): Sound {
  // Init to default values
  const sound: Sound = JSON.parse(JSON.stringify(defaultSynthPatch))
  
  let presetName = getInstrumentName(xml)
  let problem = false
  if (!presetName) {
    // Fallback to filename if no preset name is found.
    if (fileName) presetName = fileName.slice(0, -4)
    else {
      presetName = 'Unknown v3 or v4 sound 🤔'
      problem = true
    }
  }
  sound.presetName = presetName

  // Override defaults for the stuff we understand
  const polyphonic = xml.getAttribute('polyphonic')
  if (polyphonic) sound.polyphonic = polyphonic

  const voicePriority = xml.getAttribute('voicePriority')
  if (voicePriority) sound.voicePriority = Number(voicePriority)

  const mode = xml.getAttribute('mode')
  if (mode) sound.mode = mode

  const lpfMode = xml.getAttribute('lpfMode')
  if (lpfMode) sound.lpfMode = lpfMode

  const modFXType = xml.getAttribute('modFXType')
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
  if (delay) sound.delay = parseDelay(delay)

  const compressor = findDirectChildNodeByTagName(xml, 'compressor')
  if (compressor) sound.compressor = parseCompressor(compressor)

  const defaultParams = findDirectChildNodeByTagName(xml, 'defaultParams')
  if (defaultParams) sound.defaultParams = parseAllAttributes(defaultParams)

  // TODO - envelopes, patch cables, eq, etc.
  
  const arpeggiator = findDirectChildNodeByTagName(xml, 'arpeggiator')
  if (arpeggiator) sound.arpeggiator = parseArpeggiator(arpeggiator)

  const modKnobs = findDirectChildNodeByTagName(xml, 'modKnobs')
  if (modKnobs) sound.modKnobs = parseModKnobs(modKnobs)

  // Optional params
  const clippingAmount = xml.getAttribute('clippingAmount')
  if (clippingAmount) sound.clippingAmount = Number(clippingAmount)

  // Non-spec params
  sound.problem = problem
  sound.isInstance = true

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
    presetName: String(name),
    inputChannel: String(inputChannel),
    isArmedForRecording: Number(isArmedForRecording),
    activeModFunction: Number(activeModFunction),
    lpfMode: String(lpfMode),
    modFxType: String(modFxType),
    modFxCurrentParam: String(modFxCurrentParam),
    currentFilterType: String(currentFilterType),
    delay: parseDelay(delay),
    compressor: parseCompressor(compressor),
    instrumentType: 'audio track',
    problem: false,
  }

  if (echoingInput) audioTrack.echoingInput = Number(echoingInput)

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

  const sampleRanges = findDirectChildNodeByTagName(xml, 'sampleRanges')?.children
  if (sampleRanges) {
    osc.sampleRanges = Array.from(sampleRanges).map(element => {
      return {
        fileName: String(element.getAttribute('fileName')),
        rangeTopNote: Number(element.getAttribute('rangeTopNote')),
        transpose: Number(element.getAttribute('transpose')),
        zone: parseZone(element),
      }
    })
  }

  return osc
}

function parseZone(xml: Element): Zone {
  const zone = findDirectChildNodeByTagName(xml, 'zone')
  if (!zone) throw new Error(`Zone missing 'zone' element! XML: ${xml.outerHTML}`)
  const startSamplePos = zone.getAttribute('startSamplePos')
  const endSamplePos = zone.getAttribute('endSamplePos')

  if (startSamplePos === null || endSamplePos === null) {
    throw new Error(`Zone missing attributes! XML: ${xml.outerHTML}`)
  }

  return {
    startSamplePos: Number(startSamplePos),
    endSamplePos: Number(endSamplePos),
  }
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