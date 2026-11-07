import type {
  IncompleteUsageFile,
  MissingSample,
  SkippedFile,
  ParsedAssetFile,
  ParsedKitFile,
  ParsedSongFile,
  ParsedSoundFile,
  SampleFile,
  SampleLocation,
  SampleReference,
  InstrumentOwner,
} from '../composables/useFileStore'
import type { Kit, Sound } from './core'

/**
 * Asset folders: where the Deluge keeps Songs and Presets. Matched case-insensitively at the card root.
 */
const ASSET_FOLDERS = ['songs', 'synths', 'kits']

/**
 * Whether a card path (e.g. `/SONGS/sub/Song.XML`) is inside an Asset folder, subfolders included.
 */
export function isInAssetFolder(path: string): boolean {
  const parts = path.replace(/^\//, '').split('/')
  return parts.length > 1 && ASSET_FOLDERS.includes(parts[0].toLowerCase())
}

/**
 * Sample path as the Deluge writes it: forward slashes, no leading slash.
 */
export function normalizeSamplePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\//, '')
}

/**
 * Sample path key for matching: normalized and lower case (FAT is case-insensitive).
 */
export function samplePathKey(path: string): string {
  return normalizeSamplePath(path).toLowerCase()
}

/**
 * One instrument inside a file, with its owner: a Preset file's own Synth or Kit, a song Instance, or a Drum.
 */
type InstrumentEntry = { owner: InstrumentOwner, instrument: Sound | Kit }

/**
 * Walk every instrument in a file: the Preset itself, song Instances, and the Drums of any Kit.
 */
function instrumentsIn(file: ParsedSongFile | ParsedSoundFile | ParsedKitFile): InstrumentEntry[] {
  const owner = (instrumentName: string | null, drumName: string | null): InstrumentOwner => ({
    filePath: file.path, fileName: file.name, fileUrl: file.url, fileType: file.type, instrumentName, drumName,
  })
  const withDrums = (instrument: Sound | Kit, instrumentName: string | null): InstrumentEntry[] => [
    { owner: owner(instrumentName, null), instrument },
    ...(instrument.instrumentType === 'kit'
      ? Object.values(instrument.soundSources ?? {}).map(drum => ({ owner: owner(instrumentName, drum.presetName), instrument: drum }))
      : []),
  ]

  if (file.type !== 'song') return withDrums(file.data, null)
  return file.data.instruments.flatMap(instrument =>
    instrument.instrumentType === 'sound' || instrument.instrumentType === 'kit' ? withDrums(instrument, instrument.presetName) : [])
}

/**
 * Every Sample reference in one parsed file, each with its exact owner.
 */
export function collectSampleReferences(file: ParsedSongFile | ParsedSoundFile | ParsedKitFile): SampleReference[] {
  const refs: SampleReference[] = []

  for (const { owner, instrument } of instrumentsIn(file)) {
    if (instrument.instrumentType !== 'sound') continue
    for (const osc of ['osc1', 'osc2'] as const) {
      const oscillator = instrument[osc]
      if (oscillator?.fileName) refs.push({ samplePath: oscillator.fileName, owner, location: { kind: 'oscillator', osc } })
      oscillator?.sampleRanges?.forEach((range, index) => {
        if (range.fileName) refs.push({ samplePath: range.fileName, owner, location: { kind: 'sampleRange', osc, index } })
      })
    }
  }

  if (file.type === 'song') {
    file.data.recordings?.forEach((recording, index) => {
      if (!recording.filePath) return
      const owner: InstrumentOwner = {
        filePath: file.path, fileName: file.name, fileUrl: file.url, fileType: file.type, instrumentName: recording.trackName, drumName: null,
      }
      refs.push({ samplePath: recording.filePath, owner, location: { kind: 'recording', index } })
    })
  }
  return refs
}

/**
 * Compute Usage, Missing samples and Derived from links, in place on the given files.
 *
 * - Usage of a Sample: every Sample reference, from every file, whose path matches it (ignoring case).
 * - Missing samples: reference paths matching no Sample, each with the references that point to it.
 * - Derived from: Instance → Preset and Drum → Synth Preset by name. Informational only, never affects Usage.
 */
