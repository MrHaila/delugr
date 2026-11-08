import { describe, expect, test } from 'vitest'
import { parseXml } from '../src/deluge/xml'

// Chromium's DOMParser rejects these, cutting the document short. Deluge firmware writes and reads them, so the fast
// parser accepts them on purpose (see src/deluge/xml.ts).
describe('Deluge firmware quirks', () => {
  test('duplicate attribute: last one wins', () => {
    const root = parseXml('<audioClip isPlaying="0" length="384" isPlaying="1"/>')
    expect(root?.attributes).toEqual([{ name: 'isPlaying', value: '1' }, { name: 'length', value: '384' }])
  })

  test('element names starting with a digit', () => {
    const root = parseXml('<song><performanceView><row><8>128</8><7>110</7></row></performanceView><instruments/></song>')
    const row = root?.getElementsByTagName('row')[0]
    expect(Array.from(row?.children ?? [], c => [c.tagName, c.textContent])).toEqual([['8', '128'], ['7', '110']])
    expect(root?.getElementsByTagName('instruments')).toHaveLength(1)
  })

  test('attribute names still must not start with a digit', () => {
    expect(parseXml('<a 1x="1"/>')).toBeNull()
  })
})
