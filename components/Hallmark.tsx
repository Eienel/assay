// The hallmark: a struck maker's mark. It is the app logo, and the same glyph is
// punched onto an operation row when it passes the assay. A lozenge punch with
// an assayer's "A" and a struck dot, drawn at a single stroke weight.
export function Hallmark({
  size = 24,
  color = 'var(--hallmark)',
  title,
}: {
  size?: number;
  color?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* The punch outline: a rounded lozenge, like a hallmark cartouche. */}
      <path
        d="M16 2.5 L27.5 9 V23 L16 29.5 L4.5 23 V9 Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* The assayer's A. */}
      <path
        d="M11.5 22 L16 10 L20.5 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.2 18 H18.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      {/* The struck dot. */}
      <circle cx="16" cy="25" r="1.05" fill={color} />
    </svg>
  );
}
