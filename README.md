# Delugr (super wip alpha preview etc)

[![Netlify Status](https://api.netlify.com/api/v1/badges/4bc18d98-eeba-4601-857c-632ebe0d373a/deploy-status)](https://app.netlify.com/sites/delugr/deploys)

The missing asset manager for the Synthstrom Deluge. Maybe. Some day.

Huge credit to Jamie Fenton for open-sourcing [Downrush](github.com/jamiefaye/downrush) and Rohan for making his [file format documentation](https://docs.google.com/document/d/11DUuuE1LBYOVlluPA9McT1_dT4AofZ5jnUD5eHvj7Vs/edit) available. Probably would have already stopped trying to parse the Deluge file format otherwise.

Main branch automatically builds to <https://delugr.haila.fi/>

## Features

- 100% browser based. Nothing to install!
- Browse your songs and what instruments are used in them.
- Browse synths and see what songs they are used in.
- Detect songs with instruments that don't currently exist.

## Future things that would make sense (backlog)

- List kits
- Kit song usage stats
- Kit details page
- List samples... somehow. Making a file browser would suck.
- Actions to rename stuff (needs a bit of RnD on the web apis and how to surgically edit the original files without breaking anything)
- List recordings?
- Prettier everything
- Responsive layout
- Parsing synth data (of various firmwares and binary types) to reliably show the synth settings
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
