# Delugr

Delugr manages the contents of a Synthstrom Deluge SD card: songs, instruments and samples, and the references between
them.

## Language

### Instruments

**Synth**:
A single-voice instrument (oscillators, filters, envelopes). Stored as a `<sound>` element in Deluge XML.
_Avoid_: Sound (except when referring to the XML tag), patch

**Kit**:
An instrument made of Drums, each triggered by its own row.
_Avoid_: Drum kit

**Drum**:
One sound inside a Kit, whether the Kit is a Preset or an Instance. It doesn't have to be percussion.
_Avoid_: Kit row, sound source, kit sound

**Preset**:
A Synth or Kit saved as its own file in `SYNTHS/` or `KITS/`.
_Avoid_: Patch, synth file

**Instance**:
A Synth or Kit copy stored inside a Song. It plays on its own, whether or not any Preset exists.
_Avoid_: Song instrument, embedded preset

**Derived from**:
An informational link from an Instance (or a Drum) to a Preset with the same name. The two may have drifted apart, so
the link never decides Sample usage.
_Avoid_: Uses preset, instance of

**Not in any song**:
A Preset that no Instance is Derived from. Deleting it breaks no Song. Shortened to "unused" only where space is tight
(navigation lists).
_Avoid_: Unused preset (in full-text contexts)

### Samples

**Sample**:
An audio file on the card (`.wav`, `.aiff`).
_Avoid_: Audio file, wave

**Sample reference**:
A path inside a Preset, Instance, Drum or Recording that points to a Sample.
_Avoid_: Sample link, file name

**Recording**:
An audio clip in a Song's audio track. It references a Sample, typically under `SAMPLES/CLIPS/`.
_Avoid_: Audio clip (except when referring to the XML tag)

**Usage**:
The set of Sample references, from every readable file on the card, that point to a given Sample.

**Unused sample**:
A Sample that no Sample reference points to.

**Missing sample**:
A Sample reference whose path matches no Sample on the card.

**Likely match**:
A Sample suggested as the moved location of a Missing sample (same file name, most similar folder). Only a suggestion,
never applied automatically.

### Card health

**Asset folder**:
`SONGS/`, `SYNTHS/` or `KITS/`, including subfolders: where the Deluge keeps Songs and Presets. Song and Preset files
found elsewhere (e.g. backups) are still listed and still count toward Usage, but are shown as outside asset folders.

**Malformed file**:
A file whose XML is broken, so only the part before the error could be read. Some original firmwares wrote these, and
the device still loads them.

**Incomplete usage**:
The state where at least one XML file in an Asset folder could not be fully read (malformed, unsupported firmware,
unknown content), so Usage, Unused samples and Missing samples may be wrong.
