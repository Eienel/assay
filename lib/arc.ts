import 'server-only';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Source } from './sources';

// Arc testnet, from the Circle x402-batching SDK.
export const ARC_NETWORK = 'eip155:5042002';
export const ARC_USDC = '0x3600000000000000000000000000000000000000';
export const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

export function buildRequirements(micros: number, payTo: string) {
  return {
    scheme: 'exact' as const,
    network: ARC_NETWORK,
    asset: ARC_USDC,
    amount: micros.toString(),
    payTo,
    // Wide validity window: the batching facilitator settles later and rejects
    // short-lived authorizations.
    maxTimeoutSeconds: 1209600,
    extra: { name: 'GatewayWalletBatched', version: '1', verifyingContract: GATEWAY_WALLET },
  };
}

let gw: GatewayClient | null = null;
export function getGateway(): GatewayClient | null {
  const key = process.env.FUNDER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) return null;
  if (!gw) gw = new GatewayClient({ chain: 'arcTestnet', privateKey: key });
  return gw;
}

// Make sure the Gateway wallet has enough deposited to cover a toll. Deposits a
// chunk when low so we are not depositing on every request.
export async function ensureDeposit(neededMicros: number): Promise<void> {
  const g = getGateway();
  if (!g) throw new Error('No funder key');
  const bal = await g.getBalances();
  if (bal.gateway.available >= BigInt(neededMicros)) return;
  await g.deposit('0.05');
  for (let i = 0; i < 15; i++) {
    const b = await g.getBalances();
    if (b.gateway.available >= BigInt(neededMicros)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// Pay one source its weighted share by calling our own x402 source endpoint.
// Returns the on-chain settlement id reported by the seller route.
export async function payToSource(
  baseUrl: string,
  source: Source,
  micros: number,
): Promise<string | undefined> {
  const g = getGateway();
  if (!g) throw new Error('No funder key');
  const url = `${baseUrl}/api/source?id=${source.id}&micros=${micros}`;
  const res = (await g.pay(url, { method: 'GET' })) as { data?: { tx?: string } };
  return res.data?.tx;
}
