import { Hero } from '@/components/Hero';
import { AskConsole } from '@/components/AskConsole';
import { AgentConsole } from '@/components/AgentConsole';
import { Ledger } from '@/components/Ledger';
import { HowItWorks } from '@/components/HowItWorks';
import { Sources } from '@/components/Sources';
import { Faq } from '@/components/Faq';

export default function Page() {
  return (
    <main>
      <Hero />
      <AskConsole />
      <AgentConsole />
      <Ledger />
      <HowItWorks />
      <Sources />
      <Faq />
    </main>
  );
}
