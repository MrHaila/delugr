# Fix lint: correctness category

Status: needs-triage
Type: task
Blocked by: 03

Spec: `.scratch/oxc-migration/spec.md`

## Do

1. Run `lint:fix`. Commit only the autofixes. Review the diff for behavior changes first, and revert any that aren't clearly safe. Add the SHA to `.git-blame-ignore-revs`.
2. Fix the remaining errors by hand in small commits per area: `src/deluge/`, `src/composables/`, `src/components/`, `src/views/`, `scripts/`, `test/`.
3. If a rule is wrong for this codebase, disable it in config with a one-line reason comment. Don't sprinkle inline disables.
4. Any finding that is a real bug: fix it in its own commit, with a test if practical, and call it out in the summary.

## Acceptance

- `lint` passes with zero errors.
- `bun run build` and `bun run test` pass. Snapshot changes only where a bug fix explains them.
- Summary lists real bugs found and rules disabled (with reasons).
