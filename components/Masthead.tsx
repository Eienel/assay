import { Hallmark } from './Hallmark';

type PactInfo = {
  intent: string;
  perTxCapUsd: number;
  allowlist: { label: string; address: string }[];
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// The certificate masthead. Reads like the head of an assay certificate: the
// office mark, then the mandate and the policy boundaries it was issued under.
export function Masthead({
  pact,
  mode,
  judge,
}: {
  pact: PactInfo;
  mode: 'mock' | 'live';
  judge: 'gemini' | 'claude' | 'heuristic';
}) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-3">
        <Hallmark size={30} title="Assay" />
        <span className="text-label uppercase tracking-[0.2em] text-ink">Assay</span>
        <span className="ml-auto flex items-center gap-2">
          <Chip>{mode === 'live' ? 'Live testnet' : 'Demo'}</Chip>
          <Chip>
            {judge === 'gemini' ? 'Gemini judge' : judge === 'claude' ? 'Claude judge' : 'Heuristic judge'}
          </Chip>
        </span>
      </div>

      <h1 className="mt-7 text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        The wallet checks the numbers.
        <br />
        Assay checks the intent.
      </h1>
      <p className="mt-4 max-w-[52ch] text-base text-muted">
        Cobo Agentic Wallet enforces quantitative bounds: caps, limits, allowlists. It cannot tell
        whether a payment is the one the agent was supposed to make. Assay sits in front of it and
        holds in-policy but off-intent operations for a human, instead of signing them.
      </p>

      <div className="mt-9 rounded-lg border bg-surface p-5">
        <div className="field-label">Mandate</div>
        <p className="mt-2 text-base text-ink">{pact.intent}</p>

        <div className="mt-5 grid gap-5 border-t border-hairline pt-5 sm:grid-cols-2">
          <div>
            <div className="field-label">Per transaction cap</div>
            <p className="mt-2 font-mono text-sm text-ink">{pact.perTxCapUsd} USDC</p>
          </div>
          <div>
            <div className="field-label">Supplier allowlist</div>
            <ul className="mt-2 space-y-1">
              {pact.allowlist.map((a) => (
                <li key={a.address} className="flex items-baseline gap-2 text-sm">
                  <span className="text-ink">{a.label}</span>
                  <span className="font-mono text-micro text-muted">{short(a.address)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-hairline px-2.5 py-1 text-micro uppercase tracking-[0.1em] text-muted">
      {children}
    </span>
  );
}
