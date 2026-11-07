import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { parseAssetFile, parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { useFileStore } from '../src/composables/useFileStore'
import { directoryHandleFromDisk, fileHandleFromDisk, memoryFileHandle } from './helpers/diskHandles'
import { remapSampleInParsedAssetFile } from '../src/deluge/files'
import { isPresetInAnySong } from '../src/deluge/usage'

const cardRoot = resolve(__dirname, 'fixtures/card')
const assetFiles = ['SONGS', 'SYNTHS', 'KITS'].flatMap(dir =>
  readdirSync(join(cardRoot, dir)).sort().map(name => `${dir}/${name}`))
const regularFiles = assetFiles.filter(f => !f.includes('/Edge '))

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}) // parsers are chatty
})

describe('fixture card: individual files', () => {
  test.each(regularFiles)('%s parses', async (rel) => {
    const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, rel)), `/${rel}`)
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return
    // Full parsed data, minus non-serializable handles and the raw XML (that's the fixture itself).
    const { fileHandle, xml, ...rest } = result
    await expect(JSON.stringify(rest, null, 2)).toMatchFileSnapshot(`__snapshots__/parsed/${rel}.json`)
  })

  test('malformed XML keeps partial data and records the error', async () => {
    const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, 'SYNTHS/Edge malformed.XML')), '/x')
    if (typeof result === 'string') throw new Error(`Expected parsed file, got: ${result}`)
    expect(result.type).toBe('sound')
    expect(result.xmlError).toMatch(/^error on line \d+ at column \d+:/)
  })

  test('well-formed XML has no error', async () => {
    const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, 'SYNTHS/SYNT001.XML')), '/x')
    if (typeof result === 'string') throw new Error(`Expected parsed file, got: ${result}`)
    expect(result.xmlError).toBeNull()
  })

  test.each(['SYNTHS/SYNT042.XML', 'SYNTHS/SYNT001.XML', 'KITS/KIT022.XML', 'SONGS/Song 001.XML', 'SYNTHS/Synth 002.XML'])(
    '%s keeps the original file text', async (rel) => {
      const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, rel)), `/${rel}`)
      if (typeof result === 'string') throw new Error(result)
      expect(result.xml).toBe(readFileSync(join(cardRoot, rel), 'utf8'))
    })

  test('rewriting a 2.x file keeps its firmware version', async () => {
    const text = readFileSync(join(cardRoot, 'SYNTHS/SYNT168.XML'), 'utf8')
    const handle = memoryFileHandle('SYNT168.XML', text)
    const result = await parseAssetFile(handle, '/SYNTHS/SYNT168.XML')
    if (typeof result === 'string') throw new Error(result)
    const oldPath = text.match(/SAMPLES\/[^"<]+/)![0]
    await remapSampleInParsedAssetFile(result, oldPath, 'SAMPLES/NEW/renamed.wav')
    expect(handle.writes).toBe(1)
    expect(handle.text()).toContain('<firmwareVersion>2.1.0</firmwareVersion>')
    expect(handle.text()).toContain('SAMPLES/NEW/renamed.wav')
  })

  test('songs list their Recordings', async () => {
    const parse = async (rel: string) => {
      const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, rel)), `/${rel}`)
      if (typeof result === 'string' || result.type !== 'song') throw new Error(`Expected song: ${rel}`)
      return result.data.recordings
    }
    expect(await parse('SONGS/Song 004.XML')).toContainEqual(expect.objectContaining({ filePath: 'SAMPLES/D038/S0297.WAV' }))
    // An armed clip with nothing recorded is kept, but its path is absent.
    expect(await parse('SONGS/Song 002.XML')).toContainEqual(expect.objectContaining({ filePath: null }))
    // No community firmware song fixture exists yet, so parseSongvCommunity's Recordings are untested.
  })

  test('unsupported firmware is reported, not thrown', async () => {
    const result = await parseAssetFile(fileHandleFromDisk(join(cardRoot, 'SONGS/Edge unsupported firmware.XML')), '/x')
    expect(result).toBe('Firmware version 9.0.0 is not supported for songs.')
  })
})

describe('fixture card: whole folder scan', () => {
  const { fileStore } = useFileStore()

  beforeAll(async () => {
    await parseFolderIntoFileStore(directoryHandleFromDisk(cardRoot))
  })

  test('store summary', () => {
    expect(fileStore.isParsed).toBe(true)
    expect({
      songs: fileStore.songs.map(s => `${s.name} (${s.firmware})`),
      sounds: fileStore.sounds.map(s => `${s.name} (${s.firmware})`),
      kits: fileStore.kits.map(k => `${k.name} (${k.firmware})`),
      samples: fileStore.samples.length,
      usedSamples: fileStore.samples.filter(s => s.usage.length > 0).length,
      skippedFiles: fileStore.skippedFiles.map(f => `${f.path}: ${f.reason.slice(0, 80)}`),
      missingSamples: fileStore.missingSamples.map(m => `${m.path} ← ${m.references.map(r => `${r.owner.filePath} (${r.location})`).join(', ')}`),
      incompleteUsage: fileStore.incompleteUsage.map(f => f.path),
      presetsInSongs: [...fileStore.sounds, ...fileStore.kits].filter(isPresetInAnySong).map(p => p.path),
      malformed: [...fileStore.songs, ...fileStore.sounds, ...fileStore.kits]
        .filter(f => f.xmlError)
        .map(f => `${f.path}: ${f.xmlError}`),
    }).toMatchSnapshot()
  })

  test('missing samples match no sample on the card', () => {
    const known = new Set(fileStore.samples.map(s => s.path.toLowerCase()))
    for (const missing of fileStore.missingSamples) expect(known.has(`/${missing.path.toLowerCase()}`)).toBe(false)
  })
})
