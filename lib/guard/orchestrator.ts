import type { AgentStep, AssayedOperation } from '@/lib/types';
import { getCawClient } from '@/lib/caw';
import { checkConformance } from './conformance';

// The guard wraps every operation the agent intends to submit. Before anything
// reaches CAW, it runs the intent-conformance check. Only PASS verdicts are
// forwarded for signing; HOLD and BLOCK never touch CAW.
//
// This is the one place the two layers meet, so it is also where the two-layer
// story is recorded: who stopped the operation, Assay or CAW.
//
// intentOverride lets the playground judge against a mandate the visitor typed,
// instead of the active pact's intent. The wallet's quantitative policies are
// unaffected; only the semantic mandate changes.
export async function assayStep(
  step: AgentStep,
  intentOverride?: string,
): Promise<AssayedOperation> {
  const caw = getCawClient();
  const intent = intentOverride?.trim() || (await caw.getActivePactIntent());

  const conformance = await checkConformance(intent, step.reasoning, step.operation);

  if (conformance.verdict !== 'PASS') {
    // Assay holds it. CAW never sees the operation.
    return {
      step,
      conformance,
      caw: { status: 'not_forwarded', reason: 'Held by Assay before reaching CAW.' },
      blockedBy: 'assay',
      createdAt: new Date().toISOString(),
    };
  }

  // On intent: forward to CAW, which still runs its own quantitative checks.
  const outcome = await caw.submitTransfer(step.operation);
  return {
    step,
    conformance,
    caw: outcome,
    blockedBy: outcome.status === 'denied' ? 'caw' : 'none',
    createdAt: new Date().toISOString(),
  };
}
