# Home page warning for Incomplete usage

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `.scratch/sample-usage/spec.md` · ADR: `docs/adr/0002-keep-malformed-files.md`

## Do

- Work out Incomplete usage after a scan. It applies when at least one `.xml` file inside an Asset folder (subfolders included) wasn't fully read:
  - Malformed file (`xmlError` set),
  - skipped for unsupported firmware,
  - unknown root element,
  - parse exception.
- Ignore everything else: files outside Asset folders, non-XML files, `communityfeatures.xml` and `midifollow.xml`.
- Expose it from the file store (for example, a list of affected files with reasons), so issue 06 can reuse it.
- Home page only: show a warning label **only** when Incomplete usage applies, saying Usage, Unused samples and Missing samples may be wrong, and listing the affected files and reasons. Show nothing when the card is clean.

## Acceptance

- Fixture card: the warning lists `KITS/KIT041.XML` (Malformed file), `SYNTHS/Edge malformed.XML` (Malformed file) and `SONGS/Edge unsupported firmware.XML` (unsupported firmware), and nothing else.
- A non-XML file, or an XML file in the card root, never triggers the warning (unit test with a small in-memory card).
- With no affected files, the home page shows no warning.
