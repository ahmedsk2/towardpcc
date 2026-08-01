import type { InterpretationBand, IpStatus, ScoreDefinition } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";
import { formatBand } from "./format";

const c = site.calculators;

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

  /**
   * A labelled instrument row rather than four identical grey pills.
   *
   * These four facts carry the page's credibility — what kind of score it is,
   * which version, when it was last reviewed, and whether anyone independent
   * has checked it — and they were rendered as interchangeable capsules with no
   * indication of which was which. A reader had to infer that "v1.0.0" was a
   * version and "Reviewed 2026-07-31" a date from the values alone.
   *
   * Static, deliberately. This sits directly above the calculator, and
   * motion.md revision 4 keeps that zone calm; the improvement here is
   * legibility and hierarchy, not movement.
   */
  const cell =
    "flex flex-col gap-0.5 border-s border-border-subtle px-4 first:border-s-0 first:ps-0";
  const key = "font-numeric text-[10px] font-semibold tracking-[0.1em] text-ink-muted uppercase";
  const val = "font-numeric text-[12.5px] tracking-[0.02em] text-ink-strong";

  return (
    <ul className="mt-5 flex list-none flex-wrap items-stretch gap-y-3 border-y border-border-subtle py-3">
      <li className={cell}>
        <span className={key}>Category</span>
        <span className={val}>{c.categoryLabels[score.category]}</span>
      </li>
      <li className={cell}>
        <span className={key}>Version</span>
        <span className={val}>v{score.version}</span>
      </li>
      {latest ? (
        <li className={cell}>
          <span className={key}>Reviewed</span>
          <span className={`${val} tabular-nums`}>{latest.date}</span>
        </li>
      ) : null}
      <li className={cell}>
        <span className={key}>Validation</span>
        {/* Crimson never means a problem on this site, so a pending state is
            ink-muted and a confirmed one is the semantic green — never the
            brand accent in either direction. */}
        <span className={validated ? `${val} text-success-text` : `${val} text-ink-muted`}>
          {validated ? c.validatedByPrefix.replace(/[:\s]+$/, "") : c.validationPending}
        </span>
      </li>
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
   * band would be an invention. For PIM3, PRISM and PELOD-2 it is a content
   * gap: those scores have published strata that have not been authored yet.
   * Rendering nothing for both told a reader the same thing about two different
   * situations, and one of those things was untrue.
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
