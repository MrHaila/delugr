import { getInstrumentName, Kit, parseCompressor, parseDelay, parseLfo, parseOscillator, parseUnison, Song, Sound } from "./core";
import { FixPos50 } from "./dataTypes";
import { Instrument } from "./types";

export function parseSongv3(xml: Element): Song {
  // Only parse the instruments node for now. Could do more later.
  const xmlInstruments = xml.querySelector('instruments')?.children
  
  if (!xmlInstruments) throw new Error(`No instruments node found in '${xml.tagName}'`)
  
  let problem = false
  
  const instruments = Array.from(xmlInstruments).map(i => {
    let instrumentProblem = false

    // Old patches had slot numbers instead of names
    let presetName = getInstrumentName(i)

    // TODO audio tracks? Is that a thing?
    if (i.tagName === 'sound') {
      return parseSoundv3(i)
    } else if (i.tagName === 'kit') {
      return parseKitv3(i)
    } else {
      throw new Error(`Unknown instrument type '${i.tagName}' in '${presetName}'`)
    }
  })

  const song: Song = {
    name: 'TODO',
    instruments,
  }

  return song
}

export function parseKitv3 (xml: Element): Kit {
  const name = 'TODO'

  // Attributes
  const lpfMode = xml.getAttribute('lpfMode')
  const modFXType = xml.getAttribute('modFXType')
  const modFXCurrentParam = xml.getAttribute('modFXCurrentParam')
  const currentFilterType = xml.getAttribute('currentFilterType')
  
  // Child elements
  const xmlDelay = xml.querySelector('delay')
  const xmlCompressor = xml.querySelector('compressor')
  const xmlDefaultParams = xml.querySelector('defaultParams')
  const xmlEqualizer = xml.querySelector('equalizer')
  const soundSources = (() => {
    const sounds: { [key: string]: Sound } = {}
    const soundNodes = xml.querySelectorAll('sound')
    for (let i = 0; i < soundNodes.length; i++) {
      const xmlSound = soundNodes.item(i)
      if (xmlSound) {
        const song = parseSoundv3(xmlSound)
        sounds[song.presetName] = song
      }
    }
    return sounds
  })()

  if (!lpfMode) throw new Error('Missing lpfMode attribute on kit ' + name)
  if (!modFXType) throw new Error('Missing modFXType attribute on kit ' + name)
  if (!modFXCurrentParam) throw new Error('Missing modFXCurrentParam attribute on kit ' + name)
  if (!currentFilterType) throw new Error('Missing currentFilterType attribute on kit ' + name)
  if (!xmlDelay) throw new Error('Missing delay element on kit ' + name)
  if (!xmlCompressor) throw new Error('Missing compressor element on kit ' + name)
  if (!xmlDefaultParams) throw new Error('Missing defaultParams element on kit ' + name)
  if (!xmlEqualizer) throw new Error('Missing equalizer element on kit ' + name)

  const kit: Kit = {
    name: 'TODO',
    lpfMode,
    modFXType,
    modFXCurrentParam,
    currentFilterType,
    delay: parseDelay(xmlDelay),
    compressor: parseCompressor(xmlCompressor),
    defaultParams: parseAllAttributes(xmlDefaultParams),
    soundSources
  }

  return kit
}

export function parseSoundv3 (xml: Element, fileName?: string): Sound {
  let presetName = 'Unknown 🤔'

  // TODO: evaluate if there should be multi-fw support in this function?
  if (xml.hasAttribute('name')) presetName = String(xml.getAttribute('name'))
  else if (xml.querySelector('name')?.textContent) presetName = String(xml.querySelector('name')?.textContent)
  else if (fileName) presetName = fileName

  // Attributes
  const mode = xml.getAttribute('mode')
  const lpfMode = xml.getAttribute('lpfMode')
  const modFXType = xml.getAttribute('modFXType')
  const polyphonic = xml.getAttribute('polyphonic')
  const voicePriority = xml.getAttribute('voicePriority')
  const clippingAmount = xml.getAttribute('clippingAmount')

  // Child elements
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

  if (!mode) throw new Error('Missing mode attribute on sound ' + presetName)
  if (!lpfMode) throw new Error('Missing lpfMode attribute on sound ' + presetName)
  if (!modFXType) throw new Error('Missing modFXType attribute on sound ' + presetName)
  if (!osc1) throw new Error('Missing osc1 element on sound ' + presetName)
  if (!osc2) throw new Error('Missing osc2 element on sound ' + presetName)
  if (!lfo1) throw new Error('Missing lfo1 element on sound ' + presetName)
  if (!lfo2) throw new Error('Missing lfo2 element on sound ' + presetName)
  if (!unison) throw new Error('Missing unison element on sound ' + presetName)
  if (!delay) throw new Error('Missing delay element on sound ' + presetName)
  if (!defaultParams) throw new Error('Missing defaultParams element on sound ' + presetName)

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
    defaultParams: parseAllAttributes(defaultParams),
  }

  return sound
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
