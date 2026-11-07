# Parse Recordings in songs

Status: ready-for-agent
Type: task

Spec: `.scratch/sample-usage/spec.md`

## Problem

Recordings (`<audioClip>` under `<sessionClips>`, and possibly arrangement-only tracks) reference Samples through `filePath`, but `parseSongv3` / `parseSongvCommunity` don't read clips at all. Recordings therefore can't count toward Usage (issue 03).

## Do

- Add a `Recording` type to `src/deluge/core.ts` with at least `trackName`, `filePath`, `startSamplePos` and `endSamplePos`.
- Add `recordings: Recording[]` to `Song`, filled by the v3/4 and community song parsers.
- An empty `filePath` (an armed clip with nothing recorded) is not a Sample reference. Keep the Recording but treat its path as absent.

## Acceptance

- Fixture `SONGS/Song 004.XML` has a Recording with `filePath` `SAMPLES/D038/S0297.WAV`, and `Song 002.XML` has one with an empty path.
- Updated parsed snapshots differ only by the new `recordings` field.
- If the community parser has no fixture yet, note that in the test instead of guessing at its format.
