import { RecentCalls } from './RecentCalls';

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
          <a href="#ask" className="btn btn-accent px-5 py-2.5">
            Try it live
          </a>
          <a href="#how" className="btn btn-glass px-5 py-2.5">
            How it works
          </a>
        </div>
      </div>

      {/* A live document of the last few calls, in place of a static logo.
          Nudged slightly left so it sits closer to the headline. */}
      <div className="hidden md:block md:-translate-x-6">
        <RecentCalls />
      </div>
    </section>
  );
}
