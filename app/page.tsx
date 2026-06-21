import { Hero } from '@/components/Hero';
import { AskConsole } from '@/components/AskConsole';
import { Ledger } from '@/components/Ledger';
import { HowItWorks } from '@/components/HowItWorks';
import { Sources } from '@/components/Sources';

export default function Page() {
  return (
    <main>
      <Hero />
      <AskConsole />
      <Ledger />
      <HowItWorks />
      <Sources />
    </main>
  );
}
