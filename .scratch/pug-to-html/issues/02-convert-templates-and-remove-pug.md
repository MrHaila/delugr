# Convert all templates and remove Pug

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `.scratch/pug-to-html/spec.md`

## Do

1. Run the converter on `src/`. Commit only the converted `.vue` files ("Convert templates from Pug to HTML").
2. Run `check-template-equivalence.ts` against the pre-conversion commit. For every mismatch, either fix the emitter and regenerate, or hand-fix the template. Prefer fixing the emitter. Repeat until it reports zero mismatches.
3. Remove `pug` and `@vue/language-plugin-pug` from `package.json`, and the plugin from `tsconfig.json` `vueCompilerOptions.plugins`.
4. `bun run build`: vue-tsc may now type-check templates differently. Fix new errors minimally (types only, no behavior change). The equivalence check must still pass, or each diff must be explained in the commit message.
5. Update CLAUDE.md Stack: templates are plain HTML, no Pug.
6. Commit ("Remove Pug").

## Acceptance

- `grep -r 'lang="pug"' src` is empty. `pug` is not in `package.json`.
- Equivalence check: zero mismatches vs. the pre-conversion commit, except for diffs explained in step 4.
- `bun run build` and `bun run test` pass.
- Manual smoke test in `bun run dev` (human): load the card; open songs/synths/kits/samples list + details; play a sample; open the rename and delete modals.
