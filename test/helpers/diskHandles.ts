import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

/**
 * Read-only File System Access API handles backed by a folder on disk.
 * Entries are yielded in sorted order and files report `lastModified: 0` so results are deterministic.
 */
export function fileHandleFromDisk(path: string, name = basename(path)): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([readFileSync(path)], name, { lastModified: 0 }),
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
    getFile: async () => new File([text], name, { lastModified: 0 }),
  } as unknown as FileSystemFileHandle
}
