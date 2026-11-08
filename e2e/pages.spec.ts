import { test, expect, navigate } from './support/fixtures'

// Every view renders against the fixture card without console errors (catches runtime template/compile errors).
const pages: [path: string, text: string | RegExp][] = [
  ['/', 'Sample usage may be incomplete'],
  ['/songs', 'You have 6 songs'],
  ['/songs/Song%20004', 'Instruments'],
  ['/synths', 'You have 18 synth presets'],
  ['/synths/Synth%20003', 'Derived from this preset'],
  ['/synths/Edge%20missing%20sample', 'Not in any song'],
  ['/kits', 'You have 9 kit presets'],
  ['/kits/Kit%20003', 'Drums'],
  ['/kits/KIT041', 'Derived from this preset'],
  ['/samples', 'Missing Samples'],
  ['/samples/0', 'Usage'],
]

test('every page renders without errors', async ({ card }) => {
  for (const [path, text] of pages) {
    await test.step(path, async () => {
      await navigate(card, path)
      await expect(card.locator('body')).toContainText(text)
    })
  }
})

test('sample size and date load lazily on the details page and in the list', async ({ card }) => {
  await navigate(card, '/samples/0')
  await expect(card.getByText(/Last modified: \d{4}-\d{2}-\d{2}/)).toBeVisible()
  await expect(card.getByText(/\(\d+(\.\d+)? (B|kB|MB)\)/).first()).toBeVisible()
  await expect(card.locator('aside a').first()).toContainText(/\d{4}-\d{2}-\d{2}/)
})

test('home warns about Incomplete usage, listing the affected files', async ({ card }) => {
  const warning = card.getByText('Sample usage may be incomplete').locator('..')
  await expect(warning).toContainText('/KITS/KIT041.XML')
  await expect(warning).toContainText('/SYNTHS/Edge malformed.XML')
  await expect(warning).toContainText('/SONGS/Edge unsupported firmware.XML')
})

test('missing samples list their owner', async ({ card }) => {
  await navigate(card, '/samples')
  const missing = card.getByText('SAMPLES/MISSING/S9999.wav').locator('..')
  await expect(missing.getByRole('link', { name: 'Edge missing sample' })).toBeVisible()
})

test('landing page shows what is new in the latest release', async ({ page, consoleErrors: _ }) => {
  await page.goto('/')
  const whatsNew = page.getByTestId('whats-new')
  await expect(whatsNew).toContainText("What's new")
  await expect(whatsNew.locator('li').first()).toBeVisible()
})
