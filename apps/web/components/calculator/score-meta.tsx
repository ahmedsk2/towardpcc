import type { InterpretationBand, IpStatus, ScoreDefinition } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";
import { formatBand } from "./format";

const c = site.calculators;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-03` → `3 Sep 2026`. Changelog dates are ISO by the engine's gate. */
function humanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = MONTHS[(m ?? 1) - 1] ?? "";
  return `${d ?? ""} ${month} ${y ?? ""}`.trim();
}

/**
 * Metadata chips beside the heading: what this is, which version, when it was
 * last reviewed, and whether a clinician has signed it off.
 *
 * The review date is derived from the changelog, which every score already
 * carries. MDCalc publishes neither a per-page review date nor a version
 * history, so this is a place the site is genuinely ahead — worth showing at
 * the top rather than leaving at the bottom of the page.
 */

export function TrustStrip({ score }: { score: ScoreDefinition }) {
  const latest = [...score.changelog].sort((a, b) => b.date.localeCompare(a.date))[0];
  const validated = score.validators.every((v) => v.status === "assigned");
  // "3 Sep 2026", not "2026-09-03": a date a person reads, built by hand so it
  // is the same string on every server and never "6 Sept 2026" (en-GB's
  // short September) or "Sep 6, 2026" (en-US's order).
  const reviewed = latest ? humanDate(latest.date) : null;
  const items: { key: string; value: string; className?: string | undefined }[] = [
    { key: "Category", value: c.categoryLabels[score.category] },
    { key: "Version", value: `v${score.version}` },
    ...(reviewed ? [{ key: "Reviewed", value: `Reviewed ${reviewed}` }] : []),
    {
      key: "Validation",
      value: validated ? c.validatedByPrefix.replace(/[:\s]+$/, "") : "Validation pending",
      className: validated ? "text-success-text" : undefined,
    },
  ];
  /**
   * ONE QUIET LINE, not four labelled cells (2026-09-06). The keys survive
   * for screen readers; sighted readers get the values with a dot between.
   */
  return (
    <ul className="mt-4 flex list-none flex-wrap items-center gap-x-2.5 gap-y-1 font-numeric text-[12.5px] text-ink-muted">
      {items.map((it, i) => (
        <li key={it.key} className="flex items-center gap-2.5">
          {i > 0 ? (
            <span aria-hidden="true" className="size-[3px] rounded-pill bg-border-strong" />
          ) : null}
          <span className="sr-only">{it.key}: </span>
          <span className={it.className}>{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full result → meaning lookup, not merely the band that happens to apply
 * to what has been typed. A clinician reading a score wants to know where the
 * cutpoints are, not just which side of one this patient fell.
 *
 * Only 10 of the 22 scores declare bands; the rest are estimators (ideal body
 * weight, ETT size, maintenance fluids) where a severity band would be
 * meaningless. For those this renders nothing at all rather than an empty
 * table, because an absence presented as a gap reads as missing work.
 */
export function InterpretationTable({ score }: { score: ScoreDefinition }) {
  /**
   * "No band applies" and "we have not written one" used to render as the same
   * silence.
   *
   * Thirteen of the shipped scores declare no interpretation at all. For BSA,
   * ideal body weight and ETT size that is correct — they are estimators, and a
   * band would be an invention. PIM3, PRISM and PELOD-2 were once marked
   * "pending" here on the belief that they had published strata nobody had
   * transcribed yet; on 2026-08-03/04 that turned out to be false and all three
   * moved to "not-applicable". No paediatric mortality model publishes endorsed
   * severity tiers: registries report unit-level standardised mortality ratios,
   * calibration papers bin predicted probability only for goodness of fit, and
   * cutting a validated continuous prediction into categories is argued against
   * on statistical grounds (Altman & Royston, BMJ 2006;332(7549):1080).
   *
   * So no score currently ships as "pending", and the branch below is
   * deliberately kept for the case where one genuinely is mid-authoring —
   * rendering nothing would tell a reader the same thing about a settled
   * absence and an unfinished one.
   */
  if (score.interpretation.length === 0) {
    if (score.interpretationStatus !== "pending") return null;
    return (
      <Callout tone="note" className="max-w-[58ch] text-[13px]">
        {c.bandsPending}
      </Callout>
    );
  }

  const byOutput = new Map<string, InterpretationBand[]>();
  for (const band of score.interpretation) {
    const list = byOutput.get(band.appliesTo) ?? [];
    list.push(band);
    byOutput.set(band.appliesTo, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...byOutput.entries()].map(([outputId, bands]) => (
        <div key={outputId}>
          {byOutput.size > 1 ? (
            <h4 className="mb-2 font-numeric text-[11px] tracking-[0.1em] text-accent uppercase">
              {outputId}
            </h4>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-subtle bg-surface-sunken/50 text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Interpretation
                  </th>
                </tr>
              </thead>
              <tbody>
                {bands.map((band) => (
                  <tr
                    key={band.id}
                    className="border-b border-border-subtle/60 align-top last:border-0"
                  >
                    <td className="numeric px-4 py-3 whitespace-nowrap text-ink-strong tabular-nums">
                      {formatBand(band)}
                    </td>
                    <td className="px-4 py-3 leading-relaxed text-ink-body">
                      <span className="font-medium text-ink-strong">{band.label.en}</span>
                      {" — "}
                      {band.description.en}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Reproduction rights, rendered.
 *
 * Every score carries a typed `ipStatus` — original formula, freely
 * reproducible, permission required, permission obtained — with the
 * rights-holder and the evidence behind the claim. A repo-wide search found no
 * render of it anywhere: pSOFA has been carrying a paragraph of reasoning that
 * nobody could read.
 *
 * For a registry that reproduces published instruments this is exactly the
 * provenance a reviewing intensivist checks, and it belongs beside the
 * references rather than in a type definition.
 */
export function IpStatusNote({ status }: { status: IpStatus }) {
  const label = c.ipStatus[status.kind];
  const detail =
    status.kind === "freely-reproducible"
      ? status.evidence
      : status.kind === "permission-required"
        ? `${status.rightsHolder} — ${status.note}`
        : status.kind === "permission-obtained"
          ? `${status.rightsHolder} · ${c.ipGrantedOn} ${status.grantedDate}`
          : null;

  return (
    <div>
      <h3 className="font-display text-lg font-medium text-ink-strong">{c.ipHeading}</h3>
      <p className="mt-2 max-w-[58ch] leading-relaxed text-ink-body">
        <span className="font-medium">{label}</span>
        {detail ? <span className="mt-1 block text-[13px] text-ink-muted">{detail}</span> : null}
      </p>
    </div>
  );
}
