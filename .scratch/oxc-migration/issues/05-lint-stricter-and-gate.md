# Raise lint strictness and add gate

Status: needs-info
Type: task
Blocked by: 04

Spec: `.scratch/oxc-migration/spec.md`

Needs from human: final strictness target and gate type (spec open questions).

## Do

- Enable the agreed categories/plugins (likely `suspicious`, `perf`, then the `typescript`, `vue` and `import` plugins), one per commit, using the same fix process as 04.
- Add the agreed gate: a pre-commit hook and/or `check` in the Netlify build command.
- Template linting: only if the 01 ADR chose it.

## Acceptance

- `check` passes on `dev`.
- The gate blocks a deliberately introduced lint error (verify, then revert).
- CLAUDE.md documents the lint/fmt commands and the gate.
