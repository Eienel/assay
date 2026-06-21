/**
 * The attribution verifier: Touchstone's edge. Given a question, an answer, and
 * the candidate sources the agent declared, decide which sources the answer was
 * ACTUALLY grounded in and in what proportion. That proportion is the payout
 * split. Gemini does the judging when GEMINI_API_KEY is set; otherwise a
 * transparent term-overlap heuristic runs so the spike always works.
 */
import 'dotenv/config';

export interface SourceInput {
  id: string;
  label: string;
  text: string;
}

export interface SourceWeight {
  id: string;
  weight: number; // 0..1, grounded sources sum to 1
  grounded: boolean;
  reason: string;
}

export interface AttributionResult {
  weights: SourceWeight[];
  method: 'gemini' | 'heuristic';
}

const MODEL = process.env.ASSAY_JUDGE_MODEL ?? 'gemini-2.5-flash';

export async function checkAttribution(
  question: string,
  answer: string,
  sources: SourceInput[],
): Promise<AttributionResult> {
  if (process.env.GEMINI_API_KEY) {
    const r = await withGemini(question, answer, sources).catch((e) => {
      console.error('Gemini verifier failed, falling back to heuristic:', e.message);
      return null;
    });
    if (r) return r;
  }
  return withHeuristic(answer, sources);
}

async function withGemini(
  question: string,
  answer: string,
  sources: SourceInput[],
): Promise<AttributionResult> {
  const system =
    'You are Touchstone, an attribution verifier. Given a question, an answer, and ' +
    'candidate sources, decide for each source whether the answer is genuinely ' +
    'supported by (grounded in) that source, and estimate its fractional ' +
    'contribution to the answer. A source the answer did not actually use gets ' +
    'grounded=false and weight 0. The weights of grounded sources should sum to 1.';

  const user = [
    `QUESTION: ${question}`,
    `\nANSWER: ${answer}`,
    `\nSOURCES:`,
    ...sources.map((s) => `[${s.id}] ${s.label}: ${s.text}`),
    `\nScore each source by id.`,
  ].join('\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: {
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
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const parsed = JSON.parse(text) as { weights: SourceWeight[] };
  return { weights: normalize(parsed.weights), method: 'gemini' };
}

// Transparent fallback: weight each source by how much of the answer's
// vocabulary it covers. Grounded if it covers a meaningful share.
function withHeuristic(answer: string, sources: SourceInput[]): AttributionResult {
  const ansTerms = new Set(terms(answer));
  const raw = sources.map((s) => {
    const srcTerms = new Set(terms(s.text));
    let hit = 0;
    for (const t of ansTerms) if (srcTerms.has(t)) hit++;
    const coverage = ansTerms.size ? hit / ansTerms.size : 0;
    return { id: s.id, coverage };
  });
  const max = Math.max(...raw.map((r) => r.coverage), 0);
  const weights: SourceWeight[] = raw.map((r) => {
    const grounded = max > 0 && r.coverage >= 0.15 && r.coverage >= max * 0.35;
    return {
      id: r.id,
      weight: grounded ? r.coverage : 0,
      grounded,
      reason: grounded
        ? `Answer reuses ${(r.coverage * 100).toFixed(0)}% of its key terms from this source.`
        : `Only ${(r.coverage * 100).toFixed(0)}% term overlap; not a real source of the answer.`,
    };
  });
  return { weights: normalize(weights), method: 'heuristic' };
}

function normalize(weights: SourceWeight[]): SourceWeight[] {
  const total = weights.filter((w) => w.grounded).reduce((s, w) => s + Math.max(0, w.weight), 0);
  return weights.map((w) => ({
    ...w,
    weight: w.grounded && total > 0 ? Math.max(0, w.weight) / total : 0,
  }));
}

const STOP = new Set(
  'the a an and or of to in on for with is are was were be been by as at it its this that from into than then so we you they i'.split(
    ' ',
  ),
);
const terms = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));

// Standalone demo: `npm run verifier`
if (import.meta.url === `file://${process.argv[1]}`) {
  const question = 'When did the euro replace the Greek drachma, and what was the lepton?';
  const answer =
    'The euro replaced the drachma in 2002. The lepton was the smallest Greek coin, ' +
    'one hundredth of a drachma.';
  const sources: SourceInput[] = [
    { id: 'A', label: 'Drachma history', text: 'Greece adopted the euro in 2002, retiring the drachma after a long run.' },
    { id: 'B', label: 'Lepton entry', text: 'The lepton was the smallest denomination, a hundredth of a drachma.' },
    { id: 'C', label: 'Olive cultivation', text: 'Olive trees have been farmed around the Mediterranean for millennia.' },
  ];
  checkAttribution(question, answer, sources).then((r) => {
    console.log(`Attribution split (method: ${r.method}):\n`);
    for (const w of r.weights) {
      console.log(
        `  [${w.id}] ${w.grounded ? 'GROUNDED' : 'unused  '}  weight=${(w.weight * 100).toFixed(1)}%  ${w.reason}`,
      );
    }
  });
}
