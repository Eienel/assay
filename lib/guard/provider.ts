// Provider-agnostic LLM judge. Today it speaks to the Claude API; swap the body
// of callJudge to retarget another provider without touching the guard logic.
// We call the HTTP API directly to keep the dependency surface minimal.

export interface JudgeRequest {
  system: string;
  user: string;
}

export interface JudgeJson {
  verdict: 'PASS' | 'HOLD' | 'BLOCK';
  confidence: number;
  reason: string;
}

// Default to a capable, fast Claude model for this judgment task. Override with
// ASSAY_JUDGE_MODEL if needed.
const MODEL = process.env.ASSAY_JUDGE_MODEL ?? 'claude-sonnet-4-6';

export function hasJudgeProvider(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function callJudge(req: JudgeRequest): Promise<JudgeJson | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
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
              verdict: { type: 'string', enum: ['PASS', 'HOLD', 'BLOCK'] },
              confidence: { type: 'number', description: '0 to 1' },
              reason: { type: 'string', description: 'One concise human-readable line.' },
            },
            required: ['verdict', 'confidence', 'reason'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'record_verdict' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Judge provider error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: JudgeJson }>;
  };
  const tool = data.content.find((c) => c.type === 'tool_use' && c.name === 'record_verdict');
  return tool?.input ?? null;
}
