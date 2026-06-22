'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CircleNotch, CheckCircle, Coins } from '@phosphor-icons/react';
import type { GroundResult } from '@/lib/types';

interface Step {
  question: string;
  state: 'pending' | 'running' | 'paid' | 'skipped';
  paidUsdc?: number;
  sources?: number;
}

const BUDGETS = [0.01, 0.03, 0.05];

export function AgentConsole() {
  const [goal, setGoal] = useState('How do nanopayments, x402, and Arc fit together?');
  const [budget, setBudget] = useState(0.03);
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [spent, setSpent] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  async function dispatch() {
    if (running) return;
    setRunning(true);
    setSteps([]);
    setSpent(0);
    setStrategy(null);
    setNote(null);
    try {
      // 1. The agent plans.
      const planRes = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      if (!planRes.ok) throw new Error((await planRes.json()).error ?? 'Planning failed.');
      const plan = (await planRes.json()) as { strategy: string; questions: string[] };
      setStrategy(plan.strategy);
      setSteps(plan.questions.map((q) => ({ question: q, state: 'pending' })));

      // 2. The agent works the plan, watching its budget.
      let runningSpent = 0;
      let stopMsg: string | null = null;
      for (let i = 0; i < plan.questions.length; i++) {
        if (runningSpent >= budget) {
          stopMsg = `Stopped: budget of ${budget.toFixed(2)} USDC reached after ${i} of ${plan.questions.length} questions.`;
          setSteps((prev) => prev.map((s, j) => (j >= i ? { ...s, state: 'skipped' } : s)));
          break;
        }
        setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, state: 'running' } : s)));
        try {
          const res = await fetch('/api/ground', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ question: plan.questions[i] }),
          });
          if (res.ok) {
            const r = (await res.json()) as GroundResult;
            const paid = r.settledMicros / 1e6;
            runningSpent += paid;
            setSpent(runningSpent);
            window.dispatchEvent(new CustomEvent('obol:settled', { detail: r }));
            setSteps((prev) =>
              prev.map((s, j) =>
                j === i ? { ...s, state: 'paid', paidUsdc: paid, sources: r.settlements.length } : s,
              ),
            );
          } else {
            setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, state: 'skipped' } : s)));
          }
        } catch {
          setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, state: 'skipped' } : s)));
        }
      }
      setNote(stopMsg ?? `Goal covered. Spent ${runningSpent.toFixed(6)} of ${budget.toFixed(2)} USDC.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Agent failed.');
    } finally {
      setRunning(false);
    }
  }

  const pct = Math.min(100, (spent / budget) * 100);

  return (
    <section id="agent" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Dispatch a research agent</h2>
      <p className="mt-3 max-w-prose text-base text-muted">
        Give it a goal and a budget. It plans its own questions, pays each source it draws on, tracks
        its spend, and stops when the goal is covered or the budget runs out.
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
            {running ? <CircleNotch size={15} className="animate-spin" /> : <Play size={14} weight="fill" />}
            {running ? 'Working' : 'Dispatch agent'}
          </button>
        </div>

        {(strategy || steps.length > 0) && (
          <div className="mt-5 border-t border-hairline pt-4">
            {strategy && (
              <p className="mb-3 text-sm text-muted">
                <span className="label mr-2">Plan</span>
                {strategy}
              </p>
            )}
            {/* budget bar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-accent"
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <span className="mono shrink-0 text-micro text-muted">
                {spent.toFixed(6)} / {budget.toFixed(2)} USDC
              </span>
            </div>

            <ul className="space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="shrink-0">
                    {s.state === 'running' ? (
                      <CircleNotch size={15} className="animate-spin text-accent" />
                    ) : s.state === 'paid' ? (
                      <CheckCircle size={15} weight="fill" className="text-accent" />
                    ) : s.state === 'skipped' ? (
                      <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-full border border-hairline" />
                    ) : (
                      <Coins size={15} className="text-muted" />
                    )}
                  </span>
                  <span className={`flex-1 ${s.state === 'skipped' ? 'text-muted line-through' : 'text-ink'}`}>
                    {s.question}
                  </span>
                  {s.state === 'paid' && (
                    <span className="mono shrink-0 text-micro text-accent">
                      {s.paidUsdc?.toFixed(6)} ({s.sources})
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {note && <p className="mt-4 text-sm text-muted">{note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
