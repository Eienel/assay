import type { GroundResult } from './types';

// Durable ledger. When Vercel KV / Upstash Redis is configured (KV_REST_API_URL
// + KV_REST_API_TOKEN) it persists across serverless instances; otherwise it
// falls back to an in-memory store (fine for local and single-instance demos).

// Accept either the Vercel KV names or the Upstash Marketplace names, since the
// integration may set one or the other.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'obol:ledger';
const CAP = 200;

const g = globalThis as unknown as { __obolLedger?: GroundResult[]; __obolDep?: string };
const mem: GroundResult[] = (g.__obolLedger ??= []);
const DEP_KEY = 'obol:lastDeposit';

async function kv(cmd: unknown[]): Promise<unknown> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return (await res.json()) as { result: unknown };
}

export async function record(result: GroundResult): Promise<void> {
  if (KV_URL && KV_TOKEN) {
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
  if (KV_URL && KV_TOKEN) {
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
  if (KV_URL && KV_TOKEN) {
    try {
      await kv(['SET', DEP_KEY, tx]);
    } catch {
      /* ignore */
    }
  }
}

export async function getLastDeposit(): Promise<string | undefined> {
  if (KV_URL && KV_TOKEN) {
    try {
      const out = (await kv(['GET', DEP_KEY])) as { result: string | null };
      if (out.result) return out.result;
    } catch {
      /* ignore */
    }
  }
  return g.__obolDep || process.env.OBOL_FUNDING_TX || undefined;
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
    store: KV_URL && KV_TOKEN ? 'kv' : 'memory',
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
