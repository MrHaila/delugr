import { DateTime } from 'luxon'
import { Store } from 'pinia'
import { FixPos50 } from './delugeUtils'
import { DelugrState } from './store'
import { Song, ListItem, Instrument, Synth, Oscillator, Lfo, PatchCable, ModKnob } from './types'

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
  if (Object.hasOwn(folders, 'SONGS')) await parseSongFolder(folders['SONGS'])
  //if (Object.hasOwn(folders, 'KITS')) await parseKitsFolder(folders['KITS'])
  //if (Object.hasOwn(folders, 'SAMPLES')) await parseSamplesFolder(folders['SAMPLES'])

  computeSynthUsage()
}

function computeSynthUsage () {
  if (store.synths && store.songs) {
    const usage: { [key: string]: string[] } = {}

    for (const song of Object.values(store.songs.files)) {
      for (const instrument of song.parsedSong.instruments) {
        if (instrument.tag === 'sound' && instrument.presetName) {
          const synth = store.synths.files[instrument.presetName]
          if (synth) {
            if (!usage[instrument.presetName]) usage[instrument.presetName] = [song.parsedSong.name]
            else usage[instrument.presetName].push(song.parsedSong.name)
          }
        }
      }
    }

    store.synths.usage = usage
  }
}

async function parseSongFolder (folder: FileSystemDirectoryHandle) {
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
      const xmlInstruments = document.querySelector('song > instruments')?.children
      let instruments: Instrument[] = []

      if (xmlInstruments) {
        let problem = false

        instruments = Array.from(xmlInstruments).map(i => {
          let instrumentProblem = false

          // Old patches had slot numbers instead of names
          let presetName = i.getAttribute('presetName') || ''
          if (i.hasAttribute('presetSlot')) {
            const slot = Number(i.getAttribute('presetSlot'))
            if (slot < 10) presetName = `SYNT00${slot}`
            else if (slot < 99) presetName = `SYNT0${slot}`
            else presetName = `SYNT${slot}`
          }
          
          if (i.tagName === 'sound' && presetName && !store.synths?.navigationList.find(n => n.name.includes(presetName))) {
            problem = true
            instrumentProblem = true

            console.log(`Synth ${presetName} not found in synths folder`)
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

function getAttributesAsObject(element: Element | null) {
  if (!element) return {}

  const attributes = Array.from(element.attributes)
  const obj: { [key: string]: string } = {}
  attributes.forEach(a => {
    obj[a.name] = a.value
  })
  return obj
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
            parsedSynth: {
              name,
              firmwareVersion: String(xmlSound.getAttribute('firmwareVersion')),
              earliestCompatibleFirmware: String(xmlSound.getAttribute('earliestCompatibleFirmware')),
              polyphonic: String(xmlSound.getAttribute('polyphonic')),
              voicePriority: Number(xmlSound.getAttribute('voicePriority')),
              mode: String(xmlSound.getAttribute('mode')),
              lpfMode: String(xmlSound.getAttribute('lpfMode')),
              modFXType: String(xmlSound.getAttribute('modFXType')),
              clippingAmount: Number(xmlSound.getAttribute('clippingAmount')),
              osc1: (() => getAttributesAsObject(xmlSound.querySelector('osc1')) as Oscillator)(),
              osc2: (() => getAttributesAsObject(xmlSound.querySelector('osc2')) as Oscillator)(),
              lfo1: (() => getAttributesAsObject(xmlSound.querySelector('lfo1')) as Lfo)(),
              lfo2: (() => getAttributesAsObject(xmlSound.querySelector('lfo2')) as Lfo)(),
              unison: {
                num: Number(xmlSound.querySelector('unison')?.getAttribute('num')),
                detune: Number(xmlSound.querySelector('unison')?.getAttribute('detune')),
              },
              compressor: {
                syncLevel: Number(xmlSound.querySelector('compressor')?.getAttribute('syncLevel')),
                attack: Number(xmlSound.querySelector('compressor')?.getAttribute('attack')),
                release: Number(xmlSound.querySelector('compressor')?.getAttribute('release')),
              },
              delay: {
                pingPong: Number(xmlSound.querySelector('delay')?.getAttribute('pingPong')),
                analog: Number(xmlSound.querySelector('delay')?.getAttribute('analog')),
                syncLevel: Number(xmlSound.querySelector('delay')?.getAttribute('syncLevel')),
              },
              defaultParams: (() => Object.fromEntries(Object.entries(getAttributesAsObject(xmlSound.querySelector('defaultParams'))).map((p: string[]) => [p[0], new FixPos50(p[1])])))(),
              env1: {
                attack: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope1')?.getAttribute('attack'))),
                decay: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope1')?.getAttribute('decay'))),
                sustain: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope1')?.getAttribute('sustain'))),
                release: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope1')?.getAttribute('release'))),
              },
              env2: {
                attack: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope2')?.getAttribute('attack'))),
                decay: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope2')?.getAttribute('decay'))),
                sustain: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope2')?.getAttribute('sustain'))),
                release: new FixPos50(String(xmlSound.querySelector('defaultParams > envelope2')?.getAttribute('release'))),
              },
              patchCables: (() => {
                const cables = xmlSound.querySelector('defaultParams > patchCables')?.childNodes
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
              })(),
              equalizer: {
                bass: new FixPos50(String(xmlSound.querySelector('defaultParams > equalizer')?.getAttribute('bass'))),
                treble: new FixPos50(String(xmlSound.querySelector('defaultParams > equalizer')?.getAttribute('treble'))),
                bassFrequenzy: new FixPos50(String(xmlSound.querySelector('defaultParams > equalizer')?.getAttribute('bassFrequenzy'))),
                trebleFrequenzy: new FixPos50(String(xmlSound.querySelector('defaultParams > equalizer')?.getAttribute('trebleFrequenzy'))),
              },
              arpeggiator: {
                mode: String(xmlSound.querySelector('arpeggiator')?.getAttribute('mode')),
                numOctaves: Number(xmlSound.querySelector('arpeggiator')?.getAttribute('numOctaves')),
                syncLevel: Number(xmlSound.querySelector('arpeggiator')?.getAttribute('syncLevel')),
              },
              modKnobs: (() => {
                const knobs = xmlSound.querySelector('modKnobs')?.childNodes
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
              })(),
            }
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
