import { beforeAll, describe, expect, test, vi } from 'vitest'
import { parseAssetFile, parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { useFileStore } from '../src/composables/useFileStore'
import { fileHandleFromText, memoryCard } from './helpers/diskHandles'

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}) // parsers are chatty
})

const song = (firmware: string, instruments: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<song firmwareVersion="${firmware}"><instruments>${instruments}</instruments></song>`

async function parseSong(xml: string) {
  const result = await parseAssetFile(fileHandleFromText('S.XML', xml), '/SONGS/S.XML')
  if (typeof result === 'string' || result.type !== 'song') throw new Error(`Expected song, got: ${JSON.stringify(result)}`)
  return result
}

describe('song MIDI and CV tracks', () => {
  test('official firmware <midiChannel> and <cvChannel>', async () => {
    const { data } = await parseSong(song('4.1.4',
      '<midiChannel channel="2" suffix="-1" defaultVelocity="64" isArmedForRecording="0" activeModFunction="0" />' +
      '<cvChannel channel="1" defaultVelocity="64" isArmedForRecording="0" activeModFunction="0" />'))
    expect(data.instruments).toEqual([
      { instrumentType: 'midi track', channel: 2, suffix: '-1', defaultVelocity: 64, isArmedForRecording: 0, activeModFunction: 0 },
      { instrumentType: 'cv track', channel: 1, defaultVelocity: 64, isArmedForRecording: 0, activeModFunction: 0 },
    ])
  })

  test('community firmware <midi>, internal destination and <cvChannel cv2Source>', async () => {
    const { data } = await parseSong(song('c1.3.0',
      '<midi channel="5" suffix="-1" defaultVelocity="64" isArmedForRecording="0" activeModFunction="0" colour="0" />' +
      '<midi internalDest="transpose" suffix="-1" defaultVelocity="64" isArmedForRecording="0" activeModFunction="0" />' +
      '<cvChannel channel="0" defaultVelocity="64" isArmedForRecording="0" activeModFunction="1" cv2Source="1" />'))
    expect(data.instruments).toEqual([
      { instrumentType: 'midi track', channel: 5, suffix: '-1', defaultVelocity: 64, isArmedForRecording: 0, activeModFunction: 0 },
      { instrumentType: 'midi track', internalDest: 'transpose', suffix: '-1', defaultVelocity: 64, isArmedForRecording: 0, activeModFunction: 0 },
      { instrumentType: 'cv track', channel: 0, defaultVelocity: 64, isArmedForRecording: 0, activeModFunction: 1, cv2Source: 1 },
    ])
  })

  test('community firmware quirks before <instruments> keep the song intact', async () => {
    const result = await parseSong(song('c1.3.0', '<midi channel="1" />').replace('<instruments>',
      '<performanceView><row><8>128</8></row></performanceView><audioClip isPlaying="1" isPlaying="1" filePath="" /><instruments>'))
    expect(result.xmlError).toBeNull()
    expect(result.data.instruments).toEqual([{ instrumentType: 'midi track', channel: 1 }])
  })
})

test('root SETTINGS folder is not scanned', async () => {
  const { fileStore } = useFileStore()
  await parseFolderIntoFileStore(memoryCard({
    'SETTINGS/FAVOURITES/SONG_Bank0.xml': '<favourites></favourites>',
    'SETTINGS/MIDIFollow.old.XML': '<defaults></defaults>',
    'SONGS/S.XML': song('c1.3.0', '<midi channel="1" />'),
  }))
  expect(fileStore.skippedFiles).toEqual([])
  expect(fileStore.songs.map(s => s.path)).toEqual(['/SONGS/S.XML'])
})
