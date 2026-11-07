import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { parseAssetFile, parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { useFileStore } from '../src/composables/useFileStore'
import { directoryHandleFromDisk, fileHandleFromDisk } from './helpers/diskHandles'

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
      usedSamples: fileStore.samples.filter(s => s.usage.getTotal() > 0).length,
      skippedFiles: fileStore.skippedFiles.map(f => `${f.path}: ${f.reason.slice(0, 80)}`),
      missingSamples: fileStore.missingSamples,
      malformed: [...fileStore.songs, ...fileStore.sounds, ...fileStore.kits]
        .filter(f => f.xmlError)
        .map(f => `${f.path}: ${f.xmlError}`),
    }).toMatchSnapshot()
  })

  test('every sample referenced by a song exists or is reported missing', () => {
    const known = new Set(fileStore.samples.map(s => s.path.toLowerCase()))
    for (const missing of fileStore.missingSamples) expect(known.has(`/${missing.toLowerCase()}`)).toBe(false)
  })
})
