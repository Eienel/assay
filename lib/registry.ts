import 'server-only';
import { createHash } from 'node:crypto';
import { hasKv, kv } from './kv';
import type { Source } from './sources';

// The claim store: sources that real creators register with their own wallet.
// KV-backed so registrations persist and are shared across instances; falls
// back to memory locally.
const KEY = 'obol:registered';
const CAP = 200;

const g = globalThis as unknown as { __obolReg?: Source[] };
const mem: Source[] = (g.__obolReg ??= []);

export function slug(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'source';
  // keep ids unique and stable per registration
  return `r-${base}-${createHash('sha256').update(s + Date.now()).digest('hex').slice(0, 6)}`;
}

export async function addSource(input: {
  name: string;
  handle: string;
  payTo: `0x${string}`;
  text: string;
}): Promise<Source> {
  const src: Source = {
    id: slug(input.name),
    name: input.name,
    handle: input.handle,
    payTo: input.payTo,
    text: input.text,
    registered: true,
  };
  if (hasKv()) {
    try {
      await kv(['LPUSH', KEY, JSON.stringify(src)]);
      await kv(['LTRIM', KEY, 0, CAP - 1]);
      return src;
    } catch {
      /* fall through */
    }
  }
  mem.unshift(src);
  if (mem.length > CAP) mem.length = CAP;
  return src;
}

export async function listRegistered(): Promise<Source[]> {
  if (hasKv()) {
    try {
      const out = (await kv<{ result: string[] }>(['LRANGE', KEY, 0, CAP - 1])).result;
      return (out ?? []).map((s) => JSON.parse(s) as Source);
    } catch {
      /* fall through */
    }
  }
  return mem;
}

export async function getRegisteredById(id: string): Promise<Source | undefined> {
  return (await listRegistered()).find((s) => s.id === id);
}
