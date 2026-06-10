import { ArrowDown, CheckCircle, Sliders, ScanSmiley } from '@phosphor-icons/react/dist/ssr';
import { SectionHeading } from './SectionHeading';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

// Plain-language explanation of the pipeline and the two layers.
export function HowItWorks() {
  return (
    <section id="how" className="mt-20 scroll-mt-6">
      <Reveal>
        <SectionHeading index="01">How it works</SectionHeading>
        <p className="mt-4 max-w-[58ch] text-base text-muted">
          Every operation an agent wants to make passes through Assay before the wallet is allowed
          to sign. Assay reads the mandate the agent was given and the agent&apos;s own reasoning for
          this step, then decides whether the two agree.
        </p>
      </Reveal>

      {/* The pipeline. A single column on mobile, the branch made explicit. */}
      <Reveal className="mt-8 rounded-lg border bg-surface p-1.5 shadow-card">
        <div className="rounded-[7px] border border-hairline p-5 sm:p-7">
          <Stage
            tag="Agent"
            title="An agent intends an operation"
            body="A transfer or contract call, with the reasoning that led the agent to it."
          />
          <Connector />
          <Stage
            tag="Assay"
            highlight
            title="Intent conformance check"
            body="Assay weighs the operation and its reasoning against the pact's stated intent. It returns one of three verdicts."
          />

          {/* Verdict branch */}
          <RevealGroup className="mt-5 grid gap-3 sm:grid-cols-3">
            <RevealItem>
              <Verdict
                dot="hallmark"
                name="Pass"
                body="Plainly on mandate. Forwarded to the wallet for signing."
              />
            </RevealItem>
            <RevealItem>
              <Verdict
                dot="oxide"
                name="Hold"
                body="In policy but off intent, or low confidence. Never forwarded. Waits for a human."
              />
            </RevealItem>
            <RevealItem>
              <Verdict dot="ink" name="Block" body="The reasoning hijacks the mandate. Stopped outright." />
            </RevealItem>
          </RevealGroup>

          <Connector label="Only a Pass continues" />

          <Stage
            tag="Wallet"
            title="Cobo Agentic Wallet signs, or denies on its own limits"
            body="A passed operation still meets the wallet's quantitative policies: per-transaction cap, allowlist, spend limits. If it is out of bounds, the wallet denies it with a structured reason."
            icon={<CheckCircle size={18} weight="regular" className="text-hallmark" />}
          />
        </div>
      </Reveal>

      {/* The two layers, side by side. */}
      <RevealGroup className="mt-6 grid gap-3 sm:grid-cols-2">
        <RevealItem>
          <Layer
            icon={<Sliders size={20} weight="regular" />}
            owner="Cobo Agentic Wallet"
            kind="Quantitative"
            body="Is this operation within bounds? Caps, rolling limits, address and contract allowlists, review thresholds. It cannot tell whether the operation was the right one."
          />
        </RevealItem>
        <RevealItem>
          <Layer
            icon={<ScanSmiley size={20} weight="regular" />}
            owner="Assay"
            kind="Semantic"
            body="Is this the operation the agent was supposed to make? It catches in-bounds-but-wrong payments: prompt injection, hallucination, goal drift, before the wallet ever sees them."
            accent
          />
        </RevealItem>
      </RevealGroup>
    </section>
  );
}

function Stage({
  tag,
  title,
  body,
  highlight,
  icon,
}: {
  tag: string;
  title: string;
  body: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight ? 'border-hallmark/40 bg-hallmark/[0.03]' : 'border-hairline bg-paper'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="field-label">{tag}</span>
        {icon}
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-3">
      <ArrowDown size={16} weight="bold" className="text-muted" />
      {label && (
        <span className="mt-1 text-micro uppercase tracking-[0.1em] text-muted">{label}</span>
      )}
    </div>
  );
}

function Verdict({
  dot,
  name,
  body,
}: {
  dot: 'hallmark' | 'oxide' | 'ink';
  name: string;
  body: string;
}) {
  const dotColor = dot === 'hallmark' ? 'bg-hallmark' : dot === 'oxide' ? 'bg-oxide' : 'bg-ink';
  return (
    <div className="h-full rounded-md border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-ink">{name}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

function Layer({
  icon,
  owner,
  kind,
  body,
  accent,
}: {
  icon: React.ReactNode;
  owner: string;
  kind: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className="h-full rounded-lg border bg-surface p-5 shadow-card">
      <div className={`flex items-center gap-2 ${accent ? 'text-hallmark' : 'text-ink'}`}>
        {icon}
        <span className="text-sm font-medium">{owner}</span>
      </div>
      <div className="field-label mt-1">{kind} layer</div>
      <p className="mt-3 text-sm text-muted">{body}</p>
    </div>
  );
}
