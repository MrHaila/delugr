import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { useFileStore, type ParsedAssetFile, type SampleFile } from '../src/composables/useFileStore'
import { findLikeliestMatchForMisplacedSample } from '../src/deluge/files'
import { collectSampleReferences, isInAssetFolder, isPresetInAnySong, samplePathKey } from '../src/deluge/usage'
import { directoryHandleFromDisk, memoryCard } from './helpers/diskHandles'
import { config } from '../scripts/fixtures/config'

const cardRoot = resolve(__dirname, 'fixtures/card')
const fixture = (rel: string) => readFileSync(join(cardRoot, rel), 'utf8')
const { fileStore } = useFileStore()

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}) // parsers are chatty
})

const allFiles = (): ParsedAssetFile[] => [...fileStore.songs, ...fileStore.sounds, ...fileStore.kits]
const sampleByPath = (path: string) => fileStore.samples.find(s => samplePathKey(s.path) === samplePathKey(path))!

describe('isInAssetFolder', () => {
  test.each([
    ['/SONGS/a.XML', true],
    ['/songs/sub/deeper/a.XML', true],
    ['/KITS/a.XML', true],
    ['/SYNTHS/a.XML', true],
    ['/a.XML', false],
    ['/SONGS', false],
    ['/BACKUP/SONGS/a.XML', false],
    ['/SAMPLES/a.XML', false],
  ])('%s → %s', (path, expected) => expect(isInAssetFolder(path)).toBe(expected))
})

describe('fixture card usage', () => {
  beforeAll(async () => {
    await parseFolderIntoFileStore(directoryHandleFromDisk(cardRoot))
  })

  test('every referenced Sample that exists is used; only the deliberately unreferenced ones are unused', () => {
    const referenced = new Set(allFiles().flatMap(f => collectSampleReferences(f as any)).map(r => samplePathKey(r.samplePath)))
    for (const sample of fileStore.samples) {
      expect(sample.usage.length > 0, sample.path).toBe(referenced.has(samplePathKey(sample.path)))
    }
    // Raw text references, including the parts of Malformed files the parser couldn't read.
    const unused = fileStore.samples.filter(s => s.usage.length === 0)
    const inText = (sample: { path: string }, files: ParsedAssetFile[]) =>
      files.some(f => f.xml.toLowerCase().includes(samplePathKey(sample.path)))
    expect(unused.filter(s => !inText(s, allFiles()))).toHaveLength(config.unusedSamples)
    // Any other Unused sample is only referenced past the error in a Malformed file (Incomplete usage).
    expect(unused.filter(s => inText(s, allFiles())).map(s => s.path)).toEqual(['/SAMPLES/D012/D020/S0066.wav'])
    expect(inText({ path: 'SAMPLES/D012/D020/S0066.wav' }, allFiles().filter(f => f.xmlError))).toBe(true)
  })

  test('a missing reference is reported with its owner', () => {
    expect(fileStore.missingSamples).toEqual([
      expect.objectContaining({
        path: 'SAMPLES/MISSING/S9999.wav',
        references: expect.arrayContaining([
          expect.objectContaining({ owner: expect.objectContaining({ filePath: '/SYNTHS/Edge missing sample.XML' }) }),
        ]),
      }),
    ])
  })

  test('a Recording counts toward Usage', () => {
    expect(sampleByPath('SAMPLES/D038/S0297.WAV').usage).toContainEqual(expect.objectContaining({
      location: 'recording 1',
      owner: expect.objectContaining({ filePath: '/SONGS/Song 004.XML', instrumentName: 'Track 001' }),
    }))
  })

  test('a Sample referenced only by a Song Instance with no matching Preset is used', () => {
    const presetNames = new Set([...fileStore.sounds, ...fileStore.kits].map(p => p.data.presetName))
    const songOnly = fileStore.samples.find(s =>
      s.usage.length > 0 && s.usage.every(r => r.owner.fileType === 'song' && r.owner.instrumentName && !presetNames.has(r.owner.instrumentName)))
    expect(songOnly).toBeDefined()
  })

  test('a Sample referenced only by a Preset that is Not in any song is used', () => {
    const presetsNotInSongs = new Set([...fileStore.sounds, ...fileStore.kits].filter(p => !isPresetInAnySong(p)).map(p => p.path))
    const presetOnly = fileStore.samples.find(s => s.usage.length > 0 && s.usage.every(r => presetsNotInSongs.has(r.owner.filePath)))
    expect(presetOnly).toBeDefined()
  })

  test('Incomplete usage lists only unreadable XML files in Asset folders', () => {
    expect(fileStore.incompleteUsage.map(f => `${f.path}: ${f.reason.split(':')[0]}`)).toEqual([
      '/KITS/KIT041.XML: Malformed file',
      '/SONGS/Edge unsupported firmware.XML: Firmware version 9.0.0 is not supported for songs.',
      '/SYNTHS/Edge malformed.XML: Malformed file',
    ])
  })
})

