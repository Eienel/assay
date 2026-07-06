import { geminiJson, hasGemini } from './gemini';
import { groundQuestion } from './ground';
import type { GroundResult } from './types';

// A source whose grounded contribution is below this floor is considered too
// weak to be worth paying: the agent declines it even though the verifier
// grounded it. This is one of the decisions the agent makes on its own.
const MIN_WEIGHT = 0.15;
// Coverage at or above this counts the goal as answered: the agent stops here
// and leaves the rest of the budget unspent.
const COVERED_AT = 0.8;
const MAX_STEPS = 7;

export type AgentEvent =
  | { type: 'plan'; strategy: string; planned: string[] }
  | { type: 'decide'; step: number; question: string; rationale: string; adaptive: boolean }
  | {
      type: 'ground';
      step: number;
      question: string;
      answer: string;
      method: 'gemini' | 'heuristic';
      live: boolean;
      paidUsdc: number;
      paid: { handle: string; amountUsdc: string; payTo: string; txId?: string }[];
      declined: { handle: string; reason: string }[];
    }
  | { type: 'reflect'; step: number; coverage: number; covered: boolean; gap: string; rationale: string }
  | {
      type: 'stop';
      reason: 'covered' | 'budget' | 'exhausted';
      note: string;
      spentUsdc: number;
      budgetUsdc: number;
      unspentUsdc: number;
      savedPct: number;
      asked: number;
      sourcesPaid: number;
    };

interface Turn {
  question: string;
  answer: string;
  handles: string[];
}

