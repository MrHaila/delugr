# Add OXC tooling (no code changes)

Status: needs-triage
Type: task
Blocked by: 01

Spec: `.scratch/oxc-migration/spec.md`

## Do

- Install the tooling chosen in the 01 ADR. Put config in `vite.config.ts` (Vite+) or `.oxlintrc.json`/`.oxfmtrc.json` (plain).
- Lint: `correctness` category only, for now.
- Ignore `test/fixtures/`, `test/__snapshots__/`, `temp/`, `dist/`.
- `package.json` scripts: `lint`, `lint:fix`, `fmt`, `fmt:check`, `check` (lint + fmt check + `vue-tsc` + tests).
- Editor: recommend the OXC VS Code extension in `.vscode/extensions.json`, if the repo has that folder.
- Update CLAUDE.md Commands. Remove "No linter configured".

## Acceptance

- Only tooling and config files change. No source file changes.
- `bun run dev`, `build` and `test` behave as before.
- `lint` and `fmt:check` run and report findings (they may fail at this point).
