import { NextResponse } from 'next/server';
import { settleEarningsOnChain } from '@/lib/arc';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Settle a source's accrued earnings to its wallet as a real on-chain transfer,
// so the payout can be verified on ArcScan.
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`withdraw:${clientIp(request)}`, 6, 60);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many settlements, try again in ${limit.retryAfter}s.` },
        { status: 429 },
      );
    }
    const { payTo } = (await request.json()) as { payTo?: string };
    if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
      return NextResponse.json({ error: 'Bad address.' }, { status: 400 });
    }
    const res = await settleEarningsOnChain(payTo);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
