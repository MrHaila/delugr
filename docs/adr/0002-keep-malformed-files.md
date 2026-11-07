# Malformed files are kept and partly read, never rejected or repaired

Some original Deluge firmwares wrote XML that isn't well-formed (for example, a missing `</modKnobs>` in a 1.x kit), and the device still loads these files. Delugr keeps them: it uses whatever the XML parser read before the error and records the error on the file, without trying to repair it. Rejecting would hide files the user really has, and repairing would mean guessing at original data. Because partial data can hide Sample references, any malformed file in an asset folder puts the card in "incomplete usage", which is shown as a warning instead of blocking actions.

## Consequences

Features that must rely on complete data can later be limited to files without an XML error.
