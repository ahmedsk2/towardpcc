import { describeScore } from "../testing/harness";
import type { InputValues } from "../types";
import { pelod2 } from "./pelod2";

/**
 * All worked examples are the three step-by-step vectors in
 * docs/research/scores/pelod2.md ("Worked examples"), each derived from the
 * scoring table and mortality logit of Leteurtre 2013 (PMID 23685639).
 */
const leteurtre = {
  citation:
    "Leteurtre S, et al. PELOD-2: an update of the PEdiatric logistic organ dysfunction score. Crit Care Med. 2013;41(7):1761–1773.",
  pmid: "23685639",
  doi: "10.1097/CCM.0b013e31828a2bbd",
};

type PelodInputs = (typeof pelod2)["inputs"];

/** All-normal patient (pelod2.md Worked example 1): every item scores 0. */
const normal = {
  age_months: { value: 36, unit: "months" },
  gcs: { value: 15, unit: "" },
  pupils: { value: "both_reactive" },
  lactate: { value: 1.0, unit: "mmol/L" },
  map: { value: 80, unit: "mmHg" },
  creatinine: { value: 30, unit: "µmol/L" },
  pao2_fio2: { value: 300, unit: "" },
  paco2: { value: 40, unit: "mmHg" },
  invasive_vent: { value: false },
  wbc: { value: 10, unit: "10^9/L" },
  platelets: { value: 300, unit: "10^9/L" },
} as const;

