# Delete and rename: full reference rewrite and warnings

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 04

Spec: `.scratch/sample-usage/spec.md`

## Problem

- `renameSample` (`src/deluge/files.ts`) rewrites only files listed in the old `usage`, so it misses references.
- `remapSampleInParsedAssetFile` builds a `RegExp` from the raw path without escaping it. Paths with `(`, `)`, `.`, `+` or `[` don't match or match the wrong text.
- Rename UI work is paused until this lands.

## Do

- Rename rewrites every asset file whose **raw text** contains the old path, ignoring case, including Malformed files. Use plain text matching with an escaped path; replace every occurrence and keep everything else in the file byte-for-byte.
- The rename confirm dialog lists every file that will change before anything is written.
- The delete and rename confirm dialogs show the Incomplete usage warning from issue 04 when it applies, naming the affected files. The actions stay allowed.
- After rename or delete, re-scan or update Usage so the UI isn't stale. The current TODO in `remapSampleInParsedAssetFile` covers this.

## Acceptance

- Unit tests with in-memory writable handles cover:
  - a path containing regex characters,
  - a reference that differs only in case,
  - a reference inside a Malformed file,
  - a 2.x file keeping `<firmwareVersion>`.
- Files without the path are not written.
- The dialog file list matches the set of files actually written.
