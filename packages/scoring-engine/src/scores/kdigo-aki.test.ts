import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { kdigoAki } from "./kdigo-aki";

/**
 * Source of record: KDIGO 2012 AKI guideline, Table 2 (definition = Rec 2.1.1,
 * staging = Rec 2.1.2), with the Chapter 2.1 rationale (pp. 20–22) and the
 * Chapter 2.4 worked staging table (Table 10, p. 30). Every expected stage below
 * is a direct application of a criterion transcribed in
 * docs/research/scores/kdigo-aki.md; the research worked examples A/B/C are
 * reproduced as fixtures. Stages are exact integers, so no tolerance is used.
 *
 * Two outputs are asserted on every case, deliberately. `kdigo_stage` alone
 * cannot distinguish "Stage 1" from "at least Stage 1, the urine-output axis
 * could not be resolved" — that is the whole point of the floor flag, so a test
 * that checks only the stage would pass on the wrong reading of the number.
 */
const kdigo = {
  citation:
    "KDIGO AKI Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1–138.",
  doi: "10.1038/kisup.2012.1",
};

describeScore(kdigoAki, (ctx) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Serum-creatinine axis (KDIGO Table 2)
  // ═══════════════════════════════════════════════════════════════════════════

  // ---- Research worked example A — Stage 1 by serum creatinine (5-year-old) ----
  // baseline 0.4, current 0.7 → 1.75× (1.5–1.9 band) and +0.3 mg/dL rise → Stage 1.
  ctx.workedExample(
    { ...kdigo, locator: "Worked Example A (kdigo-aki.md); Table 2 Stage 1 SCr criterion" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 0.7, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
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
    {
      age: { value: 10, unit: "years" },
      scr: { value: 1.7, unit: "mg/dL" },
      egfr: { value: 31.6, unit: "mL/min/1.73m2" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- Table 2 Stage 1 by the absolute ≥ 0.3 mg/dL rise alone (ratio < 1.5) ----
  // baseline 3.0, current 3.3 → ratio 1.1 (no ratio band) but +0.3 mg/dL rise → Stage 1.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 / Rec 2.1.1 — Stage 1 absolute-rise criterion (≥ 0.3 mg/dL)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 3.3, unit: "mg/dL" },
      scr_baseline: { value: 3.0, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- Table 2 Stage 2 by the 2.0–2.9× baseline ratio ----
  // baseline 0.4, current 1.0 → 2.5× → Stage 2.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 2 SCr criterion (2.0–2.9× baseline)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.0, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- Table 2 Stage 3 by the ≥ 3.0× baseline ratio ----
  // baseline 0.4, current 1.5 → 3.75× → Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 SCr criterion (≥ 3.0× baseline)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.5, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // The ≥ 4.0 mg/dL route to Stage 3 is NOT standalone
  //
  // KDIGO's Chapter 2.1 rationale (p. 21) requires the Rec 2.1.1 creatinine-
  // change definition — a rise of ≥ 0.3 mg/dL within 48 h, or ≥ 1.5× baseline —
  // to be satisfied BEFORE the absolute-creatinine route applies. Through
  // v2.0.1 this score applied it standalone and called a chronically elevated
  // creatinine Stage 3 AKI, which it is not. Gating it strictly is the opposite
  // error and the worse one in a PICU: Stage 0 for every patient entered
  // without a baseline. Hence three cases, tested here in order.
  // ═══════════════════════════════════════════════════════════════════════════

  // Case 1 — baseline entered, rise qualifies: settled Stage 3, exactly as
  // before. A child at 4.9 mg/dL against a 4.5 baseline has risen 0.4 mg/dL, so
  // Rec 2.1.1 is met and the ≥ 4.0 route fires. The ratio is only 1.09×, so
  // NOTHING but the absolute-creatinine route can produce Stage 3 here — this
  // case fails if the gate is applied too broadly.
  ctx.workedExample(
    {
      ...kdigo,
      locator: "Chapter 2.1 rationale p. 21 — ≥ 4.0 mg/dL with the Rec 2.1.1 rise established",
    },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 4.9, unit: "mg/dL" },
      scr_baseline: { value: 4.5, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Case 2 — THE BUG THIS RELEASE FIXES. Baseline entered, no qualifying rise:
  // a child with CKD sitting at 4.6 mg/dL against a 4.5 baseline has risen
  // 0.1 mg/dL and is 1.02× baseline. Rec 2.1.1 is not met on any criterion, so
  // there is no AKI at all — Stage 0, settled, not Stage 3. The baseline is
  // present, so nothing is open and the flag must stay 0.
  ctx.workedExample(
    {
      ...kdigo,
      locator: "Chapter 2.1 rationale p. 21 — chronic elevation, no acute rise, is not AKI",
    },
    {
      age: { value: 8, unit: "years" },
      scr: { value: 4.6, unit: "mg/dL" },
      scr_baseline: { value: 4.5, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Case 3 — no baseline at all: the definition cannot be assessed in either
  // direction. Stage 3 is still reported, because withholding it would
  // under-stage every baseline-less entry, but it is reported as a BOUND —
  // KDIGO's Table 10 answer for a case whose reference creatinine cannot be
  // established. A reader holding a prior value can enter it and settle this.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 / Table 10 — ≥ 4.0 mg/dL with no baseline is Stage 3 unsettled" },
    { age: { value: 5, unit: "years" }, scr: { value: 4.5, unit: "mg/dL" } },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // Just below the cutoff with no baseline, nothing stages and nothing is open:
  // 3.9 mg/dL alone is neither Stage 3 nor a bound. Pins that the new flag is
  // driven by the ≥ 4.0 threshold and not merely by an absent baseline.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — 3.9 mg/dL with no baseline stages nothing and opens nothing" },
    { age: { value: 5, unit: "years" }, scr: { value: 3.9, unit: "mg/dL" } },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // A SETTLED Stage 3 by another route is never flagged, even with no baseline
  // and a creatinine over 4.0. RRT is Stage 3 by definition, so nothing about
  // this answer is open and "≥ 3" would be false caution.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — RRT settles Stage 3, so an un-baselined ≥ 4.0 adds no bound" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 4.5, unit: "mg/dL" },
      rrt: { value: true },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Same for the pediatric eGFR route: eGFR 30 in a 10-year-old is a settled
  // Stage 3 on its own, so the un-baselined creatinine adds no uncertainty.
  ctx.workedExample(
    {
      ...kdigo,
      pmid: "19158356",
      locator: "Table 2 — eGFR < 35 under 18 y settles Stage 3 alongside an un-baselined ≥ 4.0",
    },
    {
      age: { value: 10, unit: "years" },
      scr: { value: 4.5, unit: "mg/dL" },
      egfr: { value: 30, unit: "mL/min/1.73m2" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // And by the urine-output axis: anuria for ≥ 12 h is a closed Stage-3 row, so
  // the answer is settled from the other axis entirely.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — a closed Stage-3 UO row settles an un-baselined ≥ 4.0 case" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 4.5, unit: "mg/dL" },
      anuria: { value: true },
      uo_duration: { value: "12h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Both sources of doubt at once — an un-baselined ≥ 4.0 creatinine and an
  // unresolved urine-output axis. One flag covers both; it does not double up
  // or cancel out, and the stage stays the highest the entered data supports.
  ctx.workedExample(
    { ...kdigo, locator: "Table 10 — un-baselined ≥ 4.0 with an open UO axis is still one bound" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 4.5, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // ---- Table 2 Stage 3 by initiation of renal replacement therapy ----
  // Non-staging creatinine, RRT started → Stage 3 regardless of the SCr/UO axes.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 (initiation of RRT)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.0, unit: "mg/dL" },
      rrt: { value: true },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- Below the AKI definition → Stage 0 (ratio 1.25×, rise 0.1 mg/dL) ----
  ctx.workedExample(
    { ...kdigo, locator: "Rec 2.1.1 — definition not met (< 1.5× baseline, rise < 0.3 mg/dL)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 0.5, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- eGFR ≥ 35 does NOT trigger the pediatric branch → Stage 0 ----
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — pediatric eGFR branch is < 35 only" },
    {
      age: { value: 10, unit: "years" },
      scr: { value: 1.7, unit: "mg/dL" },
      egfr: { value: 50, unit: "mL/min/1.73m2" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Age gate on the eGFR < 35 branch (§6.5 guard table, rows 4 and 5)
  //
  // The branch reads "in patients <18 years" in Table 2. Before an age input
  // existed, an adult with an eGFR of 30 was silently staged 3 on a criterion
  // KDIGO restricts to children.
  // ═══════════════════════════════════════════════════════════════════════════

  // Age ≥ 18 y: the eGFR criterion must NOT apply. SCr 1.7 with no baseline
  // stages nothing on its own, so the whole score is Stage 0.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — eGFR < 35 is restricted to patients under 18 years (age 18)" },
    {
      age: { value: 18, unit: "years" },
      scr: { value: 1.7, unit: "mg/dL" },
      egfr: { value: 30, unit: "mL/min/1.73m2" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Just under the same boundary the branch fires — 18 years is the cutoff, and
  // it is exclusive.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — eGFR < 35 applies under 18 years (age 17.9)" },
    {
      age: { value: 17.9, unit: "years" },
      scr: { value: 1.7, unit: "mg/dL" },
      egfr: { value: 30, unit: "mL/min/1.73m2" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Urine-output axis — the four Table 2 rows, each a (rate, duration) PAIR
  //
  // Every case below carries a creatinine of 0.3 mg/dL with no baseline, so the
  // serum-creatinine axis contributes 0 and the stage shown is the urine-output
  // axis alone.
  // ═══════════════════════════════════════════════════════════════════════════

  // Row 1 — < 0.5 mL/kg/h for 6 to under 12 h → Stage 1.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — UO row 1 (< 0.5 mL/kg/h, 6 to under 12 h)" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
      uo_duration: { value: "6-to-under-12h" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Row 2 — < 0.5 mL/kg/h for ≥ 12 h → Stage 2. This is the row the previous
  // rate-first implementation could never reach: it read 0.4 mL/kg/h as Stage 1
  // whatever the duration, so a child oliguric for 14 hours was under-staged.
  // It is NOT Stage 3: that needs < 0.3 mL/kg/h for ≥ 24 h, or anuria ≥ 12 h.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — UO row 2 (< 0.5 mL/kg/h, ≥ 12 h); reference §4 Q1" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
      uo_duration: { value: "12h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // A rate of 0.4 mL/kg/h can never reach Stage 3 on this axis however long it
  // persists (Stage 3 needs < 0.3), so ≥ 24 h is still Stage 2 — and it is a
  // settled Stage 2, not a lower bound.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — 0.4 mL/kg/h at ≥ 24 h is still row 2 (Stage 3 needs < 0.3)" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- Research worked example C — Row 3, Stage 3 by urine output (12-kg toddler) ----
  // 60 mL ÷ 12 kg ÷ 24 h = 0.208 mL/kg/h < 0.3 sustained ≥ 24 h → Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Worked Example C (kdigo-aki.md); Table 2 UO row 3 (< 0.3, ≥ 24 h)" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.208, unit: "mL/kg/h" },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Row 4 — anuria for ≥ 12 h → Stage 3 with no rate entered at all (§6.5).
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — UO row 4 (anuria, ≥ 12 h)" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
      uo_duration: { value: "12h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // §6.5 guard table — the conditions that catch a rate-first implementation
  // ═══════════════════════════════════════════════════════════════════════════

  // Guard row 2: rate < 0.3 for 6 to under 12 h is Stage 1, NOT Stage 3.
  // 0.25 mL/kg/h is also below 0.5, and 8 hours sits inside the 6–12 h window,
  // so row 1 is satisfied and no higher row is. The rate-first implementation
  // this replaces returned Stage 3 here — over-staging by two whole stages.
  ctx.workedExample(
    { ...kdigo, locator: "Reference §4 Q2 / §6.5 — 0.25 mL/kg/h for 8 h is Stage 1, not Stage 3" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.25, unit: "mL/kg/h" },
      uo_duration: { value: "6-to-under-12h" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Guard row 1: rate < 0.5 for under 6 h meets NO row. Rec 2.1.1 criterion 3
  // sets 6 hours as the floor for AKI on this axis at all — so this is "the
  // definition is not met on the criteria entered", not an error, and not a
  // lower bound (the band settles the question).
  ctx.workedExample(
    { ...kdigo, locator: "§6.5 guard — rate < 0.5 mL/kg/h for under 6 h meets no Table 2 row" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
      uo_duration: { value: "under-6h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // The same floor holds for a much lower rate: 0.2 mL/kg/h for under 6 hours
  // is still below the Rec 2.1.1 duration threshold.
  ctx.workedExample(
    { ...kdigo, locator: "§6.5 guard — rate < 0.3 mL/kg/h for under 6 h still meets no row" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      uo_duration: { value: "under-6h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Anuria for 6 to under 12 hours is Stage 1, NOT Stage 0. The anuria ROW needs
  // ≥ 12 h and is not satisfied — but anuria is the absence of urine, which is
  // necessarily below 0.5 mL/kg/h, so row 1 (< 0.5 for 6 to < 12 h) is satisfied
  // on its own without KDIGO having to define anuria numerically (it never does,
  // and none is invented here). Returning Stage 0 for a child with no urine for
  // 8 hours under-staged, which the research note calls the dangerous direction
  // in a PICU (kdigo-aki.md Step 2a, Example G).
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — anuria for 6 to under 12 h satisfies row 1 (< 0.5) → Stage 1" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
      uo_duration: { value: "6-to-under-12h" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // The 6-hour floor still binds: under 6 h no row is satisfied at all, whatever
  // the entailment, because Rec 2.1.1 criterion 3 requires 6 hours.
  ctx.workedExample(
    { ...kdigo, locator: "§6.5 guard — anuria for under 6 h still meets no Table 2 row" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
      uo_duration: { value: "under-6h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // At ≥ 24 h the anuria row (Stage 3) and the entailed < 0.5 row (Stage 2) are
  // both satisfied, and the highest governs → a settled Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — anuria at ≥ 24 h satisfies rows 2 and 4; the maximum governs" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Entering the measured rate alongside anuria agrees with the entailment: a
  // recorded 0 mL/kg/h for 6 to under 12 h satisfies row 1 → Stage 1, the same
  // answer the anuria flag alone now gives.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — a measured rate of 0 for 6 to under 12 h satisfies row 1" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
      urine_output: { value: 0, unit: "mL/kg/h" },
      uo_duration: { value: "6-to-under-12h" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // A rate at or above 0.5 mL/kg/h satisfies no urine-output row at any
  // duration — the axis is settled at 0 even for a 24-hour window.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — ≥ 0.5 mL/kg/h meets no UO row at any duration" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.6, unit: "mL/kg/h" },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // A duration with nothing to apply it to stages nothing, and settles nothing
  // that was open.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — a duration band alone (no rate, no anuria) stages nothing" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // An explicit "no anuria" alongside a resolved rate row changes nothing.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — anuria answered 'no' leaves the rate rows governing" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: false },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
      uo_duration: { value: "12h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Unresolvable urine-output axis → a lower bound, never a guessed window
  //
  // KDIGO gives no duration-unknown rule and no conservative default: assuming
  // the shortest qualifying window under-stages, the longest over-stages. Its
  // own Chapter 2.4 Table 10 records Case G as "≥ 1" and Case H as "?" instead
  // of guessing, which is the notation `stage_is_floor` carries.
  // ═══════════════════════════════════════════════════════════════════════════

  // Rate below 0.5 with no duration entered: the axis spans "no AKI" to Stage 2,
  // so nothing is certain above Stage 0 and the result is flagged as a floor.
  ctx.workedExample(
    { ...kdigo, locator: "Chapter 2.4 Table 10 — 0.4 mL/kg/h with no duration is indeterminate" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // Same with a rate that could reach Stage 3 — still no certainty, still a floor.
  ctx.workedExample(
    { ...kdigo, locator: "Chapter 2.4 Table 10 — 0.2 mL/kg/h with no duration is indeterminate" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // Anuria with no duration: the anuria row could be Stage 3 or nothing at all.
  ctx.workedExample(
    { ...kdigo, locator: "Chapter 2.4 Table 10 — anuria with no duration is indeterminate" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      anuria: { value: true },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // Reference §6.4 — a known creatinine stage is a FLOOR when the urine-output
  // axis is open. Creatinine 0.7 against a 0.4 baseline is Stage 1; a rate of
  // 0.4 mL/kg/h with no window could add Stage 2. Report "≥ Stage 1", which is
  // exactly Table 10 Case G's notation.
  ctx.workedExample(
    { ...kdigo, locator: "Reference §6.4 / Table 10 Case G — SCr Stage 1 + open UO axis = ≥ 1" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 0.7, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // The same shape one stage up: creatinine 2.5× baseline is Stage 2, and a rate
  // of 0.2 mL/kg/h with no window could still reach Stage 3 → "≥ Stage 2".
  ctx.workedExample(
    { ...kdigo, locator: "Reference §6.4 — SCr Stage 2 with an indeterminate UO axis is ≥ 2" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.0, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // The bound is only reported when it can actually bind. A rate of 0.4 can
  // never exceed Stage 2, so against a creatinine axis already at Stage 2 the
  // answer is settled at 2 — flagging it as "≥ 2" would be false caution.
  ctx.workedExample(
    { ...kdigo, locator: "Reference §5 — a rate of 0.4 mL/kg/h caps the UO axis at Stage 2" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.0, unit: "mg/dL" },
      scr_baseline: { value: 0.4, unit: "mg/dL" },
      urine_output: { value: 0.4, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Nothing can exceed Stage 3, so an open urine-output axis under an RRT
  // patient is not a lower bound either.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 is the ceiling, so an open UO axis adds no bound" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 1.0, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      rrt: { value: true },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // A rate at or above 0.5 with no duration is NOT indeterminate: no window
  // makes it satisfy a row, so the axis is settled at 0.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — ≥ 0.5 mL/kg/h with no duration is settled, not indeterminate" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.6, unit: "mL/kg/h" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // "12 hours or more" asserts a lower bound only. With a rate under
  // 0.3 mL/kg/h the ≥ 24 h Stage-3 row is still reachable, so Stage 2 is
  // certain and Stage 3 is not: "≥ 2".
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — < 0.3 mL/kg/h at '≥ 12 h' leaves the 24 h row open" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      uo_duration: { value: "12h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 2 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // Selecting the ≥ 24 h band closes it → a settled Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — < 0.3 mL/kg/h at '≥ 24 h' settles UO row 3 at Stage 3" },
    {
      age: { value: 2, unit: "years" },
      scr: { value: 0.3, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      uo_duration: { value: "24h-or-more" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SI-unit entry: KDIGO's own printed µmol/L thresholds must stage the same
  //
  // KDIGO Table 2 prints the SI equivalents as thresholds, not as a footnote:
  // "increase in SCr to ≥ 4.0 mg/dL (≥ 353.6 µmol/L)" and "≥ 0.3 mg/dL
  // (≥ 26.5 µmol/L)" (kdigo-aki.md §Step 1; Merck reproduction 353.60 / 26.52).
  // Before creatinineMgdl declared canonicalDecimals: 2, entering the guideline's
  // own 353.6 converted to 3.999095 mg/dL, failed `>= 4`, and returned Stage 1.
  // ═══════════════════════════════════════════════════════════════════════════

  // 353.6 → 4.00 and 309.4 → 3.50, so the absolute ≥ 4.0 branch fires — and the
  // 0.50 mg/dL rise satisfies Rec 2.1.1, so it fires as a SETTLED Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — Stage 3 SCr criterion, entered as ≥ 353.6 µmol/L" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 353.6, unit: "µmol/L" },
      scr_baseline: { value: 309.4, unit: "µmol/L" },
    },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // Same in µmol/L with no baseline — the absolute-creatinine branch alone, so
  // as of v3.0.0 it is Stage 3 as a bound rather than a settled classification.
  // The unit conversion must not change WHICH case this is.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — absolute SCr ≥ 353.6 µmol/L with no baseline is unsettled" },
    { age: { value: 5, unit: "years" }, scr: { value: 353.6, unit: "µmol/L" } },
    [
      { id: "kdigo_stage", value: 3 },
      { id: "stage_is_floor", value: 1 },
    ],
  );

  // The other direction: 349.3 µmol/L is 3.95 mg/dL, genuinely BELOW ≥ 4.0, and
  // must not be dragged over it. Against a 309.4 µmol/L (3.50) baseline the
  // ratio is 1.13× — no ratio band — but the rise is 0.45 mg/dL, so KDIGO
  // Stage 1 by the absolute-rise criterion. Not Stage 3.
  ctx.workedExample(
    { ...kdigo, locator: "Table 2 — 349.3 µmol/L (3.95 mg/dL) is below the ≥ 4.0 mg/dL branch" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 349.3, unit: "µmol/L" },
      scr_baseline: { value: 309.4, unit: "µmol/L" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ---- The ≥ 26.5 µmol/L rise (KDIGO's printed equivalent of ≥ 0.3 mg/dL) ----
  // 70.7 → 0.80 and 97.2 → 1.10 mg/dL: a 26.5 µmol/L rise, ratio 1.375× (no
  // ratio band), so the stage comes from the absolute-rise criterion alone.
  ctx.workedExample(
    { ...kdigo, locator: "Rec 2.1.1 / Table 2 — Stage 1 rise of ≥ 26.5 µmol/L (≥ 0.3 mg/dL)" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 97.2, unit: "µmol/L" },
      scr_baseline: { value: 70.7, unit: "µmol/L" },
    },
    [
      { id: "kdigo_stage", value: 1 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // And a 26.0 µmol/L rise (96.7 → 1.09 vs 70.7 → 0.80 = 0.29 mg/dL) is below
  // the published rise and must NOT stage — rounding widens no band.
  ctx.workedExample(
    { ...kdigo, locator: "Rec 2.1.1 — a rise of 26.0 µmol/L is below the ≥ 26.5 µmol/L criterion" },
    {
      age: { value: 5, unit: "years" },
      scr: { value: 96.7, unit: "µmol/L" },
      scr_baseline: { value: 70.7, unit: "µmol/L" },
    },
    [
      { id: "kdigo_stage", value: 0 },
      { id: "stage_is_floor", value: 0 },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Required-input bounds and rejections
  // ═══════════════════════════════════════════════════════════════════════════

  ctx.boundaryTest("scr", "min", {
    age: { value: 5, unit: "years" },
    scr: { value: 0.1, unit: "mg/dL" },
  });
  ctx.boundaryTest("scr", "max", {
    age: { value: 5, unit: "years" },
    scr: { value: 15, unit: "mg/dL" },
  });
  // Age spans a whole human lifespan on purpose: the eGFR branch is gated on
  // age < 18, so an adult must be enterable and stage correctly rather than be
  // rejected at the door.
  ctx.boundaryTest("age", "min", {
    age: { value: 0, unit: "years" },
    scr: { value: 0.7, unit: "mg/dL" },
  });
  ctx.boundaryTest("age", "max", {
    age: { value: 120, unit: "years" },
    scr: { value: 0.7, unit: "mg/dL" },
  });

  ctx.rejectsImplausible(
    "a creatinine above the plausible ceiling",
    { age: { value: 5, unit: "years" }, scr: { value: 40, unit: "mg/dL" } },
    { inputId: "scr", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a negative age",
    { age: { value: -1, unit: "years" }, scr: { value: 0.7, unit: "mg/dL" } },
    { inputId: "age", code: "out-of-range" },
  );

  // ---- Interpretation bands: each integer stage maps to its band ----
  ctx.expectBand("kdigo_stage", 0, "stage-0");
  ctx.expectBand("kdigo_stage", 1, "stage-1");
  ctx.expectBand("kdigo_stage", 2, "stage-2");
  ctx.expectBand("kdigo_stage", 3, "stage-3");
});

/**
 * TWO SOURCING QUESTIONS THAT ARE CLOSED, AND MUST STAY CLOSED.
 *
 * "We could not find a source" and "we established there is no source" look the
 * same on the page and are opposite conclusions. The first invites the next
 * reader to go looking; the second tells them not to bother. Both of these were
 * re-searched on 2026-08-03 and came back settled-absent, so the wording is
 * asserted here — a later edit that softens it back to an open question would
 * silently re-open work that is finished, and nothing else in the suite would
 * notice, because neither statement changes a computed stage.
 */
describe("kdigo-aki records its settled absences as settled", () => {
  const notes = kdigoAki.notes.en;

  it("states that anuria has no numeric definition to find, not that one is missing", () => {
    expect(notes).toContain("CONFIRMED ABSENCE");
    expect(notes).toMatch(/no numeric definition of anuria|no single agreed numeric definition/i);
    // The behaviour this justifies: a clinical flag, never a fabricated rate.
    expect(notes).toMatch(/clinical flag/i);
    expect(notes).not.toMatch(/\[NEEDS SOURCE[^\]]*anuria/i);
  });

  it("states the 88.42-vs-88.4 creatinine factor is immaterial rather than undecided", () => {
    expect(notes).toContain("SETTLED, NOT OPEN");
    // The arithmetic that makes it immaterial must survive with the claim.
    expect(notes).toContain("353.60");
    expect(notes).toContain("353.68");
    expect(notes).not.toMatch(/open item/i);
  });

  it("declares the version its newest changelog entry describes", () => {
    const newest = kdigoAki.changelog[kdigoAki.changelog.length - 1];
    expect(kdigoAki.version).toBe(newest?.version);
    expect(kdigoAki.version).toBe("3.2.1");
  });
});

/**
 * THE BASELINE-SURROGATE GUIDANCE IS THE POINT OF THE v3.0.0 RELEASE, AND NONE
 * OF IT CHANGES A COMPUTED STAGE.
 *
 * The gate on the ≥ 4.0 mg/dL route is pinned by worked examples above. What
 * those cannot pin is the half of the fix that is prose: telling a reader with
 * no prior creatinine what to enter instead. If that guidance is trimmed as
 * verbose, the calculator silently reverts to leaving users at the mercy of
 * KDIGO's own appendix suggestion — back-calculation from an assumed GFR of 75,
 * which the cited validation found misses more than half of all AKI. The
 * counter-recommendation and its citation are asserted here so removing them
 * fails a test rather than passing review.
 *
 * v3.1.0 re-based that guidance on PAEDIATRIC evidence (Lee 2022, 710 children)
 * and demoted the adult malaria cohort to a secondary citation. The
 * recommendation itself did not move, which is exactly why the swap needs
 * pinning: the page reads almost the same either way, and reverting to the
 * adult study as primary would look like a wording change rather than the
 * downgrade in evidence it would be.
 */
describe("kdigo-aki keeps its baseline-surrogate guidance", () => {
  const notes = kdigoAki.notes.en;
  const baselineHelp =
    kdigoAki.inputs.find((i) => i.id === "scr_baseline")?.helpText.en ?? "(input not found)";

  it("names the lowest admission creatinine as the surrogate to use", () => {
    expect(notes).toMatch(/lowest creatinine measured during this admission/i);
    expect(baselineHelp).toMatch(/lowest creatinine measured during this admission/i);
  });

  it("warns off KDIGO's own assumed-GFR-75 back-calculation, with the finding", () => {
    expect(notes).toMatch(/assumed (e)?GFR of 75/i);
    expect(notes).toMatch(/more than half of all AKI/i);
    expect(baselineHelp).toMatch(/assumed GFR of 75/i);
  });

  /**
   * The paediatric study is the whole substance of v3.1.0. Its numbers are
   * asserted individually because each carries a different part of the argument:
   * the sensitivity pair is why SCr-min is recommended, and the incidence pair
   * (19.1% found against 58.7% true) is the only figure that conveys the SIZE of
   * what back-calculation misses. A summary that keeps the recommendation but
   * drops the magnitude leaves a reader free to think it a close call.
   */
  it("rests the recommendation on the paediatric study, with its numbers", () => {
    const lee = kdigoAki.references.find((r) => "doi" in r && r.doi === "10.23876/j.krcp.21.120");
    expect(lee, "Lee 2022 is the primary paediatric support and must be cited").toBeDefined();
    expect(lee?.citation).toMatch(/Lee YJ/);
    expect(lee?.note, "its role as primary must be stated in the reference").toMatch(/PRIMARY/);

    // Cohort: paediatric, and large enough to say so.
    expect(notes).toMatch(/710/);
    expect(notes).toMatch(/1 month to 18 years/);
    // SCr-min performance.
    expect(notes).toMatch(/87\.8%/);
    expect(notes).toMatch(/71\.0%/);
    // Back-calculation performance — the sensitivity AND the incidence gap.
    expect(notes).toMatch(/31\.5%/);
    expect(notes).toMatch(/19\.1%/);
    expect(notes).toMatch(/58\.7%/);
  });

  /**
   * THE ONE FINDING A READER IS MOST LIKELY TO INVERT.
   *
   * Adult reports have back-calculation over-diagnosing AKI; in children it
   * under-diagnoses, and badly. Someone who learned the adult direction will
   * read a low estimated baseline as conservative when it is the opposite. In a
   * PICU the miss is the harmful error, so the reversal is asserted together
   * with which direction is dangerous — stating one without the other leaves it
   * a piece of trivia instead of a warning.
   */
  it("states that the adult-to-child direction reverses, and which way is dangerous", () => {
    expect(notes).toMatch(/THE DIRECTION REVERSES BETWEEN ADULTS AND CHILDREN/);
    expect(notes).toMatch(/OVER-estimates AKI/);
    expect(notes).toMatch(/UNDER-estimated severely/);
    expect(notes).toMatch(/dangerous direction/i);
  });

  /**
   * The 7-day window is the paper's choice, not a standard, and the operating
   * characteristics above belong to it. Publishing them beside an unqualified
   * "lowest creatinine" would attach 7-day numbers to a 3-day or whole-admission
   * value, which is a different surrogate.
   */
  it("discloses that the SCr-min window is not standardised", () => {
    expect(notes).toMatch(/NOT STANDARDISED/);
    expect(notes).toMatch(/3 days/);
    expect(notes).toMatch(/7 days/);
    expect(notes).toMatch(/whole hospitalisation/);
  });

  /**
   * Cooper survives as a secondary citation only, and only for the comparisons
   * Lee does not run. It also stops the notes claiming a tidy adult-vs-child
   * split that its own result contradicts.
   */
  it("keeps the adult cohort as secondary, for what the paediatric study lacks", () => {
    const cooper = kdigoAki.references.find((r) => "pmid" in r && r.pmid === "33732979");
    expect(cooper, "Cooper 2021 is retained for the surrogates Lee did not test").toBeDefined();
    expect(cooper?.note).toMatch(/SECONDARY/);
    expect(cooper?.note).toMatch(/adult/i);
    expect(notes).toContain("33732979");
    expect(notes).toMatch(/CKD-EPI at an assumed GFR of 100/);
    // No longer the primary support, and the notes must not read as if it were.
    expect(notes).not.toMatch(/THE COOPER EVIDENCE IS ADULT/);
    expect(notes).toMatch(/no longer the primary support/i);
    // "The adult literature" is not presented as one voice.
    expect(notes).toMatch(/not one voice/i);
  });

  it("no longer flags a missing paediatric surrogate-baseline validation", () => {
    expect(notes).not.toMatch(/NEEDS SOURCE for a pediatric surrogate-baseline validation/i);
    // But the separate, still-open question — a KDIGO-ENDORSED method — stays,
    // and stays distinguished from it. Answering "which surrogate is best" did
    // not make any guideline endorse one.
    expect(notes).toMatch(/NEEDS SOURCE for a KDIGO-endorsed pediatric baseline rule/i);
    expect(notes).toMatch(/GUIDELINE ENDORSEMENT/);
  });

  it("says why no back-calculation is implemented, rather than leaving it a gap", () => {
    expect(notes).toMatch(/NO BACK-CALCULATION IS OFFERED HERE/);
    expect(notes).toMatch(/sex and race/i);
  });

  it("no longer describes the ≥ 4.0 mg/dL route as an unresolved deviation", () => {
    expect(notes).not.toMatch(/KNOWN DEVIATION/);
    expect(notes).not.toMatch(/a clinical decision this release does not take/i);
  });
});

/**
 * F4 — staging on the urine-output axis alone.
 *
 * KDIGO 2012 Rec 2.1.1 (official PDF, Kidney International Supplements
 * 2012;2:19-36, read directly 2026-08-08) defines AKI as "any of the following"
 * and its third bullet is "Urine volume <0.5 ml/kg/h for 6 hours" — naming no
 * creatinine. Chapter 2.4 scopes the other requirement in terms: "staging
 * requires reference to a baseline SCr when SCr criteria are used."
 *
 * These tests pin the behaviour AND the labelling. The labelling matters as
 * much as the number: v3.0.0 removed "lower bound" wording from
 * `stage_is_floor` because that flag can point downward, so the new signal must
 * stay separate from it and must not imply a direction.
 */
describe("F4 — urine-output-only staging (no creatinine entered)", () => {
  const stageOf = (values: Record<string, unknown>) => {
    const outcome = kdigoAki.compute(values as never);
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return new Map<string, number>();
    return new Map(outcome.result.values.map((v) => [v.id, v.value]));
  };
  const age = { age: { value: 5, unit: "years" } };

  it("stages oliguria with no creatinine at all — the patient F4 exists for", () => {
    // <0.5 mL/kg/h for 12 h or more → Stage 2 on the urine-output row.
    const out = stageOf({
      ...age,
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      uo_duration: { value: "12h-or-more" },
    });
    expect(out.get("kdigo_stage")).toBe(2);
    expect(out.get("scr_axis_not_assessed"), "must be flagged as single-axis").toBe(1);
  });

  it("marks the creatinine axis assessed as soon as a creatinine is entered", () => {
    const out = stageOf({
      ...age,
      scr: { value: 0.4, unit: "mg/dL" },
      urine_output: { value: 0.2, unit: "mL/kg/h" },
      uo_duration: { value: "12h-or-more" },
    });
    expect(out.get("kdigo_stage")).toBe(2);
    expect(out.get("scr_axis_not_assessed")).toBe(0);
  });

  it("keeps the two flags independent — they answer different questions", () => {
    // Rate below 0.5 with NO duration band: the urine-output axis is open, so
    // stage_is_floor fires. The creatinine axis is separately unassessed.
    const out = stageOf({ ...age, urine_output: { value: 0.2, unit: "mL/kg/h" } });
    expect(out.get("stage_is_floor"), "an open Table 2 row").toBe(1);
    expect(out.get("scr_axis_not_assessed"), "and no creatinine either").toBe(1);
  });

  it("does not invent an AKI stage from a normal urine output", () => {
    // 1.0 mL/kg/h satisfies no Table 2 row at any window. Stage 0 here means
    // "not met on the criteria entered" — and the new flag is what stops that
    // reading as a negative creatinine axis nobody measured.
    const out = stageOf({
      ...age,
      urine_output: { value: 1.0, unit: "mL/kg/h" },
      uo_duration: { value: "24h-or-more" },
    });
    expect(out.get("kdigo_stage")).toBe(0);
    expect(out.get("scr_axis_not_assessed")).toBe(1);
  });

  it("still reaches Stage 3 on RRT with no creatinine", () => {
    const out = stageOf({ ...age, rrt: { value: true } });
    expect(out.get("kdigo_stage")).toBe(3);
    // NOT 1. This assertion said 1 for a few hours after v3.2.0 and was wrong:
    // RRT settles the stage at 3 without the creatinine axis mattering, and no
    // urine output was entered at all. The test as written pinned the defect
    // rather than catching it.
    expect(out.get("scr_axis_not_assessed")).toBe(0);
  });

  /**
   * The three cases where the flag made a FALSE statement (v3.2.0, fixed
   * v3.2.1). Each is asserted rather than described, because the original label
   * — "staged on urine output alone" — was false in all three and the suite
   * agreed with it.
   */
  it("does not claim the creatinine axis is unassessed when an eGFR was entered", () => {
    // Self-contradictory in the original: a bedside-Schwartz eGFR is DERIVED
    // from a creatinine, so denying the axis denies the reader's own input.
    const out = stageOf({ ...age, egfr: { value: 30, unit: "mL/min/1.73m2" } });
    expect(out.get("kdigo_stage")).toBe(3);
    expect(out.get("scr_axis_not_assessed")).toBe(0);
  });

  it("keeps the flag on an adult eGFR, where the paediatric branch does not fire", () => {
    // Age gate: the eGFR < 35 route is "in patients < 18 years". For an adult
    // the eGFR settles nothing, so the creatinine axis genuinely is unassessed.
    const out = stageOf({
      age: { value: 40, unit: "years" },
      egfr: { value: 30, unit: "mL/min/1.73m2" },
    });
    expect(out.get("kdigo_stage")).toBe(0);
    expect(out.get("scr_axis_not_assessed")).toBe(1);
  });

  it("is honest on an empty form — nothing staged, and nothing claimed about urine", () => {
    // The flag is still 1 (the axis really was not assessed), but the LABEL no
    // longer asserts a urine-output basis that does not exist.
    const out = stageOf({ ...age });
    expect(out.get("kdigo_stage")).toBe(0);
    expect(out.get("scr_axis_not_assessed")).toBe(1);
  });

  it("does not fire the un-baselined >=4.0 route when there is no creatinine", () => {
    // The guard that would throw on `scr >= 4` with scr undefined. Anuria for
    // 12 h or more is Stage 3 on its own row, so the stage is reached without
    // the creatinine route being consulted at all.
    const out = stageOf({ ...age, anuria: { value: true }, uo_duration: { value: "12h-or-more" } });
    expect(out.get("kdigo_stage")).toBe(3);
    expect(out.get("scr_axis_not_assessed")).toBe(1);
  });
});
