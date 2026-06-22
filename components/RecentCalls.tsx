'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coin } from './Coin';
import type { GroundResult } from '@/lib/types';

// A small live document in the hero: the last few calls made on Obol, each with
// the sources it paid. Reads the shared ledger and updates as answers settle.
export function RecentCalls() {
  const [items, setItems] = useState<GroundResult[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger', { cache: 'no-store' });
      const d = await res.json();
      setItems(d.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const onSettled = (e: Event) => {
      const detail = (e as CustomEvent<GroundResult>).detail;
      if (detail) setItems((prev) => [detail, ...prev.filter((p) => p.id !== detail.id)].slice(0, 8));
      else load();
    };
    window.addEventListener('obol:settled', onSettled);
    const t = setInterval(load, 20000);
    return () => {
      window.removeEventListener('obol:settled', onSettled);
      clearInterval(t);
    };
  }, [load]);

  const recent = items.slice(0, 3);

  return (
    <div className="glass ticks rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="label">Last calls on Obol</span>
        <span className="inline-flex items-center gap-1.5 text-micro text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          live
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {recent.length ? (
          recent.map((it) => (
            <li key={it.id} className="border-t border-hairline pt-3 first:border-0 first:pt-0">
              <p className="line-clamp-1 text-sm text-ink">{it.question}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {it.settlements.slice(0, 3).map((s) => (
                    <Coin key={s.sourceId} size={15} paid />
                  ))}
                  <span className="mono text-micro text-muted">
                    {it.settlements.length} {it.settlements.length === 1 ? 'source' : 'sources'}
                  </span>
                </div>
                <span className="mono text-micro text-accent">
                  {(it.settledMicros / 1e6).toFixed(6)} USDC
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted">No calls yet. Ask one below and it shows up here.</li>
        )}
      </ul>
    </div>
  );
}
