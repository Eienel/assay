import 'server-only';
import { createHash } from 'node:crypto';
import { hasKv, kv } from './kv';
import { SOURCES } from './sources';
import { groundQuestion } from './ground';
import { sendOnChain } from './arc';

// Reputation you post as collateral, not a score you ask to be trusted.
//
// A broker agent stakes a USDC bond to vouch for a source's grounding quality.
// When an answer consults that source, the attribution verifier judges whether
// it genuinely delivered. Deliver, and the broker earns a small vouching fee and
// its reputation rises. Underdeliver, and its bond is slashed on-chain: a real
// USDC transfer, verifiable on ArcScan. A broker with something to lose is worth
// trusting. This is the ERC-8004 idea, made economic on Arc.

const STAKE = 50_000; // 0.05 USDC posted as bond, in micros
const SLASH = 5_000; // 0.005 USDC slashed per underdelivery
const REWARD = 500; // 0.0005 USDC vouching fee per good vouch
const WEIGHT_FLOOR = 0.15; // a source below this contribution underdelivered

const KEY = 'assay:brokers';

export interface Broker {
  id: string;
  name: string;
  wallet: `0x${string}`;
  backsSourceId: string;
  backsHandle: string;
  stakedMicros: number; // original bond
  bondMicros: number; // bond remaining after slashes
  earnedMicros: number; // vouching fees collected
  vouches: number; // times the backed source delivered
  slashes: number; // times it underdelivered and the bond was cut
}

export interface Judgment {
  brokerId: string;
  brokerName: string;
  backsHandle: string;
  delivered: boolean;
  weight: number;
  reason: string;
  action: 'reward' | 'slash' | 'insolvent';
  amountUsdc: string;
  txId: string | null;
  live: boolean;
  bondAfterUsdc: string;
  reputation: number;
}

export interface EvalResult {
  question: string;
  answer: string;
  method: 'gemini' | 'heuristic';
  judgments: Judgment[];
  ts: number;
}

// Reputation as a 0..100 score: the share of consultations the broker's source
// delivered on, weighted down hard by how much bond it has already lost.
export function reputation(b: Broker): number {
  const total = b.vouches + b.slashes;
  const hitRate = total ? b.vouches / total : 1;
  const bondHealth = b.stakedMicros ? b.bondMicros / b.stakedMicros : 0;
  return Math.round(100 * (0.6 * hitRate + 0.4 * bondHealth));
}

// A dedicated penalty vault: slashed bond forfeits here on-chain, so a slash
// reads as value genuinely leaving the escrow rather than a self-transfer.
const PENALTY_VAULT =
  ('0x' + createHash('sha256').update('assay:penalty-vault').digest('hex').slice(0, 40)) as `0x${string}`;

const g = globalThis as unknown as { __assayBrokers?: Broker[] };

function seed(): Broker[] {
  // One broker per curated source, each staking an equal bond.
  return SOURCES.map((s) => ({
    id: `bk-${createHash('sha256').update(s.id).digest('hex').slice(0, 6)}`,
    name: brokerName(s.id),
    wallet: walletFor(s.id),
    backsSourceId: s.id,
    backsHandle: s.handle,
    stakedMicros: STAKE,
    bondMicros: STAKE,
    earnedMicros: 0,
    vouches: 0,
    slashes: 0,
  }));
}

function brokerName(sourceId: string): string {
  const names: Record<string, string> = {
    lepton: 'Talos',
    arc: 'Daedalus',
    x402: 'Hermes',
    nano: 'Obolus',
    agents: 'Argos',
    usdc: 'Croesus',
  };
  return `${names[sourceId] ?? 'Broker'} Agent`;
}

const walletFor = (id: string) =>
  ('0x' + createHash('sha256').update('assay:broker:' + id).digest('hex').slice(0, 40)) as `0x${string}`;

export async function listBrokers(): Promise<Broker[]> {
  if (hasKv()) {
    try {
      const out = (await kv<{ result: string | null }>(['GET', KEY])).result;
      if (out) return JSON.parse(out) as Broker[];
      const s = seed();
      await kv(['SET', KEY, JSON.stringify(s)]);
      return s;
    } catch {
      /* fall through */
    }
  }
  return (g.__assayBrokers ??= seed());
}

async function saveBrokers(list: Broker[]): Promise<void> {
  if (hasKv()) {
    try {
      await kv(['SET', KEY, JSON.stringify(list)]);
      return;
    } catch {
      /* fall through */
    }
  }
  g.__assayBrokers = list;
}

export async function resetBrokers(): Promise<Broker[]> {
  const s = seed();
  await saveBrokers(s);
  return s;
}

// Run a question, let the verifier judge each consulted source, and settle the
// bond consequences on-chain: reward the brokers whose sources delivered, slash
// the ones whose sources did not.
export async function evaluate(question: string, origin: string): Promise<EvalResult> {
  const r = await groundQuestion(question, origin, { minWeight: 0 });
  const brokers = await listBrokers();
  const byId = new Map(brokers.map((b) => [b.backsSourceId, b]));
  const penaltyTo = PENALTY_VAULT; // slashed bond forfeits on-chain to the penalty vault

  const judgments: Judgment[] = [];
  // Only sources the answer actually consulted put their broker's bond at risk.
  for (const s of r.sources) {
    const broker = byId.get(s.id);
    if (!broker) continue;
    const delivered = s.grounded && s.weight >= WEIGHT_FLOOR;

    if (delivered) {
      const fee = Math.round(REWARD * (1 + s.weight));
      const txId = await sendOnChain(broker.wallet, fee).catch(() => null);
      broker.earnedMicros += fee;
      broker.vouches += 1;
      judgments.push({
        brokerId: broker.id,
        brokerName: broker.name,
        backsHandle: broker.backsHandle,
        delivered: true,
        weight: s.weight,
        reason: s.reason,
        action: 'reward',
        amountUsdc: (fee / 1e6).toFixed(6),
        txId,
        live: Boolean(txId),
        bondAfterUsdc: (broker.bondMicros / 1e6).toFixed(6),
        reputation: reputation(broker),
      });
    } else if (broker.bondMicros <= 0) {
      judgments.push({
        brokerId: broker.id,
        brokerName: broker.name,
        backsHandle: broker.backsHandle,
        delivered: false,
        weight: s.weight,
        reason: s.reason,
        action: 'insolvent',
        amountUsdc: '0.000000',
        txId: null,
        live: false,
        bondAfterUsdc: '0.000000',
        reputation: reputation(broker),
      });
    } else {
      const cut = Math.min(SLASH, broker.bondMicros);
      const txId = penaltyTo ? await sendOnChain(penaltyTo, cut).catch(() => null) : null;
      broker.bondMicros -= cut;
      broker.slashes += 1;
      judgments.push({
        brokerId: broker.id,
        brokerName: broker.name,
        backsHandle: broker.backsHandle,
        delivered: false,
        weight: s.weight,
        reason: s.reason,
        action: 'slash',
        amountUsdc: (cut / 1e6).toFixed(6),
        txId,
        live: Boolean(txId),
        bondAfterUsdc: (broker.bondMicros / 1e6).toFixed(6),
        reputation: reputation(broker),
      });
    }
  }

  await saveBrokers(brokers);
  return { question: r.question, answer: r.answer, method: r.method, judgments, ts: Date.now() };
}
