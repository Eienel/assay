// The assay office palette, single source of truth. Tailwind, CSS custom
// properties, and the few JS touchpoints (viewport themeColor) all read from
// here. Never write these hex values anywhere else.
export const tokens = {
  paper: '#FAF8F3',
  surface: '#FFFFFF',
  hairline: '#E4DFD4',
  ink: '#1A1815',
  muted: '#8A8378',
  hallmark: '#A8742A',
  oxide: '#9E4A3C',
} as const;
