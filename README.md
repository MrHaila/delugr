# Delugr (super wip alpha preview etc)

[![Netlify Status](https://api.netlify.com/api/v1/badges/4bc18d98-eeba-4601-857c-632ebe0d373a/deploy-status)](https://app.netlify.com/sites/delugr/deploys)

The missing asset manager for the Synthstrom Deluge. Maybe. Some day.

Huge credit to:

- Rohan for making his [Deluge file format documentation](https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit) available
- Jamie Fenton for open-sourcing [Downrush](github.com/jamiefaye/downrush)
- Fabio Barbon for open-sourcing [Deluge Commander](https://github.com/drbourbon/deluge-commander)

Probably would have already stopped trying to parse the Deluge file format(s) otherwise.

Main branch automatically builds to <https://delugr.haila.fi/>

## Features

- 100% browser based. Nothing to install!
- Browse your songs, synths, kits and samples and see how they are used.
- At-a-glace visuals for spotting the most used and un-used items.
- Easy navigation between items via deep links when possible.

## Future things that would make sense (backlog)

- Sample usage & leaderboards
- Broken sample detection in instruments
- Ability to play/preview samples?
- Song instrument view in addition to preset view?
- Actions to rename stuff (needs a bit of RnD on the web apis and how to surgically edit the original files without breaking anything)
- Actions to delete stuff?
- Prettier everything
- Responsive layout
- Parsing more XML data (of various firmwares and binary types)
  - Audio tracks
  - Default params
  - Envelopes
- 4.x support (untested for now)
- Fancy-ass visualisations of synth settings to better understand them

## Technical Stuff

- Built with Vue 3 & Tailwind 3.
- Project tooling by Vite.

### Build & Run Locally

*You need the latest LTS of [Node.js](https://nodejs.org/) installed to build the project.*

1. Clone this repo: `git clone https://gitlab.com/dasinf/delugr`
1. Install dependencies: `npm i`
1. Build: `npm run build`
1. Run: `npm run preview`

### Develop

1. Clone this repo: `git clone https://gitlab.com/dasinf/delugr`
1. Install dependencies: `npm i`
1. Build & run: `npm run dev`

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)
