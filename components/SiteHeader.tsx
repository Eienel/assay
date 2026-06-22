'use client';

import { useState } from 'react';
import { List, X } from '@phosphor-icons/react';
import { Wordmark } from './Coin';

const LINKS = [
  ['#ask', 'Try it'],
  ['#agent', 'Agent'],
  ['#how', 'How it works'],
  ['#sources', 'Sources'],
];

// One-line nav at desktop, a toggle menu on mobile. A quiet chip states network.
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-stone/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-shell items-center gap-4 px-5 sm:px-8">
        <a href="#top" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark />
        </a>

        <nav className="ml-auto hidden items-center gap-6 text-sm text-muted sm:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="wipe hover:text-ink">
              {label}
            </a>
          ))}
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
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-muted hover:text-ink"
            >
              {label}
            </a>
          ))}
          <span className="mt-2 inline-flex items-center gap-1.5 text-micro text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Arc testnet
          </span>
        </nav>
      )}
    </header>
  );
}
