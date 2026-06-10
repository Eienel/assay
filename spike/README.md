# Assay Phase 0 spike

This is a hard gate. It proves, with real CAW API calls, that:

1. The Cobo Agentic Wallet quantitative primitives behave as documented (per-transaction cap, address allowlist, structured policy denial, audit log).
2. The intent gap is real: an in-policy but off-intent transfer sails straight through.

It does not build the product. It runs, prints a PASS/FAIL summary, and stops.

## Run

```bash
cd spike
npm install
cp .env.example .env   # then fill in your credentials
npm run spike
```

## What it does

Base Sepolia (`TBASE_SETH`), USDC.

1. Resolves the wallet address and the USDC token id (via token search, with a fallback).
2. Funds the wallet via the built-in faucet (best effort, rate limited).
3. Submits one pact: intent "Pay verified supplier invoices for the gadget store, USDC only.", with a per-transaction cap of 50 USDC and an allowlist of exactly one supplier address. Polls until ACTIVE (an unpaired agent auto-approves).
4. Operation A: in-cap transfer to the allowlisted supplier. Expect PASS.
5. Operation B: over-cap transfer (and B2: a non-allowlisted address). Expect a structured HTTP 403 denial; prints the full denial object.
6. Operation C, the wedge: a second in-cap transfer to the same allowlisted supplier that has nothing to do with the intent. Expect CAW to ALLOW it with zero questions.
7. Reads the audit log and prints entries for A, B, C.
8. Revokes the pact to clean up.

## SDK call locations

All CAW calls live in `src/spike.ts` using `@cobo/agentic-wallet` v0.1.7:

- `PactsApi.submitPact`, `getPact`, `revokePact`
- `TransactionsApi.transferTokens`
- `AuditApi.listAuditLogs`
- `WalletsApi.listWalletAddresses`
- `FaucetApi.deposit`
- `MetadataApi.searchTokens`
