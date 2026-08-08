import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { anionGap } from "./anion-gap";

const figge = {
  citation:
    "Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807–1810.",
  pmid: "9824071",
  doi: "10.1097/00003246-199811000-00019",
};

const kraut = {
  citation:
    "Kraut JA, Madias NE. Serum anion gap: its uses and limitations. Clin J Am Soc Nephrol. 2007;2(1):162–174.",
  pmid: "17699401",
  doi: "10.2215/CJN.03020906",
};

const statpearls = {
  citation:
    "Anion Gap and Non–Anion Gap Metabolic Acidosis. StatPearls (NCBI Bookshelf), NBK448090.",
  url: "https://www.ncbi.nlm.nih.gov/books/NBK448090/",
};

describeScore(anionGap, (ctx) => {
  // anion-gap.md worked example 1: Na 140, Cl 104, HCO3 24 → AG = 140 − 128 = 12.
  // K-exclusive, no albumin → only the base AG is emitted.
  ctx.workedExample(
    { ...kraut, locator: "worked example 1 (AG = Na − (Cl + HCO3))" },
    {
      na: { value: 140, unit: "mEq/L" },
      cl: { value: 104, unit: "mEq/L" },
      hco3: { value: 24, unit: "mEq/L" },
    },
    [{ id: "ag", value: 12 }],
  );

  // anion-gap.md worked example 2: Na 137, K 4.0, Cl 100, HCO3 25 →
  // AG_K = (137 + 4) − 125 = 16; base AG = 137 − 125 = 12.
  ctx.workedExample(
    { ...statpearls, locator: "worked example 2 (AG_K = (Na + K) − (Cl + HCO3))" },
    {
      na: { value: 137, unit: "mEq/L" },
      k: { value: 4.0, unit: "mEq/L" },
      cl: { value: 100, unit: "mEq/L" },
      hco3: { value: 25, unit: "mEq/L" },
    },
    [
      { id: "ag", value: 12 },
      { id: "ag_k", value: 16 },
    ],
  );

  // anion-gap.md worked example 3 (the clinical point): Na 140, Cl 112, HCO3 16,
  // albumin 2.0 → AG = 12 (looks normal), correction = 2.5 × (4.0 − 2.0) = 5,
  // corrected AG = 17 (unmasks a high-AG acidosis).
  ctx.workedExample(
    { ...figge, locator: "worked example 3 (AG_corr = AG + 2.5×(4.0 − albumin))" },
    {
      na: { value: 140, unit: "mEq/L" },
      cl: { value: 112, unit: "mEq/L" },
      hco3: { value: 16, unit: "mEq/L" },
      albumin: { value: 2.0, unit: "g/dL" },
    },
    [
      { id: "ag", value: 12 },
      { id: "ag_corrected", value: 17 },
    ],
  );

  // Same example 3 entered in SI units (electrolytes mmol/L identical to mEq/L;
  // albumin 20 g/L = 2.0 g/dL) must produce the identical result after
  // conversion. Small tolerance covers float noise from the g/L → g/dL divide.
  ctx.workedExample(
    { ...figge, locator: "worked example 3, SI-unit entry (mmol/L, g/L)" },
    {
      na: { value: 140, unit: "mmol/L" },
      cl: { value: 112, unit: "mmol/L" },
      hco3: { value: 16, unit: "mmol/L" },
      albumin: { value: 20, unit: "g/L" },
    },
    [
      { id: "ag", value: 12 },
      { id: "ag_corrected", value: 17, tolerance: 1e-9 },
    ],
  );

  // anion-gap.md worked example 4 (Figge slope reproduction): albumin 2.5 g/dL is
  // a 1.5 g/dL drop from baseline → correction = 2.5 × 1.5 = 3.75. With base
  // AG 12 (Na 140, Cl 104, HCO3 24), corrected AG = 12 + 3.75 = 15.75.
  ctx.workedExample(
    { ...figge, locator: "worked example 4 (0.25/g·L = 2.5/g·dL slope; 3.75 mEq/L suppression)" },
    {
      na: { value: 140, unit: "mEq/L" },
      cl: { value: 104, unit: "mEq/L" },
      hco3: { value: 24, unit: "mEq/L" },
      albumin: { value: 2.5, unit: "g/dL" },
    },
    [
      { id: "ag", value: 12 },
      { id: "ag_corrected", value: 15.75, tolerance: 1e-9 },
    ],
  );

  // anion-gap.md worked example 5 (high-AG, normal albumin): Na 130, Cl 95,
  // HCO3 10, albumin 4.0 → AG = 25, correction = 0 → corrected AG = 25.
  ctx.workedExample(
    { ...figge, locator: "worked example 5 (albumin term is zero at 4.0 g/dL)" },
    {
      na: { value: 130, unit: "mEq/L" },
      cl: { value: 95, unit: "mEq/L" },
      hco3: { value: 10, unit: "mEq/L" },
      albumin: { value: 4.0, unit: "g/dL" },
    },
    [
      { id: "ag", value: 25 },
      { id: "ag_corrected", value: 25 },
    ],
  );

  // All four outputs at once (K and albumin both supplied): example 3 with K 4.0
  // added. Base AG = 12; AG_K = (140+4) − 128 = 16; the +5 albumin correction
  // (anion-gap.md: "applied identically to the K-inclusive AG") gives
  // corrected 17 and K-corrected 21.
  ctx.workedExample(
    {
      ...figge,
      locator: "example 3 + K-inclusive correction (correction applied identically to AG_K)",
    },
    {
      na: { value: 140, unit: "mEq/L" },
      k: { value: 4.0, unit: "mEq/L" },
      cl: { value: 112, unit: "mEq/L" },
      hco3: { value: 16, unit: "mEq/L" },
      albumin: { value: 2.0, unit: "g/dL" },
    },
    [
      { id: "ag", value: 12 },
      { id: "ag_k", value: 16 },
      { id: "ag_corrected", value: 17 },
      { id: "ag_k_corrected", value: 21 },
    ],
  );

  // Boundary coverage for the three required electrolytes.
  const base = {
    na: { value: 140, unit: "mEq/L" },
    cl: { value: 104, unit: "mEq/L" },
    hco3: { value: 24, unit: "mEq/L" },
  };
  ctx.boundaryTest("na", "min", base);
  ctx.boundaryTest("na", "max", base);
  ctx.boundaryTest("cl", "min", base);
  ctx.boundaryTest("cl", "max", base);
  ctx.boundaryTest("hco3", "min", base);
  ctx.boundaryTest("hco3", "max", base);
  // Optional inputs validate too (bounds are engineering input-validity limits).
  ctx.boundaryTest("k", "min", base);
  ctx.boundaryTest("k", "max", base);
  ctx.boundaryTest("albumin", "min", base);
  ctx.boundaryTest("albumin", "max", base);

  ctx.rejectsImplausible(
    "an albumin below the input-validity floor",
    { ...base, albumin: { value: 0.5, unit: "g/dL" } },
    { inputId: "albumin", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a potassium above the input-validity ceiling",
    { ...base, k: { value: 12, unit: "mEq/L" } },
    { inputId: "k", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "an unsupported electrolyte unit",
    { ...base, na: { value: 140, unit: "g/dL" } },
    { inputId: "na", code: "unknown-unit" },
  );
});

/**
 * Finding F3 (external calculator audit, 2026-08-08).
 *
 * The four anion-gap rows are all displayed at 1 dp. They were mixed — 0 dp
 * uncorrected, 1 dp corrected — which made the result panel stop reconciling
 * with itself: a K-inclusive AG of 16.5 rendered as "17" beside
 * "albumin-corrected 21.5", so the Figge correction appeared to be 4.5 when it
 * is exactly 2.5 x (4.0 - albumin) = 5.0.
 *
 * Precision is display-only and no test in this package asserted it anywhere,
 * which is precisely why the mismatch survived to an external audit. Asserting
 * uniformity rather than the literal 1 keeps the guard meaningful if the shared
 * display precision is ever revisited.
 */
describe("F3 — anion-gap display precision is uniform across all four rows", () => {
  // K = 4.2 and albumin = 2.0 are both ordinary values, and both are needed to
  // reach all four rows: AG = 140 - (104 + 20) = 16, AG(K) = 20.2,
  // correction = 2.5 x (4.0 - 2.0) = 5.0, so corrected = 21 and 25.2.
  const outcome = anionGap.compute({
    na: { value: 140, unit: "mEq/L" },
    cl: { value: 104, unit: "mEq/L" },
    hco3: { value: 20, unit: "mEq/L" },
    k: { value: 4.2, unit: "mEq/L" },
    albumin: { value: 2.0, unit: "g/dL" },
  });

  it("emits all four rows when potassium and albumin are supplied", () => {
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.values.map((v) => v.id).sort()).toEqual([
      "ag",
      "ag_corrected",
      "ag_k",
      "ag_k_corrected",
    ]);
  });

  it("uses one precision for every row, so the correction reconciles on screen", () => {
    if (!outcome.ok) throw new Error("compute rejected valid input");
    const precisions = new Set(outcome.result.values.map((v) => v.precision));
    expect(precisions.size, `mixed precisions: ${[...precisions].join(", ")}`).toBe(1);
  });

  it("keeps enough precision to show a half unit, which is the normal case here", () => {
    if (!outcome.ok) throw new Error("compute rejected valid input");
    const byId = new Map(outcome.result.values.map((v) => [v.id, v]));
    // The Figge correction is a multiple of 2.5 and potassium is commonly
    // reported to 1 dp, so .5 values are routine rather than exceptional.
    expect(byId.get("ag_k")?.value).toBeCloseTo(20.2, 9);
    expect(byId.get("ag_corrected")?.value).toBeCloseTo(21, 9);
    expect(byId.get("ag_k_corrected")?.value).toBeCloseTo(25.2, 9);
    for (const v of outcome.result.values) expect(v.precision).toBeGreaterThanOrEqual(1);
  });
});
