import { geminiJson } from './gemini';
import type { Source } from './sources';

export interface AnswerResult {
  answer: string;
  usedSourceIds: string[];
}

// Produce a short answer grounded strictly in the retrieved sources, and report
// which sources it drew on. If the model is unavailable, fall back to stitching
// the most relevant source sentences so the demo still runs.
export async function groundedAnswer(
  question: string,
  sources: Source[],
): Promise<AnswerResult> {
  const system =
    'You answer the question using only the provided sources. Be concise, two or ' +
    'three sentences. Do not use information beyond the sources. Report the ids of ' +
    'the sources you actually used. Never use an em dash.';
  const user = [
    `QUESTION: ${question}`,
    '',
    'SOURCES:',
    ...sources.map((s) => `[${s.id}] ${s.text}`),
  ].join('\n');

  try {
    return await geminiJson<AnswerResult>(system, user, {
      type: 'OBJECT',
      properties: {
        answer: { type: 'STRING' },
        usedSourceIds: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['answer', 'usedSourceIds'],
    });
  } catch {
    const top = sources.slice(0, 2);
    return {
      answer: top.map((s) => s.text.split('. ')[0] + '.').join(' '),
      usedSourceIds: top.map((s) => s.id),
    };
  }
}
