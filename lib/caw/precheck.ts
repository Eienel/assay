import type { Operation } from '@/lib/types';
import { DEMO_PACT } from '@/lib/demo/scenario';

// The counterfactual: what CAW's quantitative policies alone would decide,
// without ever asking whether the payment was the right one. Assay uses this to
// show, on a held row, that CAW would have signed it. This is the gap, made
// visible.
export interface CawPrecheck {
  outcome: 'would_pass' | 'would_deny';
  reason: string;
}

export function predictCawQuantitative(op: Operation): CawPrecheck {
  const amount = Number(op.amount);
  if (amount > DEMO_PACT.perTxCapUsd) {
    return {
      outcome: 'would_deny',
      reason: `Over the ${DEMO_PACT.perTxCapUsd} USDC per-transaction cap.`,
    };
  }
  const allowed = DEMO_PACT.allowlist.some(
    (a) => a.address.toLowerCase() === op.dstAddress.toLowerCase(),
  );
  if (!allowed) {
    return { outcome: 'would_deny', reason: 'Destination is not on the supplier allowlist.' };
  }
  return {
    outcome: 'would_pass',
    reason: `In cap and to an allowlisted address. CAW would sign without question.`,
  };
}
