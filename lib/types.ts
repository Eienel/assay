// Shared domain types for Assay. Kept framework-free so the guard, the CAW
// layer, and the UI all speak the same language.

// An operation the agent intends to submit. For the demo we model transfers,
// the most legible case, but the shape is generic over operation kind.
export interface Operation {
  kind: 'transfer' | 'contract_call';
  chainId: string;
  tokenId: string;
  tokenSymbol: string;
  amount: string; // decimal string, on-chain precision
  dstAddress: string;
  // A human label for the intended recipient, if the agent claims one.
  dstLabel?: string;
}

// The agent's stated reasoning for taking this step. This is what Assay weighs
// against the pact's declared intent.
export interface AgentStep {
  id: string;
  reasoning: string;
  operation: Operation;
}

// The conformance verdict produced by the guard.
export type Verdict = 'PASS' | 'HOLD' | 'BLOCK';

export interface ConformanceResult {
  verdict: Verdict;
  // 0..1, how sure the guard is about the verdict.
  confidence: number;
  // One line, human readable, shown on the row.
  reason: string;
}

// How CAW responded once (and if) Assay forwarded the operation.
export type CawOutcome =
  | { status: 'submitted'; transactionId?: string; transactionHash?: string; statusDisplay: string }
  | { status: 'denied'; code: string; reason: string; details: Record<string, unknown>; suggestion?: string }
  | { status: 'not_forwarded'; reason: string }; // Assay held it; CAW never saw it.

// The full record of one assayed operation, start to finish.
export interface AssayedOperation {
  step: AgentStep;
  conformance: ConformanceResult;
  caw: CawOutcome;
  // Layer that produced the terminal state, for the two-layer story.
  blockedBy: 'none' | 'assay' | 'caw';
  createdAt: string;
}

export const isHeld = (op: AssayedOperation) =>
  op.conformance.verdict === 'HOLD' || op.conformance.verdict === 'BLOCK';

export const passed = (op: AssayedOperation) =>
  op.conformance.verdict === 'PASS' && op.caw.status === 'submitted';
