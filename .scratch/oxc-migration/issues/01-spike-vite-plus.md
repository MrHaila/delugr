# Spike: Vite+ / Oxlint / Oxfmt on this repo

Status: ready-for-agent
Type: research

Spec: `.scratch/oxc-migration/spec.md`

## Do

Timeboxed. Work on a throwaway branch and don't merge. Answer each question with evidence (commands run, output excerpts):

1. Does `vp fmt` format `<template>` HTML in `.vue` files, or only `<script>`/`<style>`? Show a before/after on one component.
2. Does Vite+ work with Bun as package manager and runner, or does it require/replace it? What happens to `bun run dev`/`build`/`test`?
3. Do `vp dev`/`vp build` work with the current `vite.config.*` and `@vitejs/plugin-vue`?
4. Does `vp test` run the existing Vitest + happy-dom suite unchanged, including file snapshots?
5. Can `vp check` be configured to run `vue-tsc` instead of (or as well as) tsgo? If not, what's the combined command?
6. Lint noise baseline: error/warning counts per category with default config, and with `typescript`, `vue` and `import` plugins enabled.
7. Fmt noise baseline: number of files/lines changed by `vp fmt`.
8. Alternative: plain `oxlint` + `oxfmt` without Vite+. What would we lose or gain?
9. Template linting: try `oxlint-vue` briefly. Does it run, and what does it report?

## Output

- `docs/research/oxc-vite-plus.md` with the answers and sources.
- Proposed ADR `docs/adr/000N-oxc-tooling.md` (Vite+ vs. plain oxlint/oxfmt; Bun's role; template linting).
- Answers to the spec's open questions where the evidence settles them. List the rest for the human.
