import { cn } from "@towardpcc/ui";
import { Reveal } from "@/components/reveal";

/**
 * The frame a piece of evidence sits in.
 *
 * /trust is seven claims, each ending in a "How it is checked" line that names
 * a machine-checkable artefact — a zero-network test, a coverage gate, a
 * validator slot. The page described those proofs and showed none of them,
 * which made it the last place on this site still telling rather than showing.
 * The hero draws the RSA coupling instead of captioning it; the result panel
 * prints its cutpoints beside the number. This holds the same register.
 *
 * THE FRAME KNOWS NOTHING ABOUT WHAT IT HOLDS. It owns the border, the padding,
 * the caption slot and the reveal; a coverage meter and a contrast swatch are
 * separate components that pass children in. Every figure they display comes
 * from `lib/evidence.ts`, which is the only module allowed to compute one.
 *
 * `scale` rather than `up` for the reveal direction: a proof object that
 * settles into view reads differently from one that slides past, and that
 * distinction is the reason to use it. It is also the first consumer of a
 * direction that has been defined in globals.css and unused since it was
 * written.
 */
export function EvidenceChip({
  caption,
  delay = 0,
  className,
  children,
}: {
  /**
   * What enforces or computes the figure — the spec file, the gate, the
   * source. A chip asserting a number without saying what stands behind it is
   * precisely the decorative assertion this page refuses.
   */
  caption: string;
  delay?: number | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <Reveal from="scale" delay={delay} className={cn("mt-5", className)}>
      {/*
        aria-hidden, and that is not an oversight.

        Every chip is a redundant visual encoding of a sentence already on the
        page — the same decision the calculator's band scale makes, for the same
        reason. Announcing the figure twice is noise, and the prose is the
        authoritative copy. Nothing here is the sole carrier of anything.
      */}
      <figure
        aria-hidden="true"
        className="m-0 max-w-[34rem] rounded-lg border border-border-subtle bg-surface-raised p-4"
      >
        {children}
        <figcaption className="mt-3 border-t border-border-subtle pt-2.5 font-numeric text-[11px] leading-relaxed text-ink-muted">
          {caption}
        </figcaption>
      </figure>
    </Reveal>
  );
}

/** A label above a figure, in the small-caps register the site already uses. */
function ChipLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 font-numeric text-eyebrow tracking-[0.1em] text-ink-muted uppercase">
      {children}
    </p>
  );
}

/**
 * The zero-network claim, as the panel a developer would actually look at.
 *
 * The ONLY chip that is not computed at build time — the value is a constant a
 * CI gate holds, so the caption names the gate rather than asking to be
 * believed. That is the whole difference between this and a decorative badge.
 */
export function NetworkChip({ spec, delay }: { spec: string; delay?: number }) {
  const rows = ["POST /api/score", "POST /api/log", "GET /api/session"];
  return (
    <EvidenceChip caption={`Asserted on every release by ${spec}`} delay={delay}>
      <ChipLabel>Network while calculating</ChipLabel>
      <ul className="mt-2.5 m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((r) => (
          <li
            key={r}
            className="flex items-center justify-between gap-4 font-numeric text-[12px] text-ink-muted/70"
          >
            {/* Struck through: these are the requests a calculator of this kind
                would normally make, shown as not made. A panel reading only
                "0" says nothing about what was avoided. */}
            <span className="line-through decoration-ink-muted/40">{r}</span>
            <span className="shrink-0 text-ink-muted/50">blocked</span>
          </li>
        ))}
      </ul>
      <p className="numeric mt-3 m-0 text-2xl font-medium text-ink-strong tabular-nums">
        0 <span className="text-base font-normal text-ink-muted">requests</span>
      </p>
    </EvidenceChip>
  );
}