export function computeUsage(files: { songs: ParsedSongFile[], sounds: ParsedSoundFile[], kits: ParsedKitFile[], samples: SampleFile[] }): MissingSample[] {
  const { songs, sounds, kits, samples } = files
  const allFiles = [...songs, ...sounds, ...kits]

  const samplesByKey = new Map<string, SampleFile>()
  for (const sample of samples) {
    sample.usage = []
    samplesByKey.set(samplePathKey(sample.path), sample)
  }

  const missing = new Map<string, MissingSample>()
  for (const ref of allFiles.flatMap(collectSampleReferences)) {
    const key = samplePathKey(ref.samplePath)
    const sample = samplesByKey.get(key)
    if (sample) sample.usage.push(ref)
    else {
      const entry = missing.get(key) ?? { path: ref.samplePath, references: [] }
      entry.references.push(ref)
      missing.set(key, entry)
    }
  }

  // Derived from links: every Instance and Drum, but not a Preset file's own instrument.
  for (const preset of [...sounds, ...kits]) preset.derivedInstances = []
  const presetsByType = { sound: byPresetName<ParsedSoundFile | ParsedKitFile>(sounds), kit: byPresetName<ParsedSoundFile | ParsedKitFile>(kits) }
  for (const { owner, instrument } of allFiles.flatMap(instrumentsIn)) {
    if (!owner.instrumentName && !owner.drumName) continue
    for (const preset of presetsByType[instrument.instrumentType].get(instrument.presetName) ?? []) preset.derivedInstances.push(owner)
  }

  return [...missing.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function byPresetName<T extends ParsedSoundFile | ParsedKitFile>(presets: T[]) {
  const map = new Map<string, T[]>()
  for (const preset of presets) {
    const name = preset.data.presetName
    if (!name) continue
    map.set(name, [...(map.get(name) ?? []), preset])
  }
  return map
}

/**
 * Whether any Song Instance (or a Drum inside one) is Derived from this Preset. False means "Not in any song".
 */
export function isPresetInAnySong(preset: ParsedSoundFile | ParsedKitFile): boolean {
  return preset.derivedInstances.some(owner => owner.fileType === 'song')
}

/**
 * Song files whose Instances (or their Drums) are Derived from this Preset, one entry per song.
 */
export function songsDerivedFromPreset(preset: ParsedSoundFile | ParsedKitFile): InstrumentOwner[] {
  const seen = new Set<string>()
  return preset.derivedInstances.filter(owner => owner.fileType === 'song' && !seen.has(owner.filePath) && seen.add(owner.filePath))
}

/**
 * The Preset a song Instance is Derived from (same name), if any.
 */
export function presetDerivedBy(presets: (ParsedSoundFile | ParsedKitFile)[], song: ParsedSongFile, instanceName: string) {
  return presets.find(preset =>
    preset.derivedInstances.some(o => o.filePath === song.path && o.instrumentName === instanceName && o.drumName === null))
}

/**
 * Instrument part of an owner, e.g. `Preset 002 → Kick`. Empty for a Preset's own instrument.
 */
export function describeOwner(owner: InstrumentOwner): string {
  return [owner.instrumentName, owner.drumName].filter(Boolean).join(' → ')
}

/**
 * Where in the instrument a reference sits, e.g. `osc1`, `osc2 sample range 3`, `recording 1`.
 */
export function describeLocation(location: SampleLocation): string {
  if (location.kind === 'oscillator') return location.osc
  if (location.kind === 'sampleRange') return `${location.osc} sample range ${location.index + 1}`
  return `recording ${location.index + 1}`
}

/**
 * Identity of an owner (file + Instance + Drum), for grouping.
 */
export function ownerKey(owner: InstrumentOwner): string {
  return JSON.stringify([owner.filePath, owner.instrumentName, owner.drumName])
}

/**
 * References grouped by owner, in first-seen order, each with the locations it references.
 */
export function groupReferencesByOwner(refs: SampleReference[]): { owner: InstrumentOwner, locations: SampleLocation[] }[] {
  const groups = new Map<string, { owner: InstrumentOwner, locations: SampleLocation[] }>()
  for (const ref of refs) {
    const key = ownerKey(ref.owner)
    const group = groups.get(key) ?? { owner: ref.owner, locations: [] }
    group.locations.push(ref.location)
    groups.set(key, group)
  }
  return [...groups.values()]
}

/** Known settings files at the card root; never Song or Preset files. */
const SETTINGS_FILES = ['communityfeatures.xml', 'midifollow.xml']

/**
 * Asset folder XML files that weren't fully read: Malformed files, and XML files skipped for any reason
 * (unsupported firmware, unknown root element, parse exception). Any entry means Incomplete usage.
 * Files outside Asset folders, non-XML files and known settings files never count.
 */
export function computeIncompleteUsage(parsed: ParsedAssetFile[], skipped: SkippedFile[]): IncompleteUsageFile[] {
  const counts = (file: { name: string, path: string }) =>
    file.name.toLowerCase().endsWith('.xml') && !SETTINGS_FILES.includes(file.name.toLowerCase()) && isInAssetFolder(file.path)

  return [
    ...parsed.filter(f => f.xmlError && counts(f)).map(f => ({ name: f.name, path: f.path, reason: `Malformed file: ${f.xmlError}` })),
    ...skipped.filter(counts).map(f => ({ name: f.name, path: f.path, reason: f.reason })),
  ].sort((a, b) => a.path.localeCompare(b.path))
}
