# Parse performance spike (2026-11-08)

Question: can `parseFolderIntoFileStore` be made faster: logic, file structure, caching, or WASM?

## Method

- Harness `bench/` runs headless Chromium. It copies a card into OPFS (real File System Access handles) and times a full parse (`full`) plus each phase.
  - `bun bench/makeCard.ts <src> <scale> <out>` builds a card manifest. Sample files become 4-byte stubs.
  - `bun bench/run.ts --card <json> [--iters] [--cpu 4] [--profile 1] [--dump out.json]`.
  - `bench/index.html` has a "Pick real card" button for manual runs on real hardware.
- Cards come from the private `temp/DelugeTestData` and stay in `temp/bench/`. x1 = 336 XML (9.2 MB) + 2134 samples + 120 folders. x5 = everything duplicated 5 times.
- Correctness gate: the parsed store dump of each variant must be byte-identical to the baseline (`temp/bench/baseline-x1.dump.json`), and `bun run test` and `bun run build` must pass. All variants below pass.
- Machine: M1 Max, OPFS on SSD. A real SD card in a USB reader has far higher latency per I/O call, so the I/O gains below are a lower bound.

## Baseline profile (x1, ~840 ms)

| Where | ms | Note |
|---|---|---|
| Idle, awaiting I/O | ~290 | ~2470 `getFile()`/`text()` calls + 120 folder listings, each awaited in turn |
| `DOMParser.parseFromString` | ~270 | Native, but builds a full DOM |
| Versioned parsers | ~100 | ~60 of this is `findDirectChildNodeByTagName` (`Array.from(children)` on each call) |
| `computeUsage` | 3 | Not a bottleneck |

The UI does not freeze: each file awaits I/O, so the event loop gets a turn between files. The longest gap is 10–40 ms. The parse is slow, but the UI stays responsive.

## Results

Final runs were sequential on an otherwise idle machine. `full` median, ms.

| Variant | x1 | x5 | vs baseline |
|---|---|---|---|
| Baseline (`dev` 408d959) | 733 | 3660 | 1× |
| H1: concurrent I/O pool (16) + child-lookup loop | 427 | 2100 | 1.7× |
| H2: own XML parser (DOMParser fallback) | 432 | 2106 | 1.7× |
| H4: Web Worker pool (8) + own parser | 237 | 1153 | 3.1× |
| **H1 + H2 combined (main thread)** | **180** | **868** | **4.1×** |
| H1 + H2 + no sample `getFile` (best case for lazy metadata) | 116 | 553 | 6.4× |
| H5: WASM (Rust roxmltree) parser + shim | 646* | 2930* | 1.5× |
| H3: IndexedDB parse cache, warm (content hash) | 640* | 3150* | 1.5× |

\* Measured by the agent while other agents loaded the machine. Its baseline in the same runs was ~960 (x1) and ~4300 (x5), so read these as relative gains.

### H1: concurrent I/O (branch `worktree-agent-afccbf265f0fafbd4`)

- Walk the folders first, reading subfolders concurrently. Then a pool reads and parses files and writes results into slots by index. Ids and order match the baseline.
- Gains level off at 8–16 concurrent requests.
- The `findDirectChildNodeByTagName` loop alone gives about −9%.
- Updating the progress counter for each file costs nothing measurable. Keep it.
- Sample `getFile()` exists only to read `size`/`lastModified`. Those fields are used in `SampleDetails.vue`, `FileDeletionModal.vue` and the date column of `NavigationList.vue`, so they can be loaded lazily. On a real card this removes ~2134 I/O calls, likely the largest win on hardware.

### H2: own XML parser (branch `worktree-agent-a03acd3b6ad5ce118`)

