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

  // The 2026-09-05 arithmetic audit read the page's rule as "both residuals
  // negative" and found this case did not carry the label. It must not: the
  // raw gap is -40.6, so there is nothing for 50 mg/dL of ethanol to account
  // for, and the page now says so. The contrast case one row down has the
  // same ethanol and a raw gap of +0.4, and IS accounted for.
  it("does not label a negative raw gap as accounted for by ethanol (audit case)", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 100, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 250, unit: "mOsm/kg" }, // calculated 290.56 → raw gap -40.6
      ethanol: { value: 50, unit: "mg/dL" }, // residuals -54.1 and -51.4, both negative
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap");
    expect(ids).not.toContain("osm_gap_ethanol_explained");
    const gap = outcome.result.values.find((v) => v.id === "osm_gap");
    expect(gap?.value).toBeCloseTo(250 - (280 + 100 / 18 + 14 / 2.8), 6);
  });

  it("labels a non-negative raw gap as accounted for when both residuals are negative (audit contrast)", () => {
    const outcome = serumOsmolality.compute({
      na: { value: 140, unit: "mmol/L" },
      glucose: { value: 100, unit: "mg/dL" },
      bun: { value: 14, unit: "mg/dL" },
      osm_measured: { value: 291, unit: "mOsm/kg" }, // raw gap +0.44
      ethanol: { value: 50, unit: "mg/dL" }, // residuals -13.1 and -10.4
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const ids = outcome.result.values.map((v) => v.id);
    expect(ids).toContain("osm_gap_ethanol_explained");
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

  /**
   * Round-4 (2026-08-04) WITHDRAWAL. Version 1.2.0 shipped "no paediatric
   * osmolar-gap data exists — settled absent". Three paediatric datasets exist.
   * "Settled absent" tells a reader to stop looking, so shipping it wrongly is
   * worse than never having claimed it, and these assertions exist to stop the
   * claim quietly reappearing. Nothing here moves a boundary — the ≥ 10 band is
   * asserted unchanged alongside the retraction.
   */
  const surfaces = (): string[] => [
    ...(serumOsmolality.cautions ?? []).map((c) => c.en),
    ...serumOsmolality.interpretation.map((b) => b.description.en),
    serumOsmolality.notes.en,
  ];

  it("no longer asserts paediatric osmolar-gap data is settled absent", () => {
    const text = surfaces().join("\n");
    // The exact 1.2.0 formulations. Each told a reader the question was closed.
    expect(text).not.toContain("settled rather than a search still running");
    expect(text).not.toContain("settled absent, not as an unfinished search");
    expect(text).not.toContain("settled absent, not unfound");
    expect(text).not.toContain("that absence is settled rather than merely unfound");
    expect(text).not.toContain("none of it has been measured in children");
    // The sentence may survive ONLY as a quoted retraction, so any surface that
    // still utters it has to mark it withdrawn in the same breath.
    for (const surface of surfaces()) {
      if (/no paediatric osmolar-gap data exists/i.test(surface)) {
        expect(surface, "a settled-absent claim must be marked withdrawn").toMatch(
          /WITHDRAWN|withdrawn|retracted/,
        );
      }
    }
  });

  it("carries the paediatric gap data that replaces the withdrawn claim", () => {
    const cautions = (serumOsmolality.cautions ?? []).map((c) => c.en).join(" ");
    // McQuillen 1999 — the study whose existence 1.2.0 denied.
    expect(cautions).toContain("192 children");
    expect(cautions).toContain("22 mOsm");
    // Dursun 2007 — a wide spread corroborated in a second paediatric cohort.
    expect(cautions).toContain("13.7 ± 14.5");
    expect(cautions).toContain("15.2 ± 17.6");
    // Both gap bands must tell a paediatric reader the normal range is wide,
    // because that is the half of this change that reaches the bedside.
    expect(bandText("gap-normal")).toContain("22 mOsm");
    expect(bandText("gap-elevated")).toContain("22 mOsm");
    // Every new claim must be citable, not just stated.
    const ids = serumOsmolality.references.map((r) => ("pmid" in r ? r.pmid : undefined));
    expect(ids).toContain("9928973"); // McQuillen 1999
    expect(ids).toContain("17139190"); // Dursun 2007
    expect(ids).toContain("36819138"); // Berska 2023
  });

  it("keeps the boundary at 10 while saying the paediatric normal is wider", () => {
    // The point of the correction is NOT to move the cut-off — no paediatric
    // cut-point is published — but to stop 10 reading as a sharp line.
    const elevated = serumOsmolality.interpretation.find((b) => b.id === "gap-elevated");
    const normal = serumOsmolality.interpretation.find((b) => b.id === "gap-normal");
    expect(elevated?.min).toBe(10);
    expect(normal?.max).toBe(10);
    expect(bandText("gap-elevated")).toMatch(/weaker evidence/);
    const cautions = (serumOsmolality.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toMatch(/weaker evidence/);
  });

  it("states the under-3-months rule with the error type behind it", () => {
    // "Not validated" is weaker than what the study actually found, and the
    // calculator will compute for a neonate regardless — so say it at the point
    // of use, with the reason.
    const cautions = (serumOsmolality.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toMatch(/systematic and proportional error/i);
    expect(cautions).toMatch(/MEASURED rather than calculated/);
    expect(cautions).toContain("Berska 2023");
    // The [NEEDS SOURCE] this closes: the infant validation must never go back
    // to being an uncited finding — it was once an anonymous "Kraków cohort"
    // carried by PMCID alone. The bookkeeping sentence that announced the
    // resolution is gone from the notes, so the guard now holds the substance
    // of it: the under-3-months rule carries its source in the same breath.
    expect(serumOsmolality.notes.en).not.toContain(
      "was not captured, so it is stated as a finding and no citation is claimed for it",
    );
    expect(serumOsmolality.notes.en).toMatch(
      /systematic and proportional error under 3 months \(Berska 2023\)/,
    );
  });

  it("ties each Lynd figure to its decision and its ethanol coefficient", () => {
    // Full text read in round 4. The dialysis figures and the antidote figures
    // are different numbers for different questions, and each pair also depends
    // on which ethanol coefficient was used — the same fork this score emits.
    const elevated = bandText("gap-elevated");
    expect(elevated).toMatch(/HAEMODIALYSIS/);
    expect(elevated).toContain("0.80–1.00"); // dialysis sensitivity CI
    expect(elevated).toContain("0.827");
    expect(elevated).toContain("0.870");
    expect(elevated).toMatch(/ANTIDOTAL THERAPY/);
    expect(elevated).toContain("0.68–0.99"); // antidote sensitivity CI
    expect(elevated).toContain("0.736");
    expect(elevated).toContain("0.785");
    // The mislabel 1.1.0–1.2.0 shipped: 0.90 and 0.85 are two SENSITIVITIES,
    // one per ethanol coefficient, not a sensitivity/NPV pair. The notes no
    // longer say that in as many words, so the guard is aimed at the reading
    // itself — each figure named a sensitivity and tied to its coefficient,
    // with NPV left attached to the haemodialysis question it belongs to.
    const notes = serumOsmolality.notes.en;
    expect(notes).toContain("sensitivity 0.90 with coefficient 1.0 (≡ ÷ 4.6)");
    expect(notes).toContain("0.85 with coefficient 1.25 (≡ ÷ 3.7)");
    const antidoteClause = notes.slice(notes.indexOf("antidotal therapy"));
    expect(
      antidoteClause,
      "NPV 1.0 is the haemodialysis figure; naming an NPV in the antidote clause is the old mislabel",
    ).not.toMatch(/NPV/);
    expect(notes).not.toContain(
      "falling to 0.90 and 0.85 for identifying those needing antidotal therapy",
    );
  });

  it("pins the published version to the newest changelog entry", () => {
    const latest = serumOsmolality.changelog[serumOsmolality.changelog.length - 1];
    expect(latest?.version).toBe("1.0.1");
    expect(serumOsmolality.version).toBe("1.0.1");
    expect(serumOsmolality.version).toBe(latest?.version);
  });
});
