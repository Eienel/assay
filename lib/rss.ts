import 'server-only';
import { createHash } from 'node:crypto';
import type { Source } from './sources';

// Real, existing publications registered as sources. Their grounding text is
// pulled live from their public RSS feeds and refreshed periodically. They have
// not onboarded wallets, so each is assigned a deterministic receive-only Arc
// address derived from its id; /api/source derives the same address from the id,
// so payments resolve without any shared state.

interface Feed {
  id: string;
  name: string;
  handle: string;
  url: string;
}

const FEEDS: Feed[] = [
  { id: 'eth-blog', name: 'Ethereum Foundation Blog', handle: '@ethereum', url: 'https://blog.ethereum.org/en/feed.xml' },
  { id: 'the-block', name: 'The Block', handle: '@theblock', url: 'https://www.theblock.co/rss.xml' },
  { id: 'hacker-news', name: 'Hacker News', handle: '@hackernews', url: 'https://hnrss.org/frontpage' },
];

// Deterministic receive-only address from a source id. Stable across instances.
export function walletForId(id: string): `0x${string}` {
  return ('0x' + createHash('sha256').update('obol:' + id).digest('hex').slice(0, 40)) as `0x${string}`;
}

const strip = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function pick(block: string, tags: string[]): string {
  for (const t of tags) {
    const m = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'));
    if (m) return strip(m[1]);
  }
  return '';
}

function parse(xml: string): { title: string; body: string }[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks.slice(0, 5).map((b) => ({
    title: pick(b, ['title']).slice(0, 120),
    body: pick(b, ['description', 'summary', 'content:encoded', 'content']).slice(0, 180),
  }));
}

let cache: { at: number; sources: Source[] } = { at: 0, sources: [] };
const TTL = 10 * 60 * 1000;

export async function getLiveSources(): Promise<Source[]> {
  if (Date.now() - cache.at < TTL && cache.sources.length) return cache.sources;

  const sources = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(f.url, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(t);
        if (!res.ok) return null;
        const items = parse(await res.text());
        const text = items
          .map((i) => (i.body ? `${i.title}. ${i.body}` : i.title))
          .filter(Boolean)
          .join(' ')
          .slice(0, 700);
        if (!text) return null;
        return {
          id: f.id,
          name: f.name,
          handle: f.handle,
          payTo: walletForId(f.id),
          text,
          live: true,
        } as Source;
      } catch {
        return null;
      }
    }),
  );

  const ok = sources.filter((s): s is Source => s !== null);
  if (ok.length) cache = { at: Date.now(), sources: ok };
  return ok;
}
