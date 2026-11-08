# Missing samples with owners and Likely match

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `.scratch/sample-usage/spec.md`

## Do

- Wherever Missing samples are shown, list each missing path with its owners (file → Instance/Drum), linking to the owner's details page.
- Next to each Missing sample, show a Likely match if one exists, using `findLikeliestMatchForMisplacedSample` (`src/deluge/files.ts`). Only link to it; there is no re-point action.
- Fix `findLikeliestMatchForMisplacedSample` returning `null` typed as `SampleFile` (`return bestMatch!`): return `SampleFile | null`.

## Acceptance

- Fixture card: `SAMPLES/MISSING/S9999.wav` shows its owner `SYNTHS/Edge missing sample.XML`.
- Unit test: a Likely match is found when a sample with the same file name exists in another folder, and `null` is returned when none exists.
