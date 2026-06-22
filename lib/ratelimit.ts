import 'server-only';
import { hasKv, kv } from './kv';

// Per-key fixed-window rate limit. KV-backed when configured (shared across
// serverless instances), in-memory otherwise. Protects the funded public
// endpoints from being drained or spammed.
const mem = new Map<string, { n: number; reset: number }>();

export interface RateResult {
  ok: boolean;
  retryAfter: number;
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (hasKv()) {
    try {
      const k = `rl:${key}`;
      const n = (await kv<{ result: number }>(['INCR', k])).result;
      if (n === 1) await kv(['EXPIRE', k, windowSec]);
      if (n > limit) {
        const ttl = (await kv<{ result: number }>(['TTL', k])).result;
        return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
      }
      return { ok: true, retryAfter: 0 };
    } catch {
      /* fall through to memory */
    }
  }
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.reset < now) {
    mem.set(key, { n: 1, reset: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  e.n += 1;
  if (e.n > limit) return { ok: false, retryAfter: Math.ceil((e.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'anon';
}
