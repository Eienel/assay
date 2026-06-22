'use client';

import { useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { txUrl } from '@/lib/explorer';

// Settle a source's accrued earnings to its wallet as a real on-chain transfer,
// then link the resulting transaction on ArcScan.
export function SettleButton({ payTo }: { payTo: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'empty' | 'error'>('idle');
  const [tx, setTx] = useState<string | null>(null);

  async function settle() {
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payTo }),
      });
      const d = await res.json();
      if (d.txHash) {
        setTx(d.txHash);
        setState('done');
      } else {
        setState('empty');
      }
    } catch {
      setState('error');
    }
  }

  if (state === 'done' && tx) {
    return (
      <a
        href={txUrl(tx)}
        target="_blank"
        rel="noreferrer"
        className="mono shrink-0 text-micro text-accent hover:underline"
        title="View settlement transaction on ArcScan"
      >
        settled ↗
      </a>
    );
  }

  return (
    <button
      onClick={settle}
      disabled={state === 'busy'}
      className="btn btn-glass shrink-0 px-2.5 py-1 text-micro disabled:opacity-60"
      title="Settle this source's earnings to its wallet on-chain"
    >
      {state === 'busy' ? (
        <CircleNotch size={12} className="animate-spin" />
      ) : state === 'empty' ? (
        'no earnings'
      ) : state === 'error' ? (
        'retry'
      ) : (
        'settle on-chain'
      )}
    </button>
  );
}
