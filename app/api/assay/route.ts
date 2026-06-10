import { NextResponse } from 'next/server';
import type { AgentStep } from '@/lib/types';
import { assayStep } from '@/lib/guard/orchestrator';
import { predictCawQuantitative } from '@/lib/caw/precheck';
import { getCawClient } from '@/lib/caw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Run one agent step through the guard. Returns the assayed record plus the CAW
// quantitative counterfactual, so the UI can show what CAW alone would have done.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { step?: AgentStep; intent?: string };
    if (!body.step) {
      return NextResponse.json({ error: 'Missing step.' }, { status: 400 });
    }

    const assayed = await assayStep(body.step, body.intent);
    const cawPrecheck = predictCawQuantitative(body.step.operation);

    return NextResponse.json({
      assayed,
      cawPrecheck,
      mode: getCawClient().mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
