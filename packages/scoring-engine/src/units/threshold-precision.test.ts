import { describe, expect, it } from "vitest";
import {
  bilirubinMgdl,
  creatinineMgdl,
  creatinineUmolWithMgdl,
  lactateMmol,
} from "./concentration";
import { mmhgWithKpa } from "./pressure";
import { toCanonical, type UnitSpec } from "./types";

/**
 * Alternate-unit threshold crossing (UnitSpec.canonicalDecimals).
 *
 * The defect this pins: `calculate()` compares canonical values against
 * thresholds and never sees the unit the clinician typed. Where a guideline
 * PRINTS an alternate-unit equivalent of its own cut point, entering that
 * printed number used to land a hair under the cut point and stage low.
 *
 * The rule these tests enforce, in both directions:
 *   1. a PUBLISHED alternate-unit figure must reach the threshold it restates;
 *   2. a value genuinely below the threshold must still fail it — rounding is
 *      the measurement's real reporting precision, never a threshold nudge.
 *
 * Rule 2 is why three of the four specs below deliberately carry NO
 * `canonicalDecimals`: their scores print thresholds in one unit only, so the
 * "equivalent" figures are arithmetic nobody published, and rounding them up
 * would over-score real measurements. Those cases are pinned here as negative
 * controls so a future blanket-apply fails loudly.
 */

describe("canonicalDecimals — the rounding contract", () => {
  const twoDp: UnitSpec = {
    canonical: "x",
    alternates: [{ unit: "y", toCanonical: (v) => v / 3, fromCanonical: (v) => v * 3 }],
    canonicalDecimals: 2,
  };
  const unrounded: UnitSpec = {
    canonical: "x",
    alternates: [{ unit: "y", toCanonical: (v) => v / 3, fromCanonical: (v) => v * 3 }],
  };

  it("rounds a CONVERTED value to the declared decimals", () => {
    expect(toCanonical(twoDp, 1, "y")).toBe(0.33);
  });

  it("leaves a CANONICAL-unit value untouched — it is the clinician's own figure", () => {
    // Declaring canonicalDecimals must never move a canonical entry across a
    // threshold; only conversions carry conversion residue.
    expect(toCanonical(twoDp, 0.333333, "x")).toBe(0.333333);
  });

  it("does not round when canonicalDecimals is absent (unchanged behaviour)", () => {
    expect(toCanonical(unrounded, 1, "y")).toBeCloseTo(0.3333333333, 10);
  });

  it("still rejects an unknown unit rather than rounding anything", () => {
    expect(toCanonical(twoDp, 1, "z")).toBeNull();
  });
});

/**
 * Creatinine (canonical mg/dL) — THE REAL DEFECT, and the only spec that gets
 * canonicalDecimals. KDIGO Table 2 prints its own SI equivalents as thresholds:
 * "≥0.3 mg/dL (≥26.5 µmol/L)" and "increase in SCr to ≥4.0 mg/dL
 * (≥353.6 µmol/L)" (docs/research/scores/kdigo-aki.md §Step 1; the Merck
 * reproduction lists 26.52 / 353.60). Those SI numbers are published thresholds,
 * not somebody's arithmetic — so entering them must stage as KDIGO says.
 */
describe("creatinine mg/dL — published KDIGO SI thresholds must cross (2 dp)", () => {
  it("353.6 µmol/L (KDIGO's printed equivalent of ≥4.0 mg/dL) reaches 4.0", () => {
    // 353.6 ÷ 88.42 = 3.999095 mg/dL — the unrounded value that FAILED `>= 4`.
    expect(toCanonical(creatinineMgdl, 353.6, "µmol/L")).toBe(4);
    expect(toCanonical(creatinineMgdl, 353.6, "µmol/L")).toBeGreaterThanOrEqual(4);
  });

  it("26.5 µmol/L (KDIGO's printed equivalent of ≥0.3 mg/dL) reaches 0.3", () => {
    // 26.5 ÷ 88.42 = 0.299706 mg/dL unrounded — under the ≥ 0.3 mg/dL rise.
    expect(toCanonical(creatinineMgdl, 26.5, "µmol/L")).toBe(0.3);
  });

  it("349.3 µmol/L is genuinely below 4.0 mg/dL and must NOT cross", () => {
    // 349.3 ÷ 88.42 = 3.950464 → 3.95. Rounding must not drag it to the cutoff.
    expect(toCanonical(creatinineMgdl, 349.3, "µmol/L")).toBe(3.95);
    expect(toCanonical(creatinineMgdl, 349.3, "µmol/L")).toBeLessThan(4);
  });

  it("353.2 µmol/L — the tightest sub-threshold value — still must NOT cross", () => {
    // 353.2 ÷ 88.42 = 3.994571 → 3.99. Two decimals is fine enough that a value
    // 0.4 µmol/L under the published figure is still correctly below 4.0; a
    // coarser 1 dp would round this to 4.0 and over-stage it.
    expect(toCanonical(creatinineMgdl, 353.2, "µmol/L")).toBe(3.99);
    expect(toCanonical(creatinineMgdl, 353.2, "µmol/L")).toBeLessThan(4);
  });

  it("an mg/dL entry is passed through verbatim", () => {
    expect(toCanonical(creatinineMgdl, 3.999095, "mg/dL")).toBe(3.999095);
    expect(toCanonical(creatinineMgdl, 0.4, "mg/dL")).toBe(0.4);
  });
});