// Plan: turn a research goal into a strategy and an ordered set of questions the
// agent expects to work through. This is only the opening move; the agent revises
// it as it learns.
async function plan(goal: string): Promise<{ strategy: string; questions: string[] }> {
  if (hasGemini()) {
    try {
      const out = await geminiJson<{ strategy: string; questions: string[] }>(
        'You are a research agent planning how to investigate a goal by asking a sequence ' +
          'of focused questions, each answerable from a knowledge source. Return a one-line ' +
          'strategy and 4 to 6 specific questions, ordered. Never use an em dash.',
        `GOAL: ${goal}`,
        {
          type: 'OBJECT',
          properties: {
            strategy: { type: 'STRING' },
            questions: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['strategy', 'questions'],
        },
      );
      const questions = (out.questions ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 6);
      if (questions.length) return { strategy: out.strategy, questions };
    } catch {
      /* fall through */
    }
  }
  const g = goal.trim().replace(/\?+$/, '');
  // Strip a leading interrogative so a goal phrased as a question ("How do X
  // and Y fit together") becomes a topic ("X and Y fit together") that reads
  // naturally inside the follow-up templates below.
  const topic = g.replace(
    /^(how|what|why|when|who|which)\s+(do|does|did|is|are|was|were|can|could|should|would)?\s*/i,
    '',
  );
  return {
    strategy: 'Break the goal into direct questions and pay each source consulted.',
    questions: [
      `${g}?`,
      `What background helps explain ${topic}?`,
      `What are the key parts of ${topic}?`,
      `Why does ${topic} matter?`,
    ],
  };
}

// Reflect: given the goal and everything learned so far, judge how well the goal
// is covered, name the biggest remaining gap, and decide the single most useful
// next question. The next question may be one of the planned ones or a brand new
// follow-up aimed at the gap. This is the observe-and-decide half of the loop.
async function reflect(
  goal: string,
  turns: Turn[],
  planned: string[],
): Promise<{ coverage: number; covered: boolean; gap: string; nextQuestion: string; adaptive: boolean; rationale: string }> {
  const distinct = new Set(turns.flatMap((t) => t.handles));
  if (hasGemini()) {
    try {
      const out = await geminiJson<{
        coverage: number;
        covered: boolean;
        gap: string;
        nextQuestion: string;
        rationale: string;
      }>(
        'You are a research agent reviewing your own progress toward a goal. Given the goal, ' +
          'the questions you have already answered (with their answers), and a list of questions ' +
          'you had planned but not yet asked, decide: coverage (0 to 1) of the goal so far, ' +
          'whether it is now sufficiently covered, the single biggest remaining gap in one short ' +
          'phrase, and the one most useful next question to close that gap. Prefer a planned ' +
          'question when it fits the gap; otherwise write a sharper new one. If coverage is high, ' +
          'set covered true and repeat the goal as nextQuestion. One short sentence of rationale. ' +
          'Never use an em dash.',
        [
          `GOAL: ${goal}`,
          '',
          'ANSWERED SO FAR:',
          ...turns.map((t, i) => `${i + 1}. Q: ${t.question}\n   A: ${t.answer}`),
          '',
          `PLANNED, NOT YET ASKED: ${planned.length ? planned.join(' | ') : '(none left)'}`,
        ].join('\n'),
        {
          type: 'OBJECT',
          properties: {
            coverage: { type: 'NUMBER' },
            covered: { type: 'BOOLEAN' },
            gap: { type: 'STRING' },
            nextQuestion: { type: 'STRING' },
            rationale: { type: 'STRING' },
          },
          required: ['coverage', 'covered', 'gap', 'nextQuestion', 'rationale'],
        },
      );
      const nq = (out.nextQuestion ?? '').trim();
      const adaptive = Boolean(nq) && !planned.some((p) => p.toLowerCase() === nq.toLowerCase());
      return {
        coverage: clamp01(out.coverage),
        covered: Boolean(out.covered) || clamp01(out.coverage) >= COVERED_AT,
        gap: out.gap || 'none',
        nextQuestion: nq || planned[0] || '',
        adaptive,
        rationale: out.rationale || '',
      };
    } catch {
      /* fall through */
    }
  }
  // Heuristic reflection: coverage grows with the number of distinct sources the
  // agent has genuinely paid, saturating around five.
  const coverage = Math.min(1, distinct.size / 5);
  const covered = coverage >= COVERED_AT || (turns.length >= 2 && turns[turns.length - 1].handles.length === 0);
  return {
    coverage,
    covered,
    gap: planned[0] ? 'aspects not yet asked' : 'none',
    nextQuestion: planned[0] ?? '',
    adaptive: false,
    rationale: covered
      ? `Grounded in ${distinct.size} distinct sources; the goal is well covered.`
      : `Grounded in ${distinct.size} sources so far; more of the goal remains.`,
  };
}

// The autonomous loop. Decide -> act (ground + pay) -> observe -> reflect ->
// decide again, adapting the plan and honouring the budget, stopping the moment
// the goal is covered rather than spending to the last cent.
export async function* runAgent(
  goal: string,
  budget: number,
  origin: string,
): AsyncGenerator<AgentEvent> {
  const { strategy, questions } = await plan(goal);
  const planned = [...questions];
  yield { type: 'plan', strategy, planned: [...planned] };

  const turns: Turn[] = [];
  const asked = new Set<string>();
  let spent = 0;
  const paidHandles = new Set<string>();

  let next = planned.shift() ?? goal;
  let nextRationale = 'Start with the first planned question.';
  let adaptive = false;

  for (let step = 1; step <= MAX_STEPS; step++) {
    // Decide: budget gate before acting.
    if (spent >= budget) {
      yield stop('budget', spent, budget, asked.size, paidHandles.size,
        `Budget of ${budget.toFixed(2)} USDC reached; stopped with ${asked.size} questions asked.`);
      return;
    }
    if (!next || asked.has(next.toLowerCase())) {
      // Nothing sensible left to ask.
      if (!planned.length) {
        yield stop('exhausted', spent, budget, asked.size, paidHandles.size,
          `Worked through every useful question; goal covered as far as the sources allow.`);
        return;
      }
      next = planned.shift()!;
      adaptive = false;
    }

    yield { type: 'decide', step, question: next, rationale: nextRationale, adaptive };
    asked.add(next.toLowerCase());

    // Act: ground the question and pay only sources above the confidence floor.
    const r: GroundResult = await groundQuestion(next, origin, { minWeight: MIN_WEIGHT });
    const paid = r.settlements.map((s) => ({
      handle: s.handle,
      amountUsdc: s.amountUsdc,
      payTo: s.payTo,
      txId: s.txId,
    }));
    const paidIds = new Set(r.settlements.map((s) => s.sourceId));
    const declined = r.sources
      .filter((s) => !paidIds.has(s.id))
      .map((s) => ({ handle: s.handle, reason: s.reason }));
    const paidUsdc = r.settledMicros / 1e6;
    spent += paidUsdc;
    for (const s of r.settlements) paidHandles.add(s.handle);
    turns.push({ question: next, answer: r.answer, handles: r.settlements.map((s) => s.handle) });

    yield {
      type: 'ground',
      step,
      question: next,
      answer: r.answer,
      method: r.method,
      live: r.live,
      paidUsdc,
      paid,
      declined,
    };

    // Observe + decide: how covered is the goal, and what is worth asking next?
    const ref = await reflect(goal, turns, planned);
    yield {
      type: 'reflect',
      step,
      coverage: ref.coverage,
      covered: ref.covered,
      gap: ref.gap,
      rationale: ref.rationale,
    };

    if (ref.covered) {
      yield stop('covered', spent, budget, asked.size, paidHandles.size,
        `Goal covered after ${asked.size} questions. Stopped early and left ${(budget - spent).toFixed(6)} USDC unspent.`);
      return;
    }

    // Set up the next iteration from the reflection's decision.
    next = ref.nextQuestion;
    adaptive = ref.adaptive;
    nextRationale = ref.adaptive
      ? `New follow-up to close the gap: ${ref.gap}.`
      : `Next planned question; gap remaining: ${ref.gap}.`;
    // Keep the planned list from re-serving what reflection just chose.
    const idx = planned.findIndex((p) => p.toLowerCase() === next.toLowerCase());
    if (idx >= 0) planned.splice(idx, 1);
  }

  yield stop('exhausted', spent, budget, asked.size, paidHandles.size,
    `Reached the step limit; goal covered as far as the sources allow.`);
}

function stop(
  reason: 'covered' | 'budget' | 'exhausted',
  spent: number,
  budget: number,
  asked: number,
  sourcesPaid: number,
  note: string,
): AgentEvent {
  const unspent = Math.max(0, budget - spent);
  return {
    type: 'stop',
    reason,
    note,
    spentUsdc: spent,
    budgetUsdc: budget,
    unspentUsdc: unspent,
    savedPct: budget > 0 ? Math.round((unspent / budget) * 100) : 0,
    asked,
    sourcesPaid,
  };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
