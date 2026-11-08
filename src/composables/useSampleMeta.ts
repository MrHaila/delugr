import { shallowReactive } from 'vue'
import type { SampleFile } from './useFileStore'

/**
 * Sample file metadata. Not read during the card scan: one `getFile()` per Sample is the costliest part of a scan on a
 * real card (see docs/research/parse-performance.md). Views load it on demand for the samples they show.
 */
export type SampleMeta = { size: number, lastModified: number }

/**
 * Keyed by file handle: a rescan creates new handles, so stale entries are never served and old ones get collected.
 * `null` while loading or after a failed read.
 */
const cache = shallowReactive(new WeakMap<FileSystemFileHandle, SampleMeta | null>())

/** Start loading metadata for these samples (no-op for ones loaded or loading). */
export function loadSampleMeta(samples: Iterable<SampleFile>) {
  for (const { fileHandle } of samples) {
    if (cache.has(fileHandle)) continue
    cache.set(fileHandle, null)
    fileHandle.getFile()
      .then(file => cache.set(fileHandle, { size: file.size, lastModified: file.lastModified }))
      .catch(() => {}) // Stays null: the file was likely removed. A rescan will pick that up.
  }
}

/** Loaded metadata, or undefined if not loaded (yet). Reactive: updates when loading finishes. */
export function sampleMeta(sample: SampleFile): SampleMeta | undefined {
  return cache.get(sample.fileHandle) ?? undefined
}
