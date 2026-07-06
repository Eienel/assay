import { NextResponse } from 'next/server';
import { groundQuestion } from '@/lib/ground';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Retrieve sources, answer the question grounded in them, verify which sources
// the answer actually used, then settle a per-citation toll to each as real
// nanopayments on Arc. The core lives in lib/ground.ts, shared with the agent.
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`ground:${clientIp(request)}`, 12, 60);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Slow down a moment, try again in ${limit.retryAfter}s.` },
        { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
      );
    }

    const { question } = (await request.json()) as { question?: string };
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const result = await groundQuestion(question.trim(), origin);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
