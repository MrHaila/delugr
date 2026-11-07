/**
 * Browser-side helper, served by the Vite dev server: copies `test/fixtures/card` into the origin private file system
 * (OPFS) and makes `window.showDirectoryPicker` return it, so "Select folder" opens the fixture card with real,
 * writable File System Access handles.
 *
 * Use from Playwright or playwright-cli on a dev server page:
 *   await page.evaluate(() => import('/e2e/support/loadFixtureCard.ts').then(m => m.loadFixtureCard()))
 */
const fixtureUrls = import.meta.glob('/test/fixtures/card/**/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>

const PREFIX = '/test/fixtures/card/'

export async function loadFixtureCard(): Promise<number> {
  const opfs = await navigator.storage.getDirectory()
  await opfs.removeEntry('card', { recursive: true }).catch(() => {})
  const card = await opfs.getDirectoryHandle('card', { create: true })

  await Promise.all(Object.entries(fixtureUrls).map(async ([path, url]) => {
    const parts = path.slice(PREFIX.length).split('/')
    let dir = card
    for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true })
    const file = await dir.getFileHandle(parts.at(-1)!, { create: true })
    const writable = await file.createWritable()
    await writable.write(await (await fetch(url)).arrayBuffer())
    await writable.close()
  }))

  // OPFS handles may lack the permission API the app checks; they are always granted.
  const handleProto = Object.getPrototypeOf(Object.getPrototypeOf(card)) as Record<string, unknown>
  handleProto.queryPermission ??= async () => 'granted'
  handleProto.requestPermission ??= async () => 'granted'
  ;(window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () => card

  return Object.keys(fixtureUrls).length
}