describeScore(pelod2, (ctx) => {
  // Example 1 — all-normal patient → total 0, predicted mortality ≈ 0.13%.
  ctx.workedExample(
    { ...leteurtre, locator: "Worked example 1 (derived from Table 6 + logit)" },
    normal,
    [
      { id: "pelod2", value: 0 },
      { id: "mortality_probability", value: 0.1345, tolerance: 0.01 },
    ],
  );

  // Example 2 — 3-year-old (24–59 mo band), mixed dysfunction → total 9, ≈ 8.5%.
  // GCS 8→1, pupils reactive→0, lactate 6→1, MAP 40→3, creat 30→0, P/F 200→0,
  // PaCO₂ 50→0, invasive vent→3, WBC 10→0, platelets 100→1.
  ctx.workedExample(
    { ...leteurtre, locator: "Worked example 2 (derived from Table 6 + logit)" },
    {
      age_months: { value: 36, unit: "months" },
      gcs: { value: 8, unit: "" },
      pupils: { value: "both_reactive" },
      lactate: { value: 6.0, unit: "mmol/L" },
      map: { value: 40, unit: "mmHg" },
      creatinine: { value: 30, unit: "µmol/L" },
      pao2_fio2: { value: 200, unit: "" },
      paco2: { value: 50, unit: "mmHg" },
      invasive_vent: { value: true },
      wbc: { value: 10, unit: "10^9/L" },
      platelets: { value: 100, unit: "10^9/L" },
    } as const,
    [
      { id: "pelod2", value: 9 },
      { id: "mortality_probability", value: 8.47, tolerance: 0.05 },
    ],
  );

  // Example 3 — 8-month-old (1–11 mo band), maximum dysfunction → total 33 (the
  // published maximum), ≈ 99.99%. GCS 3→4, pupils fixed→5, lactate 12→4,
  // MAP 20→6, creat 30→2, P/F 50→2, PaCO₂ 100→3, vent→3, WBC 1.5→2, platelets 50→2.
  ctx.workedExample(
    { ...leteurtre, locator: "Worked example 3 (max = 33; derived from Table 6 + logit)" },
    {
      age_months: { value: 8, unit: "months" },
      gcs: { value: 3, unit: "" },
      pupils: { value: "both_fixed" },
      lactate: { value: 12.0, unit: "mmol/L" },
      map: { value: 20, unit: "mmHg" },
      creatinine: { value: 30, unit: "µmol/L" },
      pao2_fio2: { value: 50, unit: "" },
      paco2: { value: 100, unit: "mmHg" },
      invasive_vent: { value: true },
      wbc: { value: 1.5, unit: "10^9/L" },
      platelets: { value: 50, unit: "10^9/L" },
    } as const,
    [
      { id: "pelod2", value: 33 },
      { id: "mortality_probability", value: 99.986, tolerance: 0.02 },
    ],
  );

  // Example 4 — 18-month-old (12–23 mo band), isolated cardio/respiratory
  // dysfunction. Exercises the 12–23 mo age band, the MAP "2 pts" band, and the
  // PaCO₂ "59–94 → 1" band. Derived from Table 6: MAP 50 mmHg falls in 44–59
  // (=2) for 12–23 mo; PaCO₂ 70 mmHg falls in 59–94 (=1). Total 3 → ≈ 0.55%.
  ctx.workedExample(
    { ...leteurtre, locator: "Worked example 4 (12–23 mo band; derived from Table 6 + logit)" },
    {
      age_months: { value: 18, unit: "months" },
      gcs: { value: 15, unit: "" },
      pupils: { value: "both_reactive" },
      lactate: { value: 1.0, unit: "mmol/L" },
      map: { value: 50, unit: "mmHg" },
      creatinine: { value: 30, unit: "µmol/L" },
      pao2_fio2: { value: 300, unit: "" },
      paco2: { value: 70, unit: "mmHg" },
      invasive_vent: { value: false },
      wbc: { value: 10, unit: "10^9/L" },
      platelets: { value: 300, unit: "10^9/L" },
    } as const,
    [
      { id: "pelod2", value: 3 },
      { id: "mortality_probability", value: 0.5486, tolerance: 0.01 },
    ],
  );

  // Example 5 — 100-month-old (60–143 mo band), isolated renal dysfunction.
  // Exercises the 60–143 mo age band. Derived from Table 6: creatinine 60 µmol/L
  // is ≥ 59 (=2) for 60–143 mo; MAP 70 mmHg is ≥ 65 (=0). Total 2 → ≈ 0.34%.
  ctx.workedExample(
    { ...leteurtre, locator: "Worked example 5 (60–143 mo band; derived from Table 6 + logit)" },
    {
      age_months: { value: 100, unit: "months" },
      gcs: { value: 15, unit: "" },
      pupils: { value: "both_reactive" },
      lactate: { value: 1.0, unit: "mmol/L" },
      map: { value: 70, unit: "mmHg" },
      creatinine: { value: 60, unit: "µmol/L" },
      pao2_fio2: { value: 300, unit: "" },
      paco2: { value: 40, unit: "mmHg" },
      invasive_vent: { value: false },
      wbc: { value: 10, unit: "10^9/L" },
      platelets: { value: 300, unit: "10^9/L" },
    } as const,
    [
      { id: "pelod2", value: 2 },
      { id: "mortality_probability", value: 0.3436, tolerance: 0.01 },
    ],
  );

  // Boundary coverage for every numeric input (also satisfies the rejection floor).
  for (const id of [
    "age_months",
    "gcs",
    "lactate",
    "map",
    "creatinine",
    "pao2_fio2",
    "paco2",
    "wbc",
    "platelets",
  ] as const) {
    ctx.boundaryTest(id, "min", normal);
    ctx.boundaryTest(id, "max", normal);
  }

  // Required categorical: an unrecognized pupillary state is rejected.
  ctx.rejectsImplausible(
    "an unrecognized pupillary state",
    { ...normal, pupils: { value: "unrecognized" } } as unknown as InputValues<PelodInputs>,
    { inputId: "pupils", code: "invalid-category" },
  );

  // Out-of-range numeric is rejected with the stated bound.
  ctx.rejectsImplausible(
    "a mean arterial pressure above the plausibility bound",
    { ...normal, map: { value: 500, unit: "mmHg" } },
    { inputId: "map", code: "out-of-range" },
  );

  // Unknown unit is rejected (creatinine accepts only µmol/L or mg/dL).
  ctx.rejectsImplausible(
    "creatinine entered in an unsupported unit",
    { ...normal, creatinine: { value: 1.0, unit: "mmol/L" } },
    { inputId: "creatinine", code: "unknown-unit" },
  );
});
