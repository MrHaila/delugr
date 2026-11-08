import { test as base, expect, type Page } from '@playwright/test'

/**
 * Test fixtures:
 * - `consoleErrors`: every console error and uncaught page error. Checked after each test: any entry fails it.
 * - `card`: the app with the fixture card opened (see loadFixtureCard.ts), on the Overview page.
 */
export const test = base.extend<{ consoleErrors: string[], card: Page }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`) })
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
    await use(errors)
    expect(errors, 'browser console errors').toEqual([])
  },
  card: async ({ page, consoleErrors: _ }, use) => {
    await page.goto('/')
    await page.evaluate(() => import('/e2e/support/loadFixtureCard.ts').then(m => m.loadFixtureCard()))
    await page.getByRole('button', { name: 'Select folder' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await use(page)
  },
})

export { expect }

/** Navigate in-app. A page reload would drop the parsed card. */
export async function navigate(page: Page, path: string) {
  await page.evaluate(path => (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$router.push(path), path)
}

/** Read a file's text from the fixture card copy in OPFS. */
export async function readCardFile(page: Page, path: string): Promise<string | null> {
  return page.evaluate(async path => {
    let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('card')
    const parts = path.split('/')
    try {
      for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part)
      return await (await (await dir.getFileHandle(parts.at(-1)!)).getFile()).text()
    } catch {
      return null
    }
  }, path)
}
