import { NextResponse } from 'next/server';
import { geminiJson, hasGemini } from '@/lib/gemini';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The agent's planning step: turn a research goal into a short, ordered set of
// questions it will work through. This is the decision the agent makes before it
// starts spending; the budget loop runs client-side against /api/ground.
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`plan:${clientIp(request)}`, 6, 60);
    if (!limit.ok) {
      return NextResponse.json({ error: `Try again in ${limit.retryAfter}s.` }, { status: 429 });
    }
    const { goal } = (await request.json()) as { goal?: string };
    if (!goal || !goal.trim()) {
      return NextResponse.json({ error: 'Give the agent a goal.' }, { status: 400 });
    }

    if (hasGemini()) {
      try {
        const out = await geminiJson<{ strategy: string; questions: string[] }>(
          'You are a research agent planning how to investigate a goal by asking a sequence ' +
            'of focused questions, each answerable from a knowledge source. Return a one-line ' +
            'strategy and 4 to 6 specific questions, ordered. Never use an em dash.',
          `GOAL: ${goal}`,
          {
            type: 'OBJECT',
            properties: {
              strategy: { type: 'STRING' },
              questions: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['strategy', 'questions'],
          },
        );
        const questions = (out.questions ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 6);
        if (questions.length) return NextResponse.json({ strategy: out.strategy, questions });
      } catch {
        /* fall through */
      }
    }

    // Fallback plan when no model is available.
    return NextResponse.json({
      strategy: `Break the goal into direct questions and pay each source consulted.`,
      questions: [
        `${goal.trim()}?`.replace(/\?\?$/, '?'),
        `What background explains ${goal.trim()}?`,
        `What are the key components of ${goal.trim()}?`,
        `Why does ${goal.trim()} matter?`,
      ],
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
