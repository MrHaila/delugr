# Migrate tooling to OXC / Vite+

Status: needs-triage

Blocked by: `.scratch/pug-to-html/` (merged and verified in prod)

## Problem

There's no linter or formatter (CLAUDE.md: "No linter configured"). Style drifts, and agents get no fast feedback on suspicious code. Vite+ (`vp`, by VoidZero) bundles Vite, Vitest, Oxlint and Oxfmt behind one CLI and one `vite.config.ts`, which fits the existing Vite + Vitest stack.

## Known state (from docs, Nov 2026; verify in issue 01)

- Oxfmt lists `.vue` as natively supported, but embedded formatting is marked "not fully implemented". Unknown whether `<template>` markup gets formatted.
- Oxlint lints `<script>` blocks only. Template linting needs third-party plugins (`oxlint-vue`, `oxlint-plugin-vize`), both early-stage.
- `vp check` uses tsgo for types, and tsgo doesn't understand Vue templates. `vue-tsc` stays.

## Decisions

- Spike first; record the outcome in an ADR before changing the repo.
- Keep the noise isolated. One commit for tooling, one for formatting only, one for lint autofix, then manual lint fixes in small batches. The formatting and autofix commits go in `.git-blame-ignore-revs`.
- Exclude `test/fixtures/` and `test/__snapshots__/` from fmt and lint. Fixtures are generated (see CLAUDE.md).
- Keep behavior unchanged. After the fmt commit, the template equivalence check (`scripts/check-template-equivalence.ts`) must pass, and so must tests and build.
- Lint strictness rises step by step: `correctness` first, then other categories one per commit. Noisy rules get disabled explicitly with a reason instead of being mass-fixed.
- Template linting stays out of scope at first.

## Open questions

- Keep Bun as package manager/runner, or let Vite+ own it?
- Template linting: skip, or try `oxlint-vue` now?
- Final lint strictness: stop at `correctness` + `suspicious`, or go to `pedantic`?
- Gate: pre-commit hook, Netlify build failing on lint, or both?
