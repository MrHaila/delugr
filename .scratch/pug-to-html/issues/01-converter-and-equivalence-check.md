# Pug → HTML converter and render equivalence check

Status: ready-for-agent
Type: task

Spec: `.scratch/pug-to-html/spec.md`

## Do

- `scripts/pug-to-html.ts` (run with `bun`):
  - Find every `src/**/*.vue` with `<template lang="pug">`. Take the template content and dedent it.
  - Parse it with `pug-lexer` + `pug-parser` (add them as explicit devDeps if they aren't resolvable directly).
  - Emit HTML:
    - Attribute values raw (no entity escaping). Valueless attrs stay bare (`v-else`, `disabled`).
    - Merge shorthand classes/ids with explicit ones (`.a(class="b")` → `class="a b"`).
    - Self-closing/void tags handled correctly.
    - `#[...]` interpolation and `|` text inline, so inline whitespace is preserved.
    - Comments kept.
    - 2-space indent, one element per line, attrs on one line, short text-only children inline.
  - Throw on any unknown AST node type (Mixin, Each, Code, Conditional, Case, Include…) and name the file and line. Never drop content silently.
  - Replace the block with `<template>…</template>`. Leave everything else in the file byte-identical.
  - `--dry-run` prints the changed files without writing them.
- `scripts/check-template-equivalence.ts`:
  - For each `.vue` file, compile the template at git ref X (default `HEAD`) and in the working tree with `@vue/compiler-sfc` `compileTemplate` (same options as `@vitejs/plugin-vue`; default `whitespace: 'condense'`). Compare the generated code.
  - Print a diff per mismatching file. Exit non-zero on any mismatch.
  - Must handle both Pug and HTML templates on either side, so it also works for the later OXC format pass.

## Acceptance

- Unit test (or inline self-test) covering the emitter on: nested tags, class/id shorthand merging, bare `v-else`, `&&` in a `v-if`, `#[span]` interpolation, `|` text, a void tag, and an unknown node throwing.
- Running the converter in `--dry-run` across `src/` reports 28 files and no throws.
