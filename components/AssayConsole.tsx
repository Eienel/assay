'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, ArrowCounterClockwise } from '@phosphor-icons/react';
import { OperationRow, type Row } from './OperationRow';
import type { AgentStep, AssayedOperation } from '@/lib/types';
import type { CawPrecheck } from '@/lib/caw/precheck';

type PactInfo = { intent: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AssayConsole({ pact, steps }: { pact: PactInfo; steps: AgentStep[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const stepsById = useRef(new Map(steps.map((s) => [s.id, s])));

  const update = (stepId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.stepId === stepId ? { ...r, ...patch } : r)));

  async function run() {
    setRunning(true);
    setRows([]);
    for (const step of steps) {
      const base: Row = {
        stepId: step.id,
        amount: step.operation.amount,
        tokenSymbol: step.operation.tokenSymbol,
        dstLabel: step.operation.dstLabel,
        dstAddress: step.operation.dstAddress,
        reasoning: step.reasoning,
        status: 'assaying',
      };
      setRows((prev) => [...prev, base]);

      try {
        const res = await fetch('/api/assay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ step }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? `Request failed (${res.status})`);
        const data = (await res.json()) as {
          assayed: AssayedOperation;
          cawPrecheck: CawPrecheck;
        };
        update(step.id, {
          status: deriveStatus(data.assayed),
          assayed: data.assayed,
          cawPrecheck: data.cawPrecheck,
        });
      } catch (err) {
        update(step.id, { status: 'error', error: err instanceof Error ? err.message : 'Error' });
      }

      // A beat between steps so the hero lands rather than flashing past.
      await sleep(900);
    }
    setRunning(false);
  }

  async function release(stepId: string) {
    const step = stepsById.current.get(stepId);
    if (!step) return;
    setBusyRow(stepId);
    try {
      const res = await fetch('/api/forward', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: step.operation }),
      });
      const data = await res.json();
      const hash = data?.outcome?.status === 'submitted' ? data.outcome.transactionHash : undefined;
      update(stepId, { status: 'released', releaseTxHash: hash });
    } catch {
      update(stepId, { status: 'error', error: 'Could not forward to CAW.' });
    } finally {
      setBusyRow(null);
    }
  }

  function discard(stepId: string) {
    update(stepId, { status: 'discarded' });
  }

  const started = rows.length > 0;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="field-label">Assay timeline</h2>
        {started && !running && (
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            onClick={run}
            className="wipe-link inline-flex items-center gap-1.5 text-sm text-muted"
          >
            <ArrowCounterClockwise size={15} />
            Replay
          </motion.button>
        )}
      </div>

      {!started ? (
        <EmptyState onRun={run} intent={pact.intent} />
      ) : (
        <ul className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <OperationRow
                key={row.stepId}
                row={row}
                onRelease={release}
                onDiscard={discard}
                busy={busyRow === row.stepId}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function EmptyState({ onRun, intent }: { onRun: () => void; intent: string }) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-hairline bg-surface p-8 text-center">
      <p className="mx-auto max-w-[44ch] text-base text-muted">
        An agent is running under the mandate above. Play its session to watch each payment get
        assayed against{' '}
        <span className="text-ink">{trimIntent(intent)}</span> before the wallet is allowed to sign.
      </p>
      <motion.button
        whileTap={{ scale: 0.97, y: 1 }}
        onClick={onRun}
        className="mt-6 inline-flex items-center gap-2 rounded border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        <Play size={15} weight="fill" />
        Run the agent session
      </motion.button>
    </div>
  );
}

function deriveStatus(a: AssayedOperation): Row['status'] {
  if (a.conformance.verdict !== 'PASS') return 'held';
  if (a.caw.status === 'denied') return 'caw_denied';
  return 'passed';
}

const trimIntent = (s: string) => (s.endsWith('.') ? s.slice(0, -1) : s);
