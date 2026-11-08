/**
 * Build a benchmark card manifest (JSON) from a Deluge card folder. Output goes to temp/ (gitignored): it may hold
 * private XML. Samples become size-only stubs (content is never read by parsing).
 *
 *   bun bench/makeCard.ts <srcFolder> <scale> <out.json>
 *
 * scale k: every XML and sample is duplicated k times (copies get a `_dN` name suffix, same folder).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const [src = 'temp/DelugeTestData', scaleArg = '1', out = 'temp/bench/card-x1.json'] = process.argv.slice(2)
const scale = Number(scaleArg)
const entries: { path: string, text?: string, size?: number }[] = []

function walk(dir: string) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) { walk(full); continue }
    const rel = relative(src, full)
    const lower = name.toLowerCase()
    for (let k = 0; k < scale; k++) {
      const path = k === 0 ? rel : rel.replace(/(\.[^./]+)$/, `_d${k}$1`)
      if (lower.endsWith('.xml')) entries.push({ path, text: readFileSync(full, 'utf8') })
      else entries.push({ path, size: st.size })
    }
  }
}
walk(src)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(entries))
console.log(`${entries.length} entries → ${out}`)
