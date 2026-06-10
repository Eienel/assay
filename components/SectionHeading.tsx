// A certificate-style section marker. The index sits in the recording voice
// (mono, muted), never the accent: the accent is reserved for the pass meaning.
export function SectionHeading({
  index,
  children,
  tone = 'ink',
}: {
  index: string;
  children: React.ReactNode;
  tone?: 'ink' | 'paper';
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`font-mono text-micro ${tone === 'paper' ? 'text-paper/50' : 'text-muted'}`}>
        {index}
      </span>
      <span className={`field-label ${tone === 'paper' ? 'text-paper/70' : ''}`}>{children}</span>
    </div>
  );
}
