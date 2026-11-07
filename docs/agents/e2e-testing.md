# Browser testing

Vitest (happy-dom), `vue-tsc` and `bun run build` don't run the app in a real browser. Some bugs only show up there, for example TS syntax in Pug templates, or a modal confirm that runs twice. Two tools cover the gap. Both use `e2e/support/loadFixtureCard.ts`:

- It copies `test/fixtures/card` into OPFS (origin private file system), which gives real, writable File System Access handles.
- It stubs `showDirectoryPicker`, so "Select folder" opens the fixture card.
- It must be served by the Vite dev server, because it relies on `import.meta.glob`.

## E2E tests (regressions)

- `bun run test:e2e`: Playwright Test, Chromium only. It starts its own dev server on :5199, or reuses one already running there.
- First run on a machine: `bunx playwright install chromium`.
- Specs live in `e2e/*.spec.ts`. Use the `card` fixture from `e2e/support/fixtures.ts`:
  - It opens the fixture card on the Overview page.
  - Any console error or page error fails the test.
- Navigate with `navigate(page, path)`, not `page.goto`. A reload drops the parsed card.
- Check what was written to disk with `readCardFile(page, 'SONGS/x.XML')`.
- Cover each critical path with a spec: pages render, rename, delete. New file-writing flows need one too.

## Manual smoke test with playwright-cli

Use this to look at a change interactively, against the running dev server (`bun run dev`; check the port it prints):

```sh
playwright-cli open http://localhost:5174
playwright-cli eval "() => import('/e2e/support/loadFixtureCard.ts').then(m => m.loadFixtureCard())"
playwright-cli click "text=Select folder"
playwright-cli eval "() => document.querySelector('#app').__vue_app__.config.globalProperties.\$router.push('/samples')"
playwright-cli snapshot          # element refs for click/fill
playwright-cli console error     # any errors so far
playwright-cli screenshot
playwright-cli close
```

Writes such as rename and delete go to the OPFS copy, never to `test/fixtures/card`. Each `loadFixtureCard()` call starts again from a fresh copy.
