# Obol

Pay the source, per use.

When an AI answer draws on a source, Obol settles a fraction of a cent to that
source, split by what the answer actually used, on Arc, in USDC. The obol was
the small coin of the ancient world; here it is the coin an answer drops to
every source it stands on.

Live demo: https://useobol.vercel.app

## The gap it closes

AI answers are grounded in sources, and those sources are read for free. The
floor on payments (roughly thirty cents after fees) meant a citation was never
worth settling, so nobody did. Arc removes the floor: USDC gas, sub-second
finality, payments as small as $0.000001. Obol uses that to make grounding pay.

The hard part is not the rail. It is deciding **which** sources an answer was
actually grounded in, and by how much. That is the verifier, and it is the
product.

## How it works

1. **Retrieve.** A question comes in; Obol pulls the registered sources most
   relevant to it.
2. **Answer.** A model answers using only those sources and reports which it
   used.
3. **Verify.** The attribution verifier (Gemini) decides which sources the
   answer is genuinely grounded in and the contribution weight of each. Sources
   the answer did not use are paid nothing.
4. **Settle.** The toll is split by those weights and paid to each source as a
   sub-cent nanopayment on Arc, over x402 and Circle Gateway.

An autonomous **research agent** can run a batch of questions on its own,
grounding each answer and paying every source it draws on, so real test-USDC
flows continuously into the ledger.

## Architecture

Next.js 14 (App Router), TypeScript, Tailwind, Motion, Phosphor. One light
theme, one accent (verdigris, meaning "settled"), built to the taste-skill
anti-slop rules.

- `lib/sources.ts` the source registry: each source has a wallet that receives
  coins.
- `lib/retrieve.ts` term-overlap retrieval over the registry.
- `lib/answer.ts` grounded answer via Gemini (`lib/gemini.ts`).
- `lib/verifier.ts` the attribution verifier: `(question, answer, sources)` to
  per-source weights. Gemini, with a transparent heuristic fallback.
- `lib/arc.ts` the Arc settlement layer (Circle Gateway + x402).
- `lib/ledger.ts` in-memory ledger of settlements.

### Exact Arc / Circle call locations

- `app/api/source/route.ts` an x402-priced source endpoint. Returns HTTP 402
  with Gateway batching requirements, then verifies and settles with
  `BatchFacilitatorClient` from `@circle-fin/x402-batching/server`. Paid to the
  source's wallet.
- `lib/arc.ts` the buyer: `GatewayClient` from
  `@circle-fin/x402-batching/client` (`deposit`, `getBalances`, `pay`). Arc
  testnet `eip155:5042002`, USDC `0x3600…0000`, Gateway wallet `0x0077…19B9`.
- `app/api/ground/route.ts` orchestrates retrieve, answer, verify, then settles
  each grounded source's share.

A standalone Phase 0 spike that proves the rail and the verifier in isolation is
in `spike/` (`npm run spike`).

## Run

```bash
npm install
cp .env.local.example .env.local   # add FUNDER_PRIVATE_KEY and GEMINI_API_KEY
npm run dev                          # http://localhost:3000
```

- `FUNDER_PRIVATE_KEY` an Arc testnet wallet funded at https://faucet.circle.com
  (it pays the tolls).
- `GEMINI_API_KEY` powers the grounded answerer and the attribution verifier.
  Without it, a transparent heuristic runs so the demo still works.

Press **Try it live**, ask a question, and watch a coin drop to each source it
used. Or press **Run the research agent** to fill the ledger.

## Testnet evidence

Arc testnet, settled via Circle Gateway, verifier by Gemini.

- Funder / payer wallet: `0x619184708a654bc5500004485A44dD38B920D480`
- Source wallets receive per grounding, for example Numismatica
  `0xDB5ABBf92E02440B34EeA343F2aF354a8b55F883`.
- A live answer split across three sources settled `0.0012 / 0.0015 / 0.0003`
  USDC, one settlement each, with the unused sources paid nothing.

## Notes

- The public deploy carries a funded testnet key so visitor questions settle for
  real; that is the point (real flow), and the funds are testnet and
  refaucetable.
- The ledger is in-memory per server instance, enough for the live demo. Vercel
  KV would make it durable across instances.
