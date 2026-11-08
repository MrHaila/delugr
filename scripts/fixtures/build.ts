/**
 * Builds the anonymized test fixture card from a private Deluge SD card snapshot.
 *
 *   bun run fixtures:build
 *
 * See scripts/fixtures/README.md for what it does and why.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { Window } from 'happy-dom'
import { config } from './config'
import { collectFeatures, fieldKey, rewriteXml, type FieldContext } from './xml'
import { readWavInfo, synthesizeWav, type WavInfo } from './wav'

// The app's parsers need a DOMParser at import time, so install one before importing them.
globalThis.DOMParser = new Window().DOMParser as unknown as typeof DOMParser
const { parseAssetFile } = await import('../../src/deluge/fileParsing')
const { FixPos50 } = await import('../../src/deluge/dataTypes')

const repoRoot = resolve(import.meta.dir, '../..')
const sourceRoot = resolve(repoRoot, config.source)
const outRoot = resolve(repoRoot, config.out)
const ASSET_DIRS = ['SONGS', 'SYNTHS', 'KITS'] as const

// Field classification ------------------------------------------------------------------------------------------------

/** Free-text name fields -> pseudonym prefix. */
const NAME_FIELDS: Record<string, string> = {
  'sound.presetName': 'Preset',
  'kit.presetName': 'Preset',
  'instrumentClip.instrumentPresetName': 'Preset',
  'sound.name': 'Drum',
  'audioTrack.name': 'Track',
  'audioClip.trackName': 'Track',
}
/** Sample file references. */
const PATH_FIELDS = new Set(['osc1.fileName', 'osc2.fileName', 'sampleRange.fileName', 'audioClip.filePath'])
/** Positions inside a sample file; rescaled to the generated sample length. */
const SAMPLE_POSITION_FIELDS = new Set([
  'zone.startSamplePos', 'zone.endSamplePos', 'zone.startLoopPos', 'zone.endLoopPos',
  'zone.startMilliseconds', 'zone.endMilliseconds',
  'audioClip.startSamplePos', 'audioClip.endSamplePos',
])
/** Deluge uses this as "until the end of the sample". */
const SAMPLE_POSITION_SENTINEL = '9999999'
/** Hex blobs that are structure (arrangement), not sound design. */
const KEPT_HEX_FIELDS = new Set(['kit.clipInstances', 'sound.clipInstances'])
/** Fields with many distinct values that are still enums, not free text. */
const ENUM_FIELDS_WITH_MANY_VALUES = new Set(['modKnob.controlsParam', 'patchCable.destination', 'song.preview'])
/** Coverage features beyond element/attribute paths. */
const VALUE_FEATURE_FIELDS = new Set(['osc1.type', 'osc2.type', 'sound.mode'])

const isSlotName = (name: string) => /^\d{3}$/.test(name) || /^(SYNT|KIT|SONG)\d{3}( \d+)?$/i.test(name)
const isHex = (v: string) => /^0x[0-9A-F]+$/i.test(v)
const isInt = (v: string) => /^-?\d+$/.test(v)

// Helpers -------------------------------------------------------------------------------------------------------------

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

type Rng = () => number
function createRng(label: string): Rng {
  let a = hash(`${config.seed}:${label}`)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const hex8 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(8, '0')
const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')
const toInt32 = (hex: string) => parseInt(hex, 16) | 0
const pad = (n: number, width: number) => String(n).padStart(width, '0')

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter(f => !f.split('/').some(part => part.startsWith('.')))
    .filter(f => statSync(join(dir, f)).isFile())
    .sort()
}

function firmwareFamily(xml: string) {
  const m = xml.match(/<firmwareVersion>([^<]*)<\/firmwareVersion>/) ?? xml.match(/firmwareVersion="([^"]*)"/)
  if (!m) return '1'
  if (m[1].startsWith('c')) return m[1].split('.')[0]
  return m[1].split('.').slice(0, 2).join('.')
}

