import { test, expect } from '@playwright/test'
import type { Comparison } from './support/compareXmlParsers'

// The fast XML parser must build the same tree as Chromium's DOMParser, or decline (null → DOMParser fallback).
// Never accept input that DOMParser rejects, except the Deluge firmware quirks listed in src/deluge/xml.ts
// (duplicate attributes, digit-first element names), unit tested in test/xml.test.ts.

const helper = '/e2e/support/compareXmlParsers.ts'

test('fast XML parser matches DOMParser on every fixture card file', async ({ page }) => {
  await page.goto('/')
  const results: Comparison[] = await page.evaluate(h => import(h).then(m => m.compareFixtureCard()), helper)
  expect(results.length).toBeGreaterThan(30)
  expect(results.filter(r => r.result === 'mismatch')).toEqual([])
  // Only the deliberately malformed fixtures fall back.
  expect(results.filter(r => r.result === 'fallback').map(r => r.name).sort()).toEqual([
    '/test/fixtures/card/KITS/KIT041.XML',
    '/test/fixtures/card/SYNTHS/Edge malformed.XML',
  ])
})

const edgeCases = [
  '<a/>',
  '<a></a>',
  '<?xml version="1.0" encoding="UTF-8"?>\n<a x="1" y=\'2\'>t</a>\n',
  '<a x="&amp;&lt;&gt;&quot;&apos;&#65;&#x42;&#x1F600;">&amp;&lt;&gt;&#10;&#13;x</a>',
  '<a x="a\tb\nc\r\nd\re">a\r\nb\rc\td</a>',
  '<a x="&#9;&#10;&#13;"/>',
  '<a><!-- c --><b>1</b>  mid <![CDATA[<raw>&amp;\r\n]]><?pi data?><c x=">"/>tail</a>',
  '<a x="1"y="2"/>',
  '<a x=1/>',
  '<a>&foo;</a>',
  '<a>&#0;</a>',
  '<a>]]></a>',
  '<a>\u0001</a>',
  '<a x="<"/>',
  '<a></b>',
  '<a>',
  '<a/><b/>',
  'text<a/>',
  '<a/>text',
  '<a/><!-- trailing -->\n',
  ' <?xml version="1.0"?><a/>',
  '<?xml version="1.0" encoding="ISO-8859-1"?><a>é</a>',
  '<!DOCTYPE a><a/>',
  '<n:a xmlns:n="u"/>',
  '<a xmlns="u"/>',
  '<é/>',
  '<a x = "1" >t</a >',
  '<a><!-- bad -- comment --></a>',
  '<a>￾</a>',
  '<a b="é中😀">é中😀</a>',
  '﻿<a/>',
  '<a><b><c>deep</c></b><b/></a>',
  '<a>&#xD800;</a>',
  '<?xml version="1.0"?>\n<!-- pre --><?pi x?>\n<a/>',
  '<a>x &amp y</a>',
  '<a.b-c_d/>',
  '<a></a >\n\n',
  '<a x="1" />',
]

test('fast XML parser matches DOMParser or falls back on edge cases', async ({ page }) => {
  await page.goto('/')
  const results: Comparison[] = await page.evaluate(([h, cases]) => import(h).then(m => m.compareStrings(cases)), [helper, edgeCases] as const)
  expect(results.filter(r => r.result === 'mismatch')).toEqual([])
  // Sanity: the common shapes take the fast path.
  expect(results.filter(r => r.result === 'match').length).toBeGreaterThan(10)
})
