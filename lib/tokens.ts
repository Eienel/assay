// Obol palette. One light theme, one accent. Deliberately cool stone rather
// than the warm beige/brass/espresso that marks AI-default "premium" pages.
// The single accent is verdigris, the patina of an aged bronze coin, and it
// means one thing only: settled / paid.
export const tokens = {
  stone: '#F3F4F1', // background, cool pale stone
  surface: '#FFFFFF', // raised surface
  hairline: '#E4E5E0', // 1px borders
  ink: '#181A19', // primary text, cool near-black
  muted: '#6E726D', // secondary text
  accent: '#1F7A60', // verdigris: settled / paid / primary action only
  accentSoft: '#E9F1ED', // a quiet wash of the accent for fills
} as const;
