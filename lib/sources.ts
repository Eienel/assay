// The registered sources. Each is a publisher with a wallet that receives a
// nanopayment whenever an answer is grounded in its text. Wallets are real Arc
// testnet addresses; they only ever receive, so no keys live here.
//
// The corpus is intentionally small and factual so grounding is legible in a
// demo: an answer visibly draws on two or three of these and pays exactly them.

export interface Source {
  id: string;
  name: string;
  handle: string;
  payTo: `0x${string}`;
  text: string;
  live?: boolean; // true for sources pulled live from a real RSS publication
}

export const SOURCES: Source[] = [
  {
    id: 'lepton',
    name: 'Numismatica',
    handle: '@numismatica',
    payTo: '0xDB5ABBf92E02440B34EeA343F2aF354a8b55F883',
    text: 'The lepton was the smallest coin of the Greek world, one hundredth of a drachma. The name survived until the euro replaced the drachma in 2002. An obol was a small silver coin worth one sixth of a drachma in classical Athens.',
  },
  {
    id: 'arc',
    name: 'Arc Field Guide',
    handle: '@arc-field-guide',
    payTo: '0x64EfcB855d25e31f20D28d06664864689D22F7E5',
    text: 'Arc is a layer-one blockchain from Circle where gas is paid in USDC and finality lands in under a second. Native stablecoin gas and sub-second settlement make payments smaller than a cent economical for the first time.',
  },
  {
    id: 'x402',
    name: 'The Ledger Ledger',
    handle: '@the-ledger-ledger',
    payTo: '0x700BE60bED8e2Ad07A3d2ccBB6868c43e651Ed84',
    text: 'x402 revives the HTTP 402 Payment Required status code. A server answers a request with 402 and a price; the client pays and retries; the resource is returned on settlement. It turns any endpoint into a pay-per-request resource.',
  },
  {
    id: 'nano',
    name: 'Onchain Weekly',
    handle: '@onchain-weekly',
    payTo: '0x6593DBeC9158F5470c4D58022C817D168734963E',
    text: 'A nanopayment is a payment too small to have been worth making before fees: a fraction of a cent, per article, per call, per second. Circle Gateway batches many of them so each one clears gas-free.',
  },
  {
    id: 'agents',
    name: 'Agent Notes',
    handle: '@agent-notes',
    payTo: '0x8eD587B7BBFB9640908506a5d7F6A1e4980ec4Ac',
    text: 'When an AI agent answers a question it grounds the answer in sources it retrieved. Today those sources are read for free. An agent can hold a wallet and pay per call, which lets it settle a tiny fee to each source it actually used.',
  },
  {
    id: 'usdc',
    name: 'Stablecoin Times',
    handle: '@stablecoin-times',
    payTo: '0x5d549eF8D6a776c5D1150096B3eC86C057A182Cb',
    text: 'USDC is a fully reserved digital dollar issued by Circle. On Arc it is both the unit of account and the gas token, so a payment and its fee are denominated in the same dollar.',
  },
];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);
