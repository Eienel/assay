# Assay

Assay is the assay office for autonomous payments. Just as an assay office tests
a metal against its claimed purity and strikes a hallmark only on what passes,
Assay tests every agent transaction against its mandate's stated intent and lets
the wallet sign only what conforms.

A semantic guard that checks every agent transaction against its mandate's
stated intent before Cobo Agentic Wallet will sign it.

## The gap Assay closes

Cobo Agentic Wallet (CAW) enforces **quantitative** bounds only: per-transaction
caps, rolling spend limits, address and contract allowlists, review thresholds.
It validates whether an operation is within bounds. It has no notion of whether
the operation matches what the agent was actually supposed to do.

So a payment that is under the cap and to an allowlisted address passes straight
through, even when it is the wrong payment: a prompt injection, a hallucination,
goal drift.

We proved this firsthand on the live testnet in the Phase 0 spike (see
`spike/`). Three transfers against one pact whose intent was "Pay verified
supplier invoices":

- **A** (in cap, allowlisted): signed.
- **B** (over cap): denied, `TRANSFER_LIMIT_EXCEEDED`.
- **C** (in cap, allowlisted, but unrelated to any invoice): **signed with zero
  questions.**

C is the gap. Assay closes it. It sits between the agent and CAW, checks each
operation against the pact's declared intent and the agent's reasoning, and
**holds** in-policy-but-off-intent operations for a human instead of signing
them.

## How it works

Every operation the agent intends to submit is wrapped by a guard. Before
anything reaches CAW, the guard runs an intent-conformance check and returns one
of three verdicts:

- **PASS** the operation is plainly what the agent was authorized to do. Forward
  to CAW and submit. The row is struck with the hallmark.
- **HOLD** in-policy but off-intent, or low confidence. Do not submit. Surface to
  a human with the mismatch reason. The row gets an oxide streak.
- **BLOCK** the reasoning shows a clear hijack of the mandate. Do not submit.

CAW's own quantitative denials are shown distinctly, so you can see the two
layers working together: **CAW catches out-of-bounds, Assay catches
in-bounds-but-wrong.**

## Architecture

- **Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, Phosphor.**
- The CAW interaction layer is isolated in one module so it is swappable:
  - `lib/caw/types.ts` the `CawClient` interface.
  - `lib/caw/live.ts` real `@cobo/agentic-wallet` SDK adapter.
  - `lib/caw/mock.ts` a faithful mock reproducing CAW's quantitative denials.
  - `lib/caw/index.ts` the one switch (`CAW_MODE=live`).
- The guard is provider-agnostic behind a single function:
  - `lib/guard/conformance.ts` `checkConformance(intent, reasoning, operation)`
    returns `{ verdict, confidence, reason }`.
  - `lib/guard/provider.ts` the only model touchpoint. Two providers are wired,
    Gemini (free tier) and Claude, selected automatically or forced with
    `ASSAY_JUDGE_PROVIDER`. A transparent heuristic runs when no key is set.
  - `lib/guard/orchestrator.ts` wraps an operation: conformance first, then CAW.
- `lib/caw/precheck.ts` the counterfactual that shows, on a held row, that CAW
  alone would have signed it.

### Exact CAW call locations

All live CAW calls live in `lib/caw/live.ts` (`@cobo/agentic-wallet` v0.1.7):

- `PactsApi.getPact` to read the active pact's intent.
- `TransactionsApi.transferTokens` to submit an on-intent transfer.

The Phase 0 spike in `spike/src/spike.ts` additionally exercises `submitPact`,
`revokePact`, `listAuditLogs`, `listWalletAddresses`, `FaucetApi.deposit`, and
`searchTokens`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

It runs fully in demo mode with no keys: a mock CAW client and a heuristic
judge. To use a model judge (Gemini's free tier or Claude) or the live testnet,
copy `.env.local.example` to `.env.local` and fill it in.

Press **Run the agent session** to play the scripted scenario.

## Demo scenario

The agent runs under the mandate "Pay verified supplier invoices for the gadget
store, USDC only." with a 50 USDC per-transaction cap and a two-vendor
allowlist.

1. A clean invoice payment to Northgate Components. Assay passes it, CAW signs
   it, the row is struck with the hallmark.
2. An oversized payment. Assay passes the intent; CAW's cap denies it. The
   quantitative layer doing its job.
3. **The wedge.** A prompt injection in the invoice inbox reroutes funds to
   Lumen Logistics, a different but still allowlisted vendor, for an amount under
   the cap. CAW would sign it without a question. Assay holds it because it does
   not match the mandate, and hands it to a human.

## Testnet evidence (Phase 0 spike, live)

Run on Ethereum Sepolia via the `caw` CLI against
`https://api.agenticwallet.cobo.com`.

- Wallet: `0c763505-d214-463c-a6d3-2e69a84c8c56`
  (`0x691aa23a4f361c5e9aa4db8c66e3b3606e1203ff`)
- Pact: `dc74ac5d-032a-4553-9c84-758d6e9bec52` (reached ACTIVE, auto-approved)
- A, in bounds: PASS, `status: Processing`.
- B, over cap: denied, the exact structured shape Assay's mock reproduces:

```json
{
  "code": "TRANSFER_LIMIT_EXCEEDED",
  "reason": "matched_pact_transfer_deny_if",
  "details": {
    "chain_id": "SETH", "token_id": "SETH",
    "tier": "pact", "policy_type": "transfer",
    "policy_id": "ba37b667-7abd-456f-bd29-96c11c497d3b"
  },
  "suggestion": "Operation denied by the pact's policy ..."
}
```

- C, in bounds but off-intent: PASS anyway. The gap, confirmed.

A SDK-based version of the same spike is in `spike/` (`npm run spike`).
