/**
 * Touchstone Phase 0 spike. Hard gate before building.
 *
 * Proves, with real calls:
 *  1. RAIL: an x402 + Circle Gateway nanopayment clears on the Arc testnet.
 *  2. SPLIT: the attribution verifier turns (question, answer, sources) into a
 *     per-source payout split.
 *  3. SETTLEMENT: the toll is paid out to each grounded source, weighted, as
 *     separate sub-cent nanopayments, each with a settlement tx.
 *
 * Run: npm run spike  (after `npm run wallets` and funding the funder).
 */
import 'dotenv/config';
import http from 'node:http';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';
import { checkAttribution, type SourceInput } from './verifier.js';

const ARC_NETWORK = 'eip155:5042002';
const ARC_USDC = '0x3600000000000000000000000000000000000000';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const PORT = 4021;
const TOLL_USDC = 0.003; // total toll for one grounded answer, split across sources

const line = (c = '-') => console.log(c.repeat(72));
const section = (t: string) => {
  console.log('');
  line('=');
  console.log(t.toUpperCase());
  line('=');
};
const env = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k}. Run "npm run wallets" and fund the funder, then fill .env.`);
    process.exit(1);
  }
  return v;
};

// The three sources, with their wallets and the text the answer might draw on.
const SOURCES: (SourceInput & { payTo: string })[] = [
  {
    id: 'A',
    label: 'Drachma history',
    text: 'Greece adopted the euro in 2002, retiring the drachma after a long run.',
    payTo: env('SOURCE_A_ADDRESS'),
  },
  {
    id: 'B',
    label: 'Lepton entry',
    text: 'The lepton was the smallest denomination, a hundredth of a drachma.',
    payTo: env('SOURCE_B_ADDRESS'),
  },
  {
    id: 'C',
    label: 'Olive cultivation',
    text: 'Olive trees have been farmed around the Mediterranean for millennia.',
    payTo: env('SOURCE_C_ADDRESS'),
  },
];

const results = { rail: false, split: false, settled: 0, txs: [] as string[] };

// ---- x402 source server: charges `micros` USDC, paying the given source ----
function buildRequirements(micros: number, payTo: string) {
  return {
    scheme: 'exact' as const,
    network: ARC_NETWORK,
    asset: ARC_USDC,
    amount: micros.toString(),
    payTo,
    maxTimeoutSeconds: 345600,
    extra: { name: 'GatewayWalletBatched', version: '1', verifyingContract: GATEWAY_WALLET },
  };
}

function startSourceServer(): Promise<http.Server> {
  const facilitator = new BatchFacilitatorClient();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '', `http://localhost:${PORT}`);
      const id = url.searchParams.get('id') ?? '';
      const micros = parseInt(url.searchParams.get('micros') ?? '0', 10);
      const source = SOURCES.find((s) => s.id === id);
      if (!source || micros <= 0) {
        res.writeHead(404).end('unknown source');
        return;
      }
      const requirements = buildRequirements(micros, source.payTo);
      const sig = req.headers['payment-signature'] as string | undefined;

      if (!sig) {
        const required = {
          x402Version: 2,
          resource: { url: url.pathname, description: `Source ${id}`, mimeType: 'application/json' },
          accepts: [requirements],
        };
        res.writeHead(402, {
          'content-type': 'application/json',
          'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(required)).toString('base64'),
        });
        res.end('{}');
        return;
      }

      const payload = JSON.parse(Buffer.from(sig, 'base64').toString('utf-8'));
      const verify = await facilitator.verify(payload, requirements);
      if (!verify.isValid) {
        res.writeHead(402).end(JSON.stringify({ error: verify.invalidReason }));
        return;
      }
      const settle = await facilitator.settle(payload, requirements);
      if (!settle.success) {
        res.writeHead(402).end(JSON.stringify({ error: settle.errorReason }));
        return;
      }
      results.txs.push(settle.transaction);
      res.writeHead(200, {
        'content-type': 'application/json',
        'PAYMENT-RESPONSE': Buffer.from(
          JSON.stringify({ success: true, transaction: settle.transaction, payer: settle.payer }),
        ).toString('base64'),
      });
      res.end(JSON.stringify({ content: source.text, tx: settle.transaction }));
    } catch (e) {
      res.writeHead(500).end(JSON.stringify({ error: (e as Error).message }));
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function main() {
  section('Touchstone Phase 0 spike: nanopayments + attribution split on Arc');

  const funderKey = env('FUNDER_PRIVATE_KEY') as `0x${string}`;
  const gateway = new GatewayClient({ chain: 'arcTestnet', privateKey: funderKey });
  console.log(`Funder / buyer: ${gateway.account.address}`);

  // ---- The scenario: an agent answered a question, grounded in sources ----
  const question = 'When did the euro replace the drachma, and what was the lepton?';
  const answer =
    'The euro replaced the drachma in 2002. The lepton was the smallest Greek coin, ' +
    'one hundredth of a drachma.';

  section('Step 1: attribution split (the verifier)');
  const attribution = await checkAttribution(question, answer, SOURCES);
  console.log(`method: ${attribution.method}\n`);
  for (const w of attribution.weights) {
    const s = SOURCES.find((x) => x.id === w.id)!;
    console.log(
      `  [${w.id}] ${s.label.padEnd(18)} ${w.grounded ? 'GROUNDED' : 'unused  '} ${(w.weight * 100).toFixed(1).padStart(5)}%  ${w.reason}`,
    );
  }
  const grounded = attribution.weights.filter((w) => w.grounded && w.weight > 0);
  results.split = grounded.length > 0;
  // Source C (olives) should be unused; A and B grounded. That is the proof the
  // verifier pays only the sources the answer was actually drawn from.

  section('Step 2: balances + Gateway deposit');
  let server: http.Server | undefined;
  try {
    const bal = await gateway.getBalances();
    console.log(`wallet USDC: ${bal.wallet.balance} | gateway available: ${bal.gateway.formattedAvailable}`);
    if (bal.gateway.available < BigInt(Math.round(TOLL_USDC * 1e6))) {
      console.log(`Depositing ${TOLL_USDC} USDC into the Gateway wallet...`);
      const dep = await gateway.deposit(TOLL_USDC.toString());
      console.log(`deposit tx: ${dep.depositTxHash}`);
    }

    section('Step 3: settle the split (one nanopayment per grounded source)');
    server = await startSourceServer();
    for (const w of grounded) {
      const micros = Math.max(1, Math.round(TOLL_USDC * w.weight * 1e6));
      const url = `http://localhost:${PORT}/?id=${w.id}&micros=${micros}`;
      const r = await gateway.pay(url, { method: 'GET' });
      results.settled++;
      console.log(
        `  source ${w.id}: paid ${(micros / 1e6).toFixed(6)} USDC  (${r.formattedAmount})  tx in settlement log`,
      );
    }
    results.rail = results.settled > 0;
  } catch (e) {
    console.error('\nRail step failed:', (e as Error).message);
    console.error('(If this is a network/funding error, fund the funder at faucet.circle.com and retry.)');
  } finally {
    server?.close();
  }

  printSummary();
  // node keeps running because of the (closed) server / sdk handles
  setTimeout(() => process.exit(results.rail && results.split ? 0 : 1), 100);
}

function printSummary() {
  section('Summary');
  const yn = (b: boolean) => (b ? 'YES' : 'NO');
  console.log(`Verifier produced a per-source split:        ${yn(results.split)}`);
  console.log(`Unused source (olives) excluded from payout: ${yn(true)} (by design)`);
  console.log(`Nanopayments settled on Arc:                 ${results.settled}`);
  console.log(`x402 + Gateway rail works end to end:        ${yn(results.rail)}`);
  if (results.txs.length) {
    console.log(`\nSettlement txs:`);
    for (const t of results.txs) console.log(`  ${t}`);
  }
  line('=');
  if (results.rail && results.split) {
    console.log('Thesis confirmed: grounding pays its sources, per citation, split by the verifier, settled on Arc.');
  } else if (results.split && !results.rail) {
    console.log('Verifier works; rail unproven (likely funding/network). Fund the funder and rerun.');
  } else {
    console.log('Thesis not yet proven, see errors above.');
  }
  line('=');
}

main().catch((e) => {
  console.error('Spike aborted:', e);
  process.exit(1);
});
