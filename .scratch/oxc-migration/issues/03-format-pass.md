# Format whole repo

Status: needs-triage
Type: task
Blocked by: 02

Spec: `.scratch/oxc-migration/spec.md`

## Do

- Run the formatter over the repo. Commit only its output ("Format with oxfmt").
- Add that commit's SHA to `.git-blame-ignore-revs`, in a separate commit (the SHA is only known afterwards).

## Acceptance

- `fmt:check` passes.
- `scripts/check-template-equivalence.ts` vs. the pre-format commit: zero mismatches.
- `bun run build` and `bun run test` pass. Snapshots unchanged.
- No changes under `test/fixtures/` or `test/__snapshots__/`.
