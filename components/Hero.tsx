import { Coin } from './Coin';

export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-shell items-center gap-10 px-5 pb-12 pt-12 sm:px-8 sm:pt-20 md:grid-cols-[1.1fr_0.9fr] md:gap-8"
    >
      <div>
        <span className="label">Nanopayments for sources</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Pay the source, per use.
        </h1>
        <p className="mt-4 max-w-prose text-lg text-muted">
          When an AI answer draws on a source, Obol settles a fraction of a cent to that source.
          Split by what the answer actually used, on Arc, in USDC.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#ask"
            className="inline-flex items-center rounded bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-card transition-transform active:translate-y-px"
          >
            Try it live
          </a>
          <a href="#how" className="wipe px-1 text-sm text-muted hover:text-ink">
            How it works
          </a>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className="absolute h-56 w-56 rounded-full border border-hairline sm:h-64 sm:w-64"
        />
        <div className="float">
          <Coin size={208} />
        </div>
      </div>
    </section>
  );
}
