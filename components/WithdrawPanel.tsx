'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleNotch } from '@phosphor-icons/react';
import { txUrl } from '@/lib/explorer';

// Withdraw a source's Gateway earnings into its wallet on-chain, then refresh
// the page so the balances update.
export function WithdrawPanel({ payTo, hasEarnings }: { payTo: string; hasEarnings: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payTo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Withdraw failed.');
      if (d.txHash) {
        setTx(d.txHash);
        setTimeout(() => router.refresh(), 1500);
      } else {
        setError('No earnings to withdraw yet.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={withdraw}
        disabled={busy || !hasEarnings}
        className="btn btn-accent px-4 py-2 disabled:opacity-50"
        title={hasEarnings ? 'Settle earnings to this wallet on-chain' : 'No earnings to withdraw yet'}
      >
        {busy ? <CircleNotch size={15} className="animate-spin" /> : null}
        Withdraw to wallet
      </button>
      {tx && (
        <a
          href={txUrl(tx)}
          target="_blank"
          rel="noreferrer"
          className="mono text-micro text-accent hover:underline"
        >
          settled, view tx ↗
        </a>
      )}
      {error && <span className="text-micro text-red-400">{error}</span>}
    </div>
  );
}
