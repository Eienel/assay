import { Coin } from './Coin';
import { Reveal } from './Reveal';
import { SOURCES } from '@/lib/sources';
import { getLiveSources } from '@/lib/rss';
import { addressUrl } from '@/lib/explorer';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function Sources() {
  const live = await getLiveSources().catch(() => []);
  const all = [...SOURCES, ...live];

  return (
    <section id="sources" className="mx-auto max-w-shell scroll-mt-16 px-5 py-16 sm:px-8">
      <Reveal>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Registered sources</h2>
        <p className="mt-3 max-w-prose text-base text-muted">
          Each source has a wallet that receives a coin whenever an answer is grounded in it. The
          live ones are real publications, pulled from their RSS feeds; they are paid to a stand-in
          wallet until they claim it.
        </p>
      </Reveal>

      <ul className="mt-7 divide-y divide-hairline border-y border-hairline">
        {all.map((s) => (
          <li key={s.id} className="flex items-center gap-4 py-4">
            <Coin size={30} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink">{s.name}</span>
                <span className="mono text-micro text-muted">{s.handle}</span>
                {s.live && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-1.5 text-micro text-accent">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    live
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted">{s.text}</p>
            </div>
            <a
              href={addressUrl(s.payTo)}
              target="_blank"
              rel="noreferrer"
              className="mono hidden shrink-0 text-micro text-muted hover:text-accent sm:block"
              title="View wallet on ArcScan"
            >
              {short(s.payTo)} ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
