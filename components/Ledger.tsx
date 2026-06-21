'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coin } from './Coin';
import type { GroundResult } from '@/lib/types';

interface Snapshot {
  items: GroundResult[];
  totals: { answers: number; citations: number; micros: number; usdc: string; sourcesPaid: number };
}

const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export function Ledger() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger', { cache: 'no-store' });
      setSnap(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const onSettled = () => load();
    window.addEventListener('obol:settled', onSettled);
    const t = setInterval(load, 15000);
    return () => {
      window.removeEventListener('obol:settled', onSettled);
      clearInterval(t);
    };
  }, [load]);

  const t = snap?.totals;
  return (
    <section id="ledger" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">The toll ledger</h2>
      <p className="mt-3 max-w-prose text-base text-muted">
        Every answer drops coins to the sources it used. This is the running record, settled on Arc.
      </p>

      {/* totals: an inline strip, not equal cards */}
      <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-hairline py-5">
        <Stat value={<CountUp value={Number(t?.usdc ?? 0)} decimals={6} suffix=" USDC" />} label="paid to sources" wide />
        <Stat value={String(t?.citations ?? 0)} label="citations settled" />
        <Stat value={String(t?.answers ?? 0)} label="answers" />
        <Stat value={String(t?.sourcesPaid ?? 0)} label="sources paid" />
      </div>

      <ul className="mt-6 space-y-2">
        {snap?.items.length ? (
          snap.items.slice(0, 8).map((it) => (
            <li key={it.id} className="rounded-lg border bg-surface p-4 shadow-card sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-ink">{it.question}</span>
                <span className="mono shrink-0 text-micro text-muted">{ago(it.ts)}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {it.settlements.map((s) => (
                  <span key={s.sourceId} className="inline-flex items-center gap-1.5">
                    <Coin size={18} paid />
                    <span className="mono text-micro text-muted">{s.handle}</span>
                    <span className="mono text-micro text-accent">{s.amountUsdc}</span>
                  </span>
                ))}
                {!it.settlements.length && (
                  <span className="text-micro text-muted">no source paid</span>
                )}
              </div>
            </li>
          ))
        ) : (
          <li className="rounded-lg border border-dashed border-hairline p-8 text-center text-sm text-muted">
            No tolls yet. Ask a question above and the first coins will land here.
          </li>
        )}
      </ul>
    </section>
  );
}

function Stat({ value, label, wide }: { value: React.ReactNode; label: string; wide?: boolean }) {
  return (
    <div>
      <div className={`mono tracking-tight text-ink ${wide ? 'text-2xl' : 'text-2xl'}`}>{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [n, setN] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(a + (b - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}
