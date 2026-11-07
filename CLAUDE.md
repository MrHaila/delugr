# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Delugr: browser-only asset manager for Synthstrom Deluge SD cards. User picks/drops Deluge root folder; app parses songs, synths (sounds), kits, samples and shows usage/cross-links. Deployed from `main` to https://delugr.haila.fi/ (Netlify).

## Commands

Tooling is Bun + Vite (Node version in `.nvmrc`).

- `bun i` — install
- `bun run dev` — dev server
- `bun run build` — `vue-tsc --noEmit` type check + Vite build (use this to typecheck)
- `bun run preview` — serve build

No test suite or linter configured.

## Stack

Vue 3 (`<script setup lang="ts">`), templates in **Pug** (`<template lang="pug">`), Tailwind 3 with `@tailwindcss/forms`, vue-router, heroicons, wavesurfer.js (sample waveform/playback), luxon, idb-keyval. `H*` components (`HCard`, `HButton`, `HBadge`, `HModal`, `HList`, `HListCard`) and `NavigationList` are registered globally in `src/main.ts`.

## Architecture

**File System Access API is core.** Everything works on `FileSystemDirectoryHandle`/`FileSystemFileHandle` (Chromium only). Root handle persisted in IndexedDB (`idb-keyval`, key `folderHandle`) in `src/App.vue`; permission re-verified on parse.

**Global store:** `src/composables/useFileStore.ts` — module-level `shallowReactive` singleton (`fileStore`) holding parsed `songs`, `sounds`, `kits`, `samples`, `skippedFiles`, `missingSamples`, parse status. Shallow reactivity: replace arrays/objects rather than mutating deeply if UI must update. `reParseFileStore()` rescans whole folder.

**Parsing pipeline** (`src/deluge/fileParsing.ts`, `parseFolderIntoFileStore`):
1. Recursively walk folder; skip dotfiles, `communityfeatures.xml`, `midifollow.xml`.
2. `.xml` → `parseAssetFile`: detect firmware version from raw XML string (none → `1`; `<firmwareVersion>` node → 2.x; `firmwareVersion="..."` root attr → 3.x/4.x/community `c1...`), then dispatch by root tag (song/sound/kit) to versioned parser:
   - `v1-2.ts` — firmware 1.x/2.x (no songs)
   - `v3-4.ts` — firmware 3.x/4.x
   - `vCommunity.ts` — community firmware (`c1*`)
   Unsupported → returned as string reason → `skippedFiles`.
3. `.wav`/`.aiff` → `SampleFile`.
4. `computeUsageStats` cross-references sample paths in sounds/kits/songs → each sample's `usage` (`songs`/`sounds`/`kits` keyed by asset path); unresolved paths → `missingSamples`.

**Data model:** `src/deluge/core.ts` — normalized types (`Song`, `Sound`, `Kit`, `AudioTrack`, `MidiChannel`, oscillators, envelopes, etc.) all versioned parsers output; plus XML helpers (`findDirectChildNodeByTagName`, `getInstrumentName`). Fields under "Not part of the spec" (`problem`, `instrumentType`, `isInstance`) are app-added. `dataTypes.ts` `FixPos50` converts Deluge hex fixed-point params to 0–50. `defaultSynthPatchv4.ts` supplies defaults. Parsed asset files keep raw `xml` string alongside parsed `data`.

**File mutations:** `src/deluge/files.ts` — sample path lookups (case-insensitive, leading `/` normalized), misplaced-sample matching (Levenshtein on folder), and in-progress **sample renaming**: copies file via `showSaveFilePicker`, removes old, then rewrites referencing XMLs via string replace on raw `xml` (`remapSampleInParsedAssetFile`). Usage stats not yet updated after rename (TODO). Deletion via `FileDeletionModal.vue`.

**Routing** (`src/main.ts`): `/songs`, `/synths`, `/kits`, `/samples` — each list view with child routes `''` (overview) and `:name` (details, `props: true`).

## References

Deluge XML format: Rohan's [format doc](https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit), [DelugeFirmware](https://github.com/SynthstromAudible/DelugeFirmware), [Downrush](https://github.com/jamiefaye/downrush) (FixPos50 adapted from it), [Deluge Commander](https://github.com/drbourbon/deluge-commander).
