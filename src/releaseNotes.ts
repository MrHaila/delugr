/**
 * What's new, shown on the landing page. Newest release first; only the first one is shown.
 * Keep bullets short and plain: written for Deluge users, not developers.
 */
export interface ReleaseNote {
  /** Release date, YYYY-MM-DD. */
  date: string;
  /** Optional short headline. */
  title?: string;
  bullets: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    date: "2026-11-08",
    title: "Sample renaming and smarter usage",
    bullets: [
      "Sample renaming! Finally.",
      "Missing samples suggest likely matches incase you moved the files around manually.",
      "More accurate sample usage stats.",
      "Reading a deluge folder is about 4 times faster than before.",
    ],
  },
];
