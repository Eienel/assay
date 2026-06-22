import 'server-only';
import { SOURCES, type Source } from './sources';
import { getLiveSources } from './rss';
import { listRegistered } from './registry';

// Every known source: curated, creator-registered, and live RSS.
export async function allSources(): Promise<Source[]> {
  const [live, registered] = await Promise.all([
    getLiveSources().catch(() => []),
    listRegistered().catch(() => []),
  ]);
  return [...registered, ...SOURCES, ...live];
}

export async function sourceByPayTo(payTo: string): Promise<Source | undefined> {
  const a = payTo.toLowerCase();
  return (await allSources()).find((s) => s.payTo.toLowerCase() === a);
}
