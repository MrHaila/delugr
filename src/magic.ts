import { DateTime } from 'luxon'
import { Store } from 'pinia'
import { FixPos50 } from './delugeUtils'
import { DelugrState } from './store'
import { Song, ListItem, Instrument, Synth, Oscillator, Lfo, PatchCable, ModKnob, Kit, Delay, Envelope, Compressor, Equalizer, Arpeggiator, Sound } from './types'

let store: Store<"main", DelugrState, {}, {}>
const parser = new DOMParser()

export async function parseRootFolder(s: Store<"main", DelugrState, {}, {}>, folder: FileSystemDirectoryHandle) {
  store = s

  const folders: { [key: string]: FileSystemDirectoryHandle } = {}

  for await (const entry of folder.values()) {
    // Skip evaluating files instead of folders
    if (entry.kind === 'directory') {
      folders[entry.name] = entry as FileSystemDirectoryHandle
    }
  }

  if (Object.hasOwn(folders, 'SYNTHS')) await parseSynthsFolder(folders['SYNTHS'])
  if (Object.hasOwn(folders, 'KITS')) await parseKitsFolder(folders['KITS'])
  if (Object.hasOwn(folders, 'SONGS')) await parseSongsFolder(folders['SONGS'])
  //if (Object.hasOwn(folders, 'SAMPLES')) await parseSamplesFolder(folders['SAMPLES'])

  computeSynthUsage()
  computeKitsUsage()
}

async function parseKitsFolder(folder: FileSystemDirectoryHandle) {
  const files: { [key: string]: Kit } = {}
  const navigationList: ListItem[] = []

  for await (const kit of folder.values()) {
    if (kit.kind === 'file') {
      // Parse kit file
      const fsFile = await kit.getFile()
      if (!fsFile || fsFile.type !== 'text/xml') return

      const name = fsFile.name.slice(0, -4)
      const xml = await fsFile.text()
      const document = parser.parseFromString(xml, "text/xml")
      const xmlKit = document.querySelector('kit')

      if (xmlKit) {
        navigationList.push({
          name,
          date: DateTime.fromMillis(fsFile.lastModified),
          url: `/kits/${name}`,
          problem: false
        })

        files[name] = {
          fsFile,
          document,
          parsedKit: {
            name,
            firmwareVersion: String(xmlKit.getAttribute('firmwareVersion')),
            earliestCompatibleFirmware: String(xmlKit.getAttribute('earliestCompatibleFirmware')),
            lpfMode: String(xmlKit.getAttribute('lpfMode')),
            modFXType: String(xmlKit.getAttribute('modFXType')),
            modFXCurrentParam: String(xmlKit.getAttribute('modFXCurrentParam')),
            currentFilterType: String(xmlKit.getAttribute('currentFilterType')),
            delay: parseDelay(xmlKit.querySelector('delay')),
            compressor: parseCompressor(xmlKit.querySelector('compressor')),
            defaultParams: parseAllAttributes(xmlKit.querySelector('defaultParams')),
            equalizer: parseEqualizer(xmlKit.querySelector('defaultParams > equalizer')),
            soundSources: (() => {
              const sounds: Sound[] = []
              const soundNodes = xmlKit.querySelectorAll('sound')
              for (let i = 0; i < soundNodes.length; i++) {
                const xmlSound = soundNodes.item(i)
                if (xmlSound) sounds.push(parseSound(xmlSound))
              }
              return sounds
            })()
          }
        }
      }

    }
  }

  navigationList.sort((a, b) => a.name.localeCompare(b.name))

  // Save to store
  store.kits = {
    fsHandle: folder as FileSystemDirectoryHandle,
    navigationList,
    files,
    usage: {}
  }
}

function computeSynthUsage() {
  if (store.synths && store.songs) {
    const usage: { [key: string]: string[] } = {}

    for (const song of Object.values(store.songs.files)) {
      for (const instrument of song.parsedSong.instruments) {
        if (instrument.tag === 'sound' && instrument.presetName && Object.hasOwn(store.synths.files, instrument.presetName)) {
          if (!usage[instrument.presetName]) usage[instrument.presetName] = [song.parsedSong.name]
          else usage[instrument.presetName].push(song.parsedSong.name)
        }
      }
    }

    store.synths.usage = usage
  }
}

function computeKitsUsage() {
  if (store.kits && store.songs) {
    const usage: { [key: string]: string[] } = {}

    for (const song of Object.values(store.songs.files)) {
      for (const instrument of song.parsedSong.instruments) {
        if (instrument.tag === 'kit' && instrument.presetName && Object.hasOwn(store.kits.files, instrument.presetName)) {
          if (!usage[instrument.presetName]) usage[instrument.presetName] = [song.parsedSong.name]
          else usage[instrument.presetName].push(song.parsedSong.name)
        }
      }
    }

    store.kits.usage = usage
  }
}

