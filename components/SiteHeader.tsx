import { Wordmark } from './Coin';

// One-line nav at desktop. A quiet chip states the live network.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-stone/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-shell items-center gap-4 px-5 sm:px-8">
        <a href="#top" className="shrink-0">
          <Wordmark />
        </a>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-muted sm:flex">
          <a href="#ask" className="wipe hover:text-ink">
            Try it
          </a>
          <a href="#agent" className="wipe hover:text-ink">
            Agent
          </a>
          <a href="#how" className="wipe hover:text-ink">
            How it works
          </a>
          <a href="#sources" className="wipe hover:text-ink">
            Sources
          </a>
        </nav>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-micro text-muted sm:ml-0">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Arc testnet
        </span>
      </div>
    </header>
  );
}
