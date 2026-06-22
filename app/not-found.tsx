import Link from 'next/link';
import { Coin } from '@/components/Coin';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-shell flex-col items-center px-5 py-32 text-center sm:px-8">
      <Coin size={56} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Nothing minted here</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        This page does not exist. The coins are back on the home page.
      </p>
      <Link href="/" className="btn btn-accent mt-6 px-5 py-2.5">
        Back to Assay
      </Link>
    </main>
  );
}
