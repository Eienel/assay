'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { Coin } from './Coin';
import { SPRING } from '@/lib/motion';
import type { GroundResult } from '@/lib/types';

const EXAMPLES = [
  'What was the lepton, and what is an obol?',
  'How does x402 work?',
  'Why are nanopayments possible on Arc?',
  'How can an AI agent pay the sources it uses?',
];

const shortTx = (t?: string) => (t ? `${t.slice(0, 8)}…${t.slice(-6)}` : 'settling…');

export function AskConsole() {
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GroundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ground', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `Request failed (${res.status})`);
      const data = (await res.json()) as GroundResult;
      setResult(data);
      window.dispatchEvent(new CustomEvent('obol:settled', { detail: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="ask" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Ask, and watch a source get paid</h2>
      <p className="mt-3 max-w-prose text-base text-muted">
        Ask a question. Obol answers from its registered sources, verifies which ones the answer
        actually used, and settles a coin to each, live on Arc.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="glass mt-7 flex items-center gap-2 rounded-lg p-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything about Arc, x402, or nanopayments..."
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-ink outline-none placeholder:text-muted"
        />
        <button type="submit" disabled={loading || !q.trim()} className="btn btn-accent px-4 py-2 disabled:opacity-50">
          {loading ? <CircleNotch size={15} className="animate-spin" /> : <ArrowRight size={15} weight="bold" />}
          Ask
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => {
              setQ(e);
              ask(e);
            }}
            disabled={loading}
            className="btn-glass rounded-full px-3 py-1 text-micro text-muted hover:text-ink disabled:opacity-50"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <Skeleton key="sk" />
          ) : error ? (
            <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted">
              {error}
            </motion.p>
          ) : result ? (
            <Result key={result.id} result={result} reduce={!!reduce} />
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Result({ result, reduce }: { result: GroundResult; reduce: boolean }) {
  const settledById = new Map(result.settlements.map((s) => [s.sourceId, s]));
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="glass ticks glow-fresh rounded-lg"
    >
      <div className="border-b border-hairline p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="label">Answer</span>
          <span className="text-micro text-muted">
            {result.method === 'gemini' ? 'Gemini verifier' : 'heuristic verifier'}
            {result.live ? ' · paid via Circle Gateway' : ' · simulated'}
          </span>
        </div>
        <p className="mt-2 text-lg text-ink">{result.answer}</p>
      </div>

      <ul className="divide-y divide-hairline">
        {result.sources.map((s, i) => {
          const settle = settledById.get(s.id);
          return (
            <li key={s.id} className="flex items-center gap-4 p-4 sm:px-5">
              <motion.div
                initial={reduce || !s.grounded ? false : { y: -14, scale: 0.8, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ ...SPRING, delay: reduce ? 0 : 0.08 * i }}
                className="shrink-0"
              >
                <Coin size={34} paid={s.grounded} />
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-medium ${s.grounded ? 'text-ink' : 'text-muted line-through'}`}>
                    {s.name}
                  </span>
                  <span className="mono text-micro text-muted">{s.handle}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">{s.reason}</p>
              </div>

              <div className="shrink-0 text-right">
                {s.grounded ? (
                  <>
                    <div className="mono text-sm text-accent">{settle?.amountUsdc} USDC</div>
                    <div className="mono text-micro text-muted" title="Circle Gateway transfer id">
                      {(s.weight * 100).toFixed(0)}% · gw {shortTx(settle?.txId)}
                    </div>
                  </>
                ) : (
                  <span className="mono text-micro text-muted">paid nothing</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-hairline px-5 py-3 text-micro text-muted">
        <span>
          {result.tollUsdc.toFixed(4)} USDC per citation, priced by contribution across{' '}
          {result.settlements.length} {result.settlements.length === 1 ? 'source' : 'sources'}
        </span>
        <span className="mono text-accent">{(result.settledMicros / 1e6).toFixed(6)} USDC paid</span>
      </div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-lg p-5">
      <div className="h-3 w-16 animate-pulse rounded bg-hairline" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-hairline" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-hairline" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-hairline" />
            <div className="h-3 flex-1 animate-pulse rounded bg-hairline" />
            <div className="h-3 w-20 animate-pulse rounded bg-hairline" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
