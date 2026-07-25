import { describeScore } from "../testing/harness";
import { kdigoAki } from "./kdigo-aki";

/**
 * Source of record: KDIGO 2012 AKI guideline, Table 2 (definition = Rec 2.1.1,
 * staging = Rec 2.1.2). Every expected stage below is a direct application of a
 * KDIGO Table 2 criterion transcribed in docs/research/scores/kdigo-aki.md; the
 * three research worked examples (A/B/C) are reproduced verbatim as fixtures.
 * Stages are exact integers, so no tolerance is used.
 */
const kdigo = {
  citation:
    "KDIGO AKI Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1–138.",
  doi: "10.1038/kisup.2012.1",
};

describeScore(kdigoAki, (ctx) => {
  // ---- Research worked example A — Stage 1 by serum creatinine (5-year-old) ----
  // baseline 0.4, current 0.7 → 1.75× (1.5–1.9 band) and +0.3 mg/dL rise → Stage 1.
  ctx.workedExample(
    { ...kdigo, locator: "Worked Example A (kdigo-aki.md); Table 2 Stage 1 SCr criterion" },
    { scr: { value: 0.7, unit: "mg/dL" }, scr_baseline: { value: 0.4, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 1 }],
  );

  // ---- Research worked example B — Stage 3 by the pediatric eGFR branch (10-year-old) ----
  // eGFR 31.6 mL/min/1.73 m² (0.413 × 130 ÷ 1.7, Schwartz 2009) < 35, patient < 18 y,
  // current SCr 1.7 mg/dL is below the adult ≥ 4.0 cutoff → Stage 3 only via the branch.
  ctx.workedExample(
    {
      ...kdigo,
      pmid: "19158356",
      locator: "Worked Example B (kdigo-aki.md); Table 2 pediatric eGFR < 35 branch",
    },
    { scr: { value: 1.7, unit: "mg/dL" }, egfr: { value: 31.6, unit: "mL/min/1.73m2" } },
    [{ id: "kdigo_stage", value: 3 }],
  );

  // ---- Research worked example C — Stage 3 by urine output (12-kg toddler) ----
  // 60 mL ÷ 12 kg ÷ 24 h = 0.208 mL/kg/h < 0.3 sustained ≥ 24 h → Stage 3. SCr not staging.
  ctx.workedExample(
    { ...kdigo, locator: "Worked Example C (kdigo-aki.md); Table 2 Stage 3 UO criterion" },
    { scr: { value: 0.3, unit: "mg/dL" }, urine_output: { value: 0.208, unit: "mL/kg/h" } },
    [{ id: "kdigo_stage", value: 3 }],
  );

  // ---- Table 2 Stage 1 by the absolute ≥ 0.3 mg/dL rise alone (ratio < 1.5) ----
  // baseline 3.0, current 3.3 → ratio 1.1 (no ratio band) but +0.3 mg/dL rise → Stage 1.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 / Rec 2.1.1 — Stage 1 absolute-rise criterion (≥ 0.3 mg/dL)" },
    { scr: { value: 3.3, unit: "mg/dL" }, scr_baseline: { value: 3.0, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 1 }],
  );

  // ---- Table 2 Stage 2 by the 2.0–2.9× baseline ratio ----
  // baseline 0.4, current 1.0 → 2.5× → Stage 2.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 2 SCr criterion (2.0–2.9× baseline)" },
    { scr: { value: 1.0, unit: "mg/dL" }, scr_baseline: { value: 0.4, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 2 }],
  );

  // ---- Table 2 Stage 3 by the ≥ 3.0× baseline ratio ----
  // baseline 0.4, current 1.5 → 3.75× → Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 SCr criterion (≥ 3.0× baseline)" },
    { scr: { value: 1.5, unit: "mg/dL" }, scr_baseline: { value: 0.4, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 3 }],
  );

  // ---- Table 2 Stage 3 by the absolute ≥ 4.0 mg/dL creatinine (no baseline) ----
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 SCr criterion (increase to ≥ 4.0 mg/dL)" },
    { scr: { value: 4.5, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 3 }],
  );

  // ---- Table 2 Stage 3 by initiation of renal replacement therapy ----
  // Non-staging creatinine, RRT started → Stage 3 regardless of the SCr/UO axes.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 (initiation of RRT)" },
    { scr: { value: 1.0, unit: "mg/dL" }, rrt: { value: true } },
    [{ id: "kdigo_stage", value: 3 }],
  );

  // ---- Table 2 Stage 1 by urine output < 0.5 mL/kg/h (duration window assumed) ----
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 1 UO criterion (< 0.5 mL/kg/h)" },
    { scr: { value: 0.3, unit: "mg/dL" }, urine_output: { value: 0.4, unit: "mL/kg/h" } },
    [{ id: "kdigo_stage", value: 1 }],
  );

  // ---- Below the AKI definition → Stage 0 (ratio 1.25×, rise 0.1 mg/dL) ----
  ctx.workedExample(
    { ...kdigo, locator: "Rec 2.1.1 — definition not met (< 1.5× baseline, rise < 0.3 mg/dL)" },
    { scr: { value: 0.5, unit: "mg/dL" }, scr_baseline: { value: 0.4, unit: "mg/dL" } },
    [{ id: "kdigo_stage", value: 0 }],
  );

  // ---- eGFR ≥ 35 does NOT trigger the pediatric branch → Stage 0 ----
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — pediatric eGFR branch is < 35 only" },
    { scr: { value: 1.7, unit: "mg/dL" }, egfr: { value: 50, unit: "mL/min/1.73m2" } },
    [{ id: "kdigo_stage", value: 0 }],
  );

  // ---- Urine output ≥ 0.5 mL/kg/h → no UO stage → Stage 0 ----
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — UO ≥ 0.5 mL/kg/h does not meet the UO axis" },
    { scr: { value: 0.3, unit: "mg/dL" }, urine_output: { value: 0.6, unit: "mL/kg/h" } },
    [{ id: "kdigo_stage", value: 0 }],
  );

  // ---- Required-input bounds: computes at each edge, rejects just past it ----
  ctx.boundaryTest("scr", "min", { scr: { value: 0.1, unit: "mg/dL" } });
  ctx.boundaryTest("scr", "max", { scr: { value: 15, unit: "mg/dL" } });

  // ---- Explicit rejection coverage for the required creatinine input ----
  ctx.rejectsImplausible(
    "a creatinine above the plausible ceiling",
    { scr: { value: 40, unit: "mg/dL" } },
    { inputId: "scr", code: "out-of-range" },
  );

  // ---- Interpretation bands: each integer stage maps to its band ----
  ctx.expectBand("kdigo_stage", 0, "stage-0");
  ctx.expectBand("kdigo_stage", 1, "stage-1");
  ctx.expectBand("kdigo_stage", 2, "stage-2");
  ctx.expectBand("kdigo_stage", 3, "stage-3");
});
