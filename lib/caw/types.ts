import type { CawOutcome, Operation } from '@/lib/types';

// The single CAW interaction surface. Everything wallet- or pact-related goes
// through this so the whole integration is swappable in one place: mock for the
// demo, live for the real testnet.
export interface CawClient {
  readonly mode: 'mock' | 'live';

  // The active pact's declared intent. Assay weighs every step against this.
  getActivePactIntent(): Promise<string>;

  // Forward an in-policy, on-intent operation to CAW for signing. CAW still runs
  // its own quantitative policy checks; a structured denial comes back as a
  // 'denied' outcome rather than a thrown error.
  submitTransfer(op: Operation): Promise<CawOutcome>;
}
