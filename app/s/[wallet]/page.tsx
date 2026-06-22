import Link from 'next/link';
import type { Metadata } from 'next';
import { Coin } from '@/components/Coin';
import { WithdrawPanel } from '@/components/WithdrawPanel';
import { getEarnings } from '@/lib/arc';
import { sourceByPayTo } from '@/lib/catalog';
import { paymentsTo } from '@/lib/ledger';
import { addressUrl } from '@/lib/explorer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Source earnings, Assay' };

const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default async function SourcePage({ params }: { params: { wallet: string } }) {
  const wallet = params.wallet;
  if (!isAddr(wallet)) {
    return (
      <main className="mx-auto max-w-shell px-5 py-24 sm:px-8">
        <p className="text-muted">That is not a valid wallet address.</p>
        <Link href="/" className="wipe mt-3 inline-block text-sm text-accent">
          Back to Assay
        </Link>
      </main>
    );
  }

  const [source, earnings, payments] = await Promise.all([
    sourceByPayTo(wallet),
    getEarnings(wallet),
    paymentsTo(wallet),
  ]);

  const totalPaid = payments.reduce((n, p) => n + Number(p.amountUsdc), 0);

  return (
    <main className="mx-auto max-w-shell px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <Link href="/#sources" className="wipe text-sm text-muted hover:text-ink">
        ← All sources
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <Coin size={44} paid />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {source?.name ?? 'Unregistered source'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {source?.handle && <span className="mono text-micro text-muted">{source.handle}</span>}
            <a
              href={addressUrl(wallet)}
              target="_blank"
              rel="noreferrer"
              className="mono text-micro text-muted hover:text-accent"
            >
              {short(wallet)} ↗
            </a>
            {source?.registered && (
              <span className="rounded-full border border-accent/40 px-1.5 text-micro text-accent">claimed</span>
            )}
            {source?.live && (
              <span className="rounded-full border border-hairline px-1.5 text-micro text-accent">live</span>
            )}
          </div>
        </div>
      </header>

      {/* Balances */}
      <div className="glass ticks mt-8 rounded-lg p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat label="Claimable (Gateway)" value={`${earnings.gateway} USDC`} accent />
          <Stat label="In wallet (on-chain)" value={`${earnings.onchain} USDC`} />
          <Stat label="Citations paid" value={String(payments.length)} />
        </div>
        <div className="mt-6 border-t border-hairline pt-5">
          <WithdrawPanel payTo={wallet} hasEarnings={earnings.gatewayMicros > 0} />
          <p className="mt-3 max-w-prose text-micro text-muted">
            Earnings accrue gas-free in the Circle Gateway as answers cite this source. Withdraw moves
            them on-chain into this wallet, where they are yours to spend. Test USDC on Arc.
          </p>
        </div>
      </div>

      {/* Payment history */}
      <h2 className="label mt-10">Paid by these answers</h2>
      <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
        {payments.length ? (
          payments.map((p, i) => (
            <li key={i} className="flex items-center gap-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.question}</span>
              <span className="mono shrink-0 text-micro text-muted">{ago(p.ts)}</span>
              <span className="mono shrink-0 text-sm text-accent">{p.amountUsdc} USDC</span>
            </li>
          ))
        ) : (
          <li className="py-8 text-center text-sm text-muted">
            No payments yet. When an answer is grounded in this source, it earns here.
          </li>
        )}
      </ul>
      {payments.length > 0 && (
        <p className="mt-3 mono text-micro text-muted">
          {totalPaid.toFixed(6)} USDC across {payments.length}{' '}
          {payments.length === 1 ? 'citation' : 'citations'} shown
        </p>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`mono text-xl tracking-tight ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}
