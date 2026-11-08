# Research: what the firmware loads from where

Status: needs-triage
Type: research

Spec: `.scratch/sample-usage/spec.md`

## Question

Which folders and files does the Deluge firmware actually load songs, Presets and Samples from? For example: subfolders of `SONGS/`, `SYNTHS/` and `KITS/`; files outside them; how case is handled; how a missing Sample is resolved, e.g. whether the firmware searches for moved Samples.

## Why

The Asset folder rule and the "outside asset folders" handling were picked without checking firmware behavior. With real answers, Usage and the Incomplete usage rules can be tightened.

## Sources

- https://github.com/SynthstromAudible/DelugeFirmware (storage manager, file browser, sample loading code)
- The format docs linked in `CLAUDE.md`

## Output

A short write-up with code references, plus proposed changes to `GLOSSARY.md` / the spec, if any.
