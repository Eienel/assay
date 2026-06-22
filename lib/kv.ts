import 'server-only';

// One place for the KV (Vercel KV / Upstash Redis) REST connection. Accepts
// either naming convention. When unset, callers fall back to in-memory.
export const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
export const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasKv = (): boolean => Boolean(KV_URL && KV_TOKEN);

export async function kv<T = { result: unknown }>(cmd: unknown[]): Promise<T> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return (await res.json()) as T;
}
