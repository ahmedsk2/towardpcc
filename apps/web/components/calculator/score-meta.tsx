import type { InterpretationBand, ScoreDefinition } from "@towardpcc/scoring-engine";
import { site } from "@/content/site";

const c = site.calculators;

/**
 * Renders a band's numeric range exactly as the engine evaluates it.
 *
 * Inclusivity is not decoration here. The defaults model an ascending
 * "≥ threshold" score (min inclusive, max exclusive), while descending scores
 * like P/F invert both, and a band printed as "4–8" would be ambiguous at
 * precisely the boundary a clinician is most likely to be looking up.
 */
function formatBand(band: InterpretationBand): string {
  const minInc = band.minInclusive ?? true;
  const maxInc = band.maxInclusive ?? false;

  if (band.min !== null && band.max !== null) {
    return `${minInc ? "" : ">"}${band.min} to ${maxInc ? "" : "<"}${band.max}`;
  }
  if (band.min !== null) return `${minInc ? "≥" : ">"} ${band.min}`;
  if (band.max !== null) return `${maxInc ? "≤" : "<"} ${band.max}`;
  return "any value";
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
  if (score.interpretation.length === 0) return null;

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
