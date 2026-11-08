/**
 * Browser-side parse benchmark. Loaded by bench/index.html on the Vite dev server.
 * - loadCard(url): writes a manifest (bench/makeCard.ts) into OPFS dir `bench-card`, returns its handle.
 * - runBench(handle, iters): times full parse + per-phase breakdown, returns medians in ms.
 */
import { parseAssetFile, parseFolderIntoFileStore } from '../src/deluge/fileParsing'
import { computeIncompleteUsage, computeUsage } from '../src/deluge/usage'
import { useFileStore } from '../src/composables/useFileStore'

type Entry = { path: string, text?: string, size?: number }

export async function loadCard(url: string): Promise<FileSystemDirectoryHandle> {
  const entries: Entry[] = await (await fetch(url)).json()
  const opfs = await navigator.storage.getDirectory()
  await opfs.removeEntry('bench-card', { recursive: true }).catch(() => {})
  const root = await opfs.getDirectoryHandle('bench-card', { create: true })
  const dirs = new Map<string, FileSystemDirectoryHandle>([['', root]])
  async function dirFor(path: string): Promise<FileSystemDirectoryHandle> {
    if (dirs.has(path)) return dirs.get(path)!
    const i = path.lastIndexOf('/')
    const parent = await dirFor(i < 0 ? '' : path.slice(0, i))
    const d = await parent.getDirectoryHandle(path.slice(i + 1), { create: true })
    dirs.set(path, d)
    return d
  }
  await Promise.all(entries.map(async e => {
    const i = e.path.lastIndexOf('/')
    const dir = await dirFor(i < 0 ? '' : e.path.slice(0, i))
    const fh = await dir.getFileHandle(e.path.slice(i + 1), { create: true })
    const w = await fh.createWritable()
    // Sample stubs: write a few bytes only, parsing never reads sample content.
    await w.write(e.text ?? 'RIFF')
    await w.close()
  }))
  return root
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

async function time<T>(fn: () => Promise<T> | T): Promise<[number, T]> {
  const t = performance.now()
  const r = await fn()
  return [performance.now() - t, r]
}

async function walk(dir: FileSystemDirectoryHandle, path: string, out: { handle: FileSystemFileHandle, path: string }[]) {
  for await (const e of dir.values()) {
    if (e.kind === 'directory') await walk(e as FileSystemDirectoryHandle, path + e.name + '/', out)
    else out.push({ handle: e as FileSystemFileHandle, path: path + e.name })
  }
  return out
}

const isXml = (p: string) => p.toLowerCase().endsWith('.xml')

export async function runBench(root: FileSystemDirectoryHandle, iters = 5) {
  const r: Record<string, number[]> = { full: [], walk: [], walkGetFile: [], readXmlText: [], domParse: [], parseCpu: [], usage: [] }
  const { fileStore } = useFileStore()
  let counts = {}
  for (let i = 0; i < iters; i++) {
    r.full.push((await time(() => parseFolderIntoFileStore(root)))[0])
    counts = { songs: fileStore.songs.length, sounds: fileStore.sounds.length, kits: fileStore.kits.length, samples: fileStore.samples.length, skipped: fileStore.skippedFiles.length, missing: fileStore.missingSamples.length }

    const [tw, files] = await time(() => walk(root, '/', []))
    r.walk.push(tw)
    r.walkGetFile.push((await time(async () => { const fs = await walk(root, '/', []); for (const f of fs) await f.handle.getFile() }))[0])
    const xmlFiles = files.filter(f => isXml(f.path))
    const [tt, texts] = await time(async () => { const out: string[] = []; for (const f of xmlFiles) out.push(await (await f.handle.getFile()).text()); return out })
    r.readXmlText.push(tt)
    const parser = new DOMParser()
    r.domParse.push((await time(() => { for (const t of texts) parser.parseFromString(t, 'text/xml') }))[0])
    // CPU-only parse: in-memory handles, so no disk I/O.
    const mem = xmlFiles.map((f, j) => ({ path: f.path, handle: { kind: 'file', name: f.handle.name, getFile: async () => new File([texts[j]], f.handle.name) } as unknown as FileSystemFileHandle }))
    r.parseCpu.push((await time(async () => { for (const m of mem) { try { await parseAssetFile(m.handle, m.path) } catch {} } }))[0])
    r.usage.push((await time(() => {
      computeUsage({ songs: fileStore.songs, sounds: fileStore.sounds, kits: fileStore.kits, samples: fileStore.samples })
      computeIncompleteUsage([...fileStore.songs, ...fileStore.sounds, ...fileStore.kits], fileStore.skippedFiles)
    }))[0])
  }
  const medians = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(median(v) * 10) / 10]))
  const heapMB = (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1e6) : null
  return { medians, raw: r, counts, heapMB }
}

declare global { interface Window { bench: { loadCard: typeof loadCard, runBench: typeof runBench, fullOnly: typeof fullOnly, dump: typeof dump } } }
/** Parsed store as JSON without handles, for diffing a prototype's output against the baseline. */
export async function dump(root: FileSystemDirectoryHandle) {
  await parseFolderIntoFileStore(root)
  const { fileStore } = useFileStore()
  const { songs, sounds, kits, samples, skippedFiles, missingSamples, incompleteUsage } = fileStore
  const byPath = (a: { path: string }, b: { path: string }) => (a.path < b.path ? -1 : 1)
  return JSON.stringify({ songs: [...songs].sort(byPath), sounds: [...sounds].sort(byPath), kits: [...kits].sort(byPath), samples: [...samples].sort(byPath).map(s => ({ ...s, id: undefined, url: undefined, lastModified: undefined })), skippedFiles: [...skippedFiles].sort(byPath), missingSamples, incompleteUsage }, (k, v) => (k === 'fileHandle' || k === 'lastModified' ? undefined : v), 1)
}

export async function fullOnly(root: FileSystemDirectoryHandle) { await parseFolderIntoFileStore(root) }
window.bench = { loadCard, runBench, fullOnly, dump }

document.getElementById('pick')?.addEventListener('click', async () => {
  const handle = await window.showDirectoryPicker()
  const out = document.getElementById('out')!
  out.textContent = 'Running...'
  const res = await runBench(handle, 3)
  console.log(res)
  out.textContent = JSON.stringify({ medians: res.medians, counts: res.counts, heapMB: res.heapMB }, null, 2)
})
