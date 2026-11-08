import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { useFileStore } from '../src/composables/useFileStore'
import { planSampleRename, renameSample, replaceSamplePath } from '../src/deluge/files'
import { memoryCard } from './helpers/diskHandles'

const cardRoot = resolve(__dirname, 'fixtures/card')
const fixture = (rel: string) => readFileSync(join(cardRoot, rel), 'utf8')
const { fileStore } = useFileStore()

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}) // parsers are chatty
})

describe('replaceSamplePath', () => {
  test('replaces every occurrence and keeps everything else', () => {
    const text = '<a fileName="SAMPLES/x.wav" />\n<fileName>SAMPLES/x.wav</fileName>\n<b fileName="SAMPLES/y.wav" />'
    expect(replaceSamplePath(text, '/SAMPLES/x.wav', '/SAMPLES/z.wav'))
      .toBe('<a fileName="SAMPLES/z.wav" />\n<fileName>SAMPLES/z.wav</fileName>\n<b fileName="SAMPLES/y.wav" />')
  })

  test('escapes regex characters in the path', () => {
    const text = '<a fileName="SAMPLES/A (1)+[x].wav" /><b fileName="SAMPLES/A 1x.wav" />'
    expect(replaceSamplePath(text, '/SAMPLES/A (1)+[x].wav', '/SAMPLES/B.wav'))
      .toBe('<a fileName="SAMPLES/B.wav" /><b fileName="SAMPLES/A 1x.wav" />')
    // '.' must not match any character
    expect(replaceSamplePath('<a fileName="SAMPLES/xxwav" />', 'SAMPLES/x.wav', 'SAMPLES/z.wav')).toBe('<a fileName="SAMPLES/xxwav" />')
  })

  test('matches references that differ only in case', () => {
    expect(replaceSamplePath('<a fileName="samples/X.WAV" />', '/SAMPLES/x.wav', '/SAMPLES/z.wav')).toBe('<a fileName="SAMPLES/z.wav" />')
  })

  test('matches whole paths only', () => {
    const text = '<a fileName="OLD/SAMPLES/x.wav" /><b fileName="SAMPLES/x.wav.bak" />'
    expect(replaceSamplePath(text, '/SAMPLES/x.wav', '/SAMPLES/z.wav')).toBe(text)
  })

  test('keeps a leading slash written in the file', () => {
    expect(replaceSamplePath('<a fileName="/SAMPLES/x.wav" />', 'SAMPLES/x.wav', 'SAMPLES/z.wav')).toBe('<a fileName="/SAMPLES/z.wav" />')
  })
})

describe('renameSample on an in-memory card', () => {
  const sample2x = fixture('SYNTHS/SYNT168.XML')
  const path2x = sample2x.match(/<fileName>(SAMPLES\/[^<]+)<\/fileName>/)?.[1] ?? sample2x.match(/fileName="(SAMPLES\/[^"]+)"/)![1]
  const oldPath = path2x
  const malformed = `<?xml version="1.0" encoding="UTF-8"?>\n<sound firmwareVersion="3.1.5"><osc1 fileName="${oldPath.toLowerCase()}" /><broken`
  const unrelated = fixture('SYNTHS/Synth 001.XML')
  const unsupported = `<?xml version="1.0" encoding="UTF-8"?>\n<song firmwareVersion="9.0.0"><audioClip filePath="${oldPath}" /></song>`

  let card: ReturnType<typeof memoryCard>
  beforeAll(async () => {
    card = memoryCard({
      'SYNTHS/SYNT168.XML': sample2x,
      'SYNTHS/Malformed.XML': malformed,
      'SYNTHS/Synth 001.XML': unrelated,
      'SONGS/Future.XML': unsupported,
      [oldPath]: 'RIFF-old',
    })
    await parseFolderIntoFileStore(card)
  })

  test('plans every file containing the path, ignoring case, including Malformed and skipped files', async () => {
    const sample = fileStore.samples.find(s => s.path.toLowerCase() === `/${oldPath}`.toLowerCase())!
    const plan = await planSampleRename(sample, 'renamed.wav')
    expect(plan.map(p => p.path).sort()).toEqual(['/SONGS/Future.XML', '/SYNTHS/Malformed.XML', '/SYNTHS/SYNT168.XML'])

    const written = () => [...card.files()].filter(([, f]) => f.writes > 0).map(([p]) => p)
    expect(written()).toEqual([])

    await renameSample(card, sample, 'renamed.wav', plan)

    const newPath = oldPath.slice(0, oldPath.lastIndexOf('/') + 1) + 'renamed.wav'
    const files = card.files()
    // The dialog's file list matches what was written (plus the new sample file itself).
    expect(written().sort()).toEqual([newPath, 'SONGS/Future.XML', 'SYNTHS/Malformed.XML', 'SYNTHS/SYNT168.XML'].sort())
    expect(files.has(oldPath)).toBe(false)
    expect(files.get(newPath)!.text()).toBe('RIFF-old')

    const synth = files.get('SYNTHS/SYNT168.XML')!.text()
    expect(synth).toContain('<firmwareVersion>2.1.0</firmwareVersion>')
    expect(synth).toBe(sample2x.split(oldPath).join(newPath))
    expect(files.get('SYNTHS/Malformed.XML')!.text()).toBe(malformed.replace(oldPath.toLowerCase(), newPath))
    expect(files.get('SYNTHS/Synth 001.XML')!.text()).toBe(unrelated)
  })

  test('refuses names that would clash or only change case', async () => {
    await parseFolderIntoFileStore(memoryCard({ 'SAMPLES/a.wav': 'A', 'SAMPLES/b.wav': 'B' }))
    const a = fileStore.samples.find(s => s.name === 'a.wav')!
    await expect(planSampleRename(a, 'b.wav')).rejects.toThrow(/exists/)
    await expect(planSampleRename(a, 'A.wav')).rejects.toThrow(/case/)
    await expect(planSampleRename(a, 'x/y.wav')).rejects.toThrow(/name/)
  })
})
