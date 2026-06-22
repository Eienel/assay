'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CircleNotch, MagnifyingGlass } from '@phosphor-icons/react';
import { Coin } from './Coin';
import { addressUrl, txUrl } from '@/lib/explorer';
import type { GroundResult } from '@/lib/types';

interface Snapshot {
  items: GroundResult[];
  lastDepositTx?: string;
  totals: { answers: number; citations: number; micros: number; usdc: string; sourcesPaid: number };
}

// The agent's question pool. It works through a shuffled batch on its own,
// grounding each answer and paying every source it draws on.
const POOL = [
  'What was the lepton, and what is an obol?',
  'How does x402 turn an endpoint into a paid resource?',
  'Why are nanopayments finally economical on Arc?',
  'How can an AI agent pay the sources it uses?',
  'What makes USDC suited to gas on Arc?',
  'What is Circle Gateway and how does batching help?',
  'How small can a nanopayment be?',
  'Why was the drachma replaced, and when?',
];

const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export function Ledger() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [freshId, setFreshId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(6);
  const runningRef = useRef(false);
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fold in a new result and flag it so its row glows once as it lands.
  const addFresh = useCallback((r: GroundResult) => {
    setSnap((prev) => merge(prev, r));
    setFreshId(r.id);
    if (freshTimer.current) clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFreshId(null), 1800);
  }, []);

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
    const onSettled = (e: Event) => {
      const detail = (e as CustomEvent<GroundResult>).detail;
      if (detail) addFresh(detail);
      else load();
    };
    window.addEventListener('obol:settled', onSettled);
    const t = setInterval(load, 20000);
    return () => {
      window.removeEventListener('obol:settled', onSettled);
      clearInterval(t);
    };
  }, [load, addFresh]);

  async function runAgent() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    const batch = [...POOL].sort(() => Math.random() - 0.5).slice(0, 6);
    setProgress({ done: 0, total: batch.length });
    for (let i = 0; i < batch.length; i++) {
      try {
        const res = await fetch('/api/ground', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question: batch[i] }),
        });
        if (res.ok) {
          // Show the result immediately, so coins land without waiting on the
          // (possibly different) ledger instance.
          const r = (await res.json()) as GroundResult;
          addFresh(r);
        }
      } catch {
        /* keep going */
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setRunning(false);
    runningRef.current = false;
    load();
  }

  const t = snap?.totals;
  const items = snap?.items ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (it) =>
          it.question.toLowerCase().includes(q) ||
          it.settlements.some((s) => s.handle.toLowerCase().includes(q)),
      )
    : items;
  const shown = filtered.slice(0, visible);

  return (
    <section id="ledger" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">The toll ledger</h2>
          <p className="mt-3 max-w-prose text-base text-muted">
            Every answer drops coins to the sources it used. This is the running record, settled on
            Arc.
          </p>
          {snap?.lastDepositTx && (
            <a
              href={txUrl(snap.lastDepositTx)}
              target="_blank"
              rel="noreferrer"
              className="mono mt-2 inline-flex items-center gap-1 text-micro text-accent hover:underline"
              title="The treasury's most recent on-chain Gateway deposit"
            >
              treasury funded on-chain ↗
            </a>
          )}
        </div>
        <button onClick={runAgent} disabled={running} className="btn btn-glass-accent px-4 py-2 disabled:opacity-60">
          {running ? (
            <>
              <CircleNotch size={15} className="animate-spin" />
              Agent running {progress.done}/{progress.total}
            </>
          ) : (
            <>
              <Play size={14} weight="fill" />
              Quick sample run
            </>
          )}
        </button>
      </div>

      <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-hairline py-5">
        <Stat value={<CountUp value={Number(t?.usdc ?? 0)} decimals={6} suffix=" USDC" />} label="paid to sources" accent />
        <Stat value={<CountUp value={t?.citations ?? 0} />} label="citations settled" />
        <Stat value={<CountUp value={t?.answers ?? 0} />} label="answers" />
        <Stat value={<CountUp value={t?.sourcesPaid ?? 0} />} label="sources paid" />
      </div>

      {items.length > 0 && (
        <label className="glass mt-6 flex items-center gap-2 rounded-lg px-3 py-2">
          <MagnifyingGlass size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(6);
            }}
            placeholder="Search the ledger by question or source..."
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          {query && (
            <span className="mono shrink-0 text-micro text-muted">
              {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
            </span>
          )}
        </label>
      )}

      <ul className="mt-3 space-y-2">
        {shown.length ? (
          shown.map((it) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass ticks rounded-lg p-4 sm:px-5${it.id === freshId ? ' glow-fresh' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-ink">{it.question}</span>
                <span className="mono shrink-0 text-micro text-muted">{ago(it.ts)}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {it.settlements.map((s) => (
                  <a
                    key={s.sourceId}
                    href={addressUrl(s.payTo)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:opacity-80"
                    title="View recipient wallet on ArcScan"
                  >
                    <Coin size={18} paid />
                    <span className="mono text-micro text-muted">{s.handle}</span>
                    <span className="mono text-micro text-accent">{s.amountUsdc}</span>
                  </a>
                ))}
                {!it.settlements.length && <span className="text-micro text-muted">no source paid</span>}
              </div>
            </motion.li>
          ))
        ) : (
          <li className="rounded-lg border border-dashed border-hairline p-8 text-center text-sm text-muted">
            {items.length
              ? 'No entries match your search.'
              : 'No tolls yet. Ask a question, or run the agent, and the first coins will land here.'}
          </li>
        )}
      </ul>

      {filtered.length > visible && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => setVisible((v) => v + 8)} className="btn btn-glass px-4 py-2">
            View more
          </button>
          <span className="mono text-micro text-muted">
            showing {shown.length} of {filtered.length}
          </span>
        </div>
      )}
    </section>
  );
}

// Fold a fresh result into the snapshot so coins appear instantly, without
// depending on which serverless instance answers the next ledger read.
function merge(prev: Snapshot | null, r: GroundResult): Snapshot {
  const seen = new Set<string>();
  const items = [r, ...(prev?.items ?? [])].filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  }).slice(0, 200);
  let micros = 0;
  let citations = 0;
  const per = new Set<string>();
  for (const it of items)
    for (const s of it.settlements) {
      micros += s.micros;
      citations += 1;
      per.add(s.handle);
    }
  return {
    items,
    totals: {
      answers: items.length,
      citations,
      micros,
      usdc: (micros / 1e6).toFixed(6),
      sourcesPaid: per.size,
    },
  };
}

function Stat({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`mono text-2xl tracking-tight ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
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
