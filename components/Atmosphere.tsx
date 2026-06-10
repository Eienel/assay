// The air of the assay office: two slow layers of crucible smoke across the top
// of the page, and a few motes of gold dust rising through the hero. Pure CSS,
// transform and opacity only, still under prefers-reduced-motion. Decorative,
// hidden from assistive tech.

// Fixed positions so the scene is identical on server and client.
const MOTES = [
  { left: '12%', top: '30%', size: 3, duration: 26, delay: 0, opacity: 0.32, sway: 18 },
  { left: '26%', top: '52%', size: 2, duration: 34, delay: 6, opacity: 0.24, sway: -14 },
  { left: '44%', top: '38%', size: 2, duration: 30, delay: 12, opacity: 0.2, sway: 10 },
  { left: '63%', top: '56%', size: 3, duration: 38, delay: 3, opacity: 0.3, sway: -20 },
  { left: '78%', top: '34%', size: 2, duration: 28, delay: 16, opacity: 0.26, sway: 12 },
  { left: '88%', top: '48%', size: 2, duration: 42, delay: 9, opacity: 0.18, sway: -10 },
  { left: '34%', top: '64%', size: 2, duration: 36, delay: 20, opacity: 0.22, sway: 16 },
];

export function Atmosphere() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
      <div className="smoke-layer smoke-a" />
      <div className="smoke-layer smoke-b" />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="mote"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            animationDuration: `${m.duration}s`,
            animationDelay: `${m.delay}s`,
            ['--mote-opacity' as string]: m.opacity,
            ['--mote-sway' as string]: `${m.sway}px`,
          }}
        />
      ))}
    </div>
  );
}