/**
 * NEGATIVE CONTROLS — specs that must NOT get canonicalDecimals.
 *
 * For each, the "equivalent" figure an external review flagged is arithmetic on
 * a threshold published in one unit only; no source prints it. The converted
 * value is genuinely below the cut point, so it must keep scoring below it.
 */
describe("specs deliberately WITHOUT canonicalDecimals (no published equivalent)", () => {
  it("bilirubin: 34.2 µmol/L stays below the pSOFA 2.0 mg/dL band", () => {
    // pSOFA states its hepatic bands in mg/dL and supplies only a conversion
    // FACTOR (×17.104) — no printed µmol/L cut point (psofa.md §3 + §Inputs).
    // 2 mg/dL is 34.208 µmol/L, so 34.2 really is 1.99953 mg/dL.
    expect(bilirubinMgdl.canonicalDecimals).toBeUndefined();
    const v = toCanonical(bilirubinMgdl, 34.2, "µmol/L");
    expect(v).toBeCloseTo(1.999532, 6);
    expect(v).toBeLessThan(2);
  });

  it("lactate: 45 mg/dL stays below the 5 mmol/L band", () => {
    // Phoenix and PELOD-2 both state lactate in mmol/L only; phoenix.md records
    // the ×9.01 factor as "a general lab convention, not published in the
    // Phoenix paper". 5 mmol/L is 45.05 mg/dL, so 45 really is 4.9945 mmol/L.
    expect(lactateMmol.canonicalDecimals).toBeUndefined();
    const v = toCanonical(lactateMmol, 45, "mg/dL");
    expect(v).toBeCloseTo(4.994451, 6);
    expect(v).toBeLessThan(5);
  });

  it("blood-gas pressure: 12.6 kPa stays below the PELOD-2 95 mmHg band", () => {
    // pelod2.md §Inputs records "1 kPa = 7.5 mmHg" as a standard laboratory
    // conversion, "not values from the paper". 95 mmHg is 12.666 kPa, so
    // 12.6 kPa really is 94.5 mmHg — worth 1 PELOD-2 point, not 3. Rounding to
    // 0 dp would push 94.5 to 95 and over-score a real blood gas by two points.
    expect(mmhgWithKpa.canonicalDecimals).toBeUndefined();
    const v = toCanonical(mmhgWithKpa, 12.6, "kPa");
    expect(v).toBeCloseTo(94.507772, 6);
    expect(v).toBeLessThan(95);
    // The kPa figure that genuinely does reach 95 mmHg still does.
    expect(toCanonical(mmhgWithKpa, 12.7, "kPa")).toBeGreaterThan(95);
  });

  it("creatinine in SI orientation (PELOD-2) keeps its µmol/L cut points exact", () => {
    // PELOD-2 prints its renal cut points in µmol/L only (Leteurtre 2013
    // Table 6), so there is no published mg/dL equivalent to protect and no
    // reason to widen the integer thresholds. 0.26 mg/dL is 22.984 µmol/L —
    // below the 1–11 month ≥ 23 cut point, and must stay there.
    expect(creatinineUmolWithMgdl.canonicalDecimals).toBeUndefined();
    const v = toCanonical(creatinineUmolWithMgdl, 0.26, "mg/dL");
    expect(v).toBeCloseTo(22.984, 6);
    expect(v).toBeLessThan(23);
  });
});
