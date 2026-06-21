import { Coin } from './Coin';

export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-shell items-center gap-8 px-5 pb-10 pt-14 sm:px-8 sm:pt-20 md:grid-cols-[1.15fr_0.85fr]"
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
            className="inline-flex items-center rounded bg-accent px-5 py-2.5 text-sm font-medium text-stone shadow-card transition-transform active:translate-y-px"
          >
            Try it live
          </a>
          <a href="#how" className="wipe px-1 text-sm text-muted hover:text-ink">
            How it works
          </a>
        </div>
      </div>

      {/* A small glass chip holding the coin, not a giant logo. */}
      <div className="hidden justify-end md:flex">
        <div className="glass float flex items-center gap-3 rounded-xl px-4 py-3">
          <Coin size={64} />
          <div className="leading-tight">
            <div className="mono text-sm text-ink">0.000001</div>
            <div className="label">smallest coin</div>
          </div>
        </div>
      </div>
    </section>
  );
}
