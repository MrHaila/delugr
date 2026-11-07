import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Fixed file timestamp. Not 0: happy-dom treats 0 as unset and uses the current time. */
export const FIXED_LAST_MODIFIED = Date.UTC(2024, 0, 1)

/**
 * Read-only File System Access API handles backed by a folder on disk.
 * Entries are yielded in sorted order and files report a fixed `lastModified` so results are deterministic.
 */
export function fileHandleFromDisk(path: string, name = basename(path)): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([readFileSync(path)], name, { lastModified: FIXED_LAST_MODIFIED }),
  } as unknown as FileSystemFileHandle
}

export function directoryHandleFromDisk(path: string, name = basename(path)): FileSystemDirectoryHandle {
  const child = (entry: string) => {
    const full = join(path, entry)
    return statSync(full).isDirectory() ? directoryHandleFromDisk(full, entry) : fileHandleFromDisk(full, entry)
  }
  return {
    kind: 'directory',
    name,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    async *values() {
      for (const entry of readdirSync(path).sort()) yield child(entry)
    },
    getDirectoryHandle: async (entry: string) => directoryHandleFromDisk(join(path, entry), entry),
    getFileHandle: async (entry: string) => fileHandleFromDisk(join(path, entry), entry),
  } as unknown as FileSystemDirectoryHandle
}

/** A file handle with in-memory text content. */
export function fileHandleFromText(name: string, text: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([text], name, { lastModified: FIXED_LAST_MODIFIED }),
  } as unknown as FileSystemFileHandle
}

/** A writable in-memory file handle. `text()` returns the current content, `writes` counts closed writes. */
export type MemoryFileHandle = FileSystemFileHandle & { text(): string, writes: number }

export function memoryFileHandle(name: string, text: string): MemoryFileHandle {
  let content = text
  const handle = {
    kind: 'file',
    name,
    writes: 0,
    text: () => content,
    getFile: async () => new File([content], name, { lastModified: FIXED_LAST_MODIFIED }),
    createWritable: async () => {
      let pending = ''
      return {
        write: async (data: string | Blob) => { pending += typeof data === 'string' ? data : await data.text() },
        close: async () => { content = pending; handle.writes++ },
      }
    },
  }
  return handle as unknown as MemoryFileHandle
}

export type MemoryDirectoryHandle = FileSystemDirectoryHandle & {
  /** Every file below this folder by path relative to it, e.g. `SONGS/a.XML`. */
  files(): Map<string, MemoryFileHandle>,
}

/**
 * Writable in-memory card from a map of relative paths to file text, e.g. `{ 'SONGS/a.XML': '<song/>' }`.
 * Entries are yielded in sorted order.
 */
export function memoryCard(files: Record<string, string>, name = 'card'): MemoryDirectoryHandle {
  const root = memoryDirectory(name)
  for (const [path, text] of Object.entries(files)) {
    const parts = path.split('/')
    let dir = root
    for (const part of parts.slice(0, -1)) dir = dir.dirs.get(part) ?? dir.addDir(part)
    dir.entries.set(parts.at(-1)!, memoryFileHandle(parts.at(-1)!, text))
  }
  return root.handle
}

function memoryDirectory(name: string) {
  const entries = new Map<string, MemoryFileHandle>()
  const dirs = new Map<string, ReturnType<typeof memoryDirectory>>()
  const notFound = (entry: string) => new DOMException(`${entry} not found`, 'NotFoundError')
  const handle = {
    kind: 'directory',
    name,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    async *values() {
      const all = [...entries.values(), ...[...dirs.values()].map(d => d.handle)]
      yield* all.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    },
    getDirectoryHandle: async (entry: string, options?: { create?: boolean }) => {
      const dir = dirs.get(entry) ?? (options?.create ? self.addDir(entry) : undefined)
      if (!dir) throw notFound(entry)
      return dir.handle
    },
    getFileHandle: async (entry: string, options?: { create?: boolean }) => {
      let file = entries.get(entry)
      if (!file && options?.create) entries.set(entry, file = memoryFileHandle(entry, ''))
      if (!file) throw notFound(entry)
      return file
    },
    removeEntry: async (entry: string) => {
      if (!entries.delete(entry) && !dirs.delete(entry)) throw notFound(entry)
    },
    files: () => {
      const all = new Map<string, MemoryFileHandle>()
      for (const [n, f] of entries) all.set(n, f)
      for (const [n, d] of dirs) for (const [p, f] of d.handle.files()) all.set(`${n}/${p}`, f)
      return all
    },
  } as unknown as MemoryDirectoryHandle
  const self = {
    entries,
    dirs,
    handle,
    addDir(entry: string) {
      const dir = memoryDirectory(entry)
      dirs.set(entry, dir)
      return dir
    },
  }
  return self
}
