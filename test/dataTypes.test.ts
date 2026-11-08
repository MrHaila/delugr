import { describe, expect, test } from 'vitest'
import { FixPos50 } from '../src/deluge/dataTypes'

describe('FixPos50', () => {
  test.each([
    ['0x80000000', 0],
    ['0x00000000', 25],
    ['0x7FFFFFFF', 50],
    ['0xC0000000', 13], // 12.5 rounds up
    ['0x40000000', 38], // 37.5 rounds up
  ])('%s -> %d', (hex, decimal) => {
    const value = new FixPos50(hex)
    expect(value.decimal).toBe(decimal)
    expect(value.fixh).toBe(hex)
  })
})
