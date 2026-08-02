import { expect, it } from "vitest";
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

  // ---- Alternate-unit boundary: an UNPUBLISHED equivalent must not over-score ----
  // Leteurtre 2013 states PaCO₂ in mmHg only and lactate in mmol/L only;
  // pelod2.md §Inputs records "1 kPa = 7.5 mmHg" and "1 mmol/L ≈ 9.01 mg/dL" as
  // standard laboratory conversions, "not values from the paper". So neither
  // 12.6 kPa nor 45 mg/dL is a published restatement of a cut point:
  //   95 mmHg is 12.666 kPa → 12.6 kPa really is 94.5 mmHg → the 59–94 band → 1
  //   5 mmol/L is 45.05 mg/dL → 45 mg/dL really is 4.9945 mmol/L → < 5 → 0
  // mmhgWithKpa and lactateMmol therefore carry NO canonicalDecimals. Rounding
  // PaCO₂ to whole mmHg would push 94.5 to 95 and cost this patient two points.
  ctx.workedExample(
    { ...leteurtre, locator: "Table 6 respiratory band 59–94 mmHg, entered as 12.6 kPa" },
    { ...normal, paco2: { value: 12.6, unit: "kPa" } },
    [
      { id: "respiratory", value: 1 },
      { id: "pelod2", value: 1 },
    ],
  );
  // 12.7 kPa is 95.26 mmHg — genuinely at/over the published ≥ 95 cut point → 3.
  ctx.workedExample(
    { ...leteurtre, locator: "Table 6 respiratory band ≥ 95 mmHg, entered as 12.7 kPa" },
    { ...normal, paco2: { value: 12.7, unit: "kPa" } },
    [
      { id: "respiratory", value: 3 },
      { id: "pelod2", value: 3 },
    ],
  );
  ctx.workedExample(
    { ...leteurtre, locator: "Table 6 cardiovascular lactate < 5 mmol/L, entered as 45 mg/dL" },
    { ...normal, lactate: { value: 45, unit: "mg/dL" } },
    [
      { id: "cardiovascular", value: 0 },
      { id: "pelod2", value: 0 },
    ],
  );
  // 45.1 mg/dL is 5.0055 mmol/L — genuinely in the published 5.0–10.9 band → 1.
  ctx.workedExample(
    { ...leteurtre, locator: "Table 6 cardiovascular lactate 5.0–10.9 mmol/L, as 45.1 mg/dL" },
    { ...normal, lactate: { value: 45.1, unit: "mg/dL" } },
    [
      { id: "cardiovascular", value: 1 },
      { id: "pelod2", value: 1 },
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

  /**
   * THE 45 mmHg GAP IN THE 24–59 MONTH BAND.
   *
   * Table 6 prints that band as ≥62 → 0, 46–61 → 2, 32–44 → 3, ≤31 → 6. A MAP
   * of exactly 45 is scored by none of them. Every other age band tiles the
   * axis without a gap (0–<1: ≤16/17–30/31–45/≥46; 1–11: ≤24/25–38/39–54/≥55;
   * 12–23: ≤30/31–43/44–59/≥60; 60–143: ≤35/36–48/49–64/≥65; ≥144:
   * ≤37/38–51/52–66/≥67), and the creatinine bands are contiguous in all six —
   * so this is a one-value omission in the source, not a deliberate exclusion.
   *
   * The paper states no rule, so an implementation MUST choose, and the choice
   * is not derivable from the publication. We close the gap DOWNWARD: the
   * ≥-cascade in `mapPoints` falls through to the 3-point band, extending it up
   * to 45. That is the conservative (higher-severity) reading, which for a
   * severity score is the safer default. The public ESPNIC calculator closes it
   * upward and scores 45 as 2, so a 2–4-year-old at exactly this MAP totals one
   * point higher here than there — the only input at which the two disagree.
   *
   * Pinned so the choice is deliberate rather than incidental: 45 → 3 is a
   * fall-through, which is exactly the kind of behaviour that survives a
   * refactor by accident and dies by accident. The neighbours are asserted too,
   * because a "fix" that shifts the printed band edges to close the gap would
   * otherwise be invisible — 46 belongs to the 2-point band and 44 to the
   * 3-point band, and both are printed in Table 6 rather than inferred.
   *
   * `normal` is age 36 mo (in-band) with every other item scoring 0, so the
   * total IS the cardiovascular subscore here.
   */
  for (const [map, points, why] of [
    [46, 2, "printed 2-pt band floor (46–61)"],
    [45, 3, "UNPRINTED — the gap; closed downward to 3 (ESPNIC assigns 2)"],
    [44, 3, "printed 3-pt band ceiling (32–44)"],
  ] as const) {
    ctx.workedExample(
      {
        ...leteurtre,
        locator: `Table 6, 24–59 mo band: MAP ${map} mmHg → ${points} pts — ${why}`,
      },
      { ...normal, map: { value: map, unit: "mmHg" } },
      [
        { id: "pelod2", value: points },
        { id: "cardiovascular", value: points },
      ],
    );
  }

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

  it("emits five organ subscores that sum to the total", () => {
    const outcome = pelod2.compute(normal as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)?.value;
    const organs = ["neurologic", "cardiovascular", "renal", "respiratory", "haematologic"];
    for (const o of organs) expect(get(o), `${o} must be emitted`).toBeDefined();
    const sum = organs.reduce((n, o) => n + (get(o) ?? 0), 0);
    expect(sum).toBe(get("pelod2"));
  });

  /**
   * The declared composition must stay true of the numbers actually emitted.
   * registry-gate checks the ids exist; nothing checks the ARITHMETIC — that
   * the five organ subscores really sum to the total, and that each stays
   * inside its declared [min, max]. A wrong `max` draws a bar of the wrong
   * length on the result panel while every other assertion still passes.
   *
   * Read the ids and maxima from `pelod2.composition` rather than restating
   * them: a sibling task found that hardcoding the numbers here made the
   * equivalent PRISM test vacuous — the test and the declaration agreed with
   * each other while both disagreed with the code.
   *
   * The maximum-dysfunction vector is what gives this test teeth. It drives
   * ALL FIVE organs to their ceilings at once (4+5, 4+6, 2, 2+3+3, 2+2 = 33),
   * so the attainment assertion below pins every declared max from both
   * sides — too low fails because the vector exceeds it, too high fails
   * because nothing reaches it.
   */
  it("declared components sum to the total and pin their maxima, low to high", () => {
    const vectors = [
      // Low — all-normal, every organ 0 (exercises the min side).
      normal,
      // Low/moderate — isolated renal dysfunction only (total 2).
      {
        ...normal,
        age_months: { value: 100, unit: "months" },
        creatinine: { value: 60, unit: "µmol/L" },
      },
      // Moderate — isolated cardiovascular + respiratory (total 3).
      {
        ...normal,
        age_months: { value: 18, unit: "months" },
        map: { value: 50, unit: "mmHg" },
        paco2: { value: 70, unit: "mmHg" },
      },
      // Moderate/high — mixed dysfunction across four systems (total 9).
      {
        ...normal,
        gcs: { value: 8, unit: "" },
        lactate: { value: 6.0, unit: "mmol/L" },
        map: { value: 40, unit: "mmHg" },
        invasive_vent: { value: true },
        platelets: { value: 100, unit: "10^9/L" },
      },
      // High — maximum dysfunction, every organ at its ceiling (total 33).
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
      },
    ];

    const composition = pelod2.composition;
    expect(composition, "pelod2 must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((c) => [c.id, Number.NEGATIVE_INFINITY]),
    );

    for (const v of vectors) {
      const outcome = pelod2.compute(v as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const get = (id: string) => {
        const found = outcome.result.values.find((x) => x.id === id);
        expect(found, `${id} must be emitted`).toBeDefined();
        return found!.value;
      };

      const sum = composition.components.reduce((n, c) => n + get(c.id), 0);
      expect(sum, "components must sum to the total").toBe(get(composition.total));

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
      "declared maxima must sum to the published PELOD-2 maximum of 33",
    ).toBe(33);
  });
});
