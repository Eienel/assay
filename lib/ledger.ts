import type { GroundResult } from './types';

// In-memory ledger of settlements. Survives within a warm server instance,
// which is all the live demo needs. A global keeps it stable across dev HMR.
interface Store {
  items: GroundResult[];
}
const g = globalThis as unknown as { __obolLedger?: Store };
const store: Store = (g.__obolLedger ??= { items: [] });

export function record(result: GroundResult) {
  store.items.unshift(result);
  if (store.items.length > 200) store.items.length = 200;
}

export function snapshot() {
  const items = store.items;
  let micros = 0;
  let citations = 0;
  const perSource = new Map<string, number>();
  for (const it of items) {
    for (const s of it.settlements) {
      micros += s.micros;
      citations += 1;
      perSource.set(s.handle, (perSource.get(s.handle) ?? 0) + s.micros);
    }
  }
  return {
    items,
    totals: {
      answers: items.length,
      citations,
      micros,
      usdc: (micros / 1e6).toFixed(6),
      sourcesPaid: perSource.size,
    },
  };
}
