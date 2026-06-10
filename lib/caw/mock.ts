import type { CawOutcome, Operation } from '@/lib/types';
import type { CawClient } from './types';
import { DEMO_PACT } from '@/lib/demo/scenario';

// A faithful mock of CAW's quantitative enforcement, shaped to match what the
// Phase 0 spike observed on the live testnet: an in-bounds transfer is
// submitted; an out-of-bounds one returns a structured denial with the exact
// code and reason fields CAW uses (TRANSFER_LIMIT_EXCEEDED /
// matched_pact_transfer_deny_if). This lets the demo run with no live keys
// while telling the truth about how the two layers interact.
export class MockCawClient implements CawClient {
  readonly mode = 'mock' as const;

  async getActivePactIntent(): Promise<string> {
    return DEMO_PACT.intent;
  }

  async submitTransfer(op: Operation): Promise<CawOutcome> {
    // Simulate a brief round trip so loading states are real.
    await new Promise((r) => setTimeout(r, 650));

    const amount = Number(op.amount);
    const overCap = amount > DEMO_PACT.perTxCapUsd;
    const offAllowlist = !DEMO_PACT.allowlist.some(
      (a) => a.address.toLowerCase() === op.dstAddress.toLowerCase(),
    );

    if (overCap) {
      return {
        status: 'denied',
        code: 'TRANSFER_LIMIT_EXCEEDED',
        reason: 'matched_pact_transfer_deny_if',
        details: {
          reason: 'matched_pact_transfer_deny_if',
          chain_id: op.chainId,
          token_id: op.tokenId,
          dst_addr: op.dstAddress,
          tier: 'pact',
          policy_type: 'transfer',
          policy_id: DEMO_PACT.capPolicyId,
        },
        suggestion: `Operation denied by the pact's policy (policy_id: ${DEMO_PACT.capPolicyId}). Review the policy and adjust the transfer amount to fit it.`,
      };
    }

    if (offAllowlist) {
      return {
        status: 'denied',
        code: 'DESTINATION_NOT_ALLOWED',
        reason: 'matched_pact_transfer_when',
        details: {
          reason: 'destination_not_in_allowlist',
          chain_id: op.chainId,
          token_id: op.tokenId,
          dst_addr: op.dstAddress,
          tier: 'pact',
          policy_type: 'transfer',
          policy_id: DEMO_PACT.allowlistPolicyId,
        },
        suggestion: `Operation denied by the pact's policy (policy_id: ${DEMO_PACT.allowlistPolicyId}). The destination is not on the supplier allowlist.`,
      };
    }

    // In bounds: CAW signs. Note this says nothing about whether the payment was
    // the right one. That judgment is Assay's job, upstream of here.
    const hash =
      '0x' +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      status: 'submitted',
      transactionId: crypto.randomUUID(),
      transactionHash: hash,
      statusDisplay: 'Processing',
    };
  }
}
