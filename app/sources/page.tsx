import type { Metadata } from 'next';
import { Sources } from '@/components/Sources';

export const metadata: Metadata = { title: 'Sources, Assay' };

export default function SourcesPage() {
  return (
    <main className="pt-4">
      <Sources />
    </main>
  );
}
