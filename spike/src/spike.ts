/**
 * Assay Phase 0 spike.
 *
 * Goal: prove with real CAW API calls that
 *   (a) the documented quantitative primitives behave as documented, and
 *   (b) the intent gap is real: an in-policy but off-intent transfer sails through.
 *
 * Run with one command:  npm run spike   (reads keys from spike/.env)
 *
 * It does NOT build the app. It prints a clear PASS/FAIL summary and stops.
 */

import 'dotenv/config';
import {
  AuditApi,
  Configuration,
  FaucetApi,
  MetadataApi,
  PactsApi,
  TransactionsApi,
  WalletsApi,
  type AuditLogRead,
  type InlinePolicyCreate,
  type PactPublicRead,
} from '@cobo/agentic-wallet';

// ----------------------------------------------------------------------------
// Constants for this spike. Base Sepolia testnet, USDC.
// ----------------------------------------------------------------------------
const CHAIN_ID = 'TBASE_SETH'; // Base Sepolia, per CAW testnet docs.
const PER_TX_CAP_USD = '50'; // Per-transaction cap for the pact.
const AMOUNT_A = '1'; // Operation A: in-cap, to the allowlisted supplier. Should PASS.
const AMOUNT_B = '500'; // Operation B: over-cap. Should be a STRUCTURED denial.
const AMOUNT_C = '2'; // Operation C: in-cap, allowlisted, but off-intent. Should PASS.
const DEFAULT_WRONG_ADDRESS = '0x000000000000000000000000000000000000dEaD';

// ----------------------------------------------------------------------------
// Small helpers.
// ----------------------------------------------------------------------------
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`\nMissing required env var: ${name}`);
    console.error('Copy spike/.env.example to spike/.env and fill it in, then re-run.\n');
    process.exit(1);
  }
  return v.trim();
}

