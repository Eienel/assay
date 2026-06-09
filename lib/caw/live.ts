import {
  Configuration,
  PactsApi,
  TransactionsApi,
} from '@cobo/agentic-wallet';
import type { CawOutcome, Operation } from '@/lib/types';
import type { CawClient } from './types';

// The live CAW adapter. Same surface as the mock, backed by the real
// @cobo/agentic-wallet SDK against an active pact. The call shapes here match
// exactly what the Phase 0 spike verified on Base Sepolia / Ethereum Sepolia.
//
// Requires env:
//   CAW_API_URL       e.g. https://api.agenticwallet.cobo.com
//   CAW_API_KEY       pact-scoped (or owner) API key
//   CAW_WALLET_ID     wallet uuid
//   CAW_PACT_ID       the active pact whose intent governs the agent
//   CAW_SRC_ADDRESS   wallet source address on the operating chain
export class LiveCawClient implements CawClient {
  readonly mode = 'live' as const;

  private readonly pactsApi: PactsApi;
  private readonly txApi: TransactionsApi;
  private readonly walletId: string;
  private readonly pactId: string;
  private readonly srcAddress: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const apiUrl = req(env, 'CAW_API_URL');
    const apiKey = req(env, 'CAW_API_KEY');
    this.walletId = req(env, 'CAW_WALLET_ID');
    this.pactId = req(env, 'CAW_PACT_ID');
    this.srcAddress = req(env, 'CAW_SRC_ADDRESS');

    const config = new Configuration({ apiKey, basePath: apiUrl });
    this.pactsApi = new PactsApi(config);
    this.txApi = new TransactionsApi(config);
  }

  async getActivePactIntent(): Promise<string> {
    const pact = (await this.pactsApi.getPact(this.pactId)).data.result;
    return pact.intent;
  }

  async submitTransfer(op: Operation): Promise<CawOutcome> {
    try {
      const res = (
        await this.txApi.transferTokens(this.walletId, {
          dst_addr: op.dstAddress,
          src_addr: this.srcAddress,
          amount: op.amount,
          token_id: op.tokenId,
          chain_id: op.chainId,
          request_id: `assay-${Date.now()}`,
        })
      ).data.result;
      return {
        status: 'submitted',
        transactionId: res.id,
        transactionHash: res.transaction_hash,
        statusDisplay: res.status_display ?? String(res.status),
      };
    } catch (err) {
      const denial = extractDenial(err);
      if (denial) return denial;
      throw err;
    }
  }
}

function req(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env var for live CAW client: ${name}`);
  return v;
}

// CAW returns a structured policy denial as HTTP 403 with a body shaped like
// { error: { code, reason, details, suggestion } }. The SDK has no typed
// exception, so we read the raw axios error.
function extractDenial(err: unknown): Extract<CawOutcome, { status: 'denied' }> | null {
  const e = err as { response?: { status?: number; data?: { error?: Record<string, unknown> } } };
  const body = e?.response?.data?.error;
  if (e?.response?.status === 403 && body) {
    return {
      status: 'denied',
      code: String(body.code ?? 'POLICY_DENIED'),
      reason: String(body.reason ?? 'policy_denied'),
      details: (body.details as Record<string, unknown>) ?? {},
      suggestion: body.suggestion ? String(body.suggestion) : undefined,
    };
  }
  return null;
}
