import { expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { psofa } from "./psofa";

// Every worked example is derived step-by-step from the published pSOFA table
// in Matics & Sanchez-Pinto 2017 (PMID 28783810), per psofa.md "Worked examples".
const matics = {
  citation:
    "Matics TJ, Sanchez-Pinto LN. Adaptation and Validation of a Pediatric SOFA Score. JAMA Pediatr. 2017;171(10):e172352.",
  pmid: "28783810",
  doi: "10.1001/jamapediatrics.2017.2352",
};

// A fully-valid input vector for boundary tests (one input is swapped per test).
const base = {
  age_months: { value: 36, unit: "months" },
  fio2: { value: 0.6, unit: "fraction" },
  pao2: { value: 90, unit: "mmHg" },
  resp_support: { value: false },
  platelets: { value: 200, unit: "10^3/µL" },
  bilirubin: { value: 0.5, unit: "mg/dL" },
  gcs: { value: 15, unit: "" },
  creatinine: { value: 0.5, unit: "mg/dL" },
} as const;

// An all-normal vector (every organ subscore 0) for single-organ band sweeps:
// exactly one field is swapped per example, so the total equals the swapped
// subscore. Age 60 mo sits in the 60–143 band (MAP ≥65; creatinine cuts
// 0.7/1.1/1.8/2.6), and with no PaO₂/SpO₂, no MAP, and no vasoactives the
// respiratory, cardiovascular, and renal subscores are all 0 (creatinine 0.5 < 0.7).
const normal = {
  age_months: { value: 60, unit: "months" },
  fio2: { value: 1.0, unit: "fraction" },
  resp_support: { value: false },
  platelets: { value: 200, unit: "10^3/µL" },
  bilirubin: { value: 0.5, unit: "mg/dL" },
  gcs: { value: 15, unit: "" },
  creatinine: { value: 0.5, unit: "mg/dL" },
} as const;

describeScore(psofa, (ctx) => {
  // Example A — 3-year-old (36 mo → 24–59 band); total 15 (psofa.md, Example A).
  ctx.workedExample(
    { ...matics, locator: "Worked example A (derived from Table 1)" },
    {
      age_months: { value: 36, unit: "months" },
      pao2: { value: 80, unit: "mmHg" },
      fio2: { value: 0.6, unit: "fraction" },
      resp_support: { value: true },
      platelets: { value: 45, unit: "10^3/µL" },
      bilirubin: { value: 3.0, unit: "mg/dL" },
      norepinephrine: { value: 0.05, unit: "µg/kg/min" },
      gcs: { value: 10, unit: "" },
      creatinine: { value: 1.0, unit: "mg/dL" },
    },
    [
      { id: "total", value: 15 },
      { id: "respiratory", value: 3 },
      { id: "coagulation", value: 3 },
      { id: "hepatic", value: 2 },
      { id: "cardiovascular", value: 3 },
      { id: "neurologic", value: 2 },
      { id: "renal", value: 2 },
    ],
  );

  // Example A expressed in SI units (µmol/L bilirubin & creatinine, % FiO₂,
  // ×10⁹/L platelets) must convert and reproduce the same 15.
  ctx.workedExample(
    { ...matics, locator: "Worked example A — SI-unit conversion equivalent" },
    {
      age_months: { value: 36, unit: "months" },
      pao2: { value: 80, unit: "mmHg" },
      fio2: { value: 60, unit: "%" },
      resp_support: { value: true },
      platelets: { value: 45, unit: "10^9/L" },
      bilirubin: { value: 51.312, unit: "µmol/L" },
      norepinephrine: { value: 0.05, unit: "µg/kg/min" },
      gcs: { value: 10, unit: "" },
      creatinine: { value: 88.42, unit: "µmol/L" },
    },
    [
      { id: "total", value: 15 },
      { id: "respiratory", value: 3 },
      { id: "hepatic", value: 2 },
      { id: "renal", value: 2 },
    ],
  );

  // ---- Alternate-unit boundary: an UNPUBLISHED SI "equivalent" must not over-score ----
  // pSOFA states its hepatic bands in mg/dL only and supplies a conversion
  // FACTOR ("to convert to µmol/L, multiply by 17.104") — it does not print a
  // µmol/L cut point (psofa.md §3 Hepatic + §Inputs). So 34.2 µmol/L is not a
  // restatement of the 2.0 mg/dL band boundary (2.0 mg/dL is 34.208 µmol/L);
  // 34.2 ÷ 17.104 = 1.99953 mg/dL sits in the published 1.2–1.9 band → hepatic 1.
  // bilirubinMgdl therefore carries NO canonicalDecimals; this pins that adding
  // one would move a real measurement into a worse subscore.
  ctx.workedExample(
    { ...matics, locator: "Table 1 hepatic band 1.2–1.9 mg/dL, entered as 34.2 µmol/L" },
    { ...normal, bilirubin: { value: 34.2, unit: "µmol/L" } },
    [
      { id: "hepatic", value: 1 },
      { id: "total", value: 1 },
    ],
  );
  // 34.3 µmol/L is 2.0054 mg/dL — genuinely in the 2.0–5.9 band → hepatic 2.
  ctx.workedExample(
    { ...matics, locator: "Table 1 hepatic band 2.0–5.9 mg/dL, entered as 34.3 µmol/L" },
    { ...normal, bilirubin: { value: 34.3, unit: "µmol/L" } },
    [
      { id: "hepatic", value: 2 },
      { id: "total", value: 2 },
    ],
  );

  // Example B — 2-month-old (1–11 band); total 3 (psofa.md, Example B).
  // SpO₂ 95% (≤97, valid) with no PaO₂ → SpO₂:FiO₂ path.
  ctx.workedExample(
    { ...matics, locator: "Worked example B (derived from Table 1)" },
    {
      age_months: { value: 2, unit: "months" },
      spo2: { value: 95, unit: "%" },
      fio2: { value: 0.21, unit: "fraction" },
      resp_support: { value: false },
      platelets: { value: 120, unit: "10^3/µL" },
      bilirubin: { value: 0.5, unit: "mg/dL" },
      map: { value: 50, unit: "mmHg" },
      gcs: { value: 15, unit: "" },
      creatinine: { value: 0.35, unit: "mg/dL" },
    },
    [
      { id: "total", value: 3 },
      { id: "respiratory", value: 0 },
      { id: "coagulation", value: 1 },
      { id: "hepatic", value: 0 },
      { id: "cardiovascular", value: 1 },
      { id: "neurologic", value: 0 },
      { id: "renal", value: 1 },
    ],
  );

  // Example C — 14-year-old (168 mo → 144–216 band); maximum 24 (psofa.md, Example C).
  ctx.workedExample(
    { ...matics, locator: "Worked example C (derived from Table 1)" },
    {
      age_months: { value: 168, unit: "months" },
      pao2: { value: 90, unit: "mmHg" },
      fio2: { value: 1.0, unit: "fraction" },
      resp_support: { value: true },
      platelets: { value: 15, unit: "10^3/µL" },
      bilirubin: { value: 13, unit: "mg/dL" },
      epinephrine: { value: 0.2, unit: "µg/kg/min" },
      gcs: { value: 5, unit: "" },
      creatinine: { value: 4.5, unit: "mg/dL" },
    },
    [
      { id: "total", value: 24 },
      { id: "respiratory", value: 4 },
      { id: "coagulation", value: 4 },
      { id: "hepatic", value: 4 },
      { id: "cardiovascular", value: 4 },
      { id: "neurologic", value: 4 },
      { id: "renal", value: 4 },
    ],
  );

  // --- Respiratory PaO₂:FiO₂ band sweep (Table 1). Only respiratory varies;
  // every other organ stays 0, so total == respiratory subscore. Ratios are a
  // pure arithmetic consequence of the published formula (PaO₂ ÷ FiO₂). ---
  ctx.workedExample(
    {
      ...matics,
      locator: "PaO₂:FiO₂ 300–399 → respiratory 1 (derived from Table 1; 350/1.0 = 350)",
    },
    { ...normal, pao2: { value: 350, unit: "mmHg" } },
    [
      { id: "total", value: 1 },
      { id: "respiratory", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator: "PaO₂:FiO₂ 200–299 → respiratory 2 (derived from Table 1; 250/1.0 = 250)",
    },
    { ...normal, pao2: { value: 250, unit: "mmHg" } },
    [
      { id: "total", value: 2 },
      { id: "respiratory", value: 2 },
    ],
  );

  // The SAME case entered in kPa. 250 mmHg = 250 × 101.325/760 = 33.3306 kPa,
  // so this must reproduce the example directly above exactly — respiratory 2,
  // total 2 — or the unit spec is not converting.
  //
  // Pins the fix for a real defect: this input previously declared a mmHg-only
  // spec while every sibling PaO₂ in the engine (P/F, OI, Phoenix, PIM3, PRISM)
  // accepted kPa, so an SI user got a clean rejection here and nowhere else and
  // had to convert by hand. Reverting the spec turns this from a pass into an
  // `unknown-unit` rejection, which fails on the `outcome.ok` assertion inside
  // the harness rather than on the value — so the failure names the cause.
  ctx.workedExample(
    {
      ...matics,
      locator: "PaO₂:FiO₂ 200–299 → respiratory 2, entered in kPa (33.3306 kPa = 250 mmHg)",
    },
    { ...normal, pao2: { value: 33.3306, unit: "kPa" } },
    [
      { id: "total", value: 2 },
      { id: "respiratory", value: 2 },
    ],
  );

  // --- Respiratory SpO₂:FiO₂ band sweep (Table 1). Used only when no PaO₂ and
  // SpO₂ ≤97%. Subscores 3–4 require respiratory support; a 3/4-band ratio
  // without support is capped at 2 (psofa.md non-support capping convention). ---
  ctx.workedExample(
    {
      ...matics,
      locator: "SpO₂:FiO₂ 264–291 → respiratory 1 (derived from Table 1; 90/0.32 = 281.25)",
    },
    { ...normal, fio2: { value: 0.32, unit: "fraction" }, spo2: { value: 90, unit: "%" } },
    [
      { id: "total", value: 1 },
      { id: "respiratory", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator: "SpO₂:FiO₂ 221–264 → respiratory 2 (derived from Table 1; 92/0.4 = 230)",
    },
    { ...normal, fio2: { value: 0.4, unit: "fraction" }, spo2: { value: 92, unit: "%" } },
    [
      { id: "total", value: 2 },
      { id: "respiratory", value: 2 },
    ],
  );
  /**
   * THE 264 OVERLAP, PINNED FROM BOTH SIDES.
   *
   * The overlap is in the SOURCE: JAMA Pediatr Table 1 prints the SpO₂:FiO₂
   * bands as ≥292 / 264–291 / 221–264 / 148–220 / <148, so 264 is the lower
   * bound of the subscore-1 row and the upper bound of the subscore-2 row at
   * once. No reading of the published table assigns an exact 264 a single
   * subscore, so a tie-break is unavoidable; taking the worse one is THIS
   * implementation's documented choice (psofa.ts respiratoryFromSf).
   *
   * Nothing asserted a value at exactly 264 before — every band example landed
   * strictly inside a band, so flipping the comparison from `>` to `>=` would
   * have moved a real patient's subscore from 2 to 1 with the whole suite green.
   *
   * SpO₂ 66% on FiO₂ 0.25 is 264 EXACTLY in binary floating point (66/0.25;
   * both operands are exactly representable), so this pins the boundary itself
   * rather than a value near it. 66.5/0.25 = 266 is likewise exact.
   */
  ctx.workedExample(
    {
      ...matics,
      locator:
        "SpO₂:FiO₂ exactly 264 — printed in BOTH the subscore-1 and subscore-2 rows of Table 1; worse subscore taken → respiratory 2 (66/0.25 = 264)",
    },
    { ...normal, fio2: { value: 0.25, unit: "fraction" }, spo2: { value: 66, unit: "%" } },
    [
      { id: "total", value: 2 },
      { id: "respiratory", value: 2 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator:
        "SpO₂:FiO₂ 266, just above the overlapped 264 → respiratory 1 (Table 1 264–291 row; 66.5/0.25 = 266)",
    },
    { ...normal, fio2: { value: 0.25, unit: "fraction" }, spo2: { value: 66.5, unit: "%" } },
    [
      { id: "total", value: 1 },
      { id: "respiratory", value: 1 },
    ],
  );

  ctx.workedExample(
    {
      ...matics,
      locator:
        "SpO₂:FiO₂ 160 (a 3-band ratio) without respiratory support → capped at 2 (psofa.md non-support capping convention; 80/0.5 = 160)",
    },
    {
      ...normal,
      fio2: { value: 0.5, unit: "fraction" },
      spo2: { value: 80, unit: "%" },
      resp_support: { value: false },
    },
    [
      { id: "total", value: 2 },
      { id: "respiratory", value: 2 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator:
        "SpO₂:FiO₂ 148–220 with support → respiratory 3 (derived from Table 1; 80/0.5 = 160)",
    },
    {
      ...normal,
      fio2: { value: 0.5, unit: "fraction" },
      spo2: { value: 80, unit: "%" },
      resp_support: { value: true },
    },
    [
      { id: "total", value: 3 },
      { id: "respiratory", value: 3 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator: "SpO₂:FiO₂ <148 with support → respiratory 4 (derived from Table 1; 70/0.6 = 116.7)",
    },
    {
      ...normal,
      fio2: { value: 0.6, unit: "fraction" },
      spo2: { value: 70, unit: "%" },
      resp_support: { value: true },
    },
    [
      { id: "total", value: 4 },
      { id: "respiratory", value: 4 },
    ],
  );

  // Missing oxygenation (no PaO₂ and no SpO₂) → respiratory 0. This is the
  // PAPER's rule, not ours: the Matics & Sanchez-Pinto Methods state that a
  // variable not measured in a 24-hour period was taken as normal, consistent
  // with the original SOFA criteria. Round-2 sourcing established this against
  // the full text; it was previously mislabelled here as our own convention.
  // This all-normal vector also exercises the 60–143-month age band; every
  // subscore is 0.
  ctx.workedExample(
    {
      ...matics,
      locator:
        "no PaO₂/SpO₂ provided → respiratory 0; all-normal vector (Matics 2017 Methods: an unmeasured variable is taken as normal)",
    },
    { ...normal },
    [
      { id: "total", value: 0 },
      { id: "respiratory", value: 0 },
      { id: "cardiovascular", value: 0 },
      { id: "renal", value: 0 },
    ],
  );
  // SpO₂ >97% with no PaO₂ saturates and is uninformative → respiratory 0
  // (psofa.md ≤97%-only rule).
  ctx.workedExample(
    { ...matics, locator: "SpO₂ 99% (>97) with no PaO₂ → respiratory 0 (psofa.md ≤97%-only rule)" },
    { ...normal, fio2: { value: 0.5, unit: "fraction" }, spo2: { value: 99, unit: "%" } },
    [
      { id: "total", value: 0 },
      { id: "respiratory", value: 0 },
    ],
  );

  // --- Coagulation, hepatic, and neurologic mid-band levels (Table 1). ---
  ctx.workedExample(
    { ...matics, locator: "platelets 50–99 → coagulation 2 (Table 1 coagulation row)" },
    { ...normal, platelets: { value: 75, unit: "10^3/µL" } },
    [
      { id: "total", value: 2 },
      { id: "coagulation", value: 2 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "bilirubin 1.2–1.9 → hepatic 1 (Table 1 hepatic row)" },
    { ...normal, bilirubin: { value: 1.5, unit: "mg/dL" } },
    [
      { id: "total", value: 1 },
      { id: "hepatic", value: 1 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "bilirubin 6.0–11.9 → hepatic 3 (Table 1 hepatic row)" },
    { ...normal, bilirubin: { value: 8, unit: "mg/dL" } },
    [
      { id: "total", value: 3 },
      { id: "hepatic", value: 3 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "GCS 13–14 → neurologic 1 (Table 1 neurologic row)" },
    { ...normal, gcs: { value: 14, unit: "" } },
    [
      { id: "total", value: 1 },
      { id: "neurologic", value: 1 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "GCS 6–9 → neurologic 3 (Table 1 neurologic row)" },
    { ...normal, gcs: { value: 7, unit: "" } },
    [
      { id: "total", value: 3 },
      { id: "neurologic", value: 3 },
    ],
  );

  // Renal subscore 3 in the 12–23-month band (creatinine cuts 0.4/0.6/1.1/1.5):
  // 1.3 ≥ 1.1 and < 1.5 → 3. Age 18 mo also exercises the 12–23 age band.
  ctx.workedExample(
    { ...matics, locator: "creatinine 1.3 mg/dL, 12–23 mo band → renal 3 (Table 1 renal row)" },
    {
      ...normal,
      age_months: { value: 18, unit: "months" },
      creatinine: { value: 1.3, unit: "mg/dL" },
    },
    [
      { id: "total", value: 3 },
      { id: "renal", value: 3 },
    ],
  );

  /**
   * THE TWO AGE BANDS NOTHING ASSERTED A VALUE FOR.
   *
   * Table 1's age-adjusted rows are the part of pSOFA most easily got wrong,
   * and five of the seven bands were already pinned by the examples above
   * (2, 18, 36, 60 and 168 months). The outermost two — neonates under a month
   * and patients over 216 months — were only ever reached by the input-range
   * boundary probes, which prove the value is ACCEPTED, not that it selects the
   * right thresholds.
   *
   * That gap is invisible to the 100% branch gate: `ageBand` returns an object
   * literal, so the branch executes and counts as covered whether the constants
   * inside it are right or wrong. Coverage proves reachability, never
   * correctness. Flagged by an external review on 2026-08-01, which reached the
   * conclusion by the wrong route — it argued pSOFA needed a second SOFTWARE
   * implementation — but the underlying gap it pointed at was real.
   *
   * The >216-month pair below is worth reading twice: Matics & Sanchez-Pinto
   * state that band's MAP and creatinine cut points are identical to adult
   * SOFA's, and the cohort ran to 21 years (≤252 months). So these two examples
   * pin ADULT thresholds being applied inside a paediatric score — correct
   * behaviour, and a caveat `notes` now spells out rather than a defect.
   */
  ctx.workedExample(
    {
      ...matics,
      locator: "MAP 45 mmHg in the <1 mo band (threshold 46) → cardiovascular 1 (Table 1 MAP row)",
    },
    {
      ...normal,
      age_months: { value: 0.5, unit: "months" },
      map: { value: 45, unit: "mmHg" },
    },
    [
      { id: "total", value: 1 },
      { id: "cardiovascular", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator: "creatinine 1.0 mg/dL in the <1 mo band (cuts 0.8/1.0/1.2/1.6) → renal 2",
    },
    {
      ...normal,
      age_months: { value: 0.5, unit: "months" },
      creatinine: { value: 1.0, unit: "mg/dL" },
    },
    [
      { id: "total", value: 2 },
      { id: "renal", value: 2 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator:
        "MAP 69 mmHg in the >216 mo band (threshold 70, stated by the paper to be adult SOFA's) → cardiovascular 1 (Table 1 MAP row)",
    },
    {
      ...normal,
      age_months: { value: 240, unit: "months" },
      map: { value: 69, unit: "mmHg" },
    },
    [
      { id: "total", value: 1 },
      { id: "cardiovascular", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...matics,
      locator:
        "creatinine 3.5 mg/dL in the >216 mo band (cuts 1.2/2.0/3.5/5.0, stated by the paper to be adult SOFA's) → renal 3",
    },
    {
      ...normal,
      age_months: { value: 240, unit: "months" },
      creatinine: { value: 3.5, unit: "mg/dL" },
    },
    [
      { id: "total", value: 3 },
      { id: "renal", value: 3 },
    ],
  );

  // --- Cardiovascular: MAP at/above the age-band threshold, and the vasoactive
  // tiers (Table 1). With no MAP conflict, cardiovascular == the vasoactive tier. ---
  ctx.workedExample(
    {
      ...matics,
      locator: "MAP 65 mmHg at the 60–143 mo threshold (≥65) → cardiovascular 0 (Table 1 MAP band)",
    },
    { ...normal, map: { value: 65, unit: "mmHg" } },
    [
      { id: "total", value: 0 },
      { id: "cardiovascular", value: 0 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "epinephrine ≤0.1 → cardiovascular 3 (Table 1 vasoactive row)" },
    { ...normal, epinephrine: { value: 0.05, unit: "µg/kg/min" } },
    [
      { id: "total", value: 3 },
      { id: "cardiovascular", value: 3 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "dopamine ≤5 → cardiovascular 2 (Table 1 vasoactive row)" },
    { ...normal, dopamine: { value: 3, unit: "µg/kg/min" } },
    [
      { id: "total", value: 2 },
      { id: "cardiovascular", value: 2 },
    ],
  );
  ctx.workedExample(
    { ...matics, locator: "dobutamine any dose → cardiovascular 2 (Table 1 vasoactive row)" },
    { ...normal, dobutamine: { value: 5, unit: "µg/kg/min" } },
    [
      { id: "total", value: 2 },
      { id: "cardiovascular", value: 2 },
    ],
  );

  // Coverage for every required numeric input (harness §6.3.3 floor).
  ctx.boundaryTest("age_months", "min", base);
  ctx.boundaryTest("age_months", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  ctx.boundaryTest("platelets", "min", base);
  ctx.boundaryTest("platelets", "max", base);
  ctx.boundaryTest("bilirubin", "min", base);
  ctx.boundaryTest("bilirubin", "max", base);
  ctx.boundaryTest("gcs", "min", base);
  ctx.boundaryTest("gcs", "max", base);
  ctx.boundaryTest("creatinine", "min", base);
  ctx.boundaryTest("creatinine", "max", base);

  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    { ...base, fio2: { value: 0.1, unit: "fraction" } },
    { inputId: "fio2", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a GCS total below 3",
    { ...base, gcs: { value: 2, unit: "" } },
    { inputId: "gcs", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "an age beyond the validity window",
    { ...base, age_months: { value: 300, unit: "months" } },
    { inputId: "age_months", code: "out-of-range" },
  );

  // >8 cut point (Matics 2017): band switches at total = 9.
  ctx.interpretationBoundary("total", 9, "lower", "elevated");

  /**
   * The declared composition must stay true of the numbers the score actually
   * emits. registry-gate checks the IDS exist; nothing checked the ARITHMETIC —
   * that the six organ subscores really do sum to the total, and that none of
   * them exceeds the 0–4 range the composition declares. A wrong `max` here
   * would draw a bar of the wrong length on the result panel while every
   * existing assertion still passed.
   *
   * A `value <= max` assertion is only half a test: it catches a max declared
   * too LOW, never one declared too HIGH, because nothing ever attains the
   * inflated ceiling and the comparison passes forever while the rendered bar
   * stays silently short. The last vector is Worked example C's physiology —
   * every one of the six organs at 4 at once, total 24 — so the attainment
   * assertion below pins each declared max from both sides.
   */
  it("declared components sum to the total and pin their maxima, low to high", () => {
    const vectors = [
      normal,
      { ...normal, pao2: { value: 250, unit: "mmHg" } },
      { ...normal, platelets: { value: 15, unit: "10^3/µL" } },
      { ...normal, bilirubin: { value: 13, unit: "mg/dL" } },
      { ...normal, gcs: { value: 5, unit: "" } },
      { ...normal, creatinine: { value: 3.0, unit: "mg/dL" } },
      { ...normal, age_months: { value: 0.5, unit: "months" }, map: { value: 20, unit: "mmHg" } },
      // The ceiling (Worked example C): all six organs at 4 simultaneously = 24.
      {
        age_months: { value: 168, unit: "months" },
        pao2: { value: 90, unit: "mmHg" },
        fio2: { value: 1.0, unit: "fraction" },
        resp_support: { value: true },
        platelets: { value: 15, unit: "10^3/µL" },
        bilirubin: { value: 13, unit: "mg/dL" },
        epinephrine: { value: 0.2, unit: "µg/kg/min" },
        gcs: { value: 5, unit: "" },
        creatinine: { value: 4.5, unit: "mg/dL" },
      },
    ];

    const composition = psofa.composition;
    expect(composition, "psofa must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((c) => [c.id, Number.NEGATIVE_INFINITY]),
    );

    for (const v of vectors) {
      const outcome = psofa.compute(v as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
      const sum = composition.components.reduce((n, c) => n + get(c.id), 0);
      expect(sum, `components must sum to the total`).toBe(get(composition.total));
      for (const c of composition.components) {
        const value = get(c.id);
        expect(value, `${c.id} above declared max ${c.max}`).toBeLessThanOrEqual(c.max);
        expect(value, `${c.id} below declared min`).toBeGreaterThanOrEqual(c.min ?? 0);
        observedMax.set(c.id, Math.max(observedMax.get(c.id)!, value));
      }
    }

    // Each declared max must be REACHED, not merely respected — otherwise a max
    // set too high sails through the ≤ assertion above and mis-scales the bar.
    for (const c of composition.components) {
      expect(observedMax.get(c.id), `${c.id}: declared max ${c.max} is never attained`).toBe(c.max);
    }

    // And the declared maxima must still add up to the published ceiling.
    expect(
      composition.components.reduce((n, c) => n + c.max, 0),
      "declared maxima must sum to the published pSOFA maximum of 24",
    ).toBe(24);
  });

  /**
   * THE DISCLOSURES ARE PART OF THE PRODUCT, SO THEY GET A TEST.
   *
   * pSOFA carried more [NEEDS SOURCE] markers than any other score on the site.
   * Rounds 2–4 closed every one of them, and each closed in a specific
   * direction that is easy to undo by accident:
   *
   *   - missing-as-normal was labelled OUR convention when it is the paper's own
   *     Methods rule. That marker is withdrawn because it was our error;
   *   - the plausibility bounds went from [NEEDS SOURCE] (implying a source
   *     might exist) to confirmed-absent (a stronger, more honest claim);
   *   - the 264 overlap was re-attributed to the published table, leaving only
   *     the tie-break as ours;
   *   - the ≤97% ceiling gained two citations;
   *   - the neonatal caveat was softened from "inapplicable" to "defined but not
   *     derived here", with nSOFA named;
   *   - round 4 (2026-08-04) closed the LAST one, the non-support cap. It is not
   *     ours: subscores 3–4 are each gated on respiratory support and no lower
   *     band is, so a patient who is not on support cannot reach either and 2 is
   *     all that is left. The cap is entailed by the published criteria, so the
   *     marker was mis-labelled rather than unresolved;
   *   - round 5 (2026-08-04) fixed how that gate was WORDED. Round 4 wrote it as
   *     a "mechanical-ventilation requirement", which is narrower than Table 1
   *     (whose row condition is "with respiratory support") and narrower than
   *     this code, whose `resp_support` input has always accepted non-invasive
   *     support too. The entailment was therefore argued on the narrow reading
   *     while the calculator ran on the broad one. Both are now the broad one.
   *
   * pSOFA therefore carries ZERO unsourced claims, and the count is pinned at
   * zero rather than merely asserted absent. That direction of pinning is the
   * one that matters now: the failure mode is no longer a marker vanishing
   * because someone asserted a source we lack — it is a future edit
   * REINTRODUCING an unsourced claim and it passing unnoticed. Any new
   * [NEEDS SOURCE] anywhere in the notes fails here and has to be argued for.
   * The cap's new attribution is asserted alongside the count, so quietly
   * re-labelling it "an implementation convention" also fails.
   *
   * WHY THE OPEN TERM IS NOT A MARKER. The paper prints "respiratory support"
   * and never defines it, so counting non-invasive support as satisfying the
   * gate is a reading of ours — the same class as the 264 tie-break, and
   * disclosed the same way. It is not [NEEDS SOURCE] because the gate itself IS
   * sourced and no claim is made about which reading the authors intended. The
   * assertions below pin the disclosure, so dropping it silently fails too.
   */
  it("carries no unsourced claim at all, and keeps the cap's attribution", () => {
    const notes = psofa.notes.en;

    // Missing-as-normal: the paper's rule, attributed to its Methods.
    expect(notes, "missing-as-normal must be attributed to the paper").toContain(
      "Methods of Matics & Sanchez-Pinto 2017",
    );
    expect(notes, "it is no longer ours to call a convention").not.toContain(
      "following the SOFA missing-as-normal convention",
    );

    // Zero markers survive. Round 4 closed the last one.
    const markers = notes.match(/\[NEEDS SOURCE\]/g) ?? [];
    expect(markers, "pSOFA carries no unsourced claim; a new one must be justified").toHaveLength(
      0,
    );

    // The cap still exists as BEHAVIOUR — closing the marker changed the label,
    // not the number. If the rule itself were dropped, this catches it.
    expect(notes, "the cap is still what an unsupported 3/4-band ratio scores").toContain(
      "capped at 2",
    );
    // …and it is the table's structure, not ours. Re-labelling it a convention
    // of this platform would be a regression to the mis-attribution round 4
    // corrected, so the entailment wording is pinned.
    expect(notes, "the cap must stay attributed to the published table").toContain(
      "THE PUBLISHED TABLE'S OWN STRUCTURE, NOT A RULE THIS CALCULATOR ADDED",
    );
    expect(notes, "with the reasoning that makes it an entailment, not an assertion").toMatch(
      /subscores 3 and 4 each carry the table's respiratory-support requirement and no lower band carries any support requirement/,
    );

    // THE GATE MUST BE STATED AS BROADLY AS IT IS IMPLEMENTED. `resp_support` is
    // one boolean satisfied by non-invasive support, so wording the gate as
    // "mechanical ventilation" — as v1.2.0 did here, in the notes and in
    // psofa.ts — promises a stricter rule than the code applies, and argues the
    // cap on a reading the calculator does not run. Table 1's row condition is
    // respiratory support; that is the only wording allowed to appear.
    expect(notes, "the gate must not be re-narrowed to mechanical ventilation").not.toMatch(
      /mechanical[ -]ventilation/i,
    );
    // The term is undefined in the paper, so the broad reading is OURS and has
    // to be visible as such — not silently adopted.
    expect(notes, "the reading of the undefined term must stay disclosed").toContain(
      "WHAT THE SOURCE DOES LEAVE OPEN IS WHAT COUNTS AS SUPPORT",
    );
    expect(notes, "and it must say which reading this calculator runs").toMatch(
      /invasive or non-invasive support both satisfy the gate/,
    );
    expect(notes, "and name the narrower reading the source does not exclude").toContain(
      "not ruled out by the source",
    );
    // The entailment survives either reading — that is what makes the cap safe
    // to keep while the term stays open. Losing this sentence would leave the
    // argument looking contingent on the reading.
    expect(notes, "the cap must be shown to be independent of the reading").toContain(
      "turns on which bands are gated and not on what counts as support",
    );

    // The Phoenix contrast: same clinical situation, opposite structure. It is
    // in the notes precisely because the entailment invites over-generalisation.
    expect(notes, "the Phoenix contrast must survive").toContain("Phoenix");
    expect(notes, "and it must state the opposite behaviour, not just name it").toMatch(
      /scores 0 on the respiratory criterion/,
    );

    // Confirmed-absent, not unfound — a reader must not go hunting for bounds
    // the paper never printed.
    expect(notes).toContain("confirmed absent from the paper, not merely unlocated");

    // The overlap is in the source; only the tie-break is ours.
    expect(notes).toContain("JAMA Pediatr Table 1 prints 264");

    // The ≤97% ceiling is sourced twice over; the neonatal caveat names nSOFA.
    expect(notes).toContain("Khemani");
    expect(notes).toContain("nSOFA");

    // Above 216 months the cut points are adult SOFA's — a real caveat, stated.
    expect(notes).toContain("216 months");

    // Every source the prose leans on must resolve to a reference entry.
    // Matics (the score), Khemani 2009 + 2012 (the ≤97% ceiling), Wynn & Polin
    // (nSOFA). A citation named in notes but absent from `references` renders as
    // an authority the reader cannot follow.
    const refs = JSON.stringify(psofa.references);
    for (const pmid of ["28783810", "19029434", "22202709", "31394566"]) {
      expect(refs, `notes cite a source missing from references (PMID ${pmid})`).toContain(pmid);
    }

    // The two input fields that carry a caveat of their own must carry it where
    // it is read — beside the field, not only in the notes below the result.
    const help = (id: string) => psofa.inputs.find((i) => i.id === id)?.helpText?.en ?? "";
    expect(help("spo2"), "the ≤97% ceiling's provenance belongs on the field").toContain("Khemani");
    expect(help("age_months"), "the adult-cut-point caveat belongs on the field").toContain(
      "adult SOFA",
    );
    // The support field is the one being ticked at the moment the reading
    // matters, so what it counts — and that counting it is ours — belongs here
    // and not only in the notes below the result.
    expect(help("resp_support"), "the field must say non-invasive support counts").toContain(
      "Invasive or non-invasive support both count",
    );
    expect(help("resp_support"), "and that this is our reading of an undefined term").toContain(
      "this calculator's reading rather than the paper's",
    );
    expect(help("resp_support"), "the field must not re-narrow the gate either").not.toMatch(
      /mechanical[ -]ventilation/i,
    );
  });
});
