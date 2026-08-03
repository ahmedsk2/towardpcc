import { expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { serumOsmolality } from "./serum-osmolality";

/**
 * Every expected value is a worked example from
 * docs/research/scores/serum-osmolality.md ("Worked examples" 1–5), recomputed
 * from Smithline–Gardner (JAMA 1976, PMID 989132) with the ethanol divisors of
 * Purssell 2001 (PMID 11719745). Continuous outputs use a float tolerance; the
 * research rounds osmolalities to whole mOsm/kg, so ethanol-variant expectations
 * carry a 0.05 tolerance to bridge the reported rounding.
 */
const smithline = {
  citation: "Smithline N, Gardner KD Jr. Gaps—anionic and osmolal. JAMA. 1976;236(14):1594–1597.",
  pmid: "989132",
};
const purssell = {
  citation:
    "Purssell RA, Pudek M, Brubacher J, Abu-Laban RB. Derivation and validation of a formula to calculate the contribution of ethanol to the osmolal gap. Ann Emerg Med. 2001;38(6):653–659.",
  pmid: "11719745",
};

const TOL = 1e-6;

describeScore(serumOsmolality, (ctx) => {
  // Example 1 — normal panel, conventional units, near-zero gap.
  // Osm_calc = 2×140 + 90/18 + 14/2.8 = 280 + 5 + 5 = 290; gap = 292 − 290 = +2.
  ctx.workedExample(
    { ...smithline, locator: "serum-osmolality.md worked example 1 (normal panel, gap +2)" },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 292, unit: "mOsm/kg" },
    },
    [
      { id: "osm_calc", value: 290, tolerance: TOL },
      { id: "osm_gap", value: 2, tolerance: TOL },
    ],
  );

  // Example 2 — same patient in SI units (unit-equivalence check): glucose
  // 5.0 mmol/L → 90 mg/dL, urea 5.0 mmol/L → 14 mg/dL BUN. Osm_calc = 290,
  // identical to example 1. No measured value → no gap emitted.
  ctx.workedExample(
    { ...smithline, locator: "serum-osmolality.md worked example 2 (SI unit-equivalence → 290)" },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 5.0, unit: "mmol/L" },
      bun: { value: 5.0, unit: "mmol/L" },
    },
    [{ id: "osm_calc", value: 290, tolerance: TOL }],
  );

  // Example 3 — elevated gap suggesting an unmeasured osmole. measured = 330,
  // Osm_calc = 290 → gap = +40.
  ctx.workedExample(
    { ...smithline, locator: "serum-osmolality.md worked example 3 (elevated gap +40)" },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 330, unit: "mOsm/kg" },
    },
    [
      { id: "osm_calc", value: 290, tolerance: TOL },
      { id: "osm_gap", value: 40, tolerance: TOL },
    ],
  );

  // Example 4 — ethanol term rescues a falsely elevated gap. ethanol = 100 mg/dL,
  // measured = 318. Base Osm_calc 290; base gap 318 − 290 = +28 (looks abnormal).
  //   ÷3.7 (Purssell empiric): +100/3.7 = 27.0 → calc 317.0, residual gap ≈ +1.
  //   ÷4.6 (ideal MW): +100/4.6 = 21.7 → calc 311.7, residual gap ≈ +6.3.
  ctx.workedExample(
    {
      ...purssell,
      locator: "serum-osmolality.md worked example 4 (ethanol term, ÷3.7 and ÷4.6)",
    },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 100, unit: "mg/dL" },
      osm_measured: { value: 318, unit: "mOsm/kg" },
    },
    [
      { id: "osm_calc", value: 290, tolerance: TOL },
      { id: "osm_calc_ethanol_empiric", value: 317, tolerance: 0.05 },
      { id: "osm_calc_ethanol_ideal", value: 311.7, tolerance: 0.05 },
      { id: "osm_gap", value: 28, tolerance: TOL },
      { id: "osm_gap_ethanol_empiric", value: 1, tolerance: 0.05 },
      { id: "osm_gap_ethanol_ideal", value: 6.3, tolerance: 0.05 },
    ],
  );

  // Example 4, ethanol re-entered in SI (mmol/L): 21.739 mmol/L ×4.6 ≈ 100 mg/dL,
  // so the ÷3.7 residual gap must reproduce ≈ +1 (unit-trap check).
  ctx.workedExample(
    {
      ...purssell,
      locator: "serum-osmolality.md worked example 4 (ethanol entered as mmol/L)",
    },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 21.739, unit: "mmol/L" },
      osm_measured: { value: 318, unit: "mOsm/kg" },
    },
    [{ id: "osm_gap_ethanol_empiric", value: 1, tolerance: 0.05 }],
  );

  // Example 5 — hyperglycaemia raises calculated osmolality, gap stays at limit.
  // Osm_calc = 2×130 + 720/18 + 28/2.8 = 260 + 40 + 10 = 310; gap = 320 − 310 = +10.
  ctx.workedExample(
    { ...smithline, locator: "serum-osmolality.md worked example 5 (hyperglycaemia, gap +10)" },
    {
      na: { value: 130, unit: "mmol/L" },
      glucose: { value: 720, unit: "mg/dL" },
      bun: { value: 28, unit: "mg/dL" },
      osm_measured: { value: 320, unit: "mOsm/kg" },
    },
    [
      { id: "osm_calc", value: 310, tolerance: TOL },
      { id: "osm_gap", value: 10, tolerance: TOL },
    ],
  );

  // Example 6 — ethanol MORE than accounts for the gap, so the raw gap must not
  // be flagged elevated. ethanol = 200 mg/dL, measured = 320, base calc 290.
  //   raw gap = +30 (would have read "≥ 10, unmeasured osmole")
  //   ÷3.7: +200/3.7 = 54.05 → calc 344.05, residual −24.05
  //   ÷4.6: +200/4.6 = 43.48 → calc 333.48, residual −13.48
  // Both residuals negative → the raw gap is emitted as osm_gap_ethanol_explained.
  ctx.workedExample(
    {
      ...purssell,
      locator: "serum-osmolality.md worked example 6 (ethanol over-accounts; gap suppressed)",
    },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 200, unit: "mg/dL" },
      osm_measured: { value: 320, unit: "mOsm/kg" },
    },
    [
      { id: "osm_gap_ethanol_explained", value: 30, tolerance: TOL },
      { id: "osm_gap_ethanol_empiric", value: -24.054, tolerance: 0.001 },
      { id: "osm_gap_ethanol_ideal", value: -13.478, tolerance: 0.001 },
    ],
  );

  // Example 7 — the two divisors DISAGREE in sign, so the flag stands.
  // ethanol = 100 mg/dL, measured = 315, base calc 290 → raw gap +25.
  //   ÷3.7: residual 315 − 317.03 = −2.03 (negative)
  //   ÷4.6: residual 315 − 311.74 = +3.26 (positive)
  // Suppression requires BOTH negative, so this stays `osm_gap` and reads ≥ 10.
  ctx.workedExample(
    {
      ...purssell,
      locator: "serum-osmolality.md worked example 7 (divisors disagree; flag stands)",
    },
    {
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 100, unit: "mg/dL" },
      osm_measured: { value: 315, unit: "mOsm/kg" },
    },
    [
      { id: "osm_gap", value: 25, tolerance: TOL },
      { id: "osm_gap_ethanol_empiric", value: -2.027, tolerance: 0.001 },
      { id: "osm_gap_ethanol_ideal", value: 3.261, tolerance: 0.001 },
    ],
  );

  /**
   * The defect this guards: the raw gap and the residual gaps were both on the
   * page, and the raw one carried an "≥ 10, unmeasured osmole" band while the
   * residuals under it were negative. A `workedExample` asserts the ids it names
   * are present; only an explicit check can assert the OTHER id is absent, which
   * is the whole mechanism — `osm_gap` is what carries the elevated band, so
   * emitting the number under a different id is what suppresses the flag.
   */
  it("emits the raw gap under the unflagged id when both ethanol residuals are negative", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 200, unit: "mg/dL" },
      osm_measured: { value: 320, unit: "mOsm/kg" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap_ethanol_explained");
    expect(ids, "the banded id must be absent, or the flag is still shown").not.toContain(
      "osm_gap",
    );
  });

  it("keeps the banded id when only the ÷3.7 residual is negative", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      ethanol: { value: 100, unit: "mg/dL" },
      osm_measured: { value: 315, unit: "mOsm/kg" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap");
    expect(ids).not.toContain("osm_gap_ethanol_explained");
  });

  it("keeps the banded id when no ethanol is entered, however large the gap", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 330, unit: "mOsm/kg" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap");
    expect(ids).not.toContain("osm_gap_ethanol_explained");
  });

  // `ethanol` has min 0, so 0 is a legitimate entry meaning "measured, none
  // detected". With ethanol 0 both residuals collapse onto the raw gap, so a
  // guard testing only "both residuals negative" credited an ethanol of zero
  // with explaining EVERY negative gap — asserting that nothing accounted for
  // something. It displaced `gap-normal` on exactly the value Hoffman 1993 puts
  // at the centre of the healthy distribution: a gap of -2.
  it("does not credit an ethanol of zero with explaining an ordinary negative gap", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 90, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 288, unit: "mOsm/kg" }, // calculated 290 → raw gap -2
      ethanol: { value: 0, unit: "mg/dL" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap");
    expect(ids).not.toContain("osm_gap_ethanol_explained");
    const gap = outcome.result.values.find((v) => v.id === "osm_gap");
    expect(gap?.value).toBeCloseTo(-2, 6);
  });

  // Boundary coverage for every numeric input (required and optional). The base
  // panel is valid so each edge isolates the input under test.
  const base = {
    na: { value: 140, unit: "mmol/L" },
    glucose: { value: 90, unit: "mg/dL" },
    bun: { value: 14, unit: "mg/dL" },
  };
  ctx.boundaryTest("na", "min", base);
  ctx.boundaryTest("na", "max", base);
  ctx.boundaryTest("glucose", "min", base);
  ctx.boundaryTest("glucose", "max", base);
  ctx.boundaryTest("bun", "min", base);
  ctx.boundaryTest("bun", "max", base);
  ctx.boundaryTest("osm_measured", "min", base);
  ctx.boundaryTest("osm_measured", "max", base);
  ctx.boundaryTest("ethanol", "min", base);
  ctx.boundaryTest("ethanol", "max", base);

  // Implausible-input rejection (required inputs must each reject out of range).
  ctx.rejectsImplausible(
    "a sodium above the validity ceiling",
    { ...base, na: { value: 260, unit: "mmol/L" } },
    { inputId: "na", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a glucose above the validity ceiling",
    { ...base, glucose: { value: 5000, unit: "mg/dL" } },
    { inputId: "glucose", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a BUN below the validity floor",
    { ...base, bun: { value: 0, unit: "mg/dL" } },
    { inputId: "bun", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "sodium entered in an unsupported unit",
    { ...base, na: { value: 140, unit: "g/dL" } },
    { inputId: "na", code: "unknown-unit" },
  );
  ctx.rejectsImplausible(
    "a measured osmolality above the validity ceiling",
    { ...base, osm_measured: { value: 700, unit: "mOsm/kg" } },
    { inputId: "osm_measured", code: "out-of-range" },
  );

  // Osmolar-gap interpretation bands (Choy 2016 reference limit 10). Ascending:
  // the cut-off belongs to the elevated band (≥ 10). Negative gaps are normal.
  ctx.expectBand("osm_gap", -5, "gap-normal");
  ctx.expectBand("osm_gap", 0, "gap-normal");
  ctx.expectBand("osm_gap", 9.9, "gap-normal");
  ctx.expectBand("osm_gap", 10, "gap-elevated");
  ctx.expectBand("osm_gap", 40, "gap-elevated");

  // The suppressed id carries one band at every magnitude — a raw gap of 30 that
  // the ethanol term over-accounts for reads "accounted for", never "≥ 10".
  ctx.expectBand("osm_gap_ethanol_explained", 30, "gap-ethanol-explained");
  ctx.expectBand("osm_gap_ethanol_explained", 0, "gap-ethanol-explained");

  /**
   * Round-3 (2026-08-04) did not move a number; it widened what the page says
   * about the number. These three assertions exist because the whole change is
   * prose, so nothing else in this file would notice it being deleted.
   */
  const bandText = (id: string): string => {
    const band = serumOsmolality.interpretation.find((b) => b.id === id);
    if (!band) throw new Error(`no band ${id}`);
    return band.description.en;
  };

  it("carries the full measured spread, not only the −2 ± 6 summary", () => {
    // The boundary is unchanged; what changed is that the reader can see how
    // wide the healthy distribution is and where 10 sits inside it.
    const normal = bandText("gap-normal");
    expect(normal).toContain("321");
    expect(normal).toContain("−5 to +15");
    expect(normal).toContain("−14 to +10");
    expect(bandText("gap-elevated")).toContain("−14 to +10");
    // The cut-off itself must not have drifted while the description grew.
    const elevated = serumOsmolality.interpretation.find((b) => b.id === "gap-elevated");
    expect(elevated?.min).toBe(10);
  });

  it("states the negative-baseline reason a normal gap cannot exclude ingestion", () => {
    // "Does not exclude" on its own reads as boilerplate. The arithmetic is what
    // makes it actionable: a baseline near −14 leaves +10 a >20 mOsm/kg rise.
    const cautions = (serumOsmolality.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toContain("DOES NOT EXCLUDE TOXIC ALCOHOL INGESTION");
    expect(cautions).toMatch(/baseline may be NEGATIVE/);
    expect(bandText("gap-normal")).toMatch(/own true baseline may be NEGATIVE/);
  });

  it("records the absent paediatric gap data as settled, not as an open search", () => {
    // Settled-absent and not-yet-found are different claims, and only one of
    // them tells a reader to stop waiting for it.
    const cautions = (serumOsmolality.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toContain("No paediatric osmolar-gap data exists");
    expect(cautions).toMatch(/settled rather than a search still running/);
    expect(serumOsmolality.notes.en).toContain("NO PAEDIATRIC OSMOLAR-GAP DATA EXISTS");
    expect(serumOsmolality.notes.en).toMatch(/settled absent, not as an unfinished search/);
  });
});
