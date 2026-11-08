# Test fixture generator

`bun run fixtures:build` turns a private snapshot of a real Deluge SD card (`temp/DelugeTestData`, gitignored) into a
small, anonymized fixture card at `test/fixtures/card/`, which is committed and used by the tests.

The source snapshot contains paid presets and real music. **Never commit it or copy files from it directly.**

## What it does

1. **Learns bounds.** It scans every XML file in the source and records the min/max of each field, so random values
   stay within the range a real device has written.
2. **Selects files.** For each (type, firmware) group, e.g. `SYNTHS:3.1`, it greedily picks up to `maxFilesPerGroup`
   files covering the most element/attribute paths, preferring smaller files. `include`/`exclude` in `config.ts`
   override the selection.
3. **Anonymizes.** It rewrites values in place without re-serializing, so formatting is preserved. 2.x files are not
   well-formed XML, so DOM round-tripping is not an option.
   - **Names** (presets, kit drums, tracks, file names) become pseudonyms (`Synth 003`, `Drum 012`) via one shared map,
     so cross-references between files still line up. Slot names (`SYNT042`, `000`) are kept.
   - **Sample paths** become `SAMPLES/D001/S0001.wav`, mapped consistently per folder and file.
   - **Sound design:** every 8-digit hex param and automation value, plus the ints in `randomizedIntFields`, is
     randomized within its observed bounds. Automation positions are kept.
   - **Notes** (`noteData`, `noteDataWithLift`) are regenerated as random non-overlapping notes inside the clip/row
     length, with random velocities. Probability and lift bytes are kept.
   - **Sample positions** (`zone.*`, `audioClip.*`) are rescaled to the generated sample length.
   - **Structure** (element order, enums, sections, slots, scroll, clip refs, firmware strings) is kept.
4. **Generates samples.** Every referenced sample that exists in the source becomes a short sine WAV in the same format
   (bit depth, channels, rate). A few unreferenced samples are added for "unused" handling. Missing references stay
   missing.
5. **Adds edge cases:** `Edge missing sample`, `Edge malformed`, `Edge unsupported firmware`.
6. **Verifies, then writes.**
   - Each anonymized file must parse with the app's own parsers to the same shape (keys, types, flags) as its original.
   - No original name or sample path part may appear in output names, paths or file names.
   - Unclassified fields that look like free text fail the build.

The output is deterministic for a given `seed` and source. Re-running gives byte-identical files.

## Known gaps

- Fixtures have **not been verified to load on a real Deluge**. Bounds come from observed values, but cross-field
  constraints beyond notes and sample positions are not modeled. This is acceptable while the UI barely uses synth values.
- No community firmware (`c1*`) files are in the source yet.
- Coverage is capped (see the "not covered" counts in the build output). Raise `maxFilesPerGroup` or add `include`
  entries when a test needs a rarer feature.

## After regenerating

Parsed-output snapshots will change. Review them, then update with `bun run test -- -u`.
