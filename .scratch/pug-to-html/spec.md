# Migrate templates from Pug to HTML

Status: ready-for-agent

## Problem

All SFC templates except `HLogo.vue` use `<template lang="pug">`: 28 files, about 1.7k lines in total. Pug made hand-coding faster, but agents read and write plain HTML templates more reliably. Pug also blocks the OXC/Vite+ migration (`.scratch/oxc-migration/`), because Oxfmt can't format Pug.

## Decisions

- Convert with a script, not by hand. Pug usage is simple: no mixins, includes, `each`, or template-level `if`/`case`. The only Pug-specific syntax is tag interpolation `#[...]` and `|` text lines (e.g. `NavigationList.vue`).
- Use a custom emitter over the `pug-lexer` + `pug-parser` AST. Don't use `pug.render`: it escapes attribute values (`&&` → `&amp;&amp;`), renders `v-else="v-else"` and loses control over whitespace.
- **Equivalence gate:** for every file, the render code compiled by `@vue/compiler-sfc` (`compileTemplate`) from the old and new template must be identical. That is the definition of "no regression".
- No formatter in this migration. The emitter pretty-prints its own output. Reformatting belongs to `.scratch/oxc-migration/`.
- `<script>` and `<style>` blocks stay byte-identical.
- Done on its own branch off `dev`, merged and verified in prod before the OXC migration starts.

## Out of scope

- Style changes or refactoring of templates beyond what the equivalence gate allows.
- Formatting and linting (see `.scratch/oxc-migration/`).

## Open questions

- After the migration, keep the equivalence script in `scripts/` so the OXC format pass can reuse it, or delete it? (Default: keep until the OXC migration is done.)
