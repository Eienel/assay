// Assay palette. One calm dark theme, one accent. A deep teal-ink ground (like
// still water at night) so glass and drifting ink read with depth, lit by a
// single mint-verdigris accent that means one thing: settled / paid.
export const tokens = {
  stone: '#0F1514', // base background, deep teal-ink
  surface: '#161D1B', // raised solid surface (rare; most cards are glass)
  hairline: '#2A332F', // 1px borders on dark
  ink: '#ECEFEA', // primary text, off-white
  muted: '#93A09A', // secondary text, muted green-gray
  accent: '#3FB68C', // mint verdigris: settled / paid / primary action only
  accentSoft: 'rgba(63,182,140,0.14)', // quiet wash of the accent
} as const;
