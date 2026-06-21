// The obol: a line-engraved coin, like a plate in a numismatics catalogue. Ink
// line-art by default so the verdigris accent stays reserved for the "paid"
// state. The owl is the Athenian motif. This same coin drops onto a source row
// the moment it is paid.
export function Coin({
  size = 40,
  paid = false,
  className,
}: {
  size?: number;
  paid?: boolean;
  className?: string;
}) {
  const stroke = paid ? 'var(--accent)' : 'var(--ink)';
  const beads = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return { cx: 24 + Math.cos(a) * 20.5, cy: 24 + Math.sin(a) * 20.5 };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Obol"
      className={className}
    >
      {paid && <circle cx="24" cy="24" r="22.5" fill="var(--accent-soft)" />}
      <circle cx="24" cy="24" r="22.5" stroke={stroke} strokeWidth="1.4" />
      <circle cx="24" cy="24" r="17.5" stroke={stroke} strokeWidth="0.9" opacity="0.5" />
      {beads.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r="0.7" fill={stroke} opacity="0.55" />
      ))}
      {/* Athenian owl, minimal: body, two ringed eyes, beak, two feet. */}
      <g stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 19.5 Q24 14 31.5 19.5 Q33 28 24 32 Q15 28 16.5 19.5 Z" fill="none" />
        <circle cx="20.5" cy="22" r="2.6" />
        <circle cx="27.5" cy="22" r="2.6" />
        <circle cx="20.5" cy="22" r="0.7" fill={stroke} stroke="none" />
        <circle cx="27.5" cy="22" r="0.7" fill={stroke} stroke="none" />
        <path d="M24 24.5 L22.6 27 H25.4 Z" fill={stroke} stroke="none" />
        <path d="M21.5 32.5 L20.5 34.5 M26.5 32.5 L27.5 34.5" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Coin size={26} />
      <span className="text-base font-semibold tracking-tight text-ink">Obol</span>
    </span>
  );
}
