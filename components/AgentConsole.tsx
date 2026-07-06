'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CircleNotch,
  CheckCircle,
  Coins,
  Brain,
  Path,
  Prohibit,
  FlagCheckered,
} from '@phosphor-icons/react';

const BUDGETS = [0.01, 0.03, 0.05];

// The agent's decisions, streamed. Each event is one thing it did: planned,
// decided what to ask, grounded and paid, reflected on coverage, or stopped.
type AgentEvent =
  | { type: 'plan'; strategy: string; planned: string[] }
  | { type: 'decide'; step: number; question: string; rationale: string; adaptive: boolean }
  | {
      type: 'ground';
      step: number;
      question: string;
      answer: string;
      method: string;
      live: boolean;
      paidUsdc: number;
      paid: { handle: string; amountUsdc: string }[];
      declined: { handle: string; reason: string }[];
    }
  | { type: 'reflect'; step: number; coverage: number; covered: boolean; gap: string; rationale: string }
  | {
      type: 'stop';
      reason: 'covered' | 'budget' | 'exhausted';
      note: string;
      spentUsdc: number;
      budgetUsdc: number;
      unspentUsdc: number;
      savedPct: number;
      asked: number;
      sourcesPaid: number;
    }
  | { type: 'error'; message: string };

export function AgentConsole() {
  const [goal, setGoal] = useState('How do nanopayments, x402, and Arc fit together?');
  const [budget, setBudget] = useState(0.03);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [spent, setSpent] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const runningRef = useRef(false);

  async function dispatch() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setEvents([]);
    setSpent(0);
    setCoverage(0);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal, budget }),
      });
      if (!res.ok || !res.body) {
        const msg = res.headers.get('content-type')?.includes('json')
          ? (await res.json()).error
          : 'Agent failed to start.';
        setEvents([{ type: 'error', message: msg ?? 'Agent failed.' }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const line = chunk.replace(/^data: /, '').trim();
          if (!line || line === '[DONE]') continue;
          const ev = JSON.parse(line) as AgentEvent;
          setEvents((prev) => [...prev, ev]);
          if (ev.type === 'ground') {
            acc += ev.paidUsdc;
            setSpent(acc);
            // Feed the shared ledger so coins land elsewhere on the page too.
            window.dispatchEvent(new CustomEvent('obol:settled'));
          }
          if (ev.type === 'reflect') setCoverage(ev.coverage);
        }
      }
    } catch (e) {
      setEvents((prev) => [
        ...prev,
        { type: 'error', message: e instanceof Error ? e.message : 'Agent failed.' },
      ]);
    } finally {
      setRunning(false);
      runningRef.current = false;
      // Nudge the ledger to reconcile with the durable store once finished.
      window.dispatchEvent(new CustomEvent('obol:settled'));
    }
  }

  const pct = Math.min(100, (spent / budget) * 100);
  const stop = events.find((e) => e.type === 'stop') as
    | Extract<AgentEvent, { type: 'stop' }>
    | undefined;

  return (
    <section id="agent" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Dispatch a research agent</h2>
      <p className="mt-3 max-w-prose text-base text-muted">
        Give it a goal and a budget. It plans its own questions, decides which to ask as it learns,
        pays only the sources that genuinely ground each answer, declines the weak ones, and stops the
        moment the goal is covered instead of spending to the last cent. Watch it think below.
      </p>

      <div className="glass ticks mt-7 rounded-lg p-5">
        <label className="label mb-1.5 block">Goal</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full rounded border border-hairline bg-white/[0.04] px-3 py-2 text-base text-ink outline-none placeholder:text-muted focus-visible:outline-accent"
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="label">Budget</span>
            {BUDGETS.map((b) => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                disabled={running}
                className={`mono rounded-full px-3 py-1 text-micro transition-colors ${
                  budget === b ? 'bg-accent text-stone' : 'btn-glass text-muted'
                }`}
              >
                {b.toFixed(2)}
              </button>
            ))}
          </div>
          <button
            onClick={dispatch}
            disabled={running || !goal.trim()}
            className="btn btn-accent ml-auto px-4 py-2 disabled:opacity-60"
          >
            {running ? (
              <CircleNotch size={15} className="animate-spin" />
            ) : (
              <Play size={14} weight="fill" />
            )}
            {running ? 'Thinking' : 'Dispatch agent'}
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-5 border-t border-hairline pt-4">
            {/* budget + coverage meters */}
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <Meter
                label="Budget spent"
                value={`${spent.toFixed(6)} / ${budget.toFixed(2)}`}
                pct={pct}
              />
              <Meter label="Goal coverage" value={`${Math.round(coverage * 100)}%`} pct={coverage * 100} />
            </div>

            <ol className="space-y-2.5">
              <AnimatePresence initial={false}>
                {events.map((ev, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm"
                  >
                    <EventRow ev={ev} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>

            {stop && (
              <div
                className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3.5 ${
                  stop.reason === 'covered'
                    ? 'border-accent/30 bg-accent/[0.06]'
                    : 'border-hairline bg-white/[0.03]'
                }`}
              >
                <FlagCheckered size={17} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-ink">{stop.note}</p>
                  <p className="mono mt-1 text-micro text-muted">
                    spent {stop.spentUsdc.toFixed(6)} · saved {stop.savedPct}% of budget ·{' '}
                    {stop.asked} questions · {stop.sourcesPaid} sources paid
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function EventRow({ ev }: { ev: AgentEvent }) {
  if (ev.type === 'plan') {
    return (
      <div className="flex items-start gap-2.5">
        <Path size={15} className="mt-0.5 shrink-0 text-accent" />
        <span className="text-muted">
          <span className="label mr-2">Plan</span>
          {ev.strategy}
        </span>
      </div>
    );
  }
  if (ev.type === 'decide') {
    return (
      <div className="flex items-start gap-2.5">
        <span className="mono mt-0.5 shrink-0 text-micro text-muted">{ev.step}</span>
        <span className="flex-1 text-ink">
          {ev.question}
          {ev.adaptive && (
            <span className="mono ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
              new follow-up
            </span>
          )}
          <span className="mt-0.5 block text-micro text-muted">{ev.rationale}</span>
        </span>
      </div>
    );
  }
  if (ev.type === 'ground') {
    return (
      <div className="flex items-start gap-2.5 pl-6">
        <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-accent" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {ev.paid.length ? (
              ev.paid.map((p) => (
                <span key={p.handle} className="inline-flex items-center gap-1.5">
                  <Coins size={13} className="text-accent" />
                  <span className="mono text-micro text-muted">{p.handle}</span>
                  <span className="mono text-micro text-accent">{p.amountUsdc}</span>
                </span>
              ))
            ) : (
              <span className="text-micro text-muted">no source strong enough to pay</span>
            )}
          </div>
          {ev.declined.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {ev.declined.map((d) => (
                <span key={d.handle} className="inline-flex items-center gap-1.5" title={d.reason}>
                  <Prohibit size={12} className="text-muted" />
                  <span className="mono text-[10px] text-muted line-through">{d.handle}</span>
                </span>
              ))}
              <span className="text-[10px] text-muted">declined, too weak to pay</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (ev.type === 'reflect') {
    return (
      <div className="flex items-start gap-2.5 pl-6">
        <Brain size={15} className="mt-0.5 shrink-0 text-muted" />
        <span className="text-muted">
          {ev.rationale}{' '}
          <span className="mono text-micro text-accent">coverage {Math.round(ev.coverage * 100)}%</span>
        </span>
      </div>
    );
  }
  if (ev.type === 'error') {
    return <span className="text-rust">{ev.message}</span>;
  }
  return null;
}

function Meter({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="mono text-micro text-muted">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
