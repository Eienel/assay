import { AssayConsole } from '@/components/AssayConsole';
import { Masthead } from '@/components/Masthead';
import { DEMO_PACT, DEMO_STEPS } from '@/lib/demo/scenario';
import { getCawClient } from '@/lib/caw';
import { getJudgeProvider } from '@/lib/guard/provider';

export default function Page() {
  const mode = getCawClient().mode;
  const judge = getJudgeProvider() ?? 'heuristic';

  return (
    <main className="mx-auto w-full max-w-shell px-5 pb-24 pt-10 sm:px-6 sm:pt-16">
      <Masthead pact={DEMO_PACT} mode={mode} judge={judge} />
      <AssayConsole pact={DEMO_PACT} steps={DEMO_STEPS} />
    </main>
  );
}
