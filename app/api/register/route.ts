import { NextResponse } from 'next/server';
import { addSource } from '@/lib/registry';
import { rateLimit, clientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Register a source: a creator claims a wallet so answers grounded in their
// content pay them directly. Receiving needs nothing but an address.
export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`register:${clientIp(request)}`, 5, 300);
    if (!limit.ok) {
      return NextResponse.json({ error: `Try again in ${limit.retryAfter}s.` }, { status: 429 });
    }
    const body = (await request.json()) as {
      name?: string;
      handle?: string;
      payTo?: string;
      text?: string;
    };
    const name = (body.name ?? '').trim().slice(0, 60);
    let handle = (body.handle ?? '').trim().slice(0, 40);
    const payTo = (body.payTo ?? '').trim();
    const text = (body.text ?? '').trim().slice(0, 600);

    if (!name) return NextResponse.json({ error: 'Add a name.' }, { status: 400 });
    if (!/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
      return NextResponse.json({ error: 'Enter a valid 0x wallet address.' }, { status: 400 });
    }
    if (text.length < 20) {
      return NextResponse.json({ error: 'Add a sentence or two of your content.' }, { status: 400 });
    }
    if (handle && !handle.startsWith('@')) handle = '@' + handle;
    if (!handle) handle = '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '');

    const src = await addSource({ name, handle, payTo: payTo as `0x${string}`, text });
    return NextResponse.json({ source: { id: src.id, name: src.name, handle: src.handle, payTo: src.payTo } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
