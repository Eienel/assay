import { NextResponse } from 'next/server';
import { settleEarningsOnChain } from '@/lib/arc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Settle a source's accrued earnings to its wallet as a real on-chain transfer,
// so the payout can be verified on ArcScan.
export async function POST(request: Request) {
  try {
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
