// Provider-agnostic LLM judge. The guard only ever calls callJudge; everything
// below it is swappable. Two providers are wired today:
//
//   gemini  Google Gemini via the generativelanguage REST API (free tier).
//           Enabled by GEMINI_API_KEY. Preferred when both keys are present.
//   claude  Anthropic Claude via the Messages API. Enabled by ANTHROPIC_API_KEY.
//
// Force one with ASSAY_JUDGE_PROVIDER=gemini|claude. With no key at all the
// guard falls back to its transparent heuristic (see conformance.ts).
// We call the HTTP APIs directly to keep the dependency surface minimal.

export interface JudgeRequest {
  system: string;
  user: string;
}

export interface JudgeJson {
  verdict: 'PASS' | 'HOLD' | 'BLOCK';
  confidence: number;
  reason: string;
}

export type JudgeProvider = 'gemini' | 'claude';

const DEFAULT_MODEL: Record<JudgeProvider, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
};

export function getJudgeProvider(): JudgeProvider | null {
  const forced = process.env.ASSAY_JUDGE_PROVIDER;
  if (forced === 'gemini' || forced === 'claude') {
    return hasKey(forced) ? forced : null;
  }
  if (hasKey('gemini')) return 'gemini';
  if (hasKey('claude')) return 'claude';
  return null;
}

export function hasJudgeProvider(): boolean {
  return getJudgeProvider() !== null;
}

export async function callJudge(req: JudgeRequest): Promise<JudgeJson | null> {
  const provider = getJudgeProvider();
  if (!provider) return null;
  const model = process.env.ASSAY_JUDGE_MODEL || DEFAULT_MODEL[provider];
  return provider === 'gemini' ? callGemini(req, model) : callClaude(req, model);
}

function hasKey(provider: JudgeProvider): boolean {
  return Boolean(
    provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY,
  );
}

// The schema both providers are constrained to, in their own dialects.
const VERDICT_FIELDS = {
  verdict: { enum: ['PASS', 'HOLD', 'BLOCK'] },
  confidence: { description: '0 to 1' },
  reason: { description: 'One concise human-readable line.' },
};

async function callGemini(req: JudgeRequest, model: string): Promise<JudgeJson | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              verdict: { type: 'STRING', enum: VERDICT_FIELDS.verdict.enum },
              confidence: { type: 'NUMBER', description: VERDICT_FIELDS.confidence.description },
              reason: { type: 'STRING', description: VERDICT_FIELDS.reason.description },
            },
            required: ['verdict', 'confidence', 'reason'],
          },
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Judge provider error (gemini) ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) return null;
  try {
    return JSON.parse(text) as JudgeJson;
  } catch {
    return null;
  }
}

async function callClaude(req: JudgeRequest, model: string): Promise<JudgeJson | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      tools: [
        {
          name: 'record_verdict',
          description: 'Record the intent-conformance verdict for the operation.',
          input_schema: {
            type: 'object',
            properties: {
              verdict: { type: 'string', enum: VERDICT_FIELDS.verdict.enum },
              confidence: { type: 'number', description: VERDICT_FIELDS.confidence.description },
              reason: { type: 'string', description: VERDICT_FIELDS.reason.description },
            },
            required: ['verdict', 'confidence', 'reason'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'record_verdict' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Judge provider error (claude) ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: JudgeJson }>;
  };
  const tool = data.content.find((c) => c.type === 'tool_use' && c.name === 'record_verdict');
  return tool?.input ?? null;
}
