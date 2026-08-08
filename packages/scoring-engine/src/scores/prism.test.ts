import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import type { InputValues } from "../types";
import { prism } from "./prism";

/**
 * NO PUBLISHED WORKED EXAMPLE EXISTS for PRISM III or PRISM IV.
 *
 * This is stated plainly rather than papered over. Neither the 1996 derivation
 * paper, the 2016 update, the patent that reproduces the full table, nor any
 * secondary source works a case end to end. The natural oracle is the authors'
 * own CPCCRN calculators: both calculators' input and output sets were read on
 * 2026-08-03, but NO CASE HAS BEEN ROUND-TRIPPED through either one, so every
 * case below is unreconciled against the authors' own implementation.
 *
 * So these cases are CONSTRUCTED from the patent's threshold table: each
 * scoring decision below is annotated with the row that produced it, so the
 * arithmetic is auditable line by line even though the case itself is not
 * citable to a published patient. The `locator` on each source says so.
 *
 * Every case doubles as a trap for a specific way this score is easy to get
 * wrong — the shared acidosis row, the independent alkalosis row, the age
 * bands that differ between PRISM III and PRISM IV, and the PT/PTT row that
 * must award three points once rather than twice.
 *
 * NO CASE HERE ASSERTS A PRISM III MORTALITY FIGURE, and none may be added.
 * Those equations were removed on 2026-08-03: they are absent from the 1996
 * article, which publishes the score sheet in full and no regression
 * coefficients, and they are separately licensed. See the guard test
 * "emits no probability for the 12- or 24-hour window", which is what stops
 * one coming back by accident.
 */
const constructed = {
  citation:
    "Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752. Threshold table reproduced verbatim in US patent 5,809,477 (Pollack, expired 2015).",
  pmid: "8706448",
  locator: "constructed from the threshold table — no published worked example exists",
};

/**
 * The PRISM IV source, and a note on how strong the probabilities below are.
 *
 * The coefficients are Table 3 of Pollack 2016, published in full. The paper
 * contains no worked example, so every probability asserted here is ARITHMETIC
 * ON THAT PUBLISHED TABLE rather than a figure reproduced from a publication —
 * a weaker provenance than the platform's usual pattern, recorded here rather
 * than presented as publication-derived. The four exact anchors in the probe
 * block below were cross-checked against an independent recomputation of the
 * same table (0.3092%, 1.5581%, 2.6365%, 4.0660%), so they are at least not
 * this file's own arithmetic marking its own work.
 */
const prismIv = {
  citation:
    "Pollack MM, Holubkov R, Funai T, et al. The Pediatric Risk of Mortality Score: Update 2015. Pediatr Crit Care Med. 2016;17(1):2-9, Table 3.",
  pmid: "26492059",
  doi: "10.1097/PCC.0000000000000558",
  locator:
    "coefficients from Table 3; case and probability computed from them — no published worked example exists",
};

type PrismInputs = (typeof prism)["inputs"];

/**
 * A 3-year-old with entirely normal physiology. Every one of the 26 ranges
 * misses, so this pins the floor of the score at 0 on both sides of the
 * subscore split.
 *
 * The window is a PRISM III one, so it also pins the honest absence: three
 * outputs and no probability, for a patient whose data are perfectly complete.
 */
const normal = {
  collection_window: { value: "first_12h" },
  age: { value: 3, unit: "years" },
  sbp_min: { value: 95, unit: "mmHg" },
  temp_min: { value: 36.5, unit: "°C" },
  temp_max: { value: 37.5, unit: "°C" },
  // Deliberately blank: mental status is entered only for known or suspected
  // acute CNS disease, and this child has none.
  pupils: { value: "both_reactive" },
  hr_max: { value: 120, unit: "bpm" },
  ph_min: { value: 7.35, unit: "" },
  ph_max: { value: 7.42, unit: "" },
  tco2_min: { value: 22, unit: "mmol/L" },
  tco2_max: { value: 24, unit: "mmol/L" },
  pco2_max: { value: 40, unit: "mmHg" },
  pao2_min: { value: 90, unit: "mmHg" },
  glucose_max: { value: 100, unit: "mg/dL" },
  potassium_max: { value: 4.0, unit: "mEq/L" },
  creatinine_max: { value: 0.4, unit: "mg/dL" },
  bun_max: { value: 10, unit: "mg/dL" },
  wbc_min: { value: 9000, unit: "cells/mm³" },
  platelets_min: { value: 250_000, unit: "cells/mm³" },
  pt_max: { value: 12, unit: "s" },
  ptt_max: { value: 30, unit: "s" },
} as unknown as InputValues<PrismInputs>;

