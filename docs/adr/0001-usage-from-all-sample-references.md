# Sample usage comes from every reference; name matches are only "derived from"

Songs store full copies of their instruments (Instances), so a Song keeps playing its own copy even when the Preset it came from is changed, renamed or deleted. We therefore compute Sample usage from every Sample reference in every readable file (Presets, Instances, Drums, Recordings) and treat a Preset with the same name as an Instance only as an informational "derived from" link. Matching by name is unreliable (renames, reused names, drift), and using it for usage made samples that songs depend on look unused, which is dangerous for deletion and rename.

## Considered options

- **Usage only through songs, with name matches to Presets (the original implementation).** Rejected: it ignores Instance contents and unused Presets, so samples look unused while still needed.
- **Songs only, Presets tracked separately.** Rejected: the device needs a Sample whenever any file points at it.
