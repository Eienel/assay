import { MagnifyingGlass, ChatText, SealCheck, Coins } from '@phosphor-icons/react/dist/ssr';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

const STEPS = [
  {
    n: '1',
    icon: MagnifyingGlass,
    title: 'Retrieve',
    body: 'A question comes in. Assay pulls the registered sources most relevant to it.',
  },
  {
    n: '2',
    icon: ChatText,
    title: 'Answer',
    body: 'A model answers using only those sources, and reports which ones it drew on.',
  },
  {
    n: '3',
    icon: SealCheck,
    title: 'Verify',
    body: 'The verifier checks which sources the answer is genuinely grounded in, and by how much. The rest are paid nothing.',
  },
  {
    n: '4',
    icon: Coins,
    title: 'Settle',
    body: 'The toll is split by those weights and paid to each source as a sub-cent nanopayment on Arc, via x402 and Circle Gateway.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <Reveal>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">How it works</h2>
        <p className="mt-3 max-w-prose text-base text-muted">
          Grounding already happens every time an agent answers. Assay makes it pay the sources it
          used, in proportion, automatically.
        </p>
      </Reveal>

      {/* A stepped left-rail timeline, not a row of equal cards. */}
      <RevealGroup className="mt-9 border-l border-hairline">
        {STEPS.map((s) => (
          <RevealItem key={s.n}>
            <div className="relative flex gap-5 pb-8 pl-6 last:pb-0">
              <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border border-hairline bg-surface" />
              <div className="flex items-start gap-4">
                <s.icon size={22} weight="regular" className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="mono text-micro text-muted">{s.n}</span>
                    <h3 className="text-base font-medium text-ink">{s.title}</h3>
                  </div>
                  <p className="mt-1 max-w-prose text-sm text-muted">{s.body}</p>
                </div>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
