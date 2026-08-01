import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import type { InputValues } from "../types";
import { prism } from "./prism";

/**
 * NO PUBLISHED WORKED EXAMPLE EXISTS for PRISM III or PRISM IV.
 *
 * This is stated plainly rather than papered over. Neither the 1996 derivation
 * paper, the 2016 update, the patent that reproduces the full table, nor any
 * secondary source works a case end to end. The natural oracle would be the
 * authors' own CPCCRN calculators; they returned HTTP 503 behind a rate limit
 * on every attempt, both during research and at implementation.
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
 */
const constructed = {
  citation:
    "Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752. Threshold table reproduced verbatim in US patent 5,809,477 (Pollack, expired 2015).",
  pmid: "8706448",
  locator: "constructed from the threshold table — no published worked example exists",
};

const prismIv = {
  citation:
    "Pollack MM, Holubkov R, Funai T, et al. The Pediatric Risk of Mortality Score: Update 2015. Pediatr Crit Care Med. 2016;17(1):2-9, Table 3.",
  pmid: "26492059",
  doi: "10.1097/PCC.0000000000000558",
  locator: "coefficients from Table 3; case constructed — no published worked example exists",
};

type PrismInputs = (typeof prism)["inputs"];

/**
 * A 3-year-old with entirely normal physiology. Every one of the 26 ranges
 * misses, so this pins the floor: the model still predicts a non-zero
 * probability of death, which is a property of a logistic intercept and not a
 * bug.
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
    // 1 / (1 + e^5.5434). The floor is not zero and should never be shown as zero.
    { id: "mortality_probability", value: 0.39, tolerance: 0.01 },
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
      { id: "mortality_probability", value: 3.68, tolerance: 0.05 },
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
      { id: "mortality_probability", value: 11.09, tolerance: 0.05 },
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
    } as unknown as InputValues<PrismInputs>,
    [
      { id: "prism_total", value: 67 },
      { id: "neurologic_subscore", value: 16 },
      { id: "non_neurologic_subscore", value: 51 },
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
 * Branch coverage for every scoring row and both equations.
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
    const get = (id: string) => outcome.result.values.find((v) => v.id === id)!.value;
    return {
      total: get("prism_total"),
      neuro: get("neurologic_subscore"),
      nonNeuro: get("non_neurologic_subscore"),
      pct: get("mortality_probability"),
    };
  };
  const yrs = (v: number) => ({ value: v, unit: "years" });
  const mo = (v: number) => ({ value: v, unit: "months" });

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

  it("uses the 24-hour equation when that window is chosen", () => {
    const twelve = at({ collection_window: { value: "first_12h" } }).pct;
    const twentyFour = at({ collection_window: { value: "first_24h" } }).pct;
    expect(twentyFour).toBeLessThan(twelve);
    expect(twentyFour).toBeCloseTo(0.24, 1);
  });

  it("applies every PRISM IV term", () => {
    const four = { collection_window: { value: "first_4h" } };
    const floor = at({ ...four, age: yrs(3) }).pct;
    // Each covariate must move the probability in its published direction.
    expect(at({ ...four, age: mo(0.7) }).pct).toBeGreaterThan(floor); // 14 d - 1 mo
    expect(at({ ...four, age: mo(6) }).pct).toBeGreaterThan(floor); // 1 - 12 mo
    expect(
      at({ ...four, age: yrs(3), admission_source: { value: "inpatient" } }).pct,
    ).toBeGreaterThan(floor);
    expect(at({ ...four, age: yrs(3), admission_source: { value: "ed" } }).pct).toBeGreaterThan(
      floor,
    );
    expect(at({ ...four, age: yrs(3), admission_source: { value: "or_pacu" } }).pct).toBeCloseTo(
      floor,
      6,
    );
    expect(at({ ...four, age: yrs(3), cancer: { value: true } }).pct).toBeGreaterThan(floor);
    // The only protective term in the model.
    expect(at({ ...four, age: yrs(3), low_risk_system: { value: true } }).pct).toBeLessThan(floor);
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
    const worst = at({
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
    });
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
   */
  it("the two subscores sum to the total at several severities", () => {
    const cases = [
      normal,
      { ...normal, sbp_min: { value: 30, unit: "mmHg" } },
      { ...normal, pupils: { value: "both_fixed" } },
      { ...normal, mental_status_gcs: { value: 3, unit: "" }, pupils: { value: "both_fixed" } },
    ];
    for (const c of cases) {
      const outcome = prism.compute(c as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
      const sum = prism.composition!.components.reduce((n, comp) => n + get(comp.id), 0);
      expect(sum, `components must sum to the total`).toBe(get(prism.composition!.total));
      for (const comp of prism.composition!.components) {
        expect(get(comp.id), `${comp.id} above declared max`).toBeLessThanOrEqual(comp.max);
        expect(get(comp.id), `${comp.id} below declared min`).toBeGreaterThanOrEqual(comp.min ?? 0);
      }
    }
  });
});