async function parseSongsFolder (folder: FileSystemDirectoryHandle) {
  const files: { [key: string]: Song } = {}
  const navigationList: ListItem[] = []

  for await (const song of folder.values()) {
    if (song.kind === 'file') {
      // Parse song file
      const fsFile = await song.getFile()
      if (!fsFile || fsFile.type !== 'text/xml') return

      const name = fsFile.name.slice(0, -4)
      const xml = await fsFile.text()
      const document = parser.parseFromString(xml, "text/xml")

      // Only parse the instruments node for now. Could do more later.
      const xmlInstruments = document.querySelector('song > instruments')?.children
      let instruments: Instrument[] = []

      if (xmlInstruments) {
        let problem = false

        instruments = Array.from(xmlInstruments).map(i => {
          let instrumentProblem = false

          // Old patches had slot numbers instead of names
          let presetName = i.getAttribute('presetName') || ''
          if (i.hasAttribute('presetSlot')) {
            const prefix = i.tagName === 'sound' ? 'SYNT' : 'KIT'
            const slot = Number(i.getAttribute('presetSlot'))
            if (slot < 10) presetName = `${prefix}00${slot}`
            else if (slot < 99) presetName = `${prefix}0${slot}`
            else presetName = `${prefix}${slot}`
          }
          
          if (i.tagName === 'sound' && presetName && !store.synths?.navigationList.find(n => n.name.includes(presetName))) {
            problem = true
            instrumentProblem = true
          } else if (i.tagName === 'kit' && presetName && !store.kits?.navigationList.find(n => n.name.includes(presetName))) {
            problem = true
            instrumentProblem = true

            console.log(`Kit ${presetName} not found in kits folder`)
          }

          return {
            tag: i.tagName,
            presetName,
            problem: instrumentProblem
            //polyphonic: i.getAttribute('polyphonic'),
            //attributes: Array.from(i.attributes).map(a => `${a.name}: ${a.value}`)
          }
        })

        navigationList.push({
          name: fsFile.name.slice(0, -4),
          date: DateTime.fromMillis(fsFile.lastModified),
          url: `/songs/${fsFile.name.slice(0, -4)}`,
          problem
        })
      }

      files[name] = {
        fsFile,
        document,
        parsedSong: {
          name,
          firmwareVersion: String(document.querySelector('song')?.getAttribute('firmwareVersion')),
          earliestCompatibleFirmware: String(document.querySelector('song')?.getAttribute('earliestCompatibleFirmware')),
          instruments
        }
      }
    }
  }

  navigationList.sort((a, b) => a.name.localeCompare(b.name))

  // Save to store
  store.songs = {
    fsHandle: folder as FileSystemDirectoryHandle,
    navigationList,
    files
  }
}

async function parseSynthsFolder(folder: FileSystemDirectoryHandle) {
  const files: { [key: string]: Synth } = {}
  const navigationList: ListItem[] = []

  for await (const file of folder.values()) {
    if (file.kind === 'file') {
      const fsFile = await file.getFile()
      if (!fsFile || fsFile.type !== 'text/xml') return

      const name = fsFile.name.slice(0, -4)
      let xml = await fsFile.text()

      // 2.x synths are not valid XML (multiple root nodes)
      if (xml.includes('<firmwareVersion>2')) {
        const start = xml.indexOf('<firmwareVersion>2')
        const end = xml.lastIndexOf('</earliestCompatibleFirmware>')
        xml = xml.slice(0, start) + xml.slice(end + '</earliestCompatibleFirmware>'.length)
      }

      const document = parser.parseFromString(xml, "text/xml")
      const xmlSound = document.querySelector('sound')

      if (xmlSound) {
        navigationList.push({
          name,
          date: DateTime.fromMillis(fsFile.lastModified),
          url: `/synths/${name}`,
          problem: false
        })

        if (String(xmlSound.getAttribute('earliestCompatibleFirmware'))[0] === '3') {
          files[name] = {
            fsFile,
            document,
            parsedSynth: parseSound(xmlSound, name)
          }
        } else {
          files[name] = {
            fsFile,
            document
          }
        }
      } else {
        console.warn('Unable to parse synth: ', name)
        console.log(xml)
        console.log(document)
        console.log(xmlSound)
      }
    }
  }

  navigationList.sort((a, b) => a.name.localeCompare(b.name))

  // Save to store
  store.synths = {
    fsHandle: folder as FileSystemDirectoryHandle,
    navigationList,
    files,
    usage: {}
  }
}

function parseDelay(xml: Element | null): Delay {
  return {
    pingPong: Number(xml?.getAttribute('pingPong')),
    analog: Number(xml?.getAttribute('analog')),
    syncLevel: Number(xml?.getAttribute('syncLevel')),
  }
}

function parseEnvelope(xml: Element | null): Envelope {
  return {
    attack: new FixPos50(String(xml?.getAttribute('attack'))),
    decay: new FixPos50(String(xml?.getAttribute('decay'))),
    sustain: new FixPos50(String(xml?.getAttribute('sustain'))),
    release: new FixPos50(String(xml?.getAttribute('release'))),
  }
}

function parseEqualizer(xml: Element | null): Equalizer {
  return {
    bass: new FixPos50(String(xml?.getAttribute('bass'))),
    treble: new FixPos50(String(xml?.getAttribute('treble'))),
    bassFrequenzy: new FixPos50(String(xml?.getAttribute('bassFrequenzy'))),
    trebleFrequenzy: new FixPos50(String(xml?.getAttribute('trebleFrequenzy'))),
  }
}

