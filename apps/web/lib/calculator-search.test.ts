import { describe, expect, it } from "vitest";
import { listScores } from "@towardpcc/scoring-engine";
import { site } from "../content/site";
import { matchScores, SEARCH_ALIAS_SLUGS } from "./calculator-search";

const scores = listScores({ status: "published" });
const labels = site.calculators.categoryLabels;
const slugs = (q: string) => matchScores(scores, q, labels).map((s) => s.slug);

/**
 * The alias table is a set of clinical claims about what each calculator is
 * for, so the clinical ones are asserted as such, not just "returns something".
 */
describe("calculator search", () => {
  it("has scores to search, or nothing below proves anything", () => {
    expect(scores.length).toBeGreaterThan(0);
  });

  it("every alias key is a calculator that actually exists", () => {
    // A retired slug would otherwise keep a silent, unreachable alias forever.
    const real = new Set(scores.map((s) => s.slug));
    for (const slug of SEARCH_ALIAS_SLUGS) expect(real.has(slug), slug).toBe(true);
  });

  it("an empty query returns everything, untouched", () => {
    expect(slugs("   ")).toHaveLength(scores.length);
  });

  it("PARDS finds exactly the four oxygenation indices PALICC-2 grades it by", () => {
    // Clinical assertion: PALICC-2 classifies PARDS by OI/OSI on invasive
    // ventilation and P/F or S/F on non-invasive support. Not by PIM3.
    expect(new Set(slugs("PARDS"))).toEqual(
      new Set(["oxygenation-index", "oxygen-saturation-index", "pf-ratio", "sf-ratio"]),
    );
  });

  it("finds the calculator behind a drug, an eponym and a guideline", () => {
    expect(slugs("adrenaline")).toContain("vis");
    expect(slugs("Parkland")).toContain("burn-resuscitation");
    expect(slugs("schwartz")).toContain("kdigo-aki");
  });

  it("puts a name match above an alias match", () => {
    // "coma" is in the Pediatric Glasgow COMA Scale's name and only an alias on
    // the FOUR score, so the GCS must lead and the FOUR score must follow.
    const r = slugs("coma");
    expect(r[0]).toBe("pediatric-gcs");
    expect(r).toContain("four-score");
    // "mortality" is in BOTH mortality models' names, so both are name hits
    // and the order between them is alphabetical, not a ranking claim.
    expect(new Set(slugs("mortality").slice(0, 2))).toEqual(new Set(["pim3", "prism"]));
  });

  it("finds PELOD-2 by 'in-hospital mortality', which appears only in its tagline", () => {
    expect(slugs("in-hospital mortality")).toContain("pelod2");
  });

  it("does not let a two-letter query match by substring", () => {
    // "oi" must reach the Oxygenation Index by prefix and nothing by accident.
    const r = slugs("oi");
    expect(r).toContain("oxygenation-index");
    expect(r).not.toContain("pim3");
    expect(r).not.toContain("holliday-segar");
  });
});
