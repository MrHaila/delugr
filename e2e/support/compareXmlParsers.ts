/**
 * Browser-side helper, served by the Vite dev server: checks the fast XML parser (src/deluge/xml.ts) against Chromium's
 * DOMParser. happy-dom's DOMParser differs from Chrome's, so this only means something in a real browser.
 *
 * Rule: for each input, the fast parser either returns null (the app then falls back to DOMParser), or builds the same
 * tree as DOMParser (tag names, attributes in order, textContent, children), and DOMParser reports no error.
 */
import { detectFirmware } from '/src/deluge/fileParsing.ts'
import { parseXml, type XmlElement } from '/src/deluge/xml.ts'

const fixtureXml = import.meta.glob('/test/fixtures/card/**/*.{xml,XML}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export type Comparison = { name: string, result: 'match' | 'fallback' | 'mismatch', detail?: string }

const serialize = (e: XmlElement): string =>
  `<${e.tagName} ${JSON.stringify(Array.from(e.attributes, a => [a.name, a.value]))} ${JSON.stringify(e.textContent)}>` +
  Array.from(e.children, serialize).join('')

export function compare(name: string, text: string): Comparison {
  const fast = parseXml(text)
  if (!fast) return { name, result: 'fallback' }
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  if (doc.getElementsByTagName('parsererror').length) return { name, result: 'mismatch', detail: 'DOMParser reports an error' }
  const [a, b] = [serialize(doc.documentElement), serialize(fast)]
  if (a === b) return { name, result: 'match' }
  let i = 0
  while (a[i] === b[i]) i++
  return { name, result: 'mismatch', detail: `DOM …${a.slice(i - 40, i + 40)}… vs fast …${b.slice(i - 40, i + 40)}…` }
}

/** Every fixture card XML file, preprocessed the way parseAssetFile does it. */
export function compareFixtureCard(): Comparison[] {
  return Object.entries(fixtureXml).map(([path, xml]) => compare(path, detectFirmware(xml)?.parseableXml ?? xml))
}

export function compareStrings(texts: string[]): Comparison[] {
  return texts.map(text => compare(text, text))
}
