# Sample usage tracking

Status: ready-for-agent

Terms follow `GLOSSARY.md`. Decisions: `docs/adr/0001-usage-from-all-sample-references.md`, `docs/adr/0002-keep-malformed-files.md`.

## Problem

`computeUsageStats` (`src/deluge/fileParsing.ts`) starts from Songs only. It counts a Sample only when a Song's Instance has the same name as a Preset file, and then reads the Preset's Sample references instead of the Instance's own. As a result:

- Samples used by Instances whose Preset is missing or has drifted are not counted, and not reported as missing either.
- Samples used only by Presets that aren't in any Song show as Unused samples, which makes them look safe to delete.
- Recordings are not parsed at all.
- Rename (`renameSample`) rewrites only the files listed in Usage, so it misses references and leaves them broken.

On the fixture card, 14 of 362 Samples show as used and no Missing samples are reported.

## Decisions

### Usage

- Usage = every Sample reference in every readable file: Presets, Instances, Drums (in both), Recordings.
- Each reference records its exact owner: file → Instance → Drum → oscillator / sample range / Recording.
- Instance → Preset and Drum → Preset links are **Derived from** only (same name). They never affect Usage.
- Missing samples are listed per path, each with its owners. Each Missing sample may show a Likely match as a suggestion. Nothing is re-pointed automatically.
- Song and Preset files outside Asset folders are still listed and still count toward Usage, but are marked as outside asset folders. Working out what the firmware actually loads is future work.
- Path matching ignores case (FAT file system).

### Incomplete usage

- Triggered only by `.xml` files inside an Asset folder (subfolders included) that weren't fully read: Malformed file, unsupported firmware, unknown root element, or a parse exception.
- Never triggered by other files: card root, other folders, non-XML files, or the known settings files (`communityfeatures.xml`, `midifollow.xml`).
- Shown only on the home page, and only when it applies, with the list of affected files and reasons.
- Delete and rename stay allowed. Their confirm dialogs repeat the warning.

### Rename

- Rewrites every asset file whose raw text contains the old path, ignoring case, including Malformed files. Text replace with the path escaped, matching whole values only: the path must sit between quotes or tags (an optional leading `/` in the file is kept), so `OLD/SAMPLES/x.wav` or `x.wav.bak` are not touched.
- The confirm dialog lists every file that will change.
- Writes keep the original file text: never the 2.x-stripped copy used for parsing.

### Wording

- Presets: "Not in any song" in full-text places, "unused" only where space is tight (navigation lists).
- Samples: "Unused sample" means no Sample reference at all.

## Out of scope

- Detecting drift between an Instance and the Preset it's Derived from.
- Re-pointing Missing samples to their Likely match.
- Firmware research on which folders and files the device loads (see issue 08).
- Community firmware fixtures.

## Issues

| # | Title | Blocked by |
|---|---|---|
| 01 | Keep original file text for writes (2.x data loss) | — |
| 02 | Parse Recordings in songs | — |
| 03 | Compute Usage from every Sample reference | 02 |
| 04 | Home page warning for Incomplete usage | 03 |
| 05 | Missing samples with owners and Likely match | 03 |
| 06 | Delete and rename: full reference rewrite and warnings | 01, 03, 04 |
| 07 | Wording: "Not in any song", outside-asset-folder marker | 03 |
| 08 | Research: what the firmware loads from where | — |