const line = (c = '-') => console.log(c.repeat(72));
const section = (title: string) => {
  console.log('');
  line('=');
  console.log(title.toUpperCase());
  line('=');
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Extract the structured policy denial out of an axios-style error.
// Per handle-policy-denial docs, a denial is HTTP 403 with a body shaped like
// { code, reason, details, suggestion }.
function extractDenial(err: unknown): { status?: number; body?: unknown } | null {
  const e = err as { response?: { status?: number; data?: unknown }; isAxiosError?: boolean };
  if (e && e.response) {
    return { status: e.response.status, body: e.response.data };
  }
  return null;
}

// ----------------------------------------------------------------------------
// Result tracking for the final summary.
// ----------------------------------------------------------------------------
const results = {
  pactActive: false,
  aExecuted: false,
  bDenied: false,
  cExecuted: false,
  denialShape: undefined as unknown,
  sampleAuditEntry: undefined as AuditLogRead | undefined,
};

async function main() {
  section('Assay Phase 0 spike: CAW primitives and the intent gap');

  const apiUrl = requireEnv('CAW_API_URL');
  const apiKey = requireEnv('CAW_API_KEY');
  const walletId = requireEnv('CAW_WALLET_ID');
  const supplier = requireEnv('SUPPLIER_ADDRESS');
  const wrongAddress = (process.env.WRONG_ADDRESS || DEFAULT_WRONG_ADDRESS).trim();

  console.log(`Endpoint:  ${apiUrl}`);
  console.log(`Wallet:    ${walletId}`);
  console.log(`Supplier:  ${supplier} (allowlisted)`);
  console.log(`Wrong:     ${wrongAddress} (not allowlisted)`);

  // Owner-key client. We will swap to the pact-scoped key once the pact is active.
  const ownerConfig = new Configuration({ apiKey, basePath: apiUrl });
  const pactsApi = new PactsApi(ownerConfig);
  const txApi = new TransactionsApi(ownerConfig);
  const auditApi = new AuditApi(ownerConfig);
  const walletsApi = new WalletsApi(ownerConfig);
  const faucetApi = new FaucetApi(ownerConfig);
  const metadataApi = new MetadataApi(ownerConfig);

  // --------------------------------------------------------------------------
  // Step 1: resolve the wallet address and the USDC token id on Base Sepolia.
  // --------------------------------------------------------------------------
  section('Step 1: wallet address and USDC token id');

  let walletAddress = '';
  try {
    const addrs = (await walletsApi.listWalletAddresses(walletId)).data.result;
    const match =
      addrs.find((a) => (a.compatible_chains ?? []).includes(CHAIN_ID)) ?? addrs[0];
    walletAddress = match?.address ?? '';
    console.log(`Wallet address: ${walletAddress || '(none returned)'}`);
  } catch (err) {
    console.log('Could not list wallet addresses:', extractDenial(err) ?? err);
  }

  // Resolve USDC token id. Prefer the runtime search so we never hardcode wrong.
  let tokenId = `${CHAIN_ID}_USDC`; // sensible fallback matching CAW naming.
  try {
    const candidates = (await metadataApi.searchTokens('USDC')).data.result;
    const onChain = candidates.find((c) => c.chain_id === CHAIN_ID);
    if (onChain) tokenId = onChain.token_id;
    console.log(`USDC token id: ${tokenId}`);
  } catch (err) {
    console.log(`Token search failed, using fallback token id ${tokenId}.`, extractDenial(err) ?? '');
  }

  // --------------------------------------------------------------------------
  // Step 2: fund via faucet if possible (best effort, rate limited).
  // --------------------------------------------------------------------------
  section('Step 2: fund wallet via faucet (best effort)');
  if (walletAddress) {
    try {
      const dep = (await faucetApi.deposit({ address: walletAddress, token_id: tokenId })).data
        .result;
      console.log(`Faucet deposited ${dep.amount} ${dep.token_id} to ${dep.address}.`);
    } catch (err) {
      const d = extractDenial(err);
      console.log('Faucet skipped (likely already funded or rate limited):', d?.body ?? d ?? err);
    }
  } else {
    console.log('No wallet address resolved, skipping faucet.');
  }

  // --------------------------------------------------------------------------
  // Step 3: submit ONE pact with a clear stated intent and quantitative policies.
  // --------------------------------------------------------------------------
  section('Step 3: submit pact');

  const policies: InlinePolicyCreate[] = [
    {
      // Per-transaction cap.
      name: 'per-tx-cap',
      type: 'transfer',
      rules: {
        effect: 'allow',
        when: { chain_in: [CHAIN_ID] },
        deny_if: { amount_usd_gt: PER_TX_CAP_USD },
      },
    },
    {
      // Address allowlist: exactly the supplier, USDC only, on Base Sepolia.
      name: 'supplier-allowlist',
      type: 'transfer',
      rules: {
        effect: 'allow',
        when: {
          chain_in: [CHAIN_ID],
          token_in: [{ chain_id: CHAIN_ID, token_id: tokenId }],
          destination_address_in: [{ chain_id: CHAIN_ID, address: supplier }],
        },
      },
    },
  ];

  const intent = 'Pay verified supplier invoices for the gadget store, USDC only.';

  const submit = (
    await pactsApi.submitPact({
      wallet_id: walletId,
      intent,
      name: 'Assay spike: gadget store supplier payments',
      spec: {
        policies,
        completion_conditions: [{ type: 'tx_count', threshold: '10' }],
        execution_plan:
          'Pay invoices from verified suppliers only. Each payment is a USDC transfer on ' +
          'Base Sepolia to an allowlisted supplier address, under the per-transaction cap.',
      },
    })
  ).data.result;

  const pactId = submit.pact_id;
  console.log(`Submitted pact ${pactId}. Initial status: ${submit.status}`);

  // --------------------------------------------------------------------------
  // Step 3b: poll until ACTIVE. An unpaired agent auto-approves.
  // --------------------------------------------------------------------------
  let pact: PactPublicRead | undefined;
  for (let i = 0; i < 20; i++) {
    pact = (await pactsApi.getPact(pactId)).data.result;
    if (pact.status === 'active') break;
    if (['rejected', 'revoked', 'expired', 'withdrawn'].includes(pact.status)) {
      throw new Error(`Pact ${pact.status}, cannot proceed.`);
    }
    await sleep(2000);
  }
  if (!pact || pact.status !== 'active') {
    throw new Error(`Pact did not reach ACTIVE (last status: ${pact?.status}).`);
  }
  results.pactActive = true;
  console.log(`Pact is ACTIVE. Activated at ${pact.activated_at ?? 'n/a'}.`);

  // Swap to the pact-scoped API key for operations, if the pact provided one.
  const pactKey = pact.api_key;
  const opConfig = pactKey ? new Configuration({ apiKey: pactKey, basePath: apiUrl }) : ownerConfig;
  const opTxApi = pactKey ? new TransactionsApi(opConfig) : txApi;
  console.log(
    pactKey
      ? 'Using the pact-scoped API key for transfers.'
      : 'No pact-scoped key returned, using owner key for transfers.',
  );

  // --------------------------------------------------------------------------
  // Operation A: in-cap transfer to the allowlisted supplier. Should PASS.
  // --------------------------------------------------------------------------
  section('Operation A: in-cap to allowlisted supplier (expect PASS)');
  try {
    const res = (
      await opTxApi.transferTokens(walletId, {
        dst_addr: supplier,
        amount: AMOUNT_A,
        token_id: tokenId,
        chain_id: CHAIN_ID,
        request_id: `spike-A-${Date.now()}`,
        description: 'Invoice payment to verified supplier (on intent).',
      })
    ).data.result;
    results.aExecuted = true;
    console.log('Operation A accepted by CAW. Result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    const d = extractDenial(err);
    console.log('Operation A unexpectedly failed:', d?.body ?? d ?? err);
  }

  // --------------------------------------------------------------------------
  // Operation B: over-cap transfer. Should be a STRUCTURED denial (HTTP 403).
  // Also try a non-allowlisted address to show an address denial.
  // --------------------------------------------------------------------------
  section('Operation B: over-cap transfer (expect STRUCTURED denial)');
  try {
    const res = (
      await opTxApi.transferTokens(walletId, {
        dst_addr: supplier,
        amount: AMOUNT_B,
        token_id: tokenId,
        chain_id: CHAIN_ID,
        request_id: `spike-B-${Date.now()}`,
        description: 'Deliberately over the per-transaction cap.',
      })
    ).data.result;
    console.log('Operation B was NOT denied (unexpected). Result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    const d = extractDenial(err);
    if (d && d.status === 403) {
      results.bDenied = true;
      results.denialShape = d.body;
      console.log('Operation B denied as expected. Full denial object:');
      console.log(JSON.stringify(d.body, null, 2));
    } else {
      console.log('Operation B failed but not with a 403 policy denial:', d?.body ?? d ?? err);
    }
  }

  section('Operation B2: transfer to a non-allowlisted address (expect denial)');
  try {
    const res = (
      await opTxApi.transferTokens(walletId, {
        dst_addr: wrongAddress,
        amount: AMOUNT_A,
        token_id: tokenId,
        chain_id: CHAIN_ID,
        request_id: `spike-B2-${Date.now()}`,
        description: 'In-cap amount but to an address outside the allowlist.',
      })
    ).data.result;
    console.log('Operation B2 was NOT denied (unexpected). Result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    const d = extractDenial(err);
    if (d && d.status === 403) {
      console.log('Operation B2 denied as expected. Full denial object:');
      console.log(JSON.stringify(d.body, null, 2));
    } else {
      console.log('Operation B2 failed but not with a 403 policy denial:', d?.body ?? d ?? err);
    }
  }

  // --------------------------------------------------------------------------
  // Operation C: THE WEDGE. A second in-cap transfer to the SAME allowlisted
  // supplier that has nothing to do with the stated intent. CAW should ALLOW it
  // with zero questions, proving in-policy-but-off-intent passes.
  // --------------------------------------------------------------------------
  section('Operation C: in-cap, allowlisted, OFF-INTENT (expect PASS, this is the wedge)');
  try {
    const res = (
      await opTxApi.transferTokens(walletId, {
        dst_addr: supplier,
        amount: AMOUNT_C,
        token_id: tokenId,
        chain_id: CHAIN_ID,
        request_id: `spike-C-${Date.now()}`,
        description:
          'Injected/hallucinated payment. Within cap, to an allowlisted address, ' +
          'but unrelated to paying a verified invoice. CAW has no way to know.',
      })
    ).data.result;
    results.cExecuted = true;
    console.log('Operation C accepted by CAW despite being off-intent. Result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    const d = extractDenial(err);
    console.log('Operation C failed (unexpected for the wedge):', d?.body ?? d ?? err);
  }

  // --------------------------------------------------------------------------
  // Step 6: read the audit log and print entries for A, B, C.
  // --------------------------------------------------------------------------
  section('Step 6: audit log');
  try {
    const page = (
      await auditApi.listAuditLogs(
        walletId,
        undefined, // principal_id
        undefined, // action
        undefined, // result
        undefined, // start_time
        undefined, // end_time
        undefined, // after
        undefined, // before
        undefined, // cursor
        50, // limit
      )
    ).data.result;

    const items = page.items ?? [];
    console.log(`Fetched ${items.length} audit entries (most recent first).`);
    for (const it of items.slice(0, 12)) {
      const req = (it.request ?? {}) as Record<string, unknown>;
      console.log(
        `  #${it.id} ${it.created_at} ${it.action} -> ${it.result}` +
          (req.amount ? `  amount=${String(req.amount)}` : '') +
          (req.dst_addr ? `  dst=${String(req.dst_addr)}` : ''),
      );
    }
    const denied = items.find((i) => i.result === 'denied');
    results.sampleAuditEntry = denied ?? items[0];
    if (results.sampleAuditEntry) {
      console.log('\nOne full audit entry:');
      console.log(JSON.stringify(results.sampleAuditEntry, null, 2));
    }
  } catch (err) {
    console.log('Could not read audit log:', extractDenial(err) ?? err);
  }

  // --------------------------------------------------------------------------
  // Step 7: revoke the pact to clean up.
  // --------------------------------------------------------------------------
  section('Step 7: revoke pact (cleanup)');
  try {
    const revoked = (await pactsApi.revokePact(pactId)).data.result;
    console.log(`Pact ${pactId} status after revoke: ${revoked.status}`);
  } catch (err) {
    console.log('Revoke failed:', extractDenial(err) ?? err);
  }

  // --------------------------------------------------------------------------
  // Final summary.
  // --------------------------------------------------------------------------
  printSummary();
}

function printSummary() {
  section('Spike summary');
  const yn = (b: boolean) => (b ? 'YES' : 'NO');
  console.log(`Pact reached ACTIVE:                         ${yn(results.pactActive)}`);
  console.log(`A executed (in-cap, allowlisted):            ${yn(results.aExecuted)}`);
  console.log(`B got a structured denial (over-cap):        ${yn(results.bDenied)}`);
  console.log(`C executed despite being off-intent (wedge): ${yn(results.cExecuted)}`);

  console.log('\nExact denial shape captured:');
  console.log(results.denialShape ? JSON.stringify(results.denialShape, null, 2) : '(none captured)');

  console.log('\nOne audit log entry:');
  console.log(
    results.sampleAuditEntry ? JSON.stringify(results.sampleAuditEntry, null, 2) : '(none captured)',
  );

  const thesisConfirmed =
    results.pactActive && results.aExecuted && results.bDenied && results.cExecuted;

  line('=');
  if (thesisConfirmed) {
    console.log('Thesis confirmed, safe to build.');
    console.log(
      'CAW allowed an in-policy but off-intent transfer (Operation C) with zero questions. ' +
        'That is exactly the gap Assay closes.',
    );
  } else {
    console.log('Thesis broken, here is why:');
    if (!results.pactActive) console.log('  - Pact never reached ACTIVE.');
    if (!results.aExecuted) console.log('  - In-policy Operation A did not execute.');
    if (!results.bDenied) console.log('  - Over-cap Operation B was not a structured denial.');
    if (!results.cExecuted) console.log('  - Off-intent Operation C did not execute (gap may not exist as assumed).');
  }
  line('=');
}

main().catch((err) => {
  console.error('\nSpike aborted with an error:');
  const d = extractDenial(err);
  console.error(d ? JSON.stringify(d, null, 2) : err);
  printSummary();
  process.exit(1);
});
