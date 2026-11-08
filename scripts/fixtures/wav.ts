import { closeSync, openSync, readSync } from 'node:fs'

export type WavInfo = {
  /** Raw `fmt ` chunk body, copied verbatim into generated files so exotic formats (extensible, float) survive. */
  fmt: Buffer
  audioFormat: number
  channels: number
  sampleRate: number
  bitsPerSample: number
  blockAlign: number
  frames: number
}

/** Read format and length from a WAV header without loading sample data. Returns null for non-RIFF/WAVE files. */
export function readWavInfo(path: string): WavInfo | null {
  const fd = openSync(path, 'r')
  try {
    const head = Buffer.alloc(12)
    readSync(fd, head, 0, 12, 0)
    if (head.toString('ascii', 0, 4) !== 'RIFF' || head.toString('ascii', 8, 12) !== 'WAVE') return null

    let pos = 12
    let fmt: Buffer | null = null
    let dataSize: number | null = null
    const chunkHead = Buffer.alloc(8)
    while ((fmt === null || dataSize === null) && readSync(fd, chunkHead, 0, 8, pos) === 8) {
      const id = chunkHead.toString('ascii', 0, 4)
      const size = chunkHead.readUInt32LE(4)
      if (id === 'fmt ') {
        fmt = Buffer.alloc(size)
        readSync(fd, fmt, 0, size, pos + 8)
      } else if (id === 'data') {
        dataSize = size
      }
      pos += 8 + size + (size % 2)
    }
    if (!fmt || dataSize === null) return null

    let audioFormat = fmt.readUInt16LE(0)
    // WAVE_FORMAT_EXTENSIBLE: real format is the first two bytes of the sub-format GUID
    if (audioFormat === 0xfffe && fmt.length >= 26) audioFormat = fmt.readUInt16LE(24)
    const channels = fmt.readUInt16LE(2)
    const blockAlign = fmt.readUInt16LE(12)
    return {
      fmt,
      audioFormat,
      channels,
      sampleRate: fmt.readUInt32LE(4),
      bitsPerSample: fmt.readUInt16LE(14),
      blockAlign,
      frames: Math.floor(dataSize / blockAlign),
    }
  } finally {
    closeSync(fd)
  }
}

/**
 * Build a short WAV in the same format as `info`, containing a quiet sine tone (or silence for unknown encodings).
 */
export function synthesizeWav(info: WavInfo, frames: number, frequency: number): Buffer {
  const bytesPerSample = info.bitsPerSample / 8
  const data = Buffer.alloc(frames * info.blockAlign)

  for (let f = 0; f < frames; f++) {
    const v = 0.25 * Math.sin((2 * Math.PI * frequency * f) / info.sampleRate)
    for (let c = 0; c < info.channels; c++) {
      const o = f * info.blockAlign + c * bytesPerSample
      if (info.audioFormat === 3 && info.bitsPerSample === 32) data.writeFloatLE(v, o)
      else if (info.audioFormat === 1 && info.bitsPerSample === 16) data.writeInt16LE(Math.round(v * 0x7fff), o)
      else if (info.audioFormat === 1 && info.bitsPerSample === 24) data.writeIntLE(Math.round(v * 0x7fffff), o, 3)
      else if (info.audioFormat === 1 && info.bitsPerSample === 32) data.writeInt32LE(Math.round(v * 0x7fffffff), o)
      else if (info.audioFormat === 1 && info.bitsPerSample === 8) data.writeUInt8(Math.round(128 + v * 127), o)
      // else: leave zeros (silence)
    }
  }

  const fmtPadded = info.fmt.length % 2 ? Buffer.concat([info.fmt, Buffer.alloc(1)]) : info.fmt
  const header = Buffer.alloc(12)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(4 + 8 + fmtPadded.length + 8 + data.length, 4)
  header.write('WAVE', 8, 'ascii')
  const fmtHead = Buffer.alloc(8)
  fmtHead.write('fmt ', 0, 'ascii')
  fmtHead.writeUInt32LE(info.fmt.length, 4)
  const dataHead = Buffer.alloc(8)
  dataHead.write('data', 0, 'ascii')
  dataHead.writeUInt32LE(data.length, 4)
  return Buffer.concat([header, fmtHead, fmtPadded, dataHead, data])
}