describeScore(prism, (t) => {
  t.workedExample(constructed, normal, [
    { id: "prism_total", value: 0 },
    { id: "neurologic_subscore", value: 0 },
    { id: "non_neurologic_subscore", value: 0 },
  ]);

  /**
   * 8-month-old with bronchiolitis. Two near-miss traps: a heart rate of 210
   * scores NOTHING because the infant band starts at 215, and a BUN of 12
   * scores nothing because the infant cutoff is 14.9 — the same value would
   * have scored 3 in a neonate.
   */
  t.workedExample(
    constructed,
    {
      ...normal,
      age: { value: 8, unit: "months" },
      sbp_min: { value: 70, unit: "mmHg" },
      temp_max: { value: 38.5, unit: "°C" },
      hr_max: { value: 210, unit: "bpm" }, // infant band starts at 215 -> 0
      ph_min: { value: 7.25, unit: "" }, // 7.0-7.28 -> 2
      tco2_min: { value: 18, unit: "mmol/L" }, // >16.9, so it adds nothing
      tco2_max: { value: 26, unit: "mmol/L" },
      pco2_max: { value: 80, unit: "mmHg" }, // >75.0 -> 3
      pao2_min: { value: 55, unit: "mmHg" },
      glucose_max: { value: 150, unit: "mg/dL" },
      creatinine_max: { value: 0.3, unit: "mg/dL" },
      bun_max: { value: 12, unit: "mg/dL" }, // infant cutoff 14.9 -> 0
      wbc_min: { value: 8000, unit: "cells/mm³" },
      platelets_min: { value: 180_000, unit: "cells/mm³" }, // 100k-200k -> 2
      pt_max: { value: 15, unit: "s" },
      ptt_max: { value: 40, unit: "s" },
    } as unknown as InputValues<PrismInputs>,
    [
      // 2 (acidosis) + 3 (PCO2) + 2 (platelets)
      { id: "prism_total", value: 7 },
      { id: "neurologic_subscore", value: 0 },
      { id: "non_neurologic_subscore", value: 7 },
    ],
  );

  /**
   * 14-year-old in DKA. The case that proves the acidosis row is shared: pH
   * 7.05 and total CO2 6 each independently satisfy the 2-point tier, and the
   * row must award 2 once — not 4. Potassium 6.0 and a WBC of 16,000 are
   * present precisely because neither scores.
   */
  t.workedExample(
    constructed,
    {
      ...normal,
      age: { value: 14, unit: "years" },
      sbp_min: { value: 88, unit: "mmHg" },
      temp_min: { value: 36.9, unit: "°C" },
      temp_max: { value: 37.2, unit: "°C" },
      mental_status_gcs: { value: 13, unit: "" }, // assessed but >=8 -> 0
      hr_max: { value: 130, unit: "bpm" },
      ph_min: { value: 7.05, unit: "" }, // 7.0-7.28 -> 2
      ph_max: { value: 7.3, unit: "" },
      tco2_min: { value: 6, unit: "mmol/L" }, // 5-16.9 -> same tier, same row
      tco2_max: { value: 10, unit: "mmol/L" },
      pco2_max: { value: 25, unit: "mmHg" },
      pao2_min: { value: 100, unit: "mmHg" },
      glucose_max: { value: 620, unit: "mg/dL" }, // >200 -> 2
      potassium_max: { value: 6.0, unit: "mEq/L" }, // cutoff is >6.9 -> 0
      creatinine_max: { value: 1.5, unit: "mg/dL" }, // adolescent >1.30 -> 2
      bun_max: { value: 32, unit: "mg/dL" }, // >14.9 -> 3
      wbc_min: { value: 16_000, unit: "cells/mm³" }, // only leukopenia scores -> 0
      platelets_min: { value: 150_000, unit: "cells/mm³" }, // low-normal still -> 2
      pt_max: { value: 13, unit: "s" },
      ptt_max: { value: 32, unit: "s" },
    } as unknown as InputValues<PrismInputs>,
    [
      // 2 + 2 + 2 + 3 + 2 = 11, NOT 13 (which is what double-counting acidosis gives)
      { id: "prism_total", value: 11 },
      { id: "neurologic_subscore", value: 0 },
      { id: "non_neurologic_subscore", value: 11 },
    ],
  );

  /**
   * 4-year-old in septic shock. The first case with a neurologic contribution,
   * so it pins the subscore split that PRISM IV depends on: GCS 6 scores 5 into
   * the neurologic subscore while reactive pupils add nothing, and every other
   * point lands on the non-neurologic side.
   *
   * Also pins the PT/PTT row: PT 24 exceeds 22.0 while PTT 45 does not exceed
   * 57.0, so the row is satisfied by one analyte and still awards 3 once.
   */
  t.workedExample(
    constructed,
    {
      ...normal,
      age: { value: 4, unit: "years" },
      sbp_min: { value: 58, unit: "mmHg" }, // child 55-75 -> 3
      temp_min: { value: 32.5, unit: "°C" }, // <33 -> 3
      temp_max: { value: 38.0, unit: "°C" },
      mental_status_gcs: { value: 6, unit: "" }, // <8 -> 5, NEUROLOGIC
      hr_max: { value: 195, unit: "bpm" }, // child 185-205 -> 3
      ph_min: { value: 7.15, unit: "" }, // -> 2
      ph_max: { value: 7.4, unit: "" },
      tco2_min: { value: 12, unit: "mmol/L" },
      tco2_max: { value: 18, unit: "mmol/L" },
      pco2_max: { value: 55, unit: "mmHg" }, // 50.0-75.0 -> 1
      pao2_min: { value: 60, unit: "mmHg" },
      glucose_max: { value: 260, unit: "mg/dL" }, // -> 2
      potassium_max: { value: 5.2, unit: "mEq/L" },
      creatinine_max: { value: 1.2, unit: "mg/dL" }, // child >0.90 -> 2
      bun_max: { value: 30, unit: "mg/dL" }, // -> 3
      wbc_min: { value: 2200, unit: "cells/mm³" }, // <3000 -> 4
      platelets_min: { value: 65_000, unit: "cells/mm³" }, // 50k-99,999 -> 4
      pt_max: { value: 24, unit: "s" }, // >22.0 -> 3
      ptt_max: { value: 45, unit: "s" }, // <=57.0, same row, no second award
    } as unknown as InputValues<PrismInputs>,
    [
      { id: "prism_total", value: 35 },
      { id: "neurologic_subscore", value: 5 },
      { id: "non_neurologic_subscore", value: 30 },
    ],
  );

  /**
   * 10-day-old with severe perinatal asphyxia, scored under PRISM IV.
   *
   * The case that exercises the PRISM IV equation properly: a neurologic
   * subscore at its maximum of 16, three of the five non-physiologic terms
   * active, and the 14-day age boundary — this patient is on the young side of
   * a split that PRISM III does not have at all.
   *
   * It is also the only worked example that asserts a probability, because the
   * 4-hour window is the only one that produces one. R = -5.776 + 1.311 (under
   * 14 days) + 1.012 (another hospital) + 1.082 (CPR) + 0.197x16 + 0.163x51 =
   * 9.094, so P = 1 / (1 + e^-9.094) = 99.9888%. Saturated, and deliberately
   * paired with the mid-range anchors in the probe block below, which are where
   * a wrong coefficient would actually show.
   *
   * Note that cancer and low-risk system are answered NO rather than left
   * blank. They contribute nothing either way, so the arithmetic is unchanged
   * — but a blank is not an answer, and on this window a blank withholds the
   * probability outright. See the guard test below.
   */
  t.workedExample(
    prismIv,
    {
      ...normal,
      collection_window: { value: "first_4h" },
      age: { value: 10, unit: "days" },
      sbp_min: { value: 35, unit: "mmHg" }, // neonate <40 -> 7
      temp_min: { value: 36.0, unit: "°C" },
      temp_max: { value: 40.5, unit: "°C" }, // >40.0 -> 3
      mental_status_gcs: { value: 5, unit: "" }, // -> 5
      pupils: { value: "both_fixed" }, // -> 11, the heaviest single item
      hr_max: { value: 230, unit: "bpm" }, // neonate >225 -> 4
      ph_min: { value: 6.95, unit: "" }, // <7.0 -> 6
      ph_max: { value: 7.3, unit: "" },
      tco2_min: { value: 4, unit: "mmol/L" }, // <5, same row same tier
      tco2_max: { value: 20, unit: "mmol/L" },
      pco2_max: { value: 80, unit: "mmHg" }, // -> 3
      pao2_min: { value: 38, unit: "mmHg" }, // <42.0 -> 6
      glucose_max: { value: 250, unit: "mg/dL" }, // -> 2
      potassium_max: { value: 7.5, unit: "mEq/L" }, // >6.9 -> 3
      creatinine_max: { value: 1.0, unit: "mg/dL" }, // neonate >0.85 -> 2
      bun_max: { value: 20, unit: "mg/dL" }, // neonate >11.9 -> 3
      wbc_min: { value: 2500, unit: "cells/mm³" }, // -> 4
      platelets_min: { value: 40_000, unit: "cells/mm³" }, // <50k -> 5
      pt_max: { value: 30, unit: "s" }, // >22.0
      ptt_max: { value: 95, unit: "s" }, // >85.0 neonate — same row, still 3
      admission_source: { value: "another_hospital" },
      cpr_24h: { value: true },
      cancer: { value: false },
      low_risk_system: { value: false },
    } as unknown as InputValues<PrismInputs>,
    [
      { id: "prism_total", value: 67 },
      { id: "neurologic_subscore", value: 16 },
      { id: "non_neurologic_subscore", value: 51 },
      { id: "mortality_probability", value: 99.9888, tolerance: 0.001 },
    ],
  );

  // Required inputs must reject implausible values (PRD §6.3.3).
  t.rejectsImplausible(
    "a negative age",
    { ...normal, age: { value: -1, unit: "years" } } as unknown as InputValues<PrismInputs>,
    { inputId: "age", code: "out-of-range" },
  );
  t.rejectsImplausible(
    "an unknown pupillary state",
    { ...normal, pupils: { value: "dilated" } } as unknown as InputValues<PrismInputs>,
    { inputId: "pupils", code: "invalid-category" },
  );
  t.rejectsImplausible(
    "an unknown collection window",
    {
      ...normal,
      collection_window: { value: "first_6h" },
    } as unknown as InputValues<PrismInputs>,
    { inputId: "collection_window", code: "invalid-category" },
  );

  t.boundaryTest("age", "max", normal);
});

