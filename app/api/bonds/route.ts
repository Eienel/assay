import { NextResponse } from 'next/server';
import { listBrokers, evaluate, resetBrokers, reputation } from '@/lib/bonds';
import { treasuryAddress } from '@/lib/arc';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The standing of every broker agent: bond at risk and current reputation.
export async function GET() {
  const brokers = await listBrokers();
  return NextResponse.json({
    treasury: treasuryAddress(),
    brokers: brokers.map((b) => ({ ...b, reputation: reputation(b) })),
  });
}

// Run one evaluation: ground a question, judge each consulted source, and settle
// the bond consequences on-chain. `reset` re-seeds the brokers for a clean demo.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string; reset?: boolean };
    if (body.reset) {
      const brokers = await resetBrokers();
      return NextResponse.json({ reset: true, brokers: brokers.map((b) => ({ ...b, reputation: reputation(b) })) });
    }

    const limit = await rateLimit(`bonds:${clientIp(request)}`, 8, 60);
    if (!limit.ok) {
      return NextResponse.json({ error: `Try again in ${limit.retryAfter}s.` }, { status: 429 });
    }
    const question = (body.question ?? '').trim();
    if (!question) {
      return NextResponse.json({ error: 'Ask a question to test the brokers.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const result = await evaluate(question, origin);
    const brokers = await listBrokers();
    return NextResponse.json({
      ...result,
      brokers: brokers.map((b) => ({ ...b, reputation: reputation(b) })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
