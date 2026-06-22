import type { GroundResult } from './types';
import { hasKv, kv } from './kv';

// Durable ledger. When Vercel KV / Upstash Redis is configured it persists
// across serverless instances; otherwise it falls back to an in-memory store
// (fine for local and single-instance demos).
const KEY = 'obol:ledger';
const CAP = 200;

const g = globalThis as unknown as { __obolLedger?: GroundResult[]; __obolDep?: string };
const mem: GroundResult[] = (g.__obolLedger ??= []);
const DEP_KEY = 'obol:lastDeposit';

export async function record(result: GroundResult): Promise<void> {
  if (hasKv()) {
    try {
      await kv(['LPUSH', KEY, JSON.stringify(result)]);
      await kv(['LTRIM', KEY, 0, CAP - 1]);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  mem.unshift(result);
  if (mem.length > CAP) mem.length = CAP;
}

async function items(): Promise<GroundResult[]> {
  if (hasKv()) {
    try {
      const out = (await kv(['LRANGE', KEY, 0, CAP - 1])) as { result: string[] };
      return (out.result ?? []).map((s) => JSON.parse(s) as GroundResult);
    } catch {
      /* fall through to memory */
    }
  }
  return mem;
}

export async function setLastDeposit(tx: string): Promise<void> {
  g.__obolDep = tx;
  if (hasKv()) {
    try {
      await kv(['SET', DEP_KEY, tx]);
    } catch {
      /* ignore */
    }
  }
}

export async function getLastDeposit(): Promise<string | undefined> {
  if (hasKv()) {
    try {
      const out = (await kv(['GET', DEP_KEY])) as { result: string | null };
      if (out.result) return out.result;
    } catch {
      /* ignore */
    }
  }
  return g.__obolDep || process.env.OBOL_FUNDING_TX || undefined;
}

// Recent answers that paid a given wallet, newest first.
export async function paymentsTo(payTo: string, limit = 20) {
  const a = payTo.toLowerCase();
  const list = await items();
  const out: { question: string; amountUsdc: string; ts: number; txId?: string }[] = [];
  for (const it of list) {
    for (const s of it.settlements) {
      if (s.payTo.toLowerCase() === a) {
        out.push({ question: it.question, amountUsdc: s.amountUsdc, ts: it.ts, txId: s.txId });
      }
    }
  }
  return out.slice(0, limit);
}

export async function snapshot() {
  const list = await items();
  let micros = 0;
  let citations = 0;
  const perSource = new Map<string, number>();
  for (const it of list) {
    for (const s of it.settlements) {
      micros += s.micros;
      citations += 1;
      perSource.set(s.handle, (perSource.get(s.handle) ?? 0) + s.micros);
    }
  }
  return {
    store: hasKv() ? 'kv' : 'memory',
    lastDepositTx: await getLastDeposit(),
    items: list,
    totals: {
      answers: list.length,
      citations,
      micros,
      usdc: (micros / 1e6).toFixed(6),
      sourcesPaid: perSource.size,
    },
  };
}
