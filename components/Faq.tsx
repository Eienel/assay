import { Reveal } from './Reveal';

const QA: [string, string][] = [
  [
    'Are the payments real?',
    'Yes. Every answer settles real test-USDC on the Arc testnet through Circle Gateway and x402. The amounts are sub-cent and the network is a testnet, so the dollars are not real money, but the on-chain settlement is.',
  ],
  [
    'How does a source actually get paid?',
    'When an answer is grounded in a source, the toll lands in that source\'s Circle Gateway balance, gas-free and instant. From its earnings page the source withdraws on-chain into its own wallet, where the USDC is theirs to spend.',
  ],
  [
    'How is the split decided?',
    'A verifier reads the question, the answer, and the candidate sources, and scores how much each source actually contributed. Sources the answer did not use are paid nothing. The toll is divided by those contribution weights.',
  ],
  [
    'Can I get paid for my content?',
    'Register your source with a wallet you control. When an answer draws on it, you earn, and you can withdraw to your wallet and verify it on ArcScan. Receiving needs nothing but an address.',
  ],
  [
    'Why was this impossible before?',
    'Card and chain fees set a floor around thirty cents, so a single citation was never worth settling. Arc removes the floor: USDC gas, sub-second finality, payments as small as a millionth of a dollar.',
  ],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <Reveal>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Questions</h2>
      </Reveal>
      <dl className="mt-7 divide-y divide-hairline border-y border-hairline">
        {QA.map(([q, a]) => (
          <Reveal key={q} className="py-5">
            <dt className="text-base font-medium text-ink">{q}</dt>
            <dd className="mt-2 max-w-prose text-sm text-muted">{a}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
