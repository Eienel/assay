import type { CawClient } from './types';
import { MockCawClient } from './mock';
import { LiveCawClient } from './live';

// One switch for the whole integration. Set CAW_MODE=live with the live env
// vars to hit the real testnet; otherwise the demo runs against the mock, which
// reproduces CAW's quantitative enforcement faithfully.
export function getCawClient(): CawClient {
  if (process.env.CAW_MODE === 'live') {
    return new LiveCawClient();
  }
  return new MockCawClient();
}

export type { CawClient };
