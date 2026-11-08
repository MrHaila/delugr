import { describe, expect, test, vi } from 'vitest'
import type { SampleFile } from '../src/composables/useFileStore'
import { loadSampleMeta, sampleMeta } from '../src/composables/useSampleMeta'
import { fileHandleFromText, FIXED_LAST_MODIFIED } from './helpers/diskHandles'

const sample = (fileHandle: FileSystemFileHandle) => ({ name: fileHandle.name, path: `/SAMPLES/${fileHandle.name}`, fileHandle, url: '', id: 0, usage: [] }) as SampleFile
const flush = () => new Promise(resolve => setTimeout(resolve))

describe('lazy sample metadata', () => {
  test('is undefined until loaded, then has size and date', async () => {
    const s = sample(fileHandleFromText('a.wav', 'RIFF1234'))
    expect(sampleMeta(s)).toBeUndefined()
    loadSampleMeta([s])
    expect(sampleMeta(s)).toBeUndefined()
    await flush()
    expect(sampleMeta(s)).toEqual({ size: 8, lastModified: FIXED_LAST_MODIFIED })
  })

  test('reads each file once', async () => {
    const handle = fileHandleFromText('b.wav', 'RIFF')
    const getFile = vi.spyOn(handle, 'getFile')
    const s = sample(handle)
    loadSampleMeta([s])
    loadSampleMeta([s])
    await flush()
    loadSampleMeta([s])
    expect(getFile).toHaveBeenCalledTimes(1)
  })

  test('a new handle (after a rescan) is read again', async () => {
    const first = sample(fileHandleFromText('c.wav', 'RIFF'))
    loadSampleMeta([first])
    await flush()
    const rescanned = sample(fileHandleFromText('c.wav', 'RIFF-longer'))
    expect(sampleMeta(rescanned)).toBeUndefined()
    loadSampleMeta([rescanned])
    await flush()
    expect(sampleMeta(rescanned)?.size).toBe(11)
  })

  test('stays undefined when the file cannot be read', async () => {
    const handle = { kind: 'file', name: 'gone.wav', getFile: () => Promise.reject(new DOMException('gone', 'NotFoundError')) } as unknown as FileSystemFileHandle
    const s = sample(handle)
    loadSampleMeta([s])
    await flush()
    expect(sampleMeta(s)).toBeUndefined()
  })
})