/**
 * Branch coverage for every scoring row, and for the one surviving equation.
 *
 * Separate from the worked examples above on purpose. Those are clinical cases
 * and each one must be citable; these are threshold probes, and dressing a
 * probe up as a patient would misrepresent what it is. They are what proves no
 * row of the table is unreachable.
 */
describe("PRISM threshold rows", () => {
  const base = normal as unknown as Record<string, unknown>;
  const at = (patch: Record<string, unknown>) => {
    const outcome = prism.compute({ ...base, ...patch } as never);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.errors));
    const values = outcome.result.values;
    const get = (id: string) => values.find((v) => v.id === id)!.value;
    return {
      ids: values.map((v) => v.id),
      total: get("prism_total"),
      neuro: get("neurologic_subscore"),
      nonNeuro: get("non_neurologic_subscore"),
      // `undefined` on the PRISM III windows, which is the whole point — the
      // probability is absent there, not zero. Read it with `ivPct` when a test
      // means to assert a number.
      pct: values.find((v) => v.id === "mortality_probability")?.value,
    };
  };
  const yrs = (v: number) => ({ value: v, unit: "years" });
  const mo = (v: number) => ({ value: v, unit: "months" });

  /**
   * PRISM IV's four admission-context answers, every one at the model's
   * reference level.
   *
   * Supplied EXPLICITLY on every 4-hour vector below rather than left blank,
   * because a blank now withholds the probability entirely — see
   * "withholds the PRISM IV probability when any admission-context answer is
   * blank". The two are different statements about a patient: "admitted from
   * the operating room, no CPR, no cancer, no low-risk system" is an answer
   * worth 0 to the equation; a blank is no answer at all. Every anchor in this
   * block means the first, so it says the first.
   */
  const ivReference = {
    admission_source: { value: "or_pacu" },
    cpr_24h: { value: false },
    cancer: { value: false },
    low_risk_system: { value: false },
  };

  /** The PRISM IV probability, on the only window that has one. */
  const ivPct = (patch: Record<string, unknown>): number => {
    const r = at({ ...ivReference, ...patch, collection_window: { value: "first_4h" } });
    expect(r.pct, "the 4-hour window must emit a probability").toBeDefined();
    return r.pct as number;
  };

  /**
   * Every scoring row at its worst tier at once — the 74-point ceiling, which
   * decomposes as neurologic 16 + non-neurologic 58. Hoisted to describe scope
   * because three tests need it: the cap case below, the composition sweep at
   * the end, whose maxima-are-attainable assertion has no teeth without a
   * vector that actually attains them, and the no-probability guard, which
   * would be a weak guard if it only ever tried a healthy patient.
   */
  const worstCase = {
    age: mo(0.5),
    sbp_min: { value: 20, unit: "mmHg" },
    temp_min: { value: 30, unit: "°C" },
    temp_max: { value: 42, unit: "°C" },
    mental_status_gcs: { value: 3, unit: "" },
    pupils: { value: "both_fixed" },
    hr_max: { value: 300, unit: "bpm" },
    ph_min: { value: 6.8, unit: "" },
    ph_max: { value: 7.7, unit: "" },
    tco2_min: { value: 2, unit: "mmol/L" },
    tco2_max: { value: 40, unit: "mmol/L" },
    pco2_max: { value: 90, unit: "mmHg" },
    pao2_min: { value: 30, unit: "mmHg" },
    glucose_max: { value: 900, unit: "mg/dL" },
    potassium_max: { value: 9, unit: "mEq/L" },
    creatinine_max: { value: 5, unit: "mg/dL" },
    bun_max: { value: 90, unit: "mg/dL" },
    wbc_min: { value: 500, unit: "cells/mm³" },
    platelets_min: { value: 10_000, unit: "cells/mm³" },
    pt_max: { value: 60, unit: "s" },
    ptt_max: { value: 150, unit: "s" },
  };

  it("scores systolic pressure in every band", () => {
    expect(at({ age: mo(0.5), sbp_min: { value: 39, unit: "mmHg" } }).total).toBe(7);
    expect(at({ age: mo(0.5), sbp_min: { value: 50, unit: "mmHg" } }).total).toBe(3);
    expect(at({ age: mo(6), sbp_min: { value: 44, unit: "mmHg" } }).total).toBe(7);
    expect(at({ age: mo(6), sbp_min: { value: 60, unit: "mmHg" } }).total).toBe(3);
    expect(at({ age: yrs(14), sbp_min: { value: 64, unit: "mmHg" } }).total).toBe(7);
    expect(at({ age: yrs(14), sbp_min: { value: 70, unit: "mmHg" } }).total).toBe(3);
  });

  /**
   * THE AGE BOUNDARIES, PINNED — because an external review tried to move them.
   *
   * A 2026-08-01 verification report called these bands the site's one
   * launch-blocking defect: it claimed an 18-month-old with SBP 50 should score
   * 3, not 7, on the strength of the age ranges printed in the prose on the
   * CPCCRN calculator page.
   *
   * The patent settles it. US 5,809,477 states "Child = 12 months to <144
   * months" and gives the child systolic row as "55-75 [3] / <55 [7]", so 50
   * mmHg at 18 months is 7. The report's own quoted ranges also fail to tile
   * the age axis — "Child (2-12 years)" beside "Adolescent (13 years and up)"
   * leaves 12y0m-12y11m unassigned, which no scoring function can do — so it
   * was reading page copy, not behaviour.
   *
   * Acting on that report would have UNDER-SCORED hypotension in toddlers. The
   * bands were correct and untested at their edges; they are now tested, so the
   * next person who is told to "fix" them gets a failure instead of a silent
   * clinical regression.
   */
  it("holds the PRISM III age boundaries exactly where the patent puts them", () => {
    const sbp50 = { sbp_min: { value: 50, unit: "mmHg" } };
    // 12 months is the infant/child edge. Infant is 45-65 -> 3; child is
    // <55 -> 7. One month either side of the boundary must differ.
    expect(at({ age: mo(11.9), ...sbp50 }).total).toBe(3);
    expect(at({ age: mo(12), ...sbp50 }).total).toBe(7);
    // The disputed case itself.
    expect(at({ age: mo(18), ...sbp50 }).total).toBe(7);

    // 144 months (12 years) is the child/adolescent edge. SBP 50 does NOT
    // discriminate it — it is below both the child and the adolescent floor,
    // scoring 7 either side, which is why the first draft of this test passed
    // the wrong assertion. 60 mmHg does: child 55-75 is in-band (3), while the
    // adolescent floor is 65, so the same pressure becomes below-band (7).
    const sbp60 = { sbp_min: { value: 60, unit: "mmHg" } };
    expect(at({ age: mo(143.9), ...sbp60 }).total).toBe(3);
    expect(at({ age: mo(144), ...sbp60 }).total).toBe(7);
    // 12y0m must land in a band at all — precisely the gap the report's quoted
    // ranges left open between "Child (2-12 years)" and "Adolescent (13+)".
    expect(at({ age: yrs(12), ...sbp60 }).total).toBe(7);
  });

  it("scores heart rate in every band", () => {
    expect(at({ age: mo(6), hr_max: { value: 226, unit: "bpm" } }).total).toBe(4);
    expect(at({ age: mo(6), hr_max: { value: 215, unit: "bpm" } }).total).toBe(3);
    expect(at({ age: yrs(14), hr_max: { value: 156, unit: "bpm" } }).total).toBe(4);
    expect(at({ age: yrs(14), hr_max: { value: 150, unit: "bpm" } }).total).toBe(3);
  });

  it("scores creatinine against the infant cutoff, which it shares with child", () => {
    expect(at({ age: mo(6), creatinine_max: { value: 0.95, unit: "mg/dL" } }).total).toBe(2);
    expect(at({ age: mo(6), creatinine_max: { value: 0.9, unit: "mg/dL" } }).total).toBe(0);
  });

  it("awards the acidosis row from total CO2 alone when pH is normal", () => {
    // The row is shared, so it must fire from either analyte independently.
    expect(at({ tco2_min: { value: 10, unit: "mmol/L" } }).total).toBe(2);
    expect(at({ tco2_min: { value: 4, unit: "mmol/L" } }).total).toBe(6);
  });

  it("scores alkalosis from the highest pH, independently of acidosis", () => {
    expect(at({ ph_max: { value: 7.5, unit: "" } }).total).toBe(2);
    expect(at({ ph_max: { value: 7.6, unit: "" } }).total).toBe(3);
    // Both ends of the same window, which the source explicitly permits.
    expect(at({ ph_min: { value: 6.9, unit: "" }, ph_max: { value: 7.6, unit: "" } }).total).toBe(
      9,
    );
  });

  it("scores a high total CO2 separately from a low one", () => {
    expect(at({ tco2_max: { value: 35, unit: "mmol/L" } }).total).toBe(4);
    expect(
      at({ tco2_min: { value: 4, unit: "mmol/L" }, tco2_max: { value: 35, unit: "mmol/L" } }).total,
    ).toBe(10);
  });

  it("scores the middle PaO2 tier", () => {
    expect(at({ pao2_min: { value: 45, unit: "mmHg" } }).total).toBe(3);
  });

  it("scores one fixed pupil into the neurologic subscore", () => {
    const r = at({ pupils: { value: "one_fixed" } });
    expect(r.total).toBe(7);
    expect(r.neuro).toBe(7);
  });

  it("awards the clotting row from PTT alone at the non-neonate cutoff", () => {
    expect(at({ ptt_max: { value: 58, unit: "s" } }).total).toBe(3);
    expect(at({ ptt_max: { value: 57, unit: "s" } }).total).toBe(0);
    // A neonate tolerates more before the same row fires.
    expect(at({ age: mo(0.5), ptt_max: { value: 58, unit: "s" } }).total).toBe(0);
    expect(at({ age: mo(0.5), ptt_max: { value: 86, unit: "s" } }).total).toBe(3);
  });

  it("scores the neonate BUN cutoff lower than everyone else's", () => {
    expect(at({ age: mo(0.5), bun_max: { value: 12, unit: "mg/dL" } }).total).toBe(3);
    expect(at({ bun_max: { value: 12, unit: "mg/dL" } }).total).toBe(0);
  });

  it("scores every platelet tier and the untouched top", () => {
    expect(at({ platelets_min: { value: 300_000, unit: "cells/mm³" } }).total).toBe(0);
  });

  /**
   * Vectors the two window guards below sweep.
   *
   * Deliberately spans the range rather than probing one patient: an untouched
   * normal child, single-row derangements on each side of the subscore split,
   * every admission-context input set (they are PRISM IV's, and supplying them
   * must not conjure a PRISM III probability either), and the 74-point ceiling.
   * If any path could still produce a probability on a PRISM III window, one of
   * these finds it.
   */
  const windowVectors: Record<string, unknown>[] = [
    {},
    { sbp_min: { value: 30, unit: "mmHg" } },
    { pupils: { value: "both_fixed" } },
    { mental_status_gcs: { value: 3, unit: "" } },
    {
      admission_source: { value: "inpatient" },
      cpr_24h: { value: true },
      cancer: { value: true },
      low_risk_system: { value: true },
    },
    worstCase,
  ];

  /**
   * THE GUARD. Removed on 2026-08-03, and this is what keeps it removed.
   *
   * The PRISM III mortality equations are not published in the source article —
   * Pollack 1996 prints the score sheet in full and no regression coefficients,
   * in any table, with no supplement — and are separately licensed. So the 12-
   * and 24-hour windows must emit the score and its two subscores and NOTHING
   * else. Asserting the exact id list rather than "does not contain
   * mortality_probability" also catches a probability smuggled back under a new
   * id, which the narrower assertion would not.
   *
   * The absence is what the rail renders as nothing at all. A zero here would
   * be a clinical claim, and a false one.
   */
  it("emits no probability for the 12- or 24-hour window, from any vector", () => {
    for (const window of ["first_12h", "first_24h"]) {
      for (const patch of windowVectors) {
        const r = at({ ...patch, collection_window: { value: window } });
        expect(r.ids, `${window} must emit the score and nothing else`).toEqual([
          "prism_total",
          "neurologic_subscore",
          "non_neurologic_subscore",
        ]);
        expect(r.pct, `${window} must not carry a probability`).toBeUndefined();
      }
    }

    // Not vacuous: the SAME vectors do produce one on the 4-hour window, whose
    // coefficients are published in full. Without this the assertion above
    // would pass just as happily against a score that computed nothing. The
    // reference answers are spread in first so the vectors are fully specified
    // — the one vector that sets its own admission-context values overrides
    // them, which is the point of the ordering.
    for (const patch of windowVectors) {
      const r = at({ ...ivReference, ...patch, collection_window: { value: "first_4h" } });
      expect(r.ids, "the 4-hour window must still emit its probability").toContain(
        "mortality_probability",
      );
      expect(r.pct).toBeGreaterThan(0);
    }
  });

  /**
   * THE OTHER HONEST ABSENCE — and the defect this change set exists to remove.
   *
   * PRISM IV's four admission-context covariates are each worth ZERO at their
   * reference level: admitted from the operating room or post-anaesthesia
   * care, no CPR, no cancer, no low-risk system of primary dysfunction. So an
   * implementation that reads a blank as "contributes nothing" does not
   * compute a probability without that term — it computes the REFERENCE
   * PATIENT, and returns the OR/PACU curve to every clinician who left a
   * question unanswered. That is the same defect as the quadratic that
   * returned one curve for every patient, wearing a different hat, and it is
   * why flipping these inputs to `required: true` was not the fix either:
   * they are meaningless on the 12- and 24-hour windows, so an unconditional
   * requirement would reject a legitimate score-only entry.
   *
   * Each covariate is therefore omitted INDIVIDUALLY here — the other three
   * answered, so nothing but that one blank can explain the outcome — and the
   * probability must be withheld rather than defaulted. The patient carries
   * points on both sides of the subscore split so a withheld probability can
   * never be confused with a floor value, and the exact id list is asserted so
   * that a probability smuggled back under another name fails too.
   */
  it("withholds the PRISM IV probability when any admission-context answer is blank", () => {
    // 3-year-old, pupils both fixed (11 neurologic) and SBP 30 (child <55, 7
    // non-neurologic): total 18, and neither half is zero.
    const patient = {
      ...ivReference,
      pupils: { value: "both_fixed" },
      sbp_min: { value: 30, unit: "mmHg" },
      collection_window: { value: "first_4h" },
    };
    const covariates = ["admission_source", "cpr_24h", "cancer", "low_risk_system"] as const;

    for (const blank of covariates) {
      const vector: Record<string, unknown> = { ...patient };
      delete vector[blank];
      const r = at(vector);

      expect(r.ids, `a blank ${blank} must withhold the probability, not default it`).toEqual([
        "prism_total",
        "neurologic_subscore",
        "non_neurologic_subscore",
      ]);
      expect(r.pct, `a blank ${blank} must not produce a probability`).toBeUndefined();
      // The score still renders. Withholding the estimate is an absence, not
      // an error state and not a refusal to compute.
      expect([r.total, r.neuro, r.nonNeuro], `a blank ${blank} must not touch the score`).toEqual([
        18, 11, 7,
      ]);
    }

    /**
     * NOT VACUOUS. The same patient with all four answered does get a
     * probability, and it is a real number rather than a floor:
     * R = -5.776 + 0.197x11 + 0.163x7 = -2.468, P = 7.8132%.
     *
     * Without this leg the loop above would pass just as happily against an
     * implementation that had stopped emitting a probability at all.
     */
    const complete = at(patient);
    expect(complete.ids, "a fully answered 4-hour entry must emit its probability").toContain(
      "mortality_probability",
    );
    expect(complete.pct).toBeCloseTo(7.8132, 3);
  });

  /**
   * The other half of the claim the changelog makes: the SCORE never changed.
   *
   * Withdrawing the probability must not have moved a threshold, a band or a
   * subscore — and the window must not reach the score at all. Same inputs,
   * three windows, identical totals and identical halves.
   */
  it("computes an identical score in all three windows", () => {
    for (const patch of windowVectors) {
      const four = at({ ...patch, collection_window: { value: "first_4h" } });
      for (const window of ["first_12h", "first_24h"]) {
        const three = at({ ...patch, collection_window: { value: window } });
        expect(
          [three.total, three.neuro, three.nonNeuro],
          `${window} must score identically to the 4-hour window`,
        ).toEqual([four.total, four.neuro, four.nonNeuro]);
      }
    }
  });

  /**
   * PRISM IV's equation, pinned to four exact values rather than to directions.
   *
   * Each is `P = 1 / (1 + e^-R)` over Table 3's coefficients, with the patient
   * at every reference level (age >=12 months, admitted from OR/PACU, no CPR,
   * no cancer, no low-risk system) so that only the two subscore weights move:
   *
   *   score 0                   R = -5.776                     ->  0.3092%
   *   neuro 0  / non-neuro 10   R = -5.776 + 0.163x10 = -4.146 ->  1.5581%
   *   neuro 11 / non-neuro 0    R = -5.776 + 0.197x11 = -3.609 ->  2.6365%
   *   neuro 5  / non-neuro 10   R = -3.161                     ->  4.0660%
   *
   * The floor case is the one worth reading twice: a completely normal child
   * still carries a non-zero probability, because that is what a logistic
   * intercept does. It must never be displayed as 0%.
   */
  it("reproduces the PRISM IV equation at four exact points", () => {
    // Non-neurologic 10, built from three rows in a 3-year-old: pH 7.15 (2),
    // total CO2 35 (4), WBC 2,200 (4). Neurologic stays 0.
    const nonNeuro10 = {
      ph_min: { value: 7.15, unit: "" },
      tco2_max: { value: 35, unit: "mmol/L" },
      wbc_min: { value: 2200, unit: "cells/mm³" },
    };

    expect(at({ ...nonNeuro10, collection_window: { value: "first_4h" } }).nonNeuro).toBe(10);

    expect(ivPct({})).toBeCloseTo(0.3092, 3);
    expect(ivPct(nonNeuro10)).toBeCloseTo(1.5581, 3);
    expect(ivPct({ pupils: { value: "both_fixed" } })).toBeCloseTo(2.6365, 3);
    expect(ivPct({ ...nonNeuro10, mental_status_gcs: { value: 3, unit: "" } })).toBeCloseTo(
      4.066,
      3,
    );
  });

  /**
   * The subscore split cannot be collapsed back into the total.
   *
   * PRISM IV weights the neurologic half at 0.197 and the non-neurologic at
   * 0.163, so two patients with the SAME total score get different
   * probabilities depending on where the points sit. Both cases below total 12.
   *
   *   neuro 7 / non-neuro 5   R = -5.776 + 1.379 + 0.815 = -3.582 -> 2.7067%
   *   neuro 5 / non-neuro 7   R = -5.776 + 0.985 + 1.141 = -3.650 -> 2.5333%
   *
   * An implementation that summed to a total first would return one number for
   * both, and this is the test that would catch it.
   */
  it("weights the neurologic half more heavily at an identical total", () => {
    // pupils one fixed (7 neuro); pH 7.15 (2) + PCO2 55 (1) + platelets 180k (2).
    const neuroHeavy = {
      pupils: { value: "one_fixed" },
      ph_min: { value: 7.15, unit: "" },
      pco2_max: { value: 55, unit: "mmHg" },
      platelets_min: { value: 180_000, unit: "cells/mm³" },
    };
    // GCS 3 (5 neuro); pH 7.15 (2) + PCO2 80 (3) + platelets 180k (2).
    const bodyHeavy = {
      mental_status_gcs: { value: 3, unit: "" },
      ph_min: { value: 7.15, unit: "" },
      pco2_max: { value: 80, unit: "mmHg" },
      platelets_min: { value: 180_000, unit: "cells/mm³" },
    };

    const a = at({ ...neuroHeavy, collection_window: { value: "first_4h" } });
    const b = at({ ...bodyHeavy, collection_window: { value: "first_4h" } });
    expect([a.total, a.neuro, a.nonNeuro]).toEqual([12, 7, 5]);
    expect([b.total, b.neuro, b.nonNeuro]).toEqual([12, 5, 7]);

    expect(ivPct(neuroHeavy)).toBeCloseTo(2.7067, 3);
    expect(ivPct(bodyHeavy)).toBeCloseTo(2.5333, 3);
    expect(ivPct(neuroHeavy)).toBeGreaterThan(ivPct(bodyHeavy));
  });

  it("applies every PRISM IV term", () => {
    const floor = ivPct({ age: yrs(3) });
    // Each covariate must move the probability in its published direction.
    expect(ivPct({ age: mo(0.7) })).toBeGreaterThan(floor); // 14 d - 1 mo
    expect(ivPct({ age: mo(6) })).toBeGreaterThan(floor); // 1 - 12 mo
    expect(ivPct({ age: yrs(3), admission_source: { value: "inpatient" } })).toBeGreaterThan(floor);
    expect(ivPct({ age: yrs(3), admission_source: { value: "ed" } })).toBeGreaterThan(floor);
    expect(ivPct({ age: yrs(3), admission_source: { value: "or_pacu" } })).toBeCloseTo(floor, 6);
    expect(ivPct({ age: yrs(3), cancer: { value: true } })).toBeGreaterThan(floor);
    // The only protective term in the model.
    expect(ivPct({ age: yrs(3), low_risk_system: { value: true } })).toBeLessThan(floor);
  });

  /**
   * No bands, and "not-applicable" rather than "pending".
   *
   * "pending" says a published stratification exists and has not been
   * transcribed yet. PRISM IV has none to transcribe: it outputs a continuous
   * probability, and its calibration tables bin by predicted probability
   * rather than by score, so there is no score-to-band curve there either.
   * PRISM III score-only has no published severity band at all. A future edit
   * that adds bands, or that puts "pending" back, should have to delete this
   * test on purpose.
   */
  it("declares no interpretation bands, and declares that as not-applicable", () => {
    expect(prism.interpretation).toEqual([]);
    expect(prism.interpretationStatus).toBe("not-applicable");
  });

  it("treats every optional physiologic input as absent without throwing", () => {
    const r = prism.compute({
      collection_window: { value: "first_12h" },
      age: yrs(3),
      pupils: { value: "both_reactive" },
    } as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.values.find((v) => v.id === "prism_total")!.value).toBe(0);
  });

  it("caps at 74, decomposing as 16 neurologic and 58 non-neurologic", () => {
    const worst = at(worstCase);
    expect(worst.total).toBe(74);
    expect(worst.neuro).toBe(16);
    expect(worst.nonNeuro).toBe(58);

    /**
     * Tie the DECLARED composition maxima to the ceiling this case reaches.
     *
     * registry-gate proves both ids are emitted and the sum test below proves
     * the halves add up, but neither notices a `max` declared too low — and a
     * too-low max draws a bar past the end of its own track. Asserting the
     * declaration against a case that EXACTLY attains it is what makes both
     * numbers load-bearing: narrow either one and this fails.
     */
    const declaredMax = (id: string) => prism.composition!.components.find((c) => c.id === id)!.max;
    expect(declaredMax("neurologic_subscore"), "declared neurologic max").toBe(worst.neuro);
    expect(declaredMax("non_neurologic_subscore"), "declared non-neurologic max").toBe(
      worst.nonNeuro,
    );
  });

  /**
   * The declared composition, checked against the numbers rather than the ids.
   *
   * registry-gate proves both subscore ids are emitted; the case above proves
   * the pair reaches 16 and 58 at the ceiling. Neither proves the two halves
   * add to the total AWAY from the ceiling — which is the property the result
   * panel relies on when it draws one bar as two segments, and the property
   * PRISM IV relies on when it weights the halves at 0.197 and 0.163 rather
   * than scoring the total at all.
   *
   * The `<= max` assertion here is only half a test: it catches a max declared
   * too LOW, never one declared too HIGH, because nothing ever attains the
   * inflated ceiling and the comparison passes forever while the rendered bar
   * stays silently short. The ceiling vector closes that side — both halves max
   * out on the same patient (16 + 58 = 74), so each declared max is pinned from
   * below as well as above.
   */
  it("the two subscores sum to the total and pin their maxima, at several severities", () => {
    const cases = [
      normal,
      { ...normal, sbp_min: { value: 30, unit: "mmHg" } },
      { ...normal, pupils: { value: "both_fixed" } },
      { ...normal, mental_status_gcs: { value: 3, unit: "" }, pupils: { value: "both_fixed" } },
      // The ceiling: every row at its worst tier, 16 neurologic + 58 non-neurologic.
      { ...normal, ...worstCase },
    ];

    const composition = prism.composition;
    expect(composition, "prism must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((comp) => [comp.id, Number.NEGATIVE_INFINITY]),
    );

    for (const c of cases) {
      const outcome = prism.compute(c as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
      const sum = composition.components.reduce((n, comp) => n + get(comp.id), 0);
      expect(sum, `components must sum to the total`).toBe(get(composition.total));
      for (const comp of composition.components) {
        const value = get(comp.id);
        expect(value, `${comp.id} above declared max ${comp.max}`).toBeLessThanOrEqual(comp.max);
        expect(value, `${comp.id} below declared min`).toBeGreaterThanOrEqual(comp.min ?? 0);
        observedMax.set(comp.id, Math.max(observedMax.get(comp.id)!, value));
      }
    }

    // Each declared max must be REACHED, not merely respected — otherwise a max
    // set too high sails through the ≤ assertion above and mis-scales the bar.
    for (const comp of composition.components) {
      expect(
        observedMax.get(comp.id),
        `${comp.id}: declared max ${comp.max} is never attained`,
      ).toBe(comp.max);
    }

    // And the declared maxima must still add up to the published ceiling.
    expect(
      composition.components.reduce((n, comp) => n + comp.max, 0),
      "declared maxima must sum to the PRISM III maximum of 74",
    ).toBe(74);
  });
});