function parsePatchCables(xml: Element | null): PatchCable[] {
  const cables = xml?.childNodes
  if (!cables) return []

  return Array.from(cables).filter((node) => node.nodeType == 1).map((node) => {
    const element = node as Element
    const obj: PatchCable = {
      source: String(element.getAttribute('source')),
      destination: String(element.getAttribute('destination')),
      amount: new FixPos50(String(element.getAttribute('amount'))),
    }
    if (element.hasAttribute('rangeAdjustable')) {
      obj.rangeAdjustable = String(element.getAttribute('rangeAdjustable'))
    }
    return obj
  })
}

function parseModKnobs(xml: Element | null): ModKnob[] {
  const knobs = xml?.childNodes
  if (!knobs) return []

  return Array.from(knobs).filter((knob) => knob.nodeType == 1).map((knob) => {
    const element = knob as Element
    const obj: ModKnob = {
      controlsParam: String(element.getAttribute('controlsParam')),
    }
    if (element.hasAttribute('patchAmountFromSource')) {
      obj.patchAmountFromSource = String(element.getAttribute('patchAmountFromSource'))
    }
    return obj
  })
}

function parseCompressor(xml: Element | null): Compressor {
  return {
    syncLevel: Number(xml?.getAttribute('syncLevel')),
    attack: Number(xml?.getAttribute('attack')),
    release: Number(xml?.getAttribute('release')),
  }
}

function parseArpeggiator(xml: Element | null): Arpeggiator {
  return {
    mode: String(xml?.getAttribute('mode')),
    numOctaves: Number(xml?.getAttribute('numOctaves')),
    syncLevel: Number(xml?.getAttribute('syncLevel')),
  }
}

function parseLfo(xml: Element | null): Lfo {
  const lfo: Lfo = {
    type: String(xml?.getAttribute('type')),
  }
  if (xml?.hasAttribute('syncLevel')) lfo.syncLevel = Number(xml.getAttribute('syncLevel'))
  return lfo
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

// TODO: figure this out. Something about making the firmware versions optional and how to only parse optional values if they are available.
function parseSound(xml: Element, fileName?: string): Sound {
  const sound: Sound = {
    mode: String(xml.getAttribute('mode')),
    lpfMode: String(xml.getAttribute('lpfMode')),
    osc1: (() => getAttributesAsObject(xml.querySelector('osc1')) as Oscillator)(),
    osc2: (() => getAttributesAsObject(xml.querySelector('osc2')) as Oscillator)(),
    lfo1: parseLfo(xml.querySelector('lfo1')),
    lfo2: parseLfo(xml.querySelector('lfo2')),
    unison: {
      num: Number(xml.querySelector('unison')?.getAttribute('num')),
      detune: Number(xml.querySelector('unison')?.getAttribute('detune')),
    },
    delay: parseDelay(xml.querySelector('delay')),
    modFXType: String(xml.getAttribute('modFXType')),
    defaultParams: parseAllAttributes(xml.querySelector('defaultParams')),
    env1: parseEnvelope(xml.querySelector('defaultParams > envelope1')),
    env2: parseEnvelope(xml.querySelector('defaultParams > envelope2')),
    patchCables: parsePatchCables(xml.querySelector('defaultParams > patchCables')),
    equalizer: parseEqualizer(xml.querySelector('defaultParams > equalizer')),
  }

  if (xml.hasAttribute('name')) sound.name = String(xml.getAttribute('name'))
  else if (xml.querySelector('name')?.textContent) sound.name = String(xml.querySelector('name')?.textContent)
  else if (fileName) sound.name = fileName
  else sound.name = 'Unknown 🤔'
  if (xml.hasAttribute('firmwareVersion')) sound.firmwareVersion = String(xml.getAttribute('firmwareVersion'))
  if (xml.hasAttribute('earliestCompatibleFirmware')) sound.earliestCompatibleFirmware = String(xml.getAttribute('earliestCompatibleFirmware'))
  if (xml.hasAttribute('polyphonic')) sound.polyphonic = String(xml.getAttribute('polyphonic'))
  if (xml.hasAttribute('voicePriority')) sound.voicePriority = Number(xml.getAttribute('voicePriority'))
  if (xml.hasAttribute('mode')) sound.mode = String(xml.getAttribute('mode'))
  if (xml.hasAttribute('lpfMode')) sound.lpfMode = String(xml.getAttribute('lpfMode'))
  if (xml.hasAttribute('clippingAmount')) sound.clippingAmount = Number(xml.getAttribute('clippingAmount'))
  if (xml.hasAttribute('compressor')) sound.compressor = parseCompressor(xml.querySelector('compressor'))
  if (xml.hasAttribute('arpeggiator')) sound.arpeggiator = parseArpeggiator(xml.querySelector('arpeggiator'))
  if (xml.hasAttribute('modKnobs')) sound.modKnobs = parseModKnobs(xml.querySelector('modKnobs'))

  return sound

}
