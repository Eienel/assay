# Assay

Pay the source, per use.

When an AI answer draws on a source, Assay settles a fraction of a cent to that
source, split by what the answer actually used. On Arc, in USDC.

Live: https://useassay.vercel.app

## The gap it closes

AI answers are grounded in sources, and those sources are read for free. The
floor on payments (roughly thirty cents after fees) meant a single citation was
never worth settling, so nobody did. Arc removes the floor: USDC gas, sub-second
finality, payments as small as $0.000001.

The hard part was never the rail. It is deciding **which** sources an answer was
actually grounded in, and by how much. That verifier is the product.

## What it does

- **Ask** a question. Assay answers from its registered sources, a verifier
  decides which sources the answer actually used and their contribution weights,
  and it settles a per-citation toll to each, live on Arc. Unused sources are
  paid nothing.
- **Dispatch a research agent.** Give it a goal and a budget. It plans its own
  questions, pays each source it draws on, tracks spend against the budget, and
  stops when the goal is covered or the budget runs out.
- **Claim a wallet.** A creator registers their content and any wallet they
  control. When an answer is grounded in it, they earn, and can withdraw
  on-chain and verify on ArcScan.
- **Source earnings page** at `/s/[wallet]`: claimable Gateway balance, on-chain
  balance, the answers that paid it, and a withdraw button.
- **The toll ledger**: a durable, searchable record of every settlement, with a
  glow on the freshly paid source and links to ArcScan.

## How a source gets paid

1. An answer grounds in a source. The toll lands in that source's **Circle
   Gateway balance**, gas-free and instant, keyed to its wallet.
2. From the source's earnings page, **withdraw** moves those earnings on-chain
   into the wallet, where the USDC is theirs to spend, verifiable on ArcScan.

Because Gateway batches, per-payment we get a Gateway transfer id, not a block
hash. The genuinely on-chain, ArcScan-verifiable transactions are the treasury's
**deposits** and each source's **withdrawal**.

## Architecture

Next.js 14 (App Router), TypeScript, Tailwind, Motion, Phosphor. One calm dark
theme, one accent (verdigris, meaning settled), built to the taste-skill
anti-slop rules. Durable state on Vercel KV with in-memory fallback.

- `lib/retrieve.ts` ranks sources (curated, creator-registered, live RSS).
- `lib/answer.ts` grounded answer via Gemini (`lib/gemini.ts`).
- `lib/verifier.ts` the attribution verifier: `(question, answer, sources)` to
  per-source weights. Gemini, with a transparent heuristic fallback.
- `lib/arc.ts` the Arc layer: Gateway deposit, x402 pay, earnings read, on-chain
  settle.
- `lib/registry.ts` the creator claim store. `lib/rss.ts` live RSS sources.
- `lib/ledger.ts` durable ledger. `lib/ratelimit.ts` per-IP limits. `lib/kv.ts`
  the KV connection.

### Exact Arc / Circle call sites

- `app/api/source/route.ts` an x402-priced source endpoint: returns HTTP 402
  with Gateway batching requirements, verifies and settles via
  `BatchFacilitatorClient` (`@circle-fin/x402-batching/server`), paid to the
  source's wallet.
- `lib/arc.ts` the buyer: `GatewayClient` (`@circle-fin/x402-batching/client`):
  `deposit`, `getBalances`, `pay`, plus a viem on-chain transfer for withdrawals.
  Arc testnet `eip155:5042002`, USDC `0x3600…0000`, Gateway `0x0077…19B9`.
- `app/api/ground/route.ts` retrieve, answer, verify, then settle each grounded
  source's share. `app/api/agent/plan/route.ts` the agent's planning step.

A standalone Phase 0 spike proving the rail and verifier in isolation is in
`spike/` (`npm run spike`).

## Run

```bash
npm install
cp .env.local.example .env.local   # FUNDER_PRIVATE_KEY, GEMINI_API_KEY
npm run dev
```

- `FUNDER_PRIVATE_KEY` an Arc testnet wallet funded at https://faucet.circle.com.
- `GEMINI_API_KEY` powers the answerer and verifier; without it a heuristic runs.
- Optional: `KV_REST_API_URL` + `KV_REST_API_TOKEN` for a durable ledger and
  registry; `OBOL_RATE_PER_CITATION` (default 0.0015) and `OBOL_MAX_TOLL_USDC`.

## Judging fit

- **Agentic:** the research agent plans, budgets, decides what to pay, and stops
  itself.
- **Traction:** real test-USDC settles on every answer; creators can register a
  wallet and withdraw what they earned.
- **Circle tools:** x402, Gateway nanopayments, USDC, Arc, end to end.
- **Innovation:** the attribution verifier as the pricing function.