/** Two counted figures over a hairline. Both already derived by the page. */
export function CountChip({
  scores,
  citations,
  delay,
}: {
  scores: number;
  citations: number;
  delay?: number | undefined;
}) {
  return (
    <EvidenceChip caption="Counted from the score definitions at build time" delay={delay}>
      <dl className="m-0 grid grid-cols-2 gap-4">
        {[
          { n: scores, label: "calculators published" },
          { n: citations, label: "citations behind them" },
        ].map((d) => (
          <div key={d.label}>
            <dd className="numeric m-0 text-3xl font-medium text-accent tabular-nums">{d.n}</dd>
            <dt className="mt-1 text-[13px] text-ink-muted">{d.label}</dt>
          </div>
        ))}
      </dl>
    </EvidenceChip>
  );
}

/**
 * The coverage gate as a meter that fills.
 *
 * Four axes named individually rather than one number, because "100% coverage"
 * is four separate claims and a merge is blocked by whichever fails first.
 */
export function CoverageChip({
  percent,
  axes,
  delay,
}: {
  percent: number;
  axes: readonly string[];
  delay?: number | undefined;
}) {
  return (
    <EvidenceChip caption="Enforced in CI; a pull request below it does not merge" delay={delay}>
      <ChipLabel>Engine test coverage</ChipLabel>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="numeric text-3xl font-medium text-accent tabular-nums">{percent}%</span>
        <span className="text-[13px] text-ink-muted">required, all four axes</span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {axes.map((axis) => (
          <div key={axis} className="flex items-center gap-3">
            <span className="w-[5.5rem] shrink-0 font-numeric text-[11px] text-ink-muted">
              {axis}
            </span>
            {/* The fill is a scaleX so it animates on the compositor. `--fill`
                carries the value so one rule serves every axis. */}
            <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-border-subtle">
              <span
                className="chip-meter block h-full origin-left rounded-pill bg-accent"
                style={{ "--fill": percent / 100 } as React.CSSProperties}
              />
            </span>
          </div>
        ))}
      </div>
    </EvidenceChip>
  );
}

/**
 * Clinical review, at zero.
 *
 * THE CHIP THAT MUST RENDER NOTHING AND STILL SHOW UP. Every reviewer slot is
 * empty today, and a progress component that treats 0 as "nothing to display"
 * would silently delete the site's most honest claim — the one that shows an
 * empty slot rather than hiding it. So the track always renders, and the count
 * is always spelled out in text beside it.
 */
export function ReviewChip({
  validated,
  total,
  delay,
}: {
  validated: number;
  total: number;
  delay?: number | undefined;
}) {
  return (
    <EvidenceChip
      caption="Read from each score's definition; no name appears until one is recorded"
      delay={delay}
    >
      <ChipLabel>Scores with completed clinical review</ChipLabel>
      <p className="numeric mt-2.5 m-0 text-3xl font-medium text-ink-strong tabular-nums">
        {validated} <span className="text-base font-normal text-ink-muted">of {total}</span>
      </p>
      {/* `data-review-track` is a test hook, not styling. The e2e suite asserts
          this track renders its full length with nothing filled at zero — the
          empty-slot-shown-rather-than-hidden behaviour — and pinning that to
          Tailwind class names would break on any restyle. */}
      <div data-review-track className="mt-3 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-pill",
              i < validated ? "bg-accent" : "bg-border-subtle",
            )}
          />
        ))}
      </div>
    </EvidenceChip>
  );
}

/** A contrast pair that must itself pass the ratio it reports. */
export function ContrastChip({ ratio, delay }: { ratio: number; delay?: number }) {
  return (
    <EvidenceChip
      caption="Computed from the shipped stylesheet in a unit test, every token against every surface"
      delay={delay}
    >
      <ChipLabel>Measured contrast</ChipLabel>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="grid h-12 w-20 shrink-0 place-items-center rounded-md border border-border-subtle bg-surface-page">
          <span className="font-display text-lg font-medium text-ink-strong">Aa</span>
        </span>
        <span>
          <span className="numeric text-2xl font-medium text-accent tabular-nums">
            {ratio.toFixed(1)}:1
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-muted">
            body text on the page ground — AA needs 4.5:1
          </span>
        </span>
      </div>
    </EvidenceChip>
  );
}