// Load the source corpus ----------------------------------------------------------------------------------------------

if (!existsSync(sourceRoot)) {
  console.error(`Source snapshot not found at ${sourceRoot}. Copy your Deluge card there first (it is gitignored).`)
  process.exit(1)
}

type SourceFile = { rel: string, dir: typeof ASSET_DIRS[number], xml: string, size: number, family: string }
const corpus: SourceFile[] = []
for (const dir of ASSET_DIRS) {
  for (const f of listFiles(join(sourceRoot, dir))) {
    if (!/\.xml$/i.test(f)) continue
    const xml = readFileSync(join(sourceRoot, dir, f), 'utf8')
    corpus.push({ rel: `${dir}/${f}`, dir, xml, size: xml.length, family: firmwareFamily(xml) })
  }
}

/** Lowercase source-relative sample path -> absolute path. Deluge paths are case-insensitive. */
const sourceSamples = new Map<string, string>()
for (const f of listFiles(join(sourceRoot, 'SAMPLES'))) {
  if (/\.(wav|aiff?)$/i.test(f)) sourceSamples.set(`samples/${f}`.toLowerCase(), join(sourceRoot, 'SAMPLES', f))
}

// Learn value bounds and guard against unknown free-text fields -------------------------------------------------------

const hexBounds = new Map<string, { min: number, max: number }>()
const intBounds = new Map<string, { min: number, max: number }>()
const stringValues = new Map<string, Set<string>>()
const randomizedInts = new Set(config.randomizedIntFields)

function widen(map: Map<string, { min: number, max: number }>, key: string, value: number) {
  const b = map.get(key)
  if (!b) map.set(key, { min: value, max: value })
  else {
    b.min = Math.min(b.min, value)
    b.max = Math.max(b.max, value)
  }
}

for (const file of corpus) {
  rewriteXml(file.xml, (ctx, value) => {
    const key = fieldKey(ctx)
    if (isHex(value) && !KEPT_HEX_FIELDS.has(key) && !key.startsWith('noteRow.')) {
      const body = value.slice(2)
      if (body.length === 8 || (body.length - 8) % 16 === 0) {
        widen(hexBounds, key, toInt32(body.slice(0, 8)))
        for (let i = 8; i < body.length; i += 16) widen(hexBounds, key, toInt32(body.slice(i, i + 8)))
      }
    } else if (isInt(value) && randomizedInts.has(key)) {
      widen(intBounds, key, Number(value))
    } else if (!isInt(value) && !isHex(value)) {
      if (!stringValues.has(key)) stringValues.set(key, new Set())
      stringValues.get(key)!.add(value)
    }
    return value
  })
}

const freeTextSuspects = [...stringValues]
  .filter(([key, values]) => values.size > 10 && !NAME_FIELDS[key] && !PATH_FIELDS.has(key) && !ENUM_FIELDS_WITH_MANY_VALUES.has(key))
  .map(([key, values]) => `${key} (${values.size} distinct values)`)
if (freeTextSuspects.length > 0) {
  console.error('Fields that look like free text but are not anonymized. Classify them in build.ts before continuing:')
  for (const s of freeTextSuspects) console.error(`  ${s}`)
  process.exit(1)
}

// Select a small set of files that covers every element/attribute seen per (type, firmware) group ----------------------

function features(file: SourceFile) {
  const result = collectFeatures(file.xml)
  rewriteXml(file.xml, (ctx, value) => {
    if (VALUE_FEATURE_FIELDS.has(fieldKey(ctx))) result.add(`value:${fieldKey(ctx)}=${value}`)
    return value
  })
  return result
}

const groups = new Map<string, SourceFile[]>()
for (const file of corpus) {
  if (config.exclude.includes(file.rel)) continue
  const g = `${file.dir}:${file.family}`
  if (!groups.has(g)) groups.set(g, [])
  groups.get(g)!.push(file)
}

