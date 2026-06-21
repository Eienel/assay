import { NextResponse } from 'next/server';
import { retrieve } from '@/lib/retrieve';
import { groundedAnswer } from '@/lib/answer';
import { attribute } from '@/lib/verifier';
import { ensureDeposit, getGateway, payToSource } from '@/lib/arc';
import { record } from '@/lib/ledger';
import type { GroundResult, Settlement } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The whole flow: retrieve sources, answer the question grounded in them, verify
// which sources the answer actually used, then settle a toll split across those
// sources as real nanopayments on Arc.
export async function POST(request: Request) {
  try {
    const { question } = (await request.json()) as { question?: string };
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });
    }

    const toll = parseFloat(process.env.OBOL_TOLL_USDC ?? '0.003');
    const retrieved = await retrieve(question, 4);
    const { answer } = await groundedAnswer(question, retrieved);
    const { sources, method } = await attribute(question, answer, retrieved);

    const byId = new Map(retrieved.map((r) => [r.id, r]));
    const grounded = sources.filter((s) => s.grounded && s.weight > 0);
    const settlements: Settlement[] = grounded.map((s) => {
      const src = byId.get(s.id)!;
      const micros = Math.max(1, Math.round(toll * 1e6 * s.weight));
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
    const origin = new URL(request.url).origin;
    if (getGateway() && settlements.length) {
      try {
        const total = settlements.reduce((s, x) => s + x.micros, 0);
        await ensureDeposit(total);
        for (const s of settlements) {
          s.txId = await payToSource(origin, s.sourceId, s.payTo, s.micros);
        }
        live = true;
      } catch (e) {
        console.error('[obol] settlement failed:', (e as Error).message);
      }
    }

    const result: GroundResult = {
      id: `g-${Date.now()}`,
      question: question.trim(),
      answer,
      sources,
      settlements,
      tollUsdc: toll,
      settledMicros: settlements.reduce((s, x) => s + x.micros, 0),
      method,
      live,
      ts: Date.now(),
    };
    await record(result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
