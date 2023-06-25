# Delugr

[![Netlify Status](https://api.netlify.com/api/v1/badges/4bc18d98-eeba-4601-857c-632ebe0d373a/deploy-status)](https://app.netlify.com/sites/delugr/deploys)

The missing asset manager for the Synthstrom Deluge. Maybe. Some day. With more work.

Huge credit to:

- Rohan for making his [Deluge file format documentation](https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit) available
- Jamie Fenton for open-sourcing [Downrush](https://github.com/jamiefaye/downrush)
- Fabio Barbon for open-sourcing [Deluge Commander](https://github.com/drbourbon/deluge-commander)

Probably would have already stopped trying to parse the Deluge file format(s) otherwise.

Main branch automatically builds to <https://delugr.haila.fi/>

## Features

- 100% browser based. Nothing to install! Just drag & drop your Deluge folder.
- Browse your songs, synths, kits and samples and see how they are used.
- At-a-glace visuals for spotting the most used and un-used items.
- Preview (play) sample files.
- Easy navigation between items via deep links when possible.

## Future things that would make sense (backlog)

- Prettier everything
- Actions to delete stuff
- Actions to rename stuff
- Broken sample detection in instruments
- Song instrument view in addition to preset view?
- Responsive layout
- Parsing more XML data (of various firmwares and binary types)
  - Audio tracks
  - Default params
  - Envelopes
- Fancy-ass visualisations of synth settings to better understand them

## Technical Stuff

- Built with Vue & Tailwind.
- Project tooling by PNPM and Vite.

### Build & Run Locally

*You need the latest LTS of [Node.js](https://nodejs.org/) and [PNPM](https://pnpm.io/) installed to build the project.*

1. Clone this repo: `git clone git@github.com:MrHaila/delugr.git`
1. Install dependencies: `pnpm i`
1. Build: `pnpm build`
1. Run: `pnpm preview`

### Develop

1. Clone this repo: `git clone git@github.com:MrHaila/delugr.git`
1. Install dependencies: `pnpm i`
1. Build & run: `pnpm dev`

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)