/**
 * Round-3 (2026-08-04). The regional calibration evidence is prose, so nothing
 * else in this file would notice it being deleted or, worse, quietly promoted:
 * the Dubai study is PIM3's, and the two Gulf series evaluated PRISM III rather
 * than the PRISM IV model that produces this page's probability. Both of those
 * attributions are load-bearing and both are pinned here.
 */
describe("prism states its regional calibration at the right strength", () => {
  const notes = prism.notes.en;

  it("carries both Gulf findings, including the half that contradicts the other", () => {
    // An SMR of 0.53 alone reads as "conservative, therefore safe". The 2.1 in
    // the sepsis subgroup is the number that makes it false, so neither may
    // survive without the other.
    expect(notes).toContain("3396");
    expect(notes).toContain("0.87");
    expect(notes).toMatch(/infants under 12 months/);
    expect(notes).toContain("0.53");
    expect(notes).toContain("2.1");
    expect(notes).toMatch(/sepsis/);
  });

  /**
   * Round-3 verification (2026-08-04). v2.2.0 read the Dubai study's SMR 2.67 in
   * the 1-5% predicted-probability band as evidence that the low end of the
   * scale is where the model is most wrong. The SAME paper reports SMR 0.33
   * below a 14.3% predicted probability against 0.72 above it — over-prediction
   * across that same low range. Carrying one cut and not the other manufactured
   * a finding out of a subgroup instability, so both are pinned: dropping
   * either one is the defect returning.
   */
  it("carries both of the Dubai study's contradictory probability strata", () => {
    expect(notes, "the fine-grained cut").toContain("2.67");
    expect(notes, "the fine-grained cut").toContain("1-5%");
    expect(notes, "the coarse cut that reverses it").toContain("14.3%");
    expect(notes, "the coarse cut that reverses it").toContain("0.33");
    expect(notes, "the coarse cut that reverses it").toContain("0.72");
  });

  it("draws the conclusion instead of leaving the reader to assemble it", () => {
    expect(notes).toMatch(/discrimination travels between populations/);
    expect(notes).toMatch(/calibration frequently does not/);
    // The conclusion may name sepsis, which the paper does not contradict. It
    // may NOT name the low-probability band, which the paper does.
    expect(notes, "the finding that survives is the sepsis one").toMatch(
      /survives its own paper is the one in sepsis/,
    );
    expect(notes, "no direction may be asserted for the low end").toMatch(
      /NEITHER SERIES SUPPORTS IS A CLAIM ABOUT THE LOW END/,
    );
  });

  it("labels the Dubai figures as a PIM3 finding, not a PRISM one", () => {
    expect(notes).toMatch(/is a PIM3 finding and not a PRISM one/);
    const dubai = prism.references.find((r) => r.citation.includes("Dubai Med J"));
    expect(dubai, "a figure stated in notes must resolve to a reference").toBeDefined();
    expect(dubai?.note).toMatch(/A PIM3 evaluation, not a PRISM one/);
  });

  it("claims no regional evaluation of PRISM IV, which is what it shows", () => {
    // Both series evaluated PRISM III. The probability on this page is PRISM
    // IV's, and reading regional validation into it would be the error.
    expect(notes).toMatch(/They evaluated PRISM III, not PRISM IV/);
    expect(notes).toMatch(/uncalibrated population estimate/);
    const riyadh = prism.references.find((r) => r.citation.includes("Front Pediatr. 2022"));
    expect(riyadh?.note).toMatch(/It evaluated PRISM III, not PRISM IV/);
  });

  it("declares the version its newest changelog entry describes", () => {
    const newest = prism.changelog[prism.changelog.length - 1];
    expect(prism.version).toBe(newest?.version);
    expect(prism.version).toBe("2.2.2");
  });

  /**
   * Finding F5 (external calculator audit, 2026-08-08).
   *
   * Creatinine is compared in mg/dL because that is the unit the source table
   * prints, and a value arriving in µmol/L is rounded to 2 decimal places by
   * `canonicalDecimals` on the way in. The two facts combine into a knife-edge
   * nobody had written down: 115 µmol/L becomes exactly 1.30 mg/dL, which does
   * not clear the strict `> 1.3` adolescent cutoff, while 1.301 mg/dL entered
   * directly does.
   *
   * v2.2.2 documented that in the help text. These tests pin the BEHAVIOUR, so
   * a future change to the conversion factor or to `canonicalDecimals` cannot
   * move the boundary while the help text goes on describing the old one.
   */
  const creatinineScore = (value: number, unit: string): number => {
    // `normal` scores 0 on every item, so the total IS the creatinine points.
    // Age is raised to the adolescent band to reproduce the audit's own example
    // (cutoff 1.3 mg/dL, quoted as 115 µmol/L).
    const outcome = prism.compute({
      ...normal,
      age: { value: 15, unit: "years" },
      creatinine_max: { value, unit },
    });
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return Number.NaN;
    return outcome.result.values.find((v) => v.id === "prism_total")?.value ?? Number.NaN;
  };

  it("scores zero on the baseline case, so the total isolates creatinine", () => {
    expect(creatinineScore(0.5, "mg/dL")).toBe(0);
  });

  it("does not score a creatinine sitting exactly on the cutoff in either unit", () => {
    // 115 µmol/L -> 1.3009... -> rounded to 1.30, which is not > 1.3.
    expect(creatinineScore(115, "µmol/L")).toBe(0);
    expect(creatinineScore(1.3, "mg/dL")).toBe(0);
  });

  it("scores 2 just above the cutoff, and the mg/dL path is the finer of the two", () => {
    // The documented asymmetry: mg/dL is not rounded, so it resolves at 0.001;
    // the µmol path has to clear half a rounding step to register at all.
    expect(creatinineScore(1.301, "mg/dL")).toBe(2);
    expect(creatinineScore(116, "µmol/L")).toBe(2);
  });
});
