import { describeScore } from "../testing/harness";
import { phoenix } from "./phoenix";

// The two fully-specified worked examples come from the `phoenix` package's own
// clinical-vignette article (authored by the SCCM Task Force members; the JAMA
// supplement eAppendix vignettes are the same cases), thresholds per JAMA 2024
// Table 2. Component + total + sepsis/shock flags are asserted exactly.
const phoenixPkg = {
  citation:
    "DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD. phoenix R package / Python module (SCCM Pediatric Sepsis Definition Task Force). JAMIA Open. 2024;7(3):ooae066.",
  doi: "10.1093/jamiaopen/ooae066",
};

// The single-component vectors below are DERIVED (pure band/threshold lookups)
// from the score box in JAMA 2024 Table 2, transcribed in phoenix.md. Each
// expected value is an arithmetic consequence of the published cutoffs — no
// clinical number is invented. Sourced to the primary derivation paper.
const jamaTable2 = {
  citation:
    "Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al; SCCM Pediatric Sepsis Definition Task Force. Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):675-686.",
  pmid: "38245897",
  doi: "10.1001/jama.2024.0196",
};

describeScore(phoenix, (ctx) => {
  // Worked example 1 — septic shock (phoenix.md, package clinical vignette 1):
  // previously healthy 3-yr-old (36 mo), BP 67/32 → MAP ≈ 43.67, on norepinephrine
  // (1 vasoactive), platelets 95, GCS 14 with reactive pupils, no respiratory
  // support, other labs not measured (→ 0).
  //   Resp 0 | Cardio 2 (vaso 1 + lactate n/a + MAP 43.67∈[32,45)→1) | Coag 1 | Neuro 0
  //   Total 3 → sepsis YES, cardiovascular ≥1 → septic shock YES.
  ctx.workedExample(
    {
      ...phoenixPkg,
      locator: "clinical vignette 1 (cu-dbmi-peds.github.io/phoenix); JAMA Table 2",
    },
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      resp_support: { value: "none" },
      n_vasoactives: { value: 1, unit: "" },
      map: { value: 43.67, unit: "mmHg" },
      platelets: { value: 95, unit: "10^3/uL" },
      gcs_total: { value: 14, unit: "" },
      fixed_pupils: { value: false },
    },
    [
      { id: "respiratory", value: 0 },
      { id: "cardiovascular", value: 2 },
      { id: "coagulation", value: 1 },
      { id: "neurologic", value: 0 },
      { id: "phoenix_total", value: 3 },
      { id: "sepsis", value: 1 },
      { id: "septic_shock", value: 1 },
    ],
  );

  // Worked example 2 — sepsis, not shock (phoenix.md, package clinical vignette 2):
  // 6-yr-old (72 mo), bacterial pneumonia, intubated (IMV), SpO₂ 92% on FiO₂ 0.45
  // → S/F ≈ 204 (SpO₂ ≤97, valid); no vasoactives; lactate 2.9; MAP 52; platelets
  // 120, INR 1.7, D-dimer 4.4, fibrinogen 120; GCS 8 with reactive pupils.
  //   Resp 2 (IMV + S/F 204∈[148,220)) | Cardio 0 (vaso 0 + lactate<5 + MAP 52≥49→0)
  //   Coag 2 (INR>1.3, D-dimer>2; cap 2) | Neuro 1 (GCS 8≤10) | Total 5
  //   → sepsis YES, cardiovascular 0 → septic shock NO.
  ctx.workedExample(
    {
      ...phoenixPkg,
      locator: "clinical vignette 2 (cu-dbmi-peds.github.io/phoenix); JAMA Table 2",
    },
    {
      age_months: { value: 72, unit: "months" },
      suspected_infection: { value: true },
      resp_support: { value: "imv" },
      spo2: { value: 92, unit: "%" },
      fio2: { value: 0.45, unit: "fraction" },
      lactate: { value: 2.9, unit: "mmol/L" },
      map: { value: 52, unit: "mmHg" },
      platelets: { value: 120, unit: "10^3/uL" },
      inr: { value: 1.7, unit: "" },
      ddimer: { value: 4.4, unit: "mg/L FEU" },
      fibrinogen: { value: 120, unit: "mg/dL" },
      gcs_total: { value: 8, unit: "" },
      fixed_pupils: { value: false },
    },
    [
      { id: "respiratory", value: 2 },
      { id: "cardiovascular", value: 0 },
      { id: "coagulation", value: 2 },
      { id: "neurologic", value: 1 },
      { id: "phoenix_total", value: 5 },
      { id: "sepsis", value: 1 },
      { id: "septic_shock", value: 0 },
    ],
  );

  // A minimal all-normal case must score 0 and not meet the criterion even with
  // suspected infection (phoenix.md reference test-vector "0 0 0 0 → total 0").
  ctx.workedExample(
    { ...phoenixPkg, locator: "reference test-vector row: 0/0/0/0 total 0 (sepsis NO, shock NO)" },
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      resp_support: { value: "none" },
    },
    [
      { id: "respiratory", value: 0 },
      { id: "cardiovascular", value: 0 },
      { id: "coagulation", value: 0 },
      { id: "neurologic", value: 0 },
      { id: "phoenix_total", value: 0 },
      { id: "sepsis", value: 0 },
      { id: "septic_shock", value: 0 },
    ],
  );

  const requiredBase = {
    age_months: { value: 36, unit: "months" },
    suspected_infection: { value: true },
  };

  ctx.boundaryTest("age_months", "min", requiredBase);
  ctx.boundaryTest("age_months", "max", requiredBase);

  ctx.rejectsImplausible(
    "an age beyond the validated pediatric range",
    { age_months: { value: 300, unit: "months" }, suspected_infection: { value: true } },
    { inputId: "age_months", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "an implausibly high lactate",
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      lactate: { value: 100, unit: "mmol/L" },
    },
    { inputId: "lactate", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "a GCS below the 3–15 scale",
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      gcs_total: { value: 2, unit: "" },
    },
    { inputId: "gcs_total", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "an unsupported MAP unit",
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 60, unit: "psi" },
    },
    { inputId: "map", code: "unknown-unit" },
  );

  // The diagnostic threshold: below-threshold (0–1) → meets-criterion (≥ 2) at total = 2.
  ctx.interpretationBoundary("phoenix_total", 2, "below-threshold", "meets-criterion");

  // ---------------------------------------------------------------------------
  // Respiratory (0–3) — PaO₂:FiO₂ (P/F) path. phoenix.md §1: 3 pts if PF < 100 &
  // IMV; 2 pts if PF 100–200 & IMV; 1 pt if PF < 400 & any support; 0 if PF ≥ 400.
  // FiO₂ = 1.0 keeps PF = PaO₂ (pure arithmetic, easy to trace).
  // ---------------------------------------------------------------------------
  const rr = { age_months: { value: 36, unit: "months" }, suspected_infection: { value: true } };

  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §1): PF 60 < 100 + IMV → 3",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      pao2: { value: 60, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 3 },
      { id: "phoenix_total", value: 3 },
      { id: "sepsis", value: 1 },
      { id: "septic_shock", value: 0 },
    ],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §1): PF 150 ∈ [100,200) + IMV → 2",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      pao2: { value: 150, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 2 },
      { id: "phoenix_total", value: 2 },
    ],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §1): PF 300 < 400 + IMV → 1",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      pao2: { value: 300, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 1 },
      { id: "phoenix_total", value: 1 },
    ],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §1): PF 300 < 400 + any support (no IMV) → 1",
    },
    {
      ...rr,
      resp_support: { value: "any-support" },
      pao2: { value: 300, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [{ id: "respiratory", value: 1 }],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §1): PF 420 ≥ 400 → 0 despite support",
    },
    {
      ...rr,
      resp_support: { value: "any-support" },
      pao2: { value: 420, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 0 },
      { id: "phoenix_total", value: 0 },
    ],
  );

  // ---------------------------------------------------------------------------
  // Respiratory — SpO₂:FiO₂ (S/F) path (valid only when SpO₂ ≤ 97). phoenix.md §1:
  // 3 pts if SF < 148 & IMV; 1 pt if SF < 292 & any support; 0 if SF ≥ 292.
  // (The SF 148–220 + IMV → 2 tier is exercised by worked example 2 above.)
  // ---------------------------------------------------------------------------
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §1): SF 90/0.9 = 100 < 148 + IMV → 3",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      spo2: { value: 90, unit: "%" },
      fio2: { value: 0.9, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 3 },
      { id: "phoenix_total", value: 3 },
    ],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §1): SF 90/0.4 = 225 < 292 + any support → 1",
    },
    {
      ...rr,
      resp_support: { value: "any-support" },
      spo2: { value: 90, unit: "%" },
      fio2: { value: 0.4, unit: "fraction" },
    },
    [{ id: "respiratory", value: 1 }],
  );

  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §1): SF 96/0.3 = 320 ≥ 292 → 0 despite support",
    },
    {
      ...rr,
      resp_support: { value: "any-support" },
      spo2: { value: 96, unit: "%" },
      fio2: { value: 0.3, unit: "fraction" },
    },
    [{ id: "respiratory", value: 0 }],
  );

  // Support present but no gas values → no ratio can be computed → 0 points
  // (phoenix.md "Missing data → 0"; the ratio alone, absent inputs, is not scored).
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula (phoenix.md §1 + Missing-data→0): support present, no PaO₂/SpO₂/FiO₂ → 0",
    },
    { ...rr, resp_support: { value: "any-support" } },
    [
      { id: "respiratory", value: 0 },
      { id: "phoenix_total", value: 0 },
    ],
  );

  // ---------------------------------------------------------------------------
  // Cardiovascular (0–6) = vasoactives + lactate + age-banded MAP. phoenix.md §2.
  // MAP band table (§2c): each expected point is a pure band lookup.
  // ---------------------------------------------------------------------------
  // 2a. Vasoactives ≥ 2 → 2 pts (phoenix.md §2a).
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2a): ≥2 vasoactive agents → 2",
    },
    { ...rr, n_vasoactives: { value: 2, unit: "" } },
    [
      { id: "cardiovascular", value: 2 },
      { id: "septic_shock", value: 1 },
    ],
  );

  // 2b. Lactate ≥ 11 → 2 pts; lactate 5–<11 → 1 pt (phoenix.md §2b).
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2b): lactate 12 ≥ 11 → 2",
    },
    { ...rr, lactate: { value: 12, unit: "mmol/L" } },
    [{ id: "cardiovascular", value: 2 }],
  );
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2b): lactate 6 ∈ [5,11) → 1",
    },
    { ...rr, lactate: { value: 6, unit: "mmol/L" } },
    [{ id: "cardiovascular", value: 1 }],
  );

  // 2c. Age-banded MAP. Neonate band 0–<1 mo: MAP < 17 → 2 pts (also exercises the
  // "MAP < low → 2" arm). Bands 1–<12, 12–<24 and ≥144 mo each score 1 pt in-range.
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2c): 0 mo, MAP 15 < 17 → 2",
    },
    {
      age_months: { value: 0, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 15, unit: "mmHg" },
    },
    [
      { id: "cardiovascular", value: 2 },
      { id: "septic_shock", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2c): 6 mo, MAP 30 ∈ [25,39) → 1",
    },
    {
      age_months: { value: 6, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 30, unit: "mmHg" },
    },
    [{ id: "cardiovascular", value: 1 }],
  );
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "derived from formula in JAMA Table 2 (phoenix.md §2c): 18 mo, MAP 35 ∈ [31,44) → 1",
    },
    {
      age_months: { value: 18, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 35, unit: "mmHg" },
    },
    [{ id: "cardiovascular", value: 1 }],
  );
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §2c): 150 mo, MAP 40 ∈ [38,52) → 1",
    },
    {
      age_months: { value: 150, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 40, unit: "mmHg" },
    },
    [{ id: "cardiovascular", value: 1 }],
  );

  // ---------------------------------------------------------------------------
  // Coagulation (0–2) — 1 pt each, capped at 2 (phoenix.md §3). Three abnormal
  // labs (platelets < 100, INR > 1.3, fibrinogen < 100) sum to 3 → cap 2. This
  // covers the fibrinogen < 100 arm and the cap.
  // ---------------------------------------------------------------------------
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §3): platelets 90 + INR 1.5 + fibrinogen 90 = 3 → cap 2",
    },
    {
      ...rr,
      platelets: { value: 90, unit: "10^3/uL" },
      inr: { value: 1.5, unit: "" },
      fibrinogen: { value: 90, unit: "mg/dL" },
    },
    [{ id: "coagulation", value: 2 }],
  );

  // ---------------------------------------------------------------------------
  // Neurologic (0–2) — additive, capped at 2 (phoenix.md §4). GCS ≤ 10 (1 pt) +
  // bilaterally fixed pupils (1 pt) = 2. Covers the fixed-pupils arm and the cap.
  // ---------------------------------------------------------------------------
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula in JAMA Table 2 (phoenix.md §4): GCS 8 ≤ 10 + fixed pupils → 2",
    },
    { ...rr, gcs_total: { value: 8, unit: "" }, fixed_pupils: { value: true } },
    [{ id: "neurologic", value: 2 }],
  );

  // ---------------------------------------------------------------------------
  // Sepsis gate: organ dysfunction present (cardiovascular 2, total 2) but NO
  // suspected infection → does not meet the sepsis criterion (phoenix.md §
  // Diagnostic rules: sepsis = suspected infection AND total ≥ 2).
  // ---------------------------------------------------------------------------
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "derived from formula (phoenix.md Diagnostic rules): total 2 but infection absent → sepsis NO",
    },
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: false },
      n_vasoactives: { value: 2, unit: "" },
    },
    [
      { id: "cardiovascular", value: 2 },
      { id: "phoenix_total", value: 2 },
      { id: "sepsis", value: 0 },
      { id: "septic_shock", value: 0 },
    ],
  );

  /**
   * THE SpO₂ 97/98 CLIFF, PINNED — the least intuitive behaviour in this score.
   *
   * S/F is only defined for SpO₂ ≤ 97, because above that the dissociation
   * curve plateaus and the ratio stops discriminating. Combine that published
   * gate with the reference package's missing-input convention (a component
   * with no usable data contributes 0) and the result is a genuine cliff: the
   * SAME child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at
   * SpO₂ 97 and 0 at SpO₂ 98, which can drop them below the total ≥ 2 sepsis
   * threshold on respiratory grounds alone.
   *
   * Both halves are correct per the paper, and neither was asserted anywhere.
   * That is the dangerous combination: a clinician reading 0 for a child on
   * 100% oxygen could take it as reassurance rather than as "not measurable —
   * get a gas". The limitations prose now says so, and this pins the numbers
   * that sentence quotes, so the two cannot drift apart.
   *
   * Surfaced 2026-08-01 while checking an external review's claim that the S/F
   * pathway was untested. The claim was wrong — it was tested — but probing it
   * turned this up, which no committed case had covered.
   */
  const ventilatedOnPureOxygen = {
    age_months: { value: 72, unit: "months" },
    suspected_infection: { value: true },
    resp_support: { value: "imv" },
    fio2: { value: 1.0, unit: "fraction" },
  };
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "S/F 97 with IMV → respiratory 3 (Table 2 respiratory row, S/F < 148)",
    },
    { ...ventilatedOnPureOxygen, spo2: { value: 97, unit: "%" } },
    [
      { id: "respiratory", value: 3 },
      { id: "phoenix_total", value: 3 },
      { id: "sepsis", value: 1 },
    ],
  );
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "SpO₂ 98 is above the S/F validity gate, so respiratory has no usable input and scores 0",
    },
    { ...ventilatedOnPureOxygen, spo2: { value: 98, unit: "%" } },
    [
      { id: "respiratory", value: 0 },
      { id: "phoenix_total", value: 0 },
      { id: "sepsis", value: 0 },
    ],
  );
});
