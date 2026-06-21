import { geminiJson, hasGemini } from './gemini';
import type { Source } from './sources';
import type { GroundedSource } from './types';

// Obol's edge: decide which sources an answer was ACTUALLY grounded in, and in
// what proportion. That proportion is the payout split. A source the answer did
// not use gets weight 0 and is paid nothing.
export async function attribute(
  question: string,
  answer: string,
  sources: Source[],
): Promise<{ sources: GroundedSource[]; method: 'gemini' | 'heuristic' }> {
  if (hasGemini()) {
    try {
      return { sources: await withGemini(question, answer, sources), method: 'gemini' };
    } catch {
      /* fall through */
    }
  }
  return { sources: withHeuristic(answer, sources), method: 'heuristic' };
}

async function withGemini(
  question: string,
  answer: string,
  sources: Source[],
): Promise<GroundedSource[]> {
  const system =
    'You are an attribution verifier. Given a question, an answer, and candidate ' +
    'sources, decide for each source whether the answer is genuinely supported by ' +
    'it, and estimate its fractional contribution. A source the answer did not use ' +
    'gets grounded=false and weight 0. Weights of grounded sources should sum to 1. ' +
    'Keep each reason to one short sentence. Never use an em dash.';
  const user = [
    `QUESTION: ${question}`,
    `\nANSWER: ${answer}`,
    `\nSOURCES:`,
    ...sources.map((s) => `[${s.id}] ${s.text}`),
  ].join('\n');

  const out = await geminiJson<{ weights: { id: string; weight: number; grounded: boolean; reason: string }[] }>(
    system,
    user,
    {
      type: 'OBJECT',
      properties: {
        weights: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              weight: { type: 'NUMBER' },
              grounded: { type: 'BOOLEAN' },
              reason: { type: 'STRING' },
            },
            required: ['id', 'weight', 'grounded', 'reason'],
          },
        },
      },
      required: ['weights'],
    },
  );
  return assemble(sources, out.weights);
}

function withHeuristic(answer: string, sources: Source[]): GroundedSource[] {
  const a = new Set(terms(answer));
  const raw = sources.map((s) => {
    const st = new Set(terms(s.text));
    let hit = 0;
    for (const t of a) if (st.has(t)) hit++;
    return { id: s.id, coverage: a.size ? hit / a.size : 0 };
  });
  const max = Math.max(...raw.map((r) => r.coverage), 0);
  return assemble(
    sources,
    raw.map((r) => {
      const grounded = max > 0 && r.coverage >= 0.12 && r.coverage >= max * 0.3;
      return {
        id: r.id,
        weight: grounded ? r.coverage : 0,
        grounded,
        reason: grounded
          ? `Reuses ${(r.coverage * 100).toFixed(0)}% of the answer's key terms.`
          : `Only ${(r.coverage * 100).toFixed(0)}% overlap; not a source of this answer.`,
      };
    }),
  );
}

function assemble(
  sources: Source[],
  weights: { id: string; weight: number; grounded: boolean; reason: string }[],
): GroundedSource[] {
  const total = weights.filter((w) => w.grounded).reduce((s, w) => s + Math.max(0, w.weight), 0);
  return sources.map((s) => {
    const w = weights.find((x) => x.id === s.id);
    const grounded = Boolean(w?.grounded && (w?.weight ?? 0) > 0);
    return {
      id: s.id,
      name: s.name,
      handle: s.handle,
      grounded,
      weight: grounded && total > 0 ? Math.max(0, w!.weight) / total : 0,
      reason: w?.reason ?? 'Not evaluated.',
    };
  });
}

const STOP = new Set(
  'the a an and or of to in on for with is are was were be by as at it its this that from into than then so'.split(' '),
);
const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));
