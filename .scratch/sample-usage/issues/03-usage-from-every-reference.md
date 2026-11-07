# Compute Usage from every Sample reference

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `.scratch/sample-usage/spec.md` · ADR: `docs/adr/0001-usage-from-all-sample-references.md`

## Problem

`computeUsageStats` only walks Songs, and only counts Samples from Preset files whose name matches an Instance. See the spec for the consequences.

## Do

- Collect every Sample reference from every parsed file: Preset Synths, Preset Kits and their Drums, Song Instances (Synths, Kits and their Drums), and Recordings. Covers `osc1/osc2.fileName` and multisample `sampleRanges`.
- Give each reference its exact owner: file path, Instance/Drum name, and where in the instrument (`osc1`, `osc2`, sample range index, Recording).
- Usage of a Sample = all references whose path matches it, ignoring case.
- Missing samples = reference paths matching no Sample, each with its owners.
- Replace the Preset `usage` fields with **Derived from** links: Instance → Preset and Drum → Preset by name. A Preset is Not in any song when nothing is Derived from it.
- Mark files outside Asset folders (`SONGS/`, `SYNTHS/`, `KITS/` and subfolders) with a flag. They still count toward Usage.
- Update existing views that read the old `usage` shape so they keep working. Only the minimal UI changes needed; wording is issue 07.
- Update the "Parsing pipeline" note in `CLAUDE.md`.

## Acceptance

- Fixture card: every Sample referenced by any fixture file has Usage > 0. The 4 deliberately unreferenced samples (`config.unusedSamples`) are the only Unused samples.
- `SYNTHS/Edge missing sample.XML`'s reference `SAMPLES/MISSING/S9999.wav` is a Missing sample owned by that file.
- A Sample referenced only by a Song Instance (no matching Preset) is used.
- A Sample referenced only by a Preset that is Not in any song is used.
- A Recording's Sample is used.
- Store summary snapshot is updated and reviewed.
