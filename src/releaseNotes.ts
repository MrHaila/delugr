/**
 * What's new, shown on the landing page. Newest release first; only the first one is shown.
 * Keep bullets short and plain: written for Deluge users, not developers.
 */
export interface ReleaseNote {
  /** Release date, YYYY-MM-DD. */
  date: string
  /** Optional short headline. */
  title?: string
  bullets: string[]
}

export const releaseNotes: ReleaseNote[] = [
  {
    date: '2026-11-08',
    title: 'Sample renaming and smarter usage',
    bullets: [
      'Rename a sample and every song, synth and kit that uses it gets updated too.',
      'Sample usage now counts every place a sample is used: presets, instruments inside songs, kit drums and recorded audio clips.',
      'Each sample shows exactly where it is used, down to the song and the instrument or drum.',
      'Missing samples show which files want them and suggest a likely match.',
      'If some files can\'t be fully read, you get a warning that usage numbers may be off.',
      'Synth and kit presets list the song instruments that share their name.',
      'Files outside SONGS, SYNTHS and KITS are marked, but still counted.',
      'Opening a card is about 4 times faster.',
    ],
  },
]