const uncoveredCounts = new Map<string, number>()
const selected = new Set<SourceFile>(corpus.filter(f => config.include.includes(f.rel)))
for (const [, files] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const featureSets = new Map(files.map(f => [f, features(f)]))
  const uncovered = new Set([...featureSets.values()].flatMap(s => [...s]))
  for (const f of files) if (selected.has(f)) for (const feat of featureSets.get(f)!) uncovered.delete(feat)

  let picked = 0
  while (uncovered.size > 0 && picked < config.maxFilesPerGroup) {
    // Score = newly covered features per sqrt(size): favors coverage, but prefers smaller files when close.
    let best: SourceFile | null = null
    let bestScore = 0
    for (const f of files) {
      if (selected.has(f)) continue
      let gain = 0
      for (const feat of featureSets.get(f)!) if (uncovered.has(feat)) gain++
      const score = gain / Math.sqrt(f.size)
      if (score > bestScore) {
        best = f
        bestScore = score
      }
    }
    if (!best) break
    selected.add(best)
    picked++
    for (const feat of featureSets.get(best)!) uncovered.delete(feat)
  }
  uncoveredCounts.set(`${files[0].dir}:${files[0].family}`, uncovered.size)
}
const selectedFiles = [...selected].sort((a, b) => a.rel.localeCompare(b.rel))

// Anonymization -------------------------------------------------------------------------------------------------------

const names = new Map<string, string>()
const nameCounters = new Map<string, number>()
function mapName(original: string, prefix: string) {
  if (original === '' || isSlotName(original)) return original
  const key = original.toLowerCase()
  if (!names.has(key)) {
    const n = (nameCounters.get(prefix) ?? 0) + 1
    nameCounters.set(prefix, n)
    names.set(key, `${prefix} ${pad(n, 3)}`)
  }
  return names.get(key)!
}

const folders = new Map<string, string>()
const sampleFiles = new Map<string, string>()
/** Lowercase original sample reference (no leading slash) -> anonymized path. */
const sampleRefs = new Map<string, string>()
const originalPathParts = new Set<string>()

function mapSamplePath(original: string) {
  if (original === '') return original
  const lead = original.startsWith('/') ? '/' : ''
  const parts = original.slice(lead.length).split('/')
  const mapped = parts.map((part, i) => {
    const prefixKey = parts.slice(0, i + 1).join('/').toLowerCase()
    if (i === 0 && part.toUpperCase() === 'SAMPLES') return part
    originalPathParts.add(part.replace(/\.[^.]+$/, ''))
    if (i < parts.length - 1) {
      if (!folders.has(prefixKey)) folders.set(prefixKey, `D${pad(folders.size + 1, 3)}`)
      return folders.get(prefixKey)!
    }
    if (!sampleFiles.has(prefixKey)) sampleFiles.set(prefixKey, `S${pad(sampleFiles.size + 1, 4)}`)
    const ext = part.includes('.') ? part.slice(part.lastIndexOf('.')) : ''
    return sampleFiles.get(prefixKey)! + ext
  }).join('/')
  sampleRefs.set(original.slice(lead.length).toLowerCase(), mapped)
  return lead + mapped
}

