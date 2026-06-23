import type { Metadata } from 'next';
import { AskConsole } from '@/components/AskConsole';
import { AgentConsole } from '@/components/AgentConsole';
import { Ledger } from '@/components/Ledger';

export const metadata: Metadata = { title: 'Try Assay' };

export default function TryPage() {
  return (
    <main className="pt-4">
      <AskConsole />
      <AgentConsole />
      <Ledger />
    </main>
  );
}