- `src/deluge/xml.ts`: ~390 LOC, 2.2 KB gzip, no dependencies. It is 7–9× faster than DOMParser on the same text: 38 vs 279 ms on x1.
- The parsers are typed against a small `XmlElement` interface. A DOM `Element` also satisfies it, so the fallback path works unchanged.
- The parser is strict. It returns `null` for anything malformed or unusual (DOCTYPE, namespaces, unknown entities, BOM, …). The file then goes through the old DOMParser path, so partial parsing and the `xmlError` text stay exactly as before. A versioned parser that throws on the fast tree also triggers the fallback. On x1, only KIT041 falls back.
- Verified tree-equal with DOMParser on 143k elements (x1) + the fixture card, plus 40 edge-case strings.
- txml and fast-xml-parser were 3–7× slower than our parser, not strict enough to drive the fallback, and larger.

### H4: Web Workers (branch `worktree-agent-abb5982d66f4f0bdd`)

- 3.1× alone. Most of that gain is the DOM-free parser plus concurrency, which H1 + H2 already give on the main thread at 4.1×.
- Costs:
  - structured clone of parsed data (31 ms on x1, 172 ms on x5);
  - `FixPos50` class instances must be tagged and restored after the clone;
  - a second code path that Vitest does not cover;
  - ~490 LOC.
- The premise was wrong: the baseline does not freeze the UI. Reject for now. Revisit only if cards are much larger or more work moves into the parse.

### H5: WASM (branch `worktree-agent-a603398900cb0eb55`)

- Rust + roxmltree, flat tables, a JS shim: 77 ms vs DOMParser 274 ms on x1.
- A ~60-line pure-JS tokenizer that builds the same tree takes 45 ms, so WASM is slower than plain JS.
- Copying strings across the boundary is cheap: `encodeInto` takes ~5 ms. Reading bytes directly is slower: `arrayBuffer()` takes 187 ms vs 123 ms for `text()`.
- Costs 37 KB gzip (+36% bundle) and a Rust toolchain that Netlify does not have. **Reject.**

### H3: IndexedDB parse cache (branch `worktree-agent-ae6cf0133ef3a1c4a`)

- Keying on size + mtime is unsafe. The Deluge firmware's `get_fattime()` returns 0, so every file gets the same timestamp, and an edited preset usually keeps its size because hex params are fixed width.
  - A stale cache could show a used sample as Unused.
  - A sample remap could write a stale cached `xml` and undo the user's edit.
- A content-hash key is safe, but it still reads every byte and saves only the parse CPU. Once H2 lands, that is ~40 ms on x1, so the benefit is small.
- Instant startup: loading a store snapshot takes ~35–100 ms, compared with a full scan. That is a UX feature (show stale data, rescan, swap), not a parse speedup. File writes must stay disabled until the rescan finishes.
- **Defer.** Only worth it as a stale-while-revalidate startup feature.

## Proposals, in order

1. **Adopt H1 + H2** (branch `spike/parse-combo`, worktree `.claude/worktrees/combo`): **4.1× faster**, no new dependencies, output identical to the baseline.
   - Before merging:
     - replace the spike's `parseTuning` knob with a constant (16);
     - add a Playwright test that checks fast-parser vs DOMParser tree equality on the fixture card (happy-dom's DOMParser differs from Chrome's);
     - count `filesScanned` during the walk.
2. **Lazy sample metadata**: load `size`/`lastModified` per view or per visible folder. Gets to **6.4×** on SSD, and should give more on a real card. *Done: `useSampleMeta.ts`; measured x1 127 ms, x5 615 ms (5.8×).*
3. **Measure on a real SD card** with `bench/index.html` to check the I/O assumptions and the pool size; above 16 may help there.
4. Later and optional:
   - snapshot startup (H3, content hash only);
   - workers (H4), only if a profile shows main-thread jank.
5. Rejected: WASM, mtime-keyed cache, read-only workers.

## Unresolved

- Real-card latency and the best pool size: not measured.
- Fixture cards are not verified to load on hardware (known gap). The fast parser's strictness and fallback reduce the risk, but malformed files that only exist on real cards are unknown.
