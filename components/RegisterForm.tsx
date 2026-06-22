'use client';

import { useState } from 'react';
import { CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { addressUrl } from '@/lib/explorer';

// Lets a real creator claim a wallet so answers grounded in their content pay
// them. Receiving needs nothing but an address; this just registers the source.
export function RegisterForm() {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [payTo, setPayTo] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; payTo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, handle, payTo, text }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Could not register.');
      setDone({ name: d.source.name, payTo: d.source.payTo });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="glass ticks rounded-lg p-5">
        <div className="flex items-center gap-2 text-accent">
          <CheckCircle size={18} weight="fill" />
          <span className="text-sm font-medium">{done.name} is registered</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Ask a question its content answers and it earns, paid to{' '}
          <a
            href={addressUrl(done.payTo)}
            target="_blank"
            rel="noreferrer"
            className="mono text-accent hover:underline"
          >
            {done.payTo.slice(0, 6)}…{done.payTo.slice(-4)} ↗
          </a>
          . Settle it on-chain from the sources list any time.
        </p>
        <button onClick={() => setDone(null)} className="btn btn-glass mt-4 px-3 py-1.5 text-micro">
          Register another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass ticks rounded-lg p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your publication" className="inp" />
        </Field>
        <Field label="Handle (optional)">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@you" className="inp" />
        </Field>
      </div>
      <Field label="Wallet address (any EVM address you control)">
        <input value={payTo} onChange={(e) => setPayTo(e.target.value)} placeholder="0x..." className="inp font-mono" />
      </Field>
      <Field label="What you publish (a sentence or two answers can draw on)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="inp" />
      </Field>
      <div className="mt-1 flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-accent px-4 py-2 disabled:opacity-60">
          {busy ? <CircleNotch size={15} className="animate-spin" /> : null}
          Claim my wallet
        </button>
        {error && <span className="text-micro text-red-400">{error}</span>}
      </div>

      <style>{`
        .inp { width:100%; background:rgba(255,255,255,0.04); border:1px solid var(--hairline); border-radius:6px; padding:0.5rem 0.65rem; font-size:0.8125rem; color:var(--ink); line-height:1.5; }
        .inp:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
        textarea.inp { resize:vertical; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
