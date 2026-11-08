/**
 * Run the parse benchmark in headless Chromium against a card manifest.
 *
 *   bun bench/run.ts [--card temp/bench/card-x1.json] [--iters 7] [--port 5300] [--cpu 1] [--json out.json]
 *
 * Starts its own Vite dev server from the current working directory (so it works in worktrees).
 * --cpu N: CDP CPU throttling (4 ≈ low-end laptop).
 * --profile 1: print top self-time functions of one full parse.
 * --dump out.json: write parsed output (for diffing vs baseline: temp/bench/baseline-x1.dump.json) and exit.
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce<string[][]>((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const card = resolve(args.card ?? 'temp/bench/card-x1.json')
const iters = Number(args.iters ?? 7)
const port = Number(args.port ?? 5300)
const cpu = Number(args.cpu ?? 1)

const vite = Bun.spawn(['bunx', 'vite', '--port', String(port), '--strictPort'], { stdout: 'pipe', stderr: 'pipe' })
const base = `http://localhost:${port}`
for (let i = 0; i < 100; i++) { try { await fetch(base); break } catch { await Bun.sleep(200) } }

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  page.on('pageerror', e => console.error('pageerror', e.message))
  await page.route('**/__bench_card.json', r => r.fulfill({ body: readFileSync(card), contentType: 'application/json' }))
  await page.goto(`${base}/bench/index.html`)
  await page.waitForFunction(() => (window as any).bench)
  if (cpu > 1) { const s = await page.context().newCDPSession(page); await s.send('Emulation.setCPUThrottlingRate', { rate: cpu }) }
  await page.evaluate(() => (window as any).bench.loadCard('/__bench_card.json').then((h: any) => ((window as any).__card = h)))
  // Warm-up run (JIT, module load), not counted.
  await page.evaluate(() => (window as any).bench.runBench((window as any).__card, 1))
  if (args.dump) {
    // Write parsed output JSON for correctness diffing, then exit.
    writeFileSync(args.dump, await page.evaluate(() => (window as any).bench.dump((window as any).__card)))
    console.log(`dump → ${args.dump}`)
    process.exit(0)
  }
  if (args.profile) {
    // CPU profile of one full parse; prints top self-time functions.
    const s = await page.context().newCDPSession(page)
    await s.send('Profiler.enable'); await s.send('Profiler.setSamplingInterval', { interval: 100 }); await s.send('Profiler.start')
    await page.evaluate(() => (window as any).bench.fullOnly((window as any).__card))
    const { profile } = await s.send('Profiler.stop') as any
    const self = new Map<string, number>()
    const dt = new Map<number, number>()
    profile.samples.forEach((id: number, i: number) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)))
    for (const n of profile.nodes) {
      const cf = n.callFrame
      const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-2).join('/').split('?')[0]}:${cf.lineNumber + 1}`
      self.set(key, (self.get(key) ?? 0) + (dt.get(n.id) ?? 0))
    }
    const total = [...self.values()].reduce((a, b) => a + b, 0)
    for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`${(v / 1000).toFixed(1).padStart(8)}ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`)
  }
  const res = await page.evaluate(n => (window as any).bench.runBench((window as any).__card, n), iters)
  console.log(JSON.stringify({ card, iters, cpu, medians: res.medians, counts: res.counts, heapMB: res.heapMB }, null, 2))
  if (args.json) writeFileSync(args.json, JSON.stringify(res, null, 2))
} finally {
  await browser.close()
  vite.kill()
}
