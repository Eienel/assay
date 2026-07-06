'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CircleNotch,
  ShieldCheck,
  Coins,
  Warning,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { addressUrl, txUrl } from '@/lib/explorer';

interface Broker {
  id: string;
  name: string;
  wallet: string;
  backsHandle: string;
  stakedMicros: number;
  bondMicros: number;
  earnedMicros: number;
  vouches: number;
  slashes: number;
  reputation: number;
}

interface Judgment {
  brokerId: string;
  brokerName: string;
  backsHandle: string;
  delivered: boolean;
  weight: number;
  reason: string;
  action: 'reward' | 'slash' | 'insolvent';
  amountUsdc: string;
  txId: string | null;
  live: boolean;
  bondAfterUsdc: string;
  reputation: number;
}

const SUGGESTIONS = [
  'Compare the lepton, x402, USDC, and Circle Gateway batching.',
  'How does x402 turn an endpoint into a paid resource?',
  'Tell me about coins, drachma, obol, agents, and stablecoin gas.',
];

const usd = (m: number) => (m / 1e6).toFixed(6);

export function BondsConsole() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [treasury, setTreasury] = useState<string | null>(null);
  const [question, setQuestion] = useState(SUGGESTIONS[0]);
  const [running, setRunning] = useState(false);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, 'reward' | 'slash'>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bonds', { cache: 'no-store' });
      const d = await res.json();
      setBrokers(d.brokers ?? []);
      setTreasury(d.treasury ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function evaluate() {
    if (running || !question.trim()) return;
    setRunning(true);
    setError(null);
    setJudgments([]);
    setAnswer(null);
    try {
      const res = await fetch('/api/bonds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Evaluation failed.');
      setJudgments(d.judgments ?? []);
      setAnswer(d.answer ?? null);
      setBrokers(d.brokers ?? []);
      const f: Record<string, 'reward' | 'slash'> = {};
      for (const j of d.judgments ?? []) {
        if (j.action === 'reward') f[j.brokerId] = 'reward';
        if (j.action === 'slash') f[j.brokerId] = 'slash';
      }
      setFlash(f);
      setTimeout(() => setFlash({}), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed.');
    } finally {
      setRunning(false);
    }
  }

  async function reset() {
    setRunning(true);
    try {
      const res = await fetch('/api/bonds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const d = await res.json();
      setBrokers(d.brokers ?? []);
      setJudgments([]);
      setAnswer(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mx-auto max-w-shell px-5 py-16 sm:px-8">
      <div className="max-w-prose">
        <span className="label">Agent to agent · reputation as collateral</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">The bonding ring</h1>
        <p className="mt-3 text-base text-muted">
          Every source here is vouched for by a broker agent that has staked a USDC bond on its
          grounding quality. Ask a question. The same verifier that splits the toll now judges each
          source it consulted, and the bonds settle the consequence: a broker whose source delivered
          earns a vouching fee, a broker whose source underdelivered is slashed on-chain. Reputation
          is capital at risk, not a number you are asked to trust.
        </p>
        {treasury && (
          <a
            href={addressUrl(treasury)}
            target="_blank"
            rel="noreferrer"
            className="mono mt-2 inline-flex items-center gap-1 text-micro text-accent hover:underline"
            title="Slashed bonds return to this escrow on-chain"
          >
            bond escrow on ArcScan ↗
          </a>
        )}
      </div>

      {/* the console */}
      <div className="glass ticks mt-8 rounded-lg p-5">
        <label className="label mb-1.5 block">Question to test the brokers</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded border border-hairline bg-white/[0.04] px-3 py-2 text-base text-ink outline-none placeholder:text-muted focus-visible:outline-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              disabled={running}
              className="btn-glass rounded-full px-3 py-1 text-micro text-muted"
              title={s}
            >
              {s.length > 42 ? s.slice(0, 42) + '...' : s}
            </button>
          ))}
          <button
            onClick={evaluate}
            disabled={running || !question.trim()}
            className="btn btn-accent ml-auto px-4 py-2 disabled:opacity-60"
          >
            {running ? <CircleNotch size={15} className="animate-spin" /> : <Play size={14} weight="fill" />}
            {running ? 'Judging' : 'Run evaluation'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}

        {answer && (
          <div className="mt-5 border-t border-hairline pt-4">
            <p className="text-sm text-ink">{answer}</p>
            <ul className="mt-3 space-y-2">
              <AnimatePresence initial={false}>
                {judgments.map((j) => (
                  <motion.li
                    key={j.brokerId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
                      j.action === 'reward'
                        ? 'border-accent/25 bg-accent/[0.05]'
                        : j.action === 'slash'
                          ? 'border-rust/30 bg-rust/[0.06]'
                          : 'border-hairline bg-white/[0.03]'
                    }`}
                  >
                    {j.action === 'reward' ? (
                      <Coins size={16} className="mt-0.5 shrink-0 text-accent" />
                    ) : (
                      <Warning size={16} className="mt-0.5 shrink-0 text-rust" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-ink">
                          {j.brokerName}{' '}
                          <span className="mono text-micro text-muted">backs {j.backsHandle}</span>
                        </span>
                        <span
                          className={`mono text-micro ${j.action === 'reward' ? 'text-accent' : 'text-rust'}`}
                        >
                          {j.action === 'reward'
                            ? `+${j.amountUsdc} fee`
                            : j.action === 'slash'
                              ? `-${j.amountUsdc} slashed`
                              : 'bond exhausted'}
                        </span>
                      </div>
                      <p className="mt-1 text-micro text-muted">{j.reason}</p>
                      {j.txId && (
                        <a
                          href={txUrl(j.txId)}
                          target="_blank"
                          rel="noreferrer"
                          className="mono mt-1 inline-block text-[10px] text-accent hover:underline"
                        >
                          {j.action === 'reward' ? 'fee paid on-chain' : 'slash settled on-chain'} ↗
                        </a>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </div>

      {/* the roster */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Broker standing</h2>
        <button onClick={reset} disabled={running} className="btn btn-glass px-3 py-1.5 text-micro disabled:opacity-60">
          <ArrowsClockwise size={13} />
          Reset bonds
        </button>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {brokers.map((b) => {
          const health = b.stakedMicros ? b.bondMicros / b.stakedMicros : 0;
          const fl = flash[b.id];
          return (
            <li
              key={b.id}
              className={`glass rounded-lg p-4 transition-colors ${
                fl === 'reward' ? 'glow-fresh' : fl === 'slash' ? 'ring-1 ring-rust/50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-ink">
                    <ShieldCheck size={15} className="text-accent" />
                    {b.name}
                  </div>
                  <a
                    href={addressUrl(b.wallet)}
                    target="_blank"
                    rel="noreferrer"
                    className="mono text-micro text-muted hover:text-accent"
                  >
                    backs {b.backsHandle}
                  </a>
                </div>
                <div className="text-right">
                  <div className="mono text-lg leading-none text-ink">{b.reputation}</div>
                  <div className="label mt-1">reputation</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="label">Bond remaining</span>
                  <span className="mono text-micro text-muted">
                    {usd(b.bondMicros)} / {usd(b.stakedMicros)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={`h-full ${health > 0.5 ? 'bg-accent' : 'bg-rust'}`}
                    animate={{ width: `${Math.max(2, health * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              <div className="mono mt-3 flex gap-4 text-[10px] text-muted">
                <span className="text-accent">{b.vouches} vouches</span>
                <span className="text-rust">{b.slashes} slashes</span>
                <span>{usd(b.earnedMicros)} earned</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
