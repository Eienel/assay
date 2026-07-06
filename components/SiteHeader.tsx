'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, X } from '@phosphor-icons/react';
import { Wordmark } from './Coin';

const LINKS: [string, string][] = [
  ['/try', 'Try it'],
  ['/trust', 'Bonds'],
  ['/sources', 'Sources'],
  ['/#how', 'How it works'],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = (href: string) => href.startsWith('/') && !href.includes('#') && pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-stone/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-shell items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm sm:flex">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`wipe ${active(href) ? 'text-ink' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </Link>
          ))}
          <Link href="/sources#register" className="btn btn-glass-accent px-3 py-1.5 text-micro">
            Become a source
          </Link>
        </nav>

        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-micro text-muted sm:inline-flex sm:ml-0">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Arc testnet
        </span>

        <button
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded text-ink sm:hidden"
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-hairline/70 bg-stone/95 px-5 py-3 sm:hidden">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-muted hover:text-ink"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/sources#register"
            onClick={() => setOpen(false)}
            className="block py-2 text-sm text-accent"
          >
            Become a source
          </Link>
          <span className="mt-2 inline-flex items-center gap-1.5 text-micro text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Arc testnet
          </span>
        </nav>
      )}
    </header>
  );
}