describe('in-memory card', () => {
  test('files outside Asset folders count toward Usage and are marked; they never cause Incomplete usage', async () => {
    const synth = fixture('SYNTHS/Synth 003.XML')
    const samplePath = synth.match(/fileName="(SAMPLES\/[^"]+)"/)![1]
    await parseFolderIntoFileStore(memoryCard({
      'BACKUP/Synth 003.XML': synth,
      'broken.XML': '<sound firmwareVersion="3.1.5"><osc1',
      'unknown.XML': '<thing firmwareVersion="3.1.5"/>',
      'SAMPLES/notes.XML': '<thing firmwareVersion="3.1.5"/>',
      'SONGS/README.txt': 'hello',
      'MIDIFOLLOW.XML': '<nope',
      [samplePath]: 'RIFF',
    }))
    const backup = fileStore.sounds.find(s => s.path === '/BACKUP/Synth 003.XML')!
    expect(backup.outsideAssetFolders).toBe(true)
    expect(sampleByPath(samplePath).usage).toContainEqual(expect.objectContaining({ owner: expect.objectContaining({ filePath: backup.path }) }))
    expect(fileStore.incompleteUsage).toEqual([])
  })

  test('paths match ignoring case', async () => {
    const synth = fixture('SYNTHS/Synth 003.XML')
    const samplePath = synth.match(/fileName="(SAMPLES\/[^"]+)"/)![1]
    await parseFolderIntoFileStore(memoryCard({ 'SYNTHS/Synth 003.XML': synth, [samplePath.toLowerCase()]: 'RIFF' }))
    expect(fileStore.sounds[0].outsideAssetFolders).toBe(false)
    expect(fileStore.samples[0].usage.length).toBeGreaterThan(0)
    expect(fileStore.missingSamples.map(m => samplePathKey(m.path))).not.toContain(samplePathKey(samplePath))
  })
})

describe('findLikeliestMatchForMisplacedSample', () => {
  const sample = (path: string) => ({ path, name: path.split('/').pop()! }) as SampleFile

  test('finds the same file name in the most similar folder, ignoring case', () => {
    const samples = [sample('/SAMPLES/Other/kick.wav'), sample('/SAMPLES/Drums/Kick.WAV'), sample('/SAMPLES/Drums/snare.wav')]
    expect(findLikeliestMatchForMisplacedSample('SAMPLES/Drumz/kick.wav', samples)?.path).toBe('/SAMPLES/Drums/Kick.WAV')
  })

  test('finds a match even in a completely different folder', () => {
    expect(findLikeliestMatchForMisplacedSample('A/kick.wav', [sample('/XYZ/kick.wav')])?.path).toBe('/XYZ/kick.wav')
  })

  test('returns null when no sample has the same file name', () => {
    expect(findLikeliestMatchForMisplacedSample('SAMPLES/kick.wav', [sample('/SAMPLES/snare.wav')])).toBeNull()
  })
})