const wavInfoCache = new Map<string, WavInfo | null>()
function sourceWavInfo(ref: string) {
  const abs = sourceSamples.get(ref.replace(/^\//, '').toLowerCase())
  if (!abs) return null
  if (!wavInfoCache.has(abs)) wavInfoCache.set(abs, /\.wav$/i.test(abs) ? readWavInfo(abs) : null)
  return wavInfoCache.get(abs)!
}

/** Used when the referenced sample is missing from the source card: keeps relative order of positions. */
const UNKNOWN_SAMPLE_FRAMES = 10_000_000

function rescalePosition(value: string, sourceFrames: number | null) {
  if (value === SAMPLE_POSITION_SENTINEL || !isInt(value)) return value
  const scaled = Math.round(Number(value) * config.sampleFrames / (sourceFrames ?? UNKNOWN_SAMPLE_FRAMES))
  return String(Math.max(0, Math.min(config.sampleFrames, scaled)))
}

/** Randomize a 32-bit param, or an automated param (base value + [value, position] nodes), keeping positions. */
function randomizeHexParam(value: string, key: string, rng: Rng) {
  const b = hexBounds.get(key)
  const body = value.slice(2)
  if (!b || (body.length !== 8 && (body.length - 8) % 16 !== 0)) return value
  let out = hex8(randInt(rng, b.min, b.max))
  const end = Math.min(body.length, 8 + 16 * config.maxAutomationNodes)
  for (let i = 8; i < end; i += 16) out += hex8(randInt(rng, b.min, b.max)) + body.slice(i + 8, i + 16)
  return value.slice(0, 2) + out
}

/**
 * Notes are fixed-size records: position(4) length(4) velocity(1) [lift(1)] probability(1).
 * Replace positions/lengths/velocities with random non-overlapping notes inside the clip, keep the rest.
 */
function scrambleNotes(value: string, recordHexLength: number, clipLength: number, rng: Rng) {
  const body = value.slice(2)
  if (!Number.isInteger(body.length / recordHexLength)) return value
  const count = Math.min(body.length / recordHexLength, config.maxNotesPerRow)
  if (!Number.isFinite(clipLength) || clipLength < count) return value
  const positions = new Set<number>()
  while (positions.size < count) positions.add(randInt(rng, 0, clipLength - 1))
  const sorted = [...positions].sort((a, b) => a - b)
  let out = ''
  for (let i = 0; i < count; i++) {
    const record = body.slice(i * recordHexLength, (i + 1) * recordHexLength)
    const maxLength = (sorted[i + 1] ?? clipLength) - sorted[i]
    out += hex8(sorted[i]) + hex8(randInt(rng, 1, maxLength)) + hex2(randInt(rng, 1, 127)) + record.slice(18)
  }
  return value.slice(0, 2) + out
}

function anonymizeXml(file: SourceFile) {
  const rng = createRng(file.rel)
  let clipLength = NaN
  let currentSampleFrames: number | null = null

  return rewriteXml(file.xml, (ctx: FieldContext, value) => {
    const key = fieldKey(ctx)
    if (value === '' || ctx.field === 'firmwareVersion' || ctx.field === 'earliestCompatibleFirmware') return value

    if (NAME_FIELDS[key]) return mapName(value, NAME_FIELDS[key])
    if (PATH_FIELDS.has(key)) {
      currentSampleFrames = sourceWavInfo(value)?.frames ?? null
      return mapSamplePath(value)
    }
    if (SAMPLE_POSITION_FIELDS.has(key)) {
      const frames = ctx.attrs.filePath !== undefined ? sourceWavInfo(ctx.attrs.filePath)?.frames ?? null : currentSampleFrames
      return rescalePosition(value, frames)
    }
    if (key === 'instrumentClip.length') {
      clipLength = Number(value)
      return value
    }
    if (key === 'noteRow.noteData' || key === 'noteRow.noteDataWithLift') {
      const rowLength = ctx.attrs.length !== undefined ? Number(ctx.attrs.length) : clipLength
      return scrambleNotes(value, key === 'noteRow.noteData' ? 20 : 22, rowLength, rng)
    }
    if (key === 'song.preview') return value.replace(/[0-9A-F]/gi, () => randInt(rng, 0, 15).toString(16).toUpperCase())
    if (isHex(value) && !KEPT_HEX_FIELDS.has(key)) return randomizeHexParam(value, key, rng)
    if (isInt(value) && intBounds.has(key)) {
      const b = intBounds.get(key)!
      return String(randInt(rng, b.min, b.max))
    }
    return value
  })
}

// Register file-name pseudonyms first so they get readable, type-specific prefixes.
const FILE_PREFIX = { SONGS: 'Song', SYNTHS: 'Synth', KITS: 'Kit' } as const
const outputs: { source?: SourceFile, rel: string, content: string | Buffer }[] = []
for (const file of selectedFiles) {
  const base = file.rel.slice(file.rel.lastIndexOf('/') + 1)
  const stem = base.replace(/\.[^.]+$/, '')
  const ext = base.slice(stem.length)
  outputs.push({ source: file, rel: `${file.dir}/${mapName(stem, FILE_PREFIX[file.dir])}${ext}`, content: '' })
}
for (const out of outputs) out.content = anonymizeXml(out.source!)

// Deliberate edge cases (derived from anonymized output, so nothing original leaks) -----------------------------------

const sampleSynth = outputs.find(o => o.source!.dir === 'SYNTHS' && /fileName="SAMPLES\//.test(o.content as string))
if (sampleSynth) {
  outputs.push({
    rel: 'SYNTHS/Edge missing sample.XML',
    content: (sampleSynth.content as string)
      .replace(/fileName="[^"]+"/g, 'fileName="SAMPLES/MISSING/S9999.wav"')
      .replace(/presetName="[^"]*"/g, 'presetName="Edge missing sample"'),
  })
}
const anySynth = outputs.find(o => o.source?.dir === 'SYNTHS' && o.source.family.startsWith('3'))
if (anySynth) {
  const xml = anySynth.content as string
  outputs.push({ rel: 'SYNTHS/Edge malformed.XML', content: xml.slice(0, Math.floor(xml.length / 2)) })
}
outputs.push({
  rel: 'SONGS/Edge unsupported firmware.XML',
  content: '<?xml version="1.0" encoding="UTF-8"?>\n<song firmwareVersion="9.0.0" earliestCompatibleFirmware="9.0.0">\n</song>\n',
})

// Samples: every referenced sample that exists on the source card, plus a few unused ones -----------------------------

const sampleRng = createRng('samples')
const unusedCandidates = [...sourceSamples.keys()].filter(k => !sampleRefs.has(k) && /\.wav$/i.test(k))
for (let i = 0; i < config.unusedSamples && unusedCandidates.length > 0; i++) {
  const [pick] = unusedCandidates.splice(randInt(sampleRng, 0, unusedCandidates.length - 1), 1)
  mapSamplePath(sourceSamples.get(pick)!.slice(sourceRoot.length + 1))
}

let skippedSamples = 0
for (const [ref, mapped] of [...sampleRefs].sort(([, a], [, b]) => a.localeCompare(b))) {
  if (!sourceSamples.has(ref)) continue // missing on the source card too: stays missing
  const info = sourceWavInfo(ref)
  if (!info) {
    skippedSamples++
    continue
  }
  outputs.push({ rel: mapped, content: synthesizeWav(info, config.sampleFrames, randInt(sampleRng, 110, 880)) })
}

// Verify: anonymized files must parse to the same shape as the originals ----------------------------------------------

/** Objects keyed by user-given names (anonymized), compared by value order instead of key. */
const NAME_KEYED_OBJECTS = new Set(['soundSources'])

function shape(value: unknown, key = ''): unknown {
  if (NAME_KEYED_OBJECTS.has(key) && value && typeof value === 'object') return Object.values(value).map(v => shape(v))
  if (value === null || value === undefined) return String(value)
  if (Array.isArray(value)) return value.map(v => shape(v))
  if (value instanceof FixPos50) return 'FixPos50'
  if (typeof value === 'boolean') return value
  if (typeof value === 'function') return 'function'
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const k of Object.keys(value).sort()) {
      if (k !== 'fileHandle' && k !== 'xml') result[k] = shape((value as Record<string, unknown>)[k], k)
    }
    return result
  }
  return typeof value
}

async function parsedShape(xml: string, name: string): Promise<unknown> {
  const handle = { name, getFile: async () => ({ lastModified: 0, text: async () => xml }) } as unknown as FileSystemFileHandle
  try {
    const result = await parseAssetFile(handle, name)
    return shape(typeof result === 'string' ? `unsupported: ${result}` : result)
  } catch (e) {
    return `error: ${(e as Error).message.slice(0, 80)}`
  }
}

/** Path and values of the first difference between two shapes, or null if equal. */
function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return a === b ? null : `${path || '/'}: ${JSON.stringify(a)?.slice(0, 60)} -> ${JSON.stringify(b)?.slice(0, 60)}`
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}/${k}`)
    if (d) return d
  }
  return null
}

const log = console.log
console.log = () => {} // parsers are chatty
const shapeMismatches: string[] = []
for (const out of outputs) {
  if (!out.source) continue
  const diff = firstDifference(await parsedShape(out.source.xml, 'x.XML'), await parsedShape(out.content as string, 'x.XML'))
  if (diff) shapeMismatches.push(`${out.rel} (from ${out.source.rel}): ${diff}`)
}
console.log = log
if (shapeMismatches.length > 0) {
  console.error('Anonymized files parse differently from their originals:')
  for (const m of shapeMismatches) console.error(`  ${m}`)
  process.exit(1)
}

// Verify: no original names or sample path parts survive in names, paths or output file names -------------------------

const denylist = [...names.keys(), ...[...originalPathParts].map(p => p.toLowerCase())].filter(d => d.length >= 4)
const leaks: string[] = []
for (const out of outputs) {
  const checked = [out.rel]
  // Edge files are derived from already-checked output; the malformed one cannot be tokenized.
  if (typeof out.content === 'string' && out.source) {
    rewriteXml(out.content, (ctx, value) => {
      const key = fieldKey(ctx)
      if (NAME_FIELDS[key] || PATH_FIELDS.has(key)) checked.push(value)
      return value
    })
  }
  for (const text of checked) {
    const hit = denylist.find(d => text.toLowerCase().includes(d))
    if (hit) leaks.push(`${out.rel}: "${text}"`)
  }
}
if (leaks.length > 0) {
  console.error('Original names leaked into the output:')
  for (const l of leaks) console.error(`  ${l}`)
  process.exit(1)
}

// Write ---------------------------------------------------------------------------------------------------------------

if (!outRoot.startsWith(join(repoRoot, 'test') + '/')) throw new Error(`Refusing to wipe ${outRoot}: not under test/`)
rmSync(outRoot, { recursive: true, force: true })
for (const out of outputs) {
  const abs = join(outRoot, out.rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, out.content)
}

// Summary -------------------------------------------------------------------------------------------------------------

const xmlOut = outputs.filter(o => typeof o.content === 'string')
const wavOut = outputs.filter(o => typeof o.content !== 'string')
const kb = (items: typeof outputs) => Math.round(items.reduce((s, o) => s + o.content.length, 0) / 1024)
console.log(`Source: ${corpus.length} XML files, ${sourceSamples.size} samples`)
const perGroup = new Map<string, number>()
for (const f of selectedFiles) perGroup.set(`${f.dir}:${f.family}`, (perGroup.get(`${f.dir}:${f.family}`) ?? 0) + 1)
for (const [g, files] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const uncovered = uncoveredCounts.get(g) ?? 0
  console.log(`  ${g.padEnd(14)} ${perGroup.get(g) ?? 0}/${files.length} selected${uncovered ? `, ${uncovered} element/attribute paths not covered` : ''}`)
}
console.log(`Wrote ${relative(repoRoot, outRoot)}: ${xmlOut.length} XML (${kb(xmlOut)} KB), ${wavOut.length} WAV (${kb(wavOut)} KB)`)
if (skippedSamples > 0) console.log(`Skipped ${skippedSamples} referenced samples that are not readable WAV files`)
