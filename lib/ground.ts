import { retrieve } from './retrieve';
import { groundedAnswer } from './answer';
import { attribute } from './verifier';
import { ensureDeposit, getGateway, payToSource } from './arc';
import { record } from './ledger';
import type { GroundResult, Settlement } from './types';

// Pricing knobs, read once. Per citation, not a flat fee: each source the answer
// genuinely used earns a base rate scaled by how much it contributed, capped so
// a single answer can never drain the funder.
export function pricing() {
  const rate = parseFloat(
    process.env.OBOL_RATE_PER_CITATION ?? process.env.OBOL_TOLL_USDC ?? '0.0015',
  );
  const maxToll = parseFloat(process.env.OBOL_MAX_TOLL_USDC ?? '0.02');
  return { rate, maxToll };
}

// The whole grounding + settlement flow for a single question. Retrieve sources,
// answer grounded in them, verify which sources the answer actually used, then
// settle a per-citation toll split across those sources as real nanopayments on
// Arc. Shared by the /api/ground route and the autonomous agent loop.
//
// `minWeight` lets a caller (the agent) refuse to pay a source whose grounded
// contribution is below a confidence floor, even if the verifier grounded it.
export async function groundQuestion(
  question: string,
  origin: string,
  opts: { minWeight?: number } = {},
): Promise<GroundResult> {
  const { rate, maxToll } = pricing();
  const minWeight = opts.minWeight ?? 0;

  const retrieved = await retrieve(question, 4);
  const { answer } = await groundedAnswer(question, retrieved);
  const { sources, method } = await attribute(question, answer, retrieved);

  const byId = new Map(retrieved.map((r) => [r.id, r]));
  const grounded = sources.filter((s) => s.grounded && s.weight > minWeight);
  const n = grounded.length;
  const cap = Math.round(maxToll * 1e6);
  let running = 0;
  const settlements: Settlement[] = grounded.map((s) => {
    const src = byId.get(s.id)!;
    // weight sums to 1, so weight * n averages to 1 per source: total scales
    // with the number of grounded sources, each share set by contribution.
    let micros = Math.max(1, Math.round(rate * 1e6 * s.weight * n));
    micros = Math.min(micros, Math.max(1, cap - running));
    running += micros;
    return {
      sourceId: s.id,
      name: s.name,
      handle: s.handle,
      payTo: src.payTo,
      micros,
      amountUsdc: (micros / 1e6).toFixed(6),
    };
  });

  // Settle live on Arc when a funder key is present.
  let live = false;
  if (getGateway() && settlements.length) {
    try {
      const total = settlements.reduce((s, x) => s + x.micros, 0);
      await ensureDeposit(total);
      for (const s of settlements) {
        s.txId = await payToSource(origin, s.sourceId, s.payTo, s.micros);
      }
      live = true;
    } catch (e) {
      console.error('[assay] settlement failed:', (e as Error).message);
    }
  }

  const result: GroundResult = {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    question: question.trim(),
    answer,
    sources,
    settlements,
    tollUsdc: rate,
    settledMicros: settlements.reduce((s, x) => s + x.micros, 0),
    method,
    live,
    ts: Date.now(),
  };
  await record(result);
  return result;
}
