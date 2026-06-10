import { NextResponse } from 'next/server';
import type { Operation } from '@/lib/types';
import { getCawClient } from '@/lib/caw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Human override. When a person reviews a held operation and decides to release
// it, this forwards the operation straight to CAW for signing. The guard has
// already been satisfied by a human, so it is bypassed here on purpose.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { operation?: Operation };
    if (!body.operation) {
      return NextResponse.json({ error: 'Missing operation.' }, { status: 400 });
    }
    const caw = getCawClient();
    const outcome = await caw.submitTransfer(body.operation);
    return NextResponse.json({ outcome, mode: caw.mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
