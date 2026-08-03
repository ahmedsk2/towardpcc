import { expect, it } from "vitest";
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

// Expected values that are OUTPUT OF THE TASK FORCE'S OWN SOFTWARE, executed
// against the stated inputs, rather than read off a printed table. Used for the
// two places where the published tables cannot settle the question by
// themselves: the neurologic row (whose three mutually exclusive columns do not
// say what a fixed pupil with a normal or unrecorded GCS scores) and the four
// boundary values where the printed integer bands and the continuous software
// comparisons disagree. Provenance is recorded in
// docs/research/scores/phoenix.md; the module is CU-DBMI-Peds/phoenix, MIT.
const phoenixModule = {
  citation:
    "DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD. phoenix: an R package and Python module for calculating the Phoenix pediatric sepsis score and criteria. JAMIA Open. 2024;7(3):ooae066 — official Python module (CU-DBMI-Peds/phoenix) executed against these inputs.",
  doi: "10.1093/jamiaopen/ooae066",
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

  // 2b, entered in mg/dL. Phoenix states its lactate bands in mmol/L only —
  // phoenix.md records the ×9.01 factor as "a general lab convention, not
  // published in the Phoenix paper" — so 45 mg/dL is NOT a published
  // restatement of the 5 mmol/L cut point (5 mmol/L is 45.05 mg/dL). 45 ÷ 9.01
  // = 4.9945 mmol/L, genuinely in the < 5 band → 0. Rounding lactate at
  // conversion would add a cardiovascular point to a measurement that does not
  // meet the published threshold; this pins that it must not.
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "JAMA Table 2 (phoenix.md §2b): 45 mg/dL = 4.9945 mmol/L, below the 5 mmol/L band",
    },
    { ...rr, lactate: { value: 45, unit: "mg/dL" } },
    [{ id: "cardiovascular", value: 0 }],
  );
  // 45.1 mg/dL is 5.0055 mmol/L — genuinely at/over the published cut point → 1.
  ctx.workedExample(
    {
      ...jamaTable2,
      locator: "JAMA Table 2 (phoenix.md §2b): 45.1 mg/dL = 5.0055 mmol/L ∈ [5,11) → 1",
    },
    { ...rr, lactate: { value: 45.1, unit: "mg/dL" } },
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

  /**
   * NEUROLOGIC (0–2) — HIERARCHICAL, and this is the row the calculator got
   * wrong until 2026-08-03.
   *
   * It was implemented as GCS ≤ 10 (+1) plus fixed pupils (+1), capped at 2.
   * That agrees with the published rule at exactly one input — fixed pupils
   * with a GCS ≤ 10 — and disagrees everywhere else a pupil is fixed, which is
   * why a single passing "GCS 8 + fixed pupils → 2" case (the only neurologic
   * case this file used to carry) could not see it.
   *
   * The published tables print three mutually exclusive columns and cannot be
   * read as an addition. The whole edge-case table below is real output from
   * the task force's Python module, so it settles the two questions the printed
   * table leaves open: a fixed pupil with a NORMAL GCS, and a fixed pupil with
   * NO GCS at all.
   *
   * The missing-GCS row is the clinically load-bearing one. GCS imputes to 15
   * and pupil status imputes to 'not fixed' INDEPENDENTLY, so a child with
   * bilaterally fixed pupils and no GCS recorded scores the full 2 — which on
   * its own reaches the total ≥ 2 sepsis threshold. The old additive-with-cap
   * form scored that child 1 and put them below it.
   */
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: fixed pupils, GCS 15 → 2" },
    { ...rr, gcs_total: { value: 15, unit: "" }, fixed_pupils: { value: true } },
    [{ id: "neurologic", value: 2 }],
  );
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: fixed pupils, GCS 8 → 2" },
    { ...rr, gcs_total: { value: 8, unit: "" }, fixed_pupils: { value: true } },
    [{ id: "neurologic", value: 2 }],
  );
  // The one that changes a diagnosis: no GCS entered at all, pupils fixed.
  // Nothing else abnormal, so the neurologic 2 IS the total, and the total
  // crossing 2 is what the sepsis criterion turns on.
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "phoenix_neurologic executed: fixed pupils, GCS missing (imputed 15) → 2",
    },
    { ...rr, fixed_pupils: { value: true } },
    [
      { id: "neurologic", value: 2 },
      { id: "phoenix_total", value: 2 },
      { id: "sepsis", value: 1 },
      { id: "septic_shock", value: 0 },
    ],
  );
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: pupils not fixed, GCS 15 → 0" },
    { ...rr, gcs_total: { value: 15, unit: "" }, fixed_pupils: { value: false } },
    [{ id: "neurologic", value: 0 }],
  );
  // 11 and 10 straddle the published cut point from below.
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: pupils not fixed, GCS 11 → 0" },
    { ...rr, gcs_total: { value: 11, unit: "" }, fixed_pupils: { value: false } },
    [{ id: "neurologic", value: 0 }],
  );
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: pupils not fixed, GCS 10 → 1" },
    { ...rr, gcs_total: { value: 10, unit: "" }, fixed_pupils: { value: false } },
    [{ id: "neurologic", value: 1 }],
  );
  ctx.workedExample(
    { ...phoenixModule, locator: "phoenix_neurologic executed: pupils not fixed, GCS 3 → 1" },
    { ...rr, gcs_total: { value: 3, unit: "" }, fixed_pupils: { value: false } },
    [{ id: "neurologic", value: 1 }],
  );
  // The mirror of the load-bearing case: pupil status missing must not suppress
  // the GCS point either. Imputation is per input, in both directions.
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "phoenix_neurologic executed: GCS 8, pupil status missing (imputed not fixed) → 1",
    },
    { ...rr, gcs_total: { value: 8, unit: "" } },
    [{ id: "neurologic", value: 1 }],
  );
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "phoenix_neurologic executed: GCS and pupil status both missing → 0",
    },
    { ...rr },
    [{ id: "neurologic", value: 0 }],
  );

  /**
   * The neurologic component must never exceed 2. An uncapped sum of the two
   * criteria would return 3 for fixed pupils at GCS 8 — out of range for the
   * subscore and an inflated total — and the reference package guards against
   * it with an explicit cap. The hierarchical form here makes 3 unreachable by
   * construction rather than by a cap, so this asserts the property directly
   * across every combination of the two inputs.
   */
  it("neurologic is 0-2 for every combination of GCS and pupil status", () => {
    const observed = new Set<number>();
    for (const gcs of [undefined, 3, 10, 11, 15]) {
      for (const fixed of [undefined, false, true]) {
        const outcome = phoenix.compute({
          age_months: { value: 36, unit: "months" },
          suspected_infection: { value: true },
          ...(gcs === undefined ? {} : { gcs_total: { value: gcs, unit: "" } }),
          ...(fixed === undefined ? {} : { fixed_pupils: { value: fixed } }),
        } as never);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) continue;
        const neuro = outcome.result.values.find((v) => v.id === "neurologic")!.value;
        expect(neuro, `GCS ${gcs}, fixed pupils ${fixed}`).toBeGreaterThanOrEqual(0);
        expect(neuro, `GCS ${gcs}, fixed pupils ${fixed}`).toBeLessThanOrEqual(2);
        observed.add(neuro);
      }
    }
    // All three points of the range are reachable — otherwise "never exceeds 2"
    // would pass on a subscore that had silently stopped scoring.
    expect([...observed].sort()).toEqual([0, 1, 2]);
  });

  /**
   * THE FOUR BOUNDARY DIVERGENCES, PINNED.
   *
   * The published tables are written for the bedside — integer MAP bands, a
   * one-decimal lactate band — while the reference software compares every
   * input continuously. That produces a small, complete, enumerable set of
   * values where the printed table and the software disagree. There are exactly
   * four, and this calculator follows the software at all four; the choice is
   * stated in `formula` so a reader who checks against the printed table finds
   * the discrepancy explained rather than surprising.
   *
   * These cases exist because "we follow the software" is otherwise a claim in
   * prose with nothing holding it: every other test in this file sits inside a
   * band where the two conventions agree, so a future edit to a comparison
   * operator would move all four of these silently and break nothing.
   */
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "executed: MAP 30.5 at age < 1 mo → 1 (printed 0-point band starts at 31)",
    },
    {
      age_months: { value: 0, unit: "months" },
      suspected_infection: { value: true },
      map: { value: 30.5, unit: "mmHg" },
    },
    [{ id: "cardiovascular", value: 1 }],
  );
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "executed: lactate 10.95 → 1 (printed 1-point band 5-10.9 leaves it in a gap)",
    },
    { ...rr, lactate: { value: 10.95, unit: "mmol/L" } },
    [{ id: "cardiovascular", value: 1 }],
  );
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "executed: P/F exactly 200 on IMV → 1 (printed 2-point band 100-200 reads 2)",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      pao2: { value: 200, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [{ id: "respiratory", value: 1 }],
  );
  ctx.workedExample(
    {
      ...phoenixModule,
      locator: "executed: S/F exactly 220 on IMV → 1 (printed 2-point band 148-220 reads 2)",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      spo2: { value: 88, unit: "%" },
      fio2: { value: 0.4, unit: "fraction" },
    },
    [{ id: "respiratory", value: 1 }],
  );

  /**
   * BOTH oxygenation ratios are tested at every tier, and either can trigger
   * one. The published respiratory rows are disjunctions ("P/F < 200 OR
   * S/F < 220") and the reference expression evaluates both terms; a ratio that
   * cannot be computed imputes to 500, above every cut point, so it contributes
   * nothing rather than vetoing the other one.
   *
   * Until 2026-08-03 this calculator used P/F ALONE whenever an arterial gas
   * was present and only fell back to S/F when it was not, so an S/F that
   * crossed a tier was discarded the moment a PaO₂ existed. The two ratios do
   * disagree in practice, because a gas and a saturation are rarely drawn at
   * the same instant: below, P/F 250/0.6 = 417 clears the 400 cut point while
   * S/F 96/0.6 = 160 sits inside the 2-point band. The published rule scores
   * that child 2; the old code scored 0 and left them below the sepsis
   * threshold. The correction can only ever raise a respiratory score.
   */
  ctx.workedExample(
    {
      ...phoenixModule,
      locator:
        "executed: IMV, P/F 417 (no points on its own) with S/F 160 → 2, per the disjunction in the respiratory rows",
    },
    {
      ...rr,
      resp_support: { value: "imv" },
      pao2: { value: 250, unit: "mmHg" },
      spo2: { value: 96, unit: "%" },
      fio2: { value: 0.6, unit: "fraction" },
    },
    [
      { id: "respiratory", value: 2 },
      { id: "phoenix_total", value: 2 },
      { id: "sepsis", value: 1 },
      { id: "septic_shock", value: 0 },
    ],
  );

  /**
   * Respiratory is cumulative, and the ceiling that matters clinically is the
   * one on NON-invasive support: it is 1, however bad the ratio gets, because
   * the 2- and 3-point tiers are gated on invasive ventilation. A ratio deep
   * below the 3-point cut point still scores 1 without a tube.
   */
  ctx.workedExample(
    {
      ...jamaTable2,
      locator:
        "JAMA Table 2 respiratory row: P/F 50 on non-invasive support → 1, the 2- and 3-point tiers requiring IMV",
    },
    {
      ...rr,
      resp_support: { value: "any-support" },
      pao2: { value: 50, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
    },
    [{ id: "respiratory", value: 1 }],
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
  // `as const` is load-bearing: without it `resp_support.value` widens to
  // `string` and will not narrow back to the "none" | "any-support" | "imv"
  // union when spread into workedExample. Every other case in this file passes
  // its inputs inline, where the literal type survives — this is the first one
  // hoisted to a shared constant, which is why it is the first to hit it.
  const ventilatedOnPureOxygen = {
    age_months: { value: 72, unit: "months" },
    suspected_infection: { value: true },
    resp_support: { value: "imv" },
    fio2: { value: 1.0, unit: "fraction" },
  } as const;
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

  /**
   * The declared composition must stay true of the numbers the score emits.
   * registry-gate checks the four component IDS are emitted; nothing checked
   * that they sum to the total, nor that any of them respects the range
   * declared for it. Three of the four maxima (cardiovascular 6, coagulation 2,
   * neurologic 2) are properties of the published table rather than of a
   * literal in `calculate`, so a wrong one would draw a bar of the wrong length
   * on a sepsis calculator while every other assertion in this file passed.
   *
   * The last vector is the published ceiling: 3 + 6 + 2 + 2 = 13. Asserting the
   * sum there checks the four maxima are simultaneously attainable and that
   * they tile the published 0–13 range rather than merely fitting inside it.
   *
   * A `value <= max` assertion alone is only half a test: it catches a max
   * declared too LOW, never one declared too HIGH, because nothing ever attains
   * the inflated ceiling and the comparison passes forever while the rendered
   * bar stays silently short. Hence the per-component attainment assertion
   * below — the total reaching 13 constrains the four maxima only in aggregate.
   */
  it("declared components sum to the total and pin their maxima, low through the 13-point ceiling", () => {
    const vectors = [
      // Nothing abnormal: every component 0.
      { age_months: { value: 36, unit: "months" }, suspected_infection: { value: true } },
      // Vignette 2's physiology: resp 2, cardio 0, coag 2, neuro 1 → 5.
      {
        age_months: { value: 72, unit: "months" },
        suspected_infection: { value: true },
        resp_support: { value: "imv" },
        spo2: { value: 92, unit: "%" },
        fio2: { value: 0.45, unit: "fraction" },
        lactate: { value: 2.9, unit: "mmol/L" },
        map: { value: 52, unit: "mmHg" },
        inr: { value: 1.7, unit: "" },
        ddimer: { value: 4.4, unit: "mg/L FEU" },
        gcs_total: { value: 8, unit: "" },
      },
      // Every cardiovascular sub-score contributing one point apiece (vaso 1 +
      // lactate 6 + MAP 40 ∈ [36,49) at 72 mo), with respiratory at 3.
      {
        ...ventilatedOnPureOxygen,
        spo2: { value: 97, unit: "%" },
        n_vasoactives: { value: 1, unit: "" },
        lactate: { value: 6, unit: "mmol/L" },
        map: { value: 40, unit: "mmHg" },
      },
      // The ceiling: resp 3 (S/F 97 < 148 on IMV) + cardio 6 (2 + 2 + 2) +
      // coag 2 (capped) + neuro 2 (fixed pupils, which is the whole 2) = 13.
      {
        ...ventilatedOnPureOxygen,
        spo2: { value: 97, unit: "%" },
        n_vasoactives: { value: 3, unit: "" },
        lactate: { value: 12, unit: "mmol/L" },
        map: { value: 30, unit: "mmHg" },
        platelets: { value: 50, unit: "10^3/uL" },
        inr: { value: 2.0, unit: "" },
        ddimer: { value: 5, unit: "mg/L FEU" },
        fibrinogen: { value: 80, unit: "mg/dL" },
        gcs_total: { value: 3, unit: "" },
        fixed_pupils: { value: true },
      },
    ];
    const composition = phoenix.composition;
    expect(composition, "phoenix must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((c) => [c.id, Number.NEGATIVE_INFINITY]),
    );

    const totals: number[] = [];
    for (const v of vectors) {
      const outcome = phoenix.compute(v as never);
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
      totals.push(sum);
    }

    // Each declared max must be REACHED, not merely respected — otherwise a max
    // set too high sails through the ≤ assertion above and mis-scales the bar.
    for (const c of composition.components) {
      expect(observedMax.get(c.id), `${c.id}: declared max ${c.max} is never attained`).toBe(c.max);
    }

    // The sweep really does span the published range, floor to ceiling — so a
    // silently-narrowed max could not hide behind vectors that never reach it.
    expect(totals[0], "the sweep must include a 0").toBe(0);
    expect(totals.at(-1), "the sweep must reach the published 0–13 ceiling").toBe(13);
    expect(
      composition.components.reduce((n, c) => n + c.max, 0),
      "declared maxima must sum to the published Phoenix maximum of 13",
    ).toBe(13);
  });
});
