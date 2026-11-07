/**
 * Fixture generator settings. See scripts/fixtures/README.md.
 */
export const config = {
  /** Changing this reshuffles every random value in the generated fixtures. */
  seed: 'delugr-fixtures-v1',

  /** Private source snapshot of a real Deluge SD card (gitignored, never commit). */
  source: 'temp/DelugeTestData',

  /** Generated, anonymized, committed fixture card. Wiped and rewritten on every run. */
  out: 'test/fixtures/card',

  /** Length of every generated WAV, in frames. Sample positions in XML are rescaled to fit. */
  sampleFrames: 512,

  /**
   * Max files picked automatically per (type, firmware) group. Picks go to the files adding the most uncovered
   * elements/attributes first, so later picks add little. Raise to cover more rare features.
   */
  maxFilesPerGroup: 3,

  /** Notes are regenerated anyway; fewer notes per row keeps songs small. */
  maxNotesPerRow: 4,

  /** Param automation values are randomized anyway; keep at most this many nodes per automated param. */
  maxAutomationNodes: 4,

  /** Extra source samples that no selected XML references, copied (anonymized) to test "unused sample" handling. */
  unusedSamples: 4,

  /**
   * Source-relative paths of XML files to always select / never select, on top of automatic coverage-based selection.
   * @example 'SYNTHS/SYNT000.XML'
   */
  include: [] as string[],
  exclude: [] as string[],

  /**
   * Plain-integer fields that express sound design and get randomized within observed bounds.
   * Integers not listed here are treated as structure (slots, sections, scroll, clip refs) and kept as-is.
   * All 8-digit hex values (patch params, automation values) are randomized regardless of this list.
   */
  randomizedIntFields: [
    'arpeggiator.numOctaves', 'arpeggiator.syncLevel',
    'compressor.attack', 'compressor.release', 'compressor.syncLevel',
    'delay.analog', 'delay.pingPong', 'delay.syncLevel',
    'lfo1.syncLevel',
    'modulator1.cents', 'modulator1.transpose', 'modulator2.cents', 'modulator2.transpose',
    'osc1.cents', 'osc1.transpose', 'osc2.cents', 'osc2.transpose',
    'reverb.dampening', 'reverb.pan', 'reverb.roomSize', 'reverb.width',
    'sound.clippingAmount', 'sound.transpose',
    'unison.detune', 'unison.num',
  ],
}
