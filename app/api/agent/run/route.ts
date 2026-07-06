import { runAgent } from '@/lib/agent';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Drives the autonomous agent and streams its decisions as they happen, one
// server-sent event per step, so the client watches it think, spend, and stop
// rather than replaying a finished transcript.
export async function POST(request: Request) {
  const limit = await rateLimit(`agentrun:${clientIp(request)}`, 4, 60);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: `Try again in ${limit.retryAfter}s.` }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });
  }

  let goal = '';
  let budget = 0.03;
  try {
    const body = (await request.json()) as { goal?: string; budget?: number };
    goal = (body.goal ?? '').trim();
    if (typeof body.budget === 'number' && body.budget > 0) budget = Math.min(body.budget, 1);
  } catch {
    /* defaults */
  }
  if (!goal) {
    return new Response(JSON.stringify({ error: 'Give the agent a goal.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const event of runAgent(goal, budget, origin)) {
          send(event);
        }
      } catch (e) {
        send({ type: 'error', message: (e as Error).message });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
