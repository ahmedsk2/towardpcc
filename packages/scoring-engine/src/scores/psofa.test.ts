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

  // Missing oxygenation (no PaO₂ and no SpO₂) → respiratory 0 (SOFA
  // missing-as-normal, psofa.md notes). This all-normal vector also exercises
  // the 60–143-month age band; every subscore is 0.
  ctx.workedExample(
    {
      ...matics,
      locator:
        "no PaO₂/SpO₂ provided → respiratory 0; all-normal vector (psofa.md missing-as-normal)",
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
        "MAP 69 mmHg in the >216 mo band (threshold 70) → cardiovascular 1 (Table 1 MAP row)",
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
      locator: "creatinine 3.5 mg/dL in the >216 mo band (cuts 1.2/2.0/3.5/5.0) → renal 3",
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
});
