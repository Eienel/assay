'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Prohibit, Warning } from '@phosphor-icons/react';
import { Hallmark } from './Hallmark';
import { liftHover, sinkTap } from '@/lib/motion';
import type { AssayedOperation } from '@/lib/types';
import type { CawPrecheck } from '@/lib/caw/precheck';

export type RowStatus =
  | 'assaying'
  | 'passed'
  | 'caw_denied'
  | 'held'
  | 'released'
  | 'discarded'
  | 'error';

export interface Row {
  stepId: string;
  amount: string;
  tokenSymbol: string;
  dstLabel?: string;
  dstAddress: string;
  reasoning: string;
  status: RowStatus;
  assayed?: AssayedOperation;
  cawPrecheck?: CawPrecheck;
  releaseTxHash?: string;
  error?: string;
}

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function OperationRow({
  row,
  onRelease,
  onDiscard,
  busy,
}: {
  row: Row;
  onRelease: (stepId: string) => void;
  onDiscard: (stepId: string) => void;
  busy: boolean;
}) {
  const reduce = useReducedMotion();
  const held = row.status === 'held';

  return (
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative overflow-hidden rounded-lg border bg-surface p-5"
    >
      {/* Oxide streak: drawn diagonally across the row when the op is held. */}
      <OxideStreak show={held} reduce={!!reduce} />

      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {/* The operation line, all on-chain data in mono. */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-base text-ink">
              {row.amount} {row.tokenSymbol}
            </span>
            <ArrowRight size={14} weight="bold" className="text-muted" />
            <span className="text-sm text-ink">{row.dstLabel ?? 'Unlabeled recipient'}</span>
            <span className="font-mono text-micro text-muted">{short(row.dstAddress)}</span>
          </div>

          {/* The agent's stated reasoning for this step. */}
          <p className="mt-3 text-sm leading-relaxed text-muted">
            <span className="field-label mr-2 align-middle">Agent</span>
            {row.reasoning}
          </p>

          <Verdict row={row} />
        </div>

        {/* The status mark sits to the side: hallmark on pass, nothing on hold
            (the oxide streak carries that), a small icon otherwise. */}
        <div className="flex w-8 shrink-0 justify-center pt-0.5">
          <StatusMark status={row.status} reduce={!!reduce} />
        </div>
      </div>

      {held && (
        <ReviewPanel
          row={row}
          onRelease={onRelease}
          onDiscard={onDiscard}
          busy={busy}
          reduce={!!reduce}
        />
      )}
    </motion.li>
  );
}

function StatusMark({ status, reduce }: { status: RowStatus; reduce: boolean }) {
  if (status === 'assaying') {
    return (
      <span
        className="mt-1 h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-muted"
        aria-label="Assaying"
      />
    );
  }
  if (status === 'passed' || status === 'released') {
    return (
      <span className="relative inline-flex">
        {/* The struck ring: a quick expanding ring, like a punch hitting metal. */}
        {!reduce && (
          <motion.span
            key="ring"
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 0 1px var(--hallmark)' }}
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
        <motion.span
          initial={reduce ? false : { scale: 0, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <Hallmark size={24} title="Passed the assay" />
        </motion.span>
      </span>
    );
  }
  if (status === 'caw_denied') {
    return <Prohibit size={22} className="text-muted" aria-label="Blocked by CAW" />;
  }
  if (status === 'error') {
    return <Warning size={22} className="text-oxide" aria-label="Error" />;
  }
  return null;
}

function Verdict({ row }: { row: Row }) {
  switch (row.status) {
    case 'assaying':
      return (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-3 w-40 animate-pulse rounded bg-hairline" />
          <div className="h-3 w-56 animate-pulse rounded bg-hairline" />
        </div>
      );

    case 'passed':
    case 'released': {
      const hash =
        row.releaseTxHash ??
        (row.assayed?.caw.status === 'submitted' ? row.assayed.caw.transactionHash : undefined);
      return (
        <div className="mt-4">
          <Tag tone="hallmark">
            {row.status === 'released' ? 'Released by human, signed by CAW' : 'Struck, signed by CAW'}
          </Tag>
          <p className="mt-2 text-sm text-ink">{row.assayed?.conformance.reason}</p>
          {hash && (
            <p className="mt-2 font-mono text-micro text-muted">
              tx {hash.slice(0, 10)}…{hash.slice(-8)}
            </p>
          )}
        </div>
      );
    }

    case 'caw_denied': {
      const caw = row.assayed?.caw;
      const denied = caw && caw.status === 'denied' ? caw : undefined;
      return (
        <div className="mt-4">
          <Tag tone="muted">CAW blocked, out of bounds</Tag>
          <p className="mt-2 text-sm text-ink">
            Assay passed the intent. CAW&apos;s quantitative policy stopped it.
          </p>
          {denied && (
            <div className="mt-3 rounded border border-hairline bg-paper p-3">
              <div className="font-mono text-micro text-ink">{denied.code}</div>
              <div className="mt-1 font-mono text-micro text-muted">{denied.reason}</div>
            </div>
          )}
        </div>
      );
    }

    case 'held':
      return (
        <div className="mt-4">
          <Tag tone="oxide">Held, off intent</Tag>
          <p className="mt-2 text-sm text-ink">{row.assayed?.conformance.reason}</p>
          {row.cawPrecheck?.outcome === 'would_pass' && (
            <p className="mt-2 text-sm text-oxide">
              CAW would have signed this. {row.cawPrecheck.reason}
            </p>
          )}
        </div>
      );

    case 'discarded':
      return (
        <div className="mt-4">
          <Tag tone="muted">Discarded by human</Tag>
        </div>
      );

    case 'error':
      return (
        <div className="mt-4">
          <Tag tone="oxide">Could not assay</Tag>
          <p className="mt-2 text-sm text-muted">{row.error}</p>
        </div>
      );
  }
}

function ReviewPanel({
  row,
  onRelease,
  onDiscard,
  busy,
  reduce,
}: {
  row: Row;
  onRelease: (stepId: string) => void;
  onDiscard: (stepId: string) => void;
  busy: boolean;
  reduce: boolean;
}) {
  return (
    <div className="relative mt-5 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
      <div className="field-label">Human review</div>
      <div className="flex gap-2 sm:ml-auto">
        <motion.button
          whileHover={reduce ? undefined : liftHover}
          whileTap={reduce ? undefined : sinkTap}
          disabled={busy}
          onClick={() => onDiscard(row.stepId)}
          className="rounded border border-hairline bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-paper disabled:opacity-50"
        >
          Discard
        </motion.button>
        <motion.button
          whileHover={reduce ? undefined : liftHover}
          whileTap={reduce ? undefined : sinkTap}
          disabled={busy}
          onClick={() => onRelease(row.stepId)}
          className="rounded border border-oxide bg-surface px-4 py-2 text-sm text-oxide transition-colors hover:bg-paper disabled:opacity-50"
        >
          Sign anyway
        </motion.button>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'hallmark' | 'oxide' | 'muted' }) {
  const color =
    tone === 'hallmark' ? 'text-hallmark' : tone === 'oxide' ? 'text-oxide' : 'text-muted';
  return <span className={`field-label ${color}`}>{children}</span>;
}

function OxideStreak({ show, reduce }: { show: boolean; reduce: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.svg
          key="streak"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          initial={{ opacity: reduce ? 0.12 : 0 }}
          animate={{ opacity: 0.12 }}
          exit={{ opacity: 0 }}
        >
          <motion.line
            x1="2"
            y1="92"
            x2="98"
            y2="8"
            stroke="var(--oxide)"
            strokeWidth={6}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
