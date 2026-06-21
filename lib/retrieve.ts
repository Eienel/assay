import { SOURCES, type Source } from './sources';
import { getLiveSources } from './rss';

const STOP = new Set(
  'the a an and or of to in on for with is are was were be by as at it its this that from into what when who how why does did do which'.split(
    ' ',
  ),
);
const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

// Cheap, legible retrieval over the curated sources plus any live RSS
// publications, ranked by term overlap with the question.
export async function retrieve(question: string, k = 4): Promise<Source[]> {
  const live = await getLiveSources().catch(() => []);
  const pool = [...SOURCES, ...live];
  const q = new Set(terms(question));
  const scored = pool.map((s) => {
    const st = new Set(terms(s.text + ' ' + s.name));
    let hit = 0;
    for (const t of q) if (st.has(t)) hit++;
    return { s, hit };
  });
  const withHits = scored.filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit);
  return (withHits.length ? withHits : scored).slice(0, k).map((x) => x.s);
}
