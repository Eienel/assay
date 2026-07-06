import 'server-only';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import {
  createWalletClient,
  createPublicClient,
  http,
  erc20Abi,
  formatUnits,
  type Address,
} from 'viem';
import { arcTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { setLastDeposit } from './ledger';

// Arc testnet, from the Circle x402-batching SDK.
export const ARC_NETWORK = 'eip155:5042002';
export const ARC_USDC = '0x3600000000000000000000000000000000000000';
export const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const RPC = 'https://rpc.testnet.arc.network';

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
  const dep = await g.deposit('0.05');
  await setLastDeposit(dep.depositTxHash); // real on-chain funding tx
  for (let i = 0; i < 15; i++) {
    const b = await g.getBalances();
    if (b.gateway.available >= BigInt(neededMicros)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// Pay one source its weighted share by calling our own x402 source endpoint.
// Returns the settlement id reported by the seller route. payTo is passed so
// live (RSS) sources resolve without any shared registry state.
export async function payToSource(
  baseUrl: string,
  id: string,
  payTo: string,
  micros: number,
): Promise<string | undefined> {
  const g = getGateway();
  if (!g) throw new Error('No funder key');
  const url = `${baseUrl}/api/source?id=${encodeURIComponent(id)}&payTo=${payTo}&micros=${micros}`;
  const res = (await g.pay(url, { method: 'GET' })) as { data?: { tx?: string } };
  return res.data?.tx;
}

// A source's earnings: what it has accrued in the Gateway (claimable) and what
// already sits on-chain in its wallet.
export async function getEarnings(
  payTo: string,
): Promise<{ gateway: string; onchain: string; gatewayMicros: number }> {
  const g = getGateway();
  let gatewayMicros = 0n;
  if (g) {
    try {
      gatewayMicros = (await g.getBalances(payTo as Address)).gateway.available;
    } catch {
      /* ignore */
    }
  }
  let onchain = 0n;
  try {
    const pub = createPublicClient({ chain: arcTestnet, transport: http(RPC) });
    onchain = (await pub.readContract({
      address: ARC_USDC as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [payTo as Address],
    })) as bigint;
  } catch {
    /* ignore */
  }
  return {
    gateway: formatUnits(gatewayMicros, 6),
    onchain: formatUnits(onchain, 6),
    gatewayMicros: Number(gatewayMicros),
  };
}

// The treasury's own address, derived from the funder key. It is the escrow that
// holds broker bonds and the counterparty a slashed bond returns to.
export function treasuryAddress(): string | null {
  const key = process.env.FUNDER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) return null;
  return privateKeyToAccount(key).address;
}

// A raw on-chain USDC transfer from the treasury to any address, verifiable on
// ArcScan. Used to settle bond slashes and vouching rewards. Returns null when
// no funder key is configured, so callers fall back to a recorded-only
// (simulated) settlement for local and keyless demos.
export async function sendOnChain(to: string, micros: number): Promise<string | null> {
  const key = process.env.FUNDER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key || micros <= 0) return null;
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: arcTestnet, transport: http(RPC) });
  const pub = createPublicClient({ chain: arcTestnet, transport: http(RPC) });
  const hash = await wallet.writeContract({
    address: ARC_USDC as Address,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to as Address, BigInt(micros)],
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

// Materialize a source's earnings on-chain: read what it has accrued in the
// Gateway, then send that exact amount on-chain from the treasury to its wallet,
// so the payout is verifiable as a real transaction on ArcScan. (We hold the
// treasury key, not the sources', and a Gateway withdrawal carries a large fee,
// so this is a direct on-chain transfer of the earned amount.)
export async function settleEarningsOnChain(
  payTo: string,
): Promise<{ txHash: string | null; amount: string }> {
  const g = getGateway();
  const key = process.env.FUNDER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!g || !key) throw new Error('No funder key');

  const earned = (await g.getBalances(payTo as Address)).gateway.available;
  if (earned <= 0n) return { txHash: null, amount: '0' };
  const cap = 50000n; // 0.05 USDC safety cap per click
  const micros = earned > cap ? cap : earned;

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: arcTestnet, transport: http(RPC) });
  const pub = createPublicClient({ chain: arcTestnet, transport: http(RPC) });
  const hash = await wallet.writeContract({
    address: ARC_USDC as Address,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [payTo as Address, micros],
  });
  await pub.waitForTransactionReceipt({ hash });
  return { txHash: hash, amount: formatUnits(micros, 6) };
}
