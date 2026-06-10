import { AssayConsole } from '@/components/AssayConsole';
import { Masthead } from '@/components/Masthead';
import { HowItWorks } from '@/components/HowItWorks';
import { Playground } from '@/components/Playground';
import { SectionHeading } from '@/components/SectionHeading';
import { Reveal } from '@/components/Reveal';
import { DEMO_PACT, DEMO_STEPS } from '@/lib/demo/scenario';
import { getCawClient } from '@/lib/caw';
import { getJudgeProvider } from '@/lib/guard/provider';

export default function Page() {
  const mode = getCawClient().mode;
  const judge = getJudgeProvider() ?? 'heuristic';

  return (
    <main className="mx-auto w-full max-w-shell px-5 pb-24 pt-10 sm:px-6 sm:pt-16">
      <Masthead pact={DEMO_PACT} mode={mode} judge={judge} />

      <HowItWorks />

      <Reveal as="section" className="mt-20 scroll-mt-6">
        <div id="watch" className="scroll-mt-6">
          <SectionHeading index="02">Watch a scripted attack</SectionHeading>
          <p className="mt-4 max-w-[58ch] text-base text-muted">
            An agent runs under the mandate above. Play its session to watch each payment get
            assayed, including a prompt injection that stays inside the wallet&apos;s limits.
          </p>
          <AssayConsole pact={DEMO_PACT} steps={DEMO_STEPS} />
        </div>
      </Reveal>

      <Playground pact={DEMO_PACT} judge={judge} />

      <Reveal
        as="section"
        className="mt-16 border-t border-hairline pt-6 text-micro text-muted"
      >
        Assay tests every agent transaction against its mandate before the wallet will sign it.
        Running on the {mode === 'live' ? 'live testnet' : 'demo wallet'}, judged by{' '}
        {judge === 'gemini' ? 'Gemini' : judge === 'claude' ? 'Claude' : 'the built-in heuristic'}.
      </Reveal>
    </main>
  );
}
