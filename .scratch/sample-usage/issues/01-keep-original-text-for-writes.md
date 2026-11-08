# Keep original file text for writes (2.x data loss)

Status: ready-for-agent
Type: task

Spec: `.scratch/sample-usage/spec.md`

## Problem

`parseAssetFile` (`src/deluge/fileParsing.ts`) removes the `<firmwareVersion>…</earliestCompatibleFirmware>` block from 2.x files so `DOMParser` gets a single root element, then stores that **stripped** text as `ParsedAssetFile.xml`. `remapSampleInParsedAssetFile` (`src/deluge/files.ts`) writes `xml` back to disk, so renaming a Sample silently removes the firmware version from every 2.x Preset it touches.

## Do

- Keep the original file text in `xml`, and parse from a local stripped copy.
- Check that nothing else relies on `xml` being stripped (`git grep "\.xml\b" src`).

## Acceptance

- After parsing any fixture file, `xml` is byte-identical to the file on disk. Test this for 1.x, 2.x and 3.x/4.x fixtures.
- Parsed data snapshots are unchanged.
- A test runs `remapSampleInParsedAssetFile` on a 2.x fixture with an in-memory writable file handle (extend `test/helpers/diskHandles.ts`), and the written text still contains `<firmwareVersion>`.
