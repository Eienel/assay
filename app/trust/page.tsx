import type { Metadata } from 'next';
import { BondsConsole } from '@/components/BondsConsole';

export const metadata: Metadata = {
  title: 'The bonding ring, Assay',
  description:
    'Broker agents stake a USDC bond on the sources they vouch for. The verifier judges each answer; good vouches earn a fee, bad ones are slashed on-chain. Reputation as collateral.',
};

export default function TrustPage() {
  return (
    <main className="pt-4">
      <BondsConsole />
    </main>
  );
}
