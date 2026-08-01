import { describe, expect, it } from "vitest";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { formatBand, shortCite } from "./format";

/**
 * The provenance line beside every result.
 *
 * IT SHIPPED BROKEN AND NOTHING NOTICED. The year pattern was written through a
 * tool that read `\b` as the escape it is in most languages rather than as the
 * two characters a regex needs, so the compiled expression held literal
 * backspace characters and could never match. `shortCite` then took its
 * fallback branch and returned the whole citation — a valid string, so nothing
 * threw and no test failed, while the result panel printed a 200-character
 * reference where it meant to print "Matics 2017".
 *
 * That is the shape worth guarding: a graceful fallback hiding a dead branch.
 */
describe("shortCite", () => {
  // Worked examples, spanning the citation styles in the corpus.
  it.each([
    [
      "Matics TJ, Sanchez-Pinto LN. Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score. JAMA Pediatr. 2017;171(10):e172352.",
      "Matics 2017",
    ],
    [
      "Leteurtre S, Duhamel A, Salleron J. PELOD-2: an update of the PEdiatric logistic organ dysfunction score. Crit Care Med. 2013;41(7):1761-1773.",
      "Leteurtre 2013",
    ],
    [
      "Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752.",
      "Pollack 1996",
    ],
  ])("shortens %s", (citation, expected) => {
    expect(shortCite(citation)).toBe(expected);
  });

  it.each([
    // A collective author leading the named ones — the Berlin Definition.
    [
      "ARDS Definition Task Force; Ranieri VM, Rubenfeld GD, Thompson BT, et al. Acute respiratory distress syndrome: the Berlin Definition. JAMA. 2012;307(23):2526-2533.",
      "Ranieri 2012",
    ],
    // A corporate author with no personal one at all.
    [
      "KDIGO Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1-138.",
      "KDIGO 2012",
    ],
  ])("shortens the collective author in %s", (citation, expected) => {
    expect(shortCite(citation)).toBe(expected);
  });

  it.each([
    // No year to attach.
    "Smith J. A paper with no year.",
    // Title-first: matching the leading capital alone produced the plausible
    // and wrong "Endotracheal 2023".
    "Endotracheal Tube. StatPearls [Internet]. Treasure Island: StatPearls; 2023.",
    // Vendor pages, not issuing bodies — "MD 2019" would be an invention.
    "MDCalc / Scholastica. Sodium Correction for Hyperglycemia. 2019.",
    "Evidencio - Body surface area (Mosteller). 2020.",
  ])("returns null rather than degrading: %s", (citation) => {
    expect(shortCite(citation)).toBeNull();
  });

  /**
   * The set that actually renders. The source line appears only where a band
   * matched, so a score with no interpretation never reaches shortCite — and a
   * banded score whose first reference cannot be shortened would print its
   * whole citation into a 22rem sticky rail.
   */
  const banded = listScores().flatMap((meta) => {
    const score = getScore(meta.slug);
    if (!score || score.interpretation.length === 0) return [];
    const first = score.references[0];
    return first ? [[meta.slug, first.citation] as const] : [];
  });

  it("covers every score that renders a source line", () => {
    expect(banded.length).toBeGreaterThan(4);
  });

  it.each(banded)("shortens the first reference %s renders", (_slug, citation) => {
    const short = shortCite(citation);
    expect(short, "no provenance line would render").not.toBeNull();
    expect(short).toMatch(/^[A-Za-zÀ-ÿ'’-]+ (?:19|20)\d{2}$/);
  });
});

describe("formatBand", () => {
  /**
   * Inclusivity is the whole point. The defaults model an ascending
   * "≥ threshold" score (min inclusive, max exclusive); descending scores like
   * P/F invert both, and "4-8" would be ambiguous at precisely the boundary a
   * clinician is most likely to be looking up.
   */
  const band = (over: Record<string, unknown>) =>
    ({
      id: "b",
      appliesTo: "total",
      min: null,
      max: null,
      label: { key: "l", en: "L" },
      description: { key: "d", en: "D" },
      ...over,
    }) as never;

  it.each([
    [{ min: 4, max: 8 }, "4 to <8"],
    [{ min: 4, max: 8, maxInclusive: true }, "4 to 8"],
    [{ min: 4, max: 8, minInclusive: false }, ">4 to <8"],
    [{ min: 9 }, "≥ 9"],
    [{ min: 9, minInclusive: false }, "> 9"],
    [{ max: 9 }, "< 9"],
    [{ max: 9, maxInclusive: true }, "≤ 9"],
    [{}, "any value"],
  ])("prints %o as %s", (over, expected) => {
    expect(formatBand(band(over))).toBe(expected);
  });
});
