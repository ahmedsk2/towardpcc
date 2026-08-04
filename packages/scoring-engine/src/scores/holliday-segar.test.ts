import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { hollidaySegar } from "./holliday-segar";

const hs = {
  citation:
    "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832.",
  pmid: "13431307",
  doi: "10.1542/peds.19.5.823",
};

const iowa = {
  citation: "University of Iowa Head and Neck Protocols — Pediatric Fluid Management.",
  locator: "Pediatric Fluid Management worked example (35 kg → 75 mL/hr)",
};

/**
 * The source for the RATE cap, which is not Holliday & Segar's. Leung 2021 is
 * used because it is the one carrier of the 100 mL/hour figure with a DOI;
 * NICE NG29, RCH 2026 and the Be-PIV Belgian consensus state it identically
 * (holliday-segar.md "The rate cap"). No worked example below cites the 1957
 * paper for a capped value.
 */
const leung = {
  citation:
    "Leung LCK, So LY, Ng YK, et al. Initial intravenous fluid prescription in general paediatric in-patients aged >28 days and <18 years: consensus statements. Hong Kong Med J. 2021;27(4):276–286.",
  doi: "10.12809/hkmj209010",
};

describeScore(hollidaySegar, (ctx) => {
  // Example 1 (holliday-segar.md, first bracket only): 8 kg → 800 mL/day, 32 mL/hr.
  // Exact integers — no tolerance. The capped rate is pinned too, so the cap is
  // proven NOT to bite here; without that the cap assertions below could pass
  // against an implementation that clamped everything.
  ctx.workedExample(
    { ...hs, locator: "Worked example 1 (8 kg): V_day=100×8=800, V_hr=4×8=32" },
    { weight: { value: 8, unit: "kg" } },
    [
      { id: "daily_volume", value: 800 },
      { id: "hourly_rate", value: 32 },
      { id: "hourly_rate_capped", value: 32 },
    ],
  );

  // Example 2 (holliday-segar.md; daily figure matches the Wikipedia worked example):
  // 32 kg → 1740 mL/day, 72 mL/hr (all three brackets).
  ctx.workedExample(
    { ...hs, locator: "Worked example 2 (32 kg): V_day=1500+20×12=1740, V_hr=60+1×12=72" },
    { weight: { value: 32, unit: "kg" } },
    [
      { id: "daily_volume", value: 1740 },
      { id: "hourly_rate", value: 72 },
      { id: "hourly_rate_capped", value: 72 },
    ],
  );

  // Example 3 (holliday-segar.md, first two brackets): 15 kg → 1250 mL/day, 50 mL/hr.
  ctx.workedExample(
    { ...hs, locator: "Worked example 3 (15 kg): V_day=1000+50×5=1250, V_hr=40+2×5=50" },
    { weight: { value: 15, unit: "kg" } },
    [
      { id: "daily_volume", value: 1250 },
      { id: "hourly_rate", value: 50 },
    ],
  );

  // Example 4 (holliday-segar.md; hourly figure matches the Iowa protocol worked
  // example): 35 kg → 1800 mL/day, 75 mL/hr (all three brackets).
  ctx.workedExample(
    {
      ...iowa,
      locator: "Iowa Pediatric Fluid Management (35 kg → 75 mL/hr); daily V_day=1500+20×15=1800",
    },
    { weight: { value: 35, unit: "kg" } },
    [
      { id: "daily_volume", value: 1800 },
      { id: "hourly_rate", value: 75 },
    ],
  );

  // Knot continuity (holliday-segar.md "Boundary check"): the brackets join with
  // no discontinuity — at 10 kg V_day=1000, at 20 kg V_day=1500 (hourly 40 / 60).
  ctx.workedExample(
    { ...hs, locator: "Boundary check at 10 kg: V_day=100×10=1000, V_hr=4×10=40" },
    { weight: { value: 10, unit: "kg" } },
    [
      { id: "daily_volume", value: 1000 },
      { id: "hourly_rate", value: 40 },
    ],
  );
  ctx.workedExample(
    { ...hs, locator: "Boundary check at 20 kg: V_day=1000+50×10=1500, V_hr=40+2×10=60" },
    { weight: { value: 20, unit: "kg" } },
    [
      { id: "daily_volume", value: 1500 },
      { id: "hourly_rate", value: 60 },
    ],
  );

  /**
   * THE RATE CAP, ATTAINED. 60 kg is the exact weight at which the 4-2-1 rule
   * reaches 100 mL/h (60 + (60 − 20) = 100), which is also where RCH's band
   * structure stops and its own cap begins (holliday-segar.md "Rate-cap
   * boundary"). The uncapped and capped rates are equal here: the cap is
   * ATTAINED, not yet cutting. A ceiling declared too HIGH is invisible unless
   * something reaches it exactly — that is what this example is for.
   */
  ctx.workedExample(
    { ...hs, locator: "Rate-cap boundary at 60 kg: V_day=1500+20×40=2300, V_hr=60+40=100" },
    { weight: { value: 60, unit: "kg" } },
    [
      { id: "daily_volume", value: 2300 },
      { id: "hourly_rate", value: 100 },
    ],
  );
  ctx.workedExample(
    { ...leung, locator: "Statement 6.1 — 100 mL/hour; attained exactly at 60 kg under 4-2-1" },
    { weight: { value: 60, unit: "kg" } },
    [{ id: "hourly_rate_capped", value: 100 }],
  );

  /**
   * THE RATE CAP, BINDING — and the proof that NO DAILY CAP is applied.
   *
   * At 70 kg the uncapped rate is 110 mL/h, so the cap cuts it to 100. The
   * DAILY figure at the same weight is 2500 mL/day and is returned whole. That
   * single number falsifies every circulating daily maximum at once: it is
   * above ESPNIC's 2000 (Brossier 2024), above the 2400 that Be-PIV and RCH
   * 2026 state — 2400 being a traced citation error, arithmetically 100 mL/h ×
   * 24 and nothing more — and equal to, not clamped at, RCH's own calculator
   * page figure of 2500 (holliday-segar.md "Why no daily cap is applied").
   */
  ctx.workedExample(
    { ...hs, locator: "70 kg: V_day=1500+20×50=2500 (uncapped), V_hr=60+50=110 (uncapped)" },
    { weight: { value: 70, unit: "kg" } },
    [
      { id: "daily_volume", value: 2500 },
      { id: "hourly_rate", value: 110 },
    ],
  );
  ctx.workedExample(
    { ...leung, locator: "Statement 6.1 — 100 mL/hour; binds at 70 kg, where 4-2-1 gives 110" },
    { weight: { value: 70, unit: "kg" } },
    [{ id: "hourly_rate_capped", value: 100 }],
  );

  // Unit conversion — grams entry converts exactly: 8000 g = 8 kg → 800 mL/day, 32 mL/hr.
  ctx.workedExample(
    { ...hs, locator: "grams entry equals example 1: 8000 g = 8 kg" },
    { weight: { value: 8000, unit: "g" } },
    [
      { id: "daily_volume", value: 800 },
      { id: "hourly_rate", value: 32 },
    ],
  );

  // Unit conversion — pounds entry converts before computing: 22.0462 lb ≈ 10 kg →
  // 1000 mL/day. Float noise from ÷2.20462 needs a small tolerance.
  ctx.workedExample(
    { ...hs, locator: "pounds entry ≈ boundary at 10 kg: 22.0462 lb ÷ 2.20462 = 10 kg" },
    { weight: { value: 22.0462, unit: "lb" } },
    [
      { id: "daily_volume", value: 1000, tolerance: 0.05 },
      { id: "hourly_rate", value: 40, tolerance: 0.05 },
    ],
  );

  // Computes at the 4 kg scope floor and the 150 kg input-sanity ceiling, and
  // rejects just past each.
  ctx.boundaryTest("weight", "min", { weight: { value: 8, unit: "kg" } });
  ctx.boundaryTest("weight", "max", { weight: { value: 8, unit: "kg" } });

  /**
   * The source review's OWN example of why a weight guard cannot implement an
   * age-based scope rule: a 3.2 kg term neonate on day 2 needs roughly
   * 70–80 mL/kg/day, and this formula would hand back 320 mL/day (100 mL/kg/day)
   * for it — 25–45% too much — while being unable to tell that infant from a
   * well 3.2 kg two-month-old for whom 100 is right (holliday-segar.md "Lower
   * bound"). v1.0.0 accepted down to 0.5 kg and computed silently. It now
   * refuses.
   */
  ctx.rejectsImplausible(
    "a 3.2 kg weight — a term neonate the formula must not be applied to",
    { weight: { value: 3.2, unit: "kg" } },
    { inputId: "weight", code: "out-of-range" },
  );

  // A zero weight is inherently invalid, and is below the 4 kg scope floor.
  ctx.rejectsImplausible(
    "a zero body weight",
    { weight: { value: 0, unit: "kg" } },
    { inputId: "weight", code: "out-of-range" },
  );
});

/**
 * Weights spanning every bracket, both knots, and both sides of the 60 kg point
 * at which the 4-2-1 rule reaches 100 mL/h. Kept sorted so the monotonicity
 * assertion below can walk it directly.
 */
const SWEEP_KG = [
  4, 5, 8, 9.9, 10, 10.1, 15, 19.9, 20, 20.1, 32, 35, 55, 59, 59.9, 60, 60.1, 70, 100, 150,
] as const;

function outputsAt(weightKg: number): Map<string, number> {
  const outcome = hollidaySegar.compute({ weight: { value: weightKg, unit: "kg" } });
  if (!outcome.ok)
    throw new Error(`${weightKg} kg did not compute: ${JSON.stringify(outcome.errors)}`);
  return new Map(outcome.result.values.map((v) => [v.id, v.value]));
}

/**
 * The 100 mL/h guideline maximum asserted in BOTH directions.
 *
 * A `≤ 100` sweep alone catches a maximum declared too LOW — something would
 * breach it — but nothing ever reaches an inflated ceiling, so it can never
 * catch one declared too HIGH. The corpus lost exactly that guarantee once
 * before (PRISM's composition maxima, commit 702d742). So: nothing exceeds,
 * something attains, and — the third leg, without which "attains" is satisfied
 * by an implementation that returns 100 for everybody — the cap leaves smaller
 * rates untouched.
 */
describe("the 100 mL/h rate maximum, in both directions", () => {
  it("nothing across the accepted weight range exceeds it", () => {
    for (const kg of SWEEP_KG) {
      const capped = outputsAt(kg).get("hourly_rate_capped");
      expect(capped, `${kg} kg emitted no capped rate`).toBeDefined();
      expect(capped, `${kg} kg exceeded the 100 mL/h guideline maximum`).toBeLessThanOrEqual(100);
    }
  });

  it("something attains it exactly, at 60 kg", () => {
    expect(outputsAt(60).get("hourly_rate_capped")).toBe(100);
    // Attained, not cut: the uncapped rate is already exactly 100 there, so the
    // cap and the formula agree at the boundary rather than one masking the other.
    expect(outputsAt(60).get("hourly_rate")).toBe(100);
  });

  it("binds above 60 kg and leaves every rate below it untouched", () => {
    for (const kg of SWEEP_KG) {
      const v = outputsAt(kg);
      const uncapped = v.get("hourly_rate") ?? Number.NaN;
      const capped = v.get("hourly_rate_capped") ?? Number.NaN;
      if (kg <= 60) {
        expect(capped, `${kg} kg is below the cap and must pass through unchanged`).toBe(uncapped);
      } else {
        expect(uncapped, `${kg} kg should exceed the cap before it is applied`).toBeGreaterThan(
          100,
        );
        expect(capped, `${kg} kg must be cut to the guideline maximum`).toBe(100);
      }
    }
  });
});

/**
 * The other half of the cap question, and the one the source review spends a
 * whole section on: there is NO daily cap, and there must not be one, because
 * current guidance disagrees with itself across a 500 mL range (2000 / 2400 /
 * 2500 / 2500♂–2000♀) and the most widely repeated of those figures is a
 * citation error at its point of entry. A daily clamp would show as a plateau.
 */
describe("no daily maximum is applied to the volume", () => {
  const CIRCULATING_DAILY_CAPS = [2000, 2400, 2500];

  it("the daily volume rises strictly with weight — a clamp would plateau", () => {
    for (let i = 1; i < SWEEP_KG.length; i += 1) {
      const lower = outputsAt(SWEEP_KG[i - 1]!).get("daily_volume") ?? Number.NaN;
      const higher = outputsAt(SWEEP_KG[i]!).get("daily_volume") ?? Number.NaN;
      expect(
        higher,
        `daily volume did not rise from ${SWEEP_KG[i - 1]} kg to ${SWEEP_KG[i]} kg — a cap has been reintroduced`,
      ).toBeGreaterThan(lower);
    }
  });

  it("returns figures above every circulating daily maximum", () => {
    // 150 kg → 1500 + 20 × 130 = 4100 mL/day, returned whole.
    const top = outputsAt(150).get("daily_volume");
    expect(top).toBe(4100);
    for (const cap of CIRCULATING_DAILY_CAPS) {
      expect(top, `the daily volume is being clamped at ${cap} mL/day`).toBeGreaterThan(cap);
    }
  });

  it("passes 2400 mL/day without stopping there", () => {
    // The traced citation error is 100 mL/h × 24. If it were ever applied, the
    // weights either side of it would collapse onto one number.
    expect(outputsAt(65).get("daily_volume")).toBe(2400);
    expect(outputsAt(66).get("daily_volume")).toBe(2420);
  });
});

/**
 * Content rules the source review states as rules, not preferences. Each is
 * asserted on the shortest distinctive fragment rather than a whole sentence,
 * so rewording survives but removal does not.
 */
describe("provenance and content rules survive editing", () => {
  const cautions = hollidaySegar.cautions?.map((c) => c.en).join("\n") ?? "";

  it("attributes the rate cap away from Holliday-Segar on the output itself", () => {
    // The label is what a clinician reads next to the number. Whatever else is
    // buried in the notes, the capped figure must not look like theirs — their
    // function is monotonic with no ceiling.
    const outcome = hollidaySegar.compute({ weight: { value: 70, unit: "kg" } });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const capped = outcome.result.values.find((v) => v.id === "hourly_rate_capped");
    expect(capped?.label.en, "the capped rate must disclaim Holliday-Segar attribution").toContain(
      "not from Holliday-Segar",
    );
  });

  it("never presents restriction as hyponatraemia prophylaxis", () => {
    // AAP found the hypotonic-fluid risk PERSISTED in rate-restricted patients,
    // and Leung concludes fluid type matters more than fluid rate. A calculator
    // that lets a reduced volume read as protection is making a false claim.
    expect(cautions).toContain("substitute for correct tonicity");
  });

  it("states the daily-cap disagreement rather than a single figure", () => {
    for (const figure of ["2000", "2400", "2500"]) {
      expect(cautions, `the cautions must name the ${figure} mL/day figure`).toContain(figure);
    }
  });

  it("keeps the electrolyte basis per 100 kcal, not per kilogram", () => {
    expect(hollidaySegar.notes.en).toMatch(/100 kcal/i);
    expect(hollidaySegar.notes.en).toMatch(/not per kilogram/i);
    // And it computes none, so it cannot make the per-kg error it warns about.
    const outcome = hollidaySegar.compute({ weight: { value: 20, unit: "kg" } });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.values.map((v) => v.id)).toEqual([
      "daily_volume",
      "hourly_rate",
      "hourly_rate_capped",
    ]);
  });

  it("carries the measured expenditure figure that explains the overestimate", () => {
    expect(hollidaySegar.notes.en).toMatch(/50[–-]60 kcal\/kg\/day/);
  });

  it("keeps the 4 kg scope floor and the 1998 provenance that replaced the 2-week claim", () => {
    const weight = hollidaySegar.inputs.find((i) => i.id === "weight");
    expect(weight?.type).toBe("numeric");
    if (weight?.type !== "numeric") return;
    expect(weight.min, "the scope floor must not drift back toward v1.0.0's 0.5 kg").toBe(4);
    // The ">2 weeks of age" limitation traces to a 1998-vintage calculator web
    // page, not to 1957. Naming that is the whole reason the floor moved.
    expect(hollidaySegar.notes.en).toContain("1998");
  });

  /**
   * THE 4 kg FLOOR IS OURS, AND THE PAGE HAS TO SAY SO.
   *
   * v2.0.0 kept the right behaviour for the right reason but attributed the
   * number to "the source review's recommendation". No guideline anywhere states
   * a weight below which this method must not be used — every scope is written
   * in AGE — so there was nothing behind the attribution.
   *
   * Behaviour and claim are asserted separately on purpose. The floor must still
   * reject (a relabelling that quietly loosened the guard would be far worse
   * than the mislabel), AND the page must own the number instead of borrowing
   * authority for it. The 3 kg table starts are asserted as NOT floors, because
   * that is the nearest thing to a citation anyone would reach for next.
   */
  it("labels the 4 kg floor as this project's choice, with no source claimed", () => {
    const notes = hollidaySegar.notes.en;
    expect(notes, "the absence of any citable weight floor must be stated").toMatch(
      /NO WEIGHT FLOOR FOR THIS METHOD IS CITABLE ANYWHERE/,
    );
    expect(notes, "it must be owned as a choice, not attributed").toMatch(/IMPLEMENTATION CHOICE/i);
    expect(notes, "the scopes are age-based, and that is why weight cannot do it").toMatch(
      /written in AGE|by AGE/,
    );
    // The nearest-looking citation, explicitly disarmed.
    expect(notes).toMatch(/3 kg/);
    expect(notes).toMatch(/where a table begins/i);
    // The old borrowed attribution may still APPEAR — it has to, to be
    // retracted, the same way the burn score keeps its 1968 correction visible
    // rather than quietly rewording. So what is asserted is that wherever it
    // appears it is pinned to the version that carried it and named as
    // overstated, never left standing as a live claim.
    for (const m of notes.matchAll(/the source review's recommendation/gi)) {
      const window = notes.slice(Math.max(0, (m.index ?? 0) - 200), (m.index ?? 0) + 200);
      expect(window, "the old attribution must appear only inside its retraction").toMatch(
        /Up to v2\.0\.0/,
      );
    }
    expect(notes, "the retraction must name what was wrong with it").toMatch(
      /a pedigree it does not have/,
    );
    expect(cautions).toMatch(/THE 4 kg FIGURE IS THIS PROJECT'S OWN/);

    // And the behaviour is unchanged — the label moved, the guard did not.
    expect(hollidaySegar.compute({ weight: { value: 3.9, unit: "kg" } }).ok).toBe(false);
    expect(hollidaySegar.compute({ weight: { value: 4, unit: "kg" } }).ok).toBe(true);
  });

  /**
   * RESTRICTION-IS-NOT-PROPHYLAXIS NOW HAS ITS TRIAL.
   *
   * The rule was already stated and already tested above ("substitute for
   * correct tonicity"). What is asserted here is the SOURCE — and specifically
   * the 2 × 2 design, because that is the only feature that makes the trial able
   * to answer the question. A citation to a restriction study without the
   * crossing would not support the claim, so the design is asserted, not just
   * the author's name.
   */
  it("cites Neville 2010, with the 2 x 2 crossing that makes it decisive", () => {
    const notes = hollidaySegar.notes.en;
    expect(notes).toMatch(/NEVILLE 2010/i);
    expect(notes, "the factorial crossing is the load-bearing detail").toMatch(/2 × 2/);
    expect(notes).toMatch(/124 postoperative children/);
    expect(notes).toMatch(/0\.9%[\s\S]{0,60}0\.45%/);
    expect(notes).toMatch(/100%[\s\S]{0,40}50%/);
    expect(notes, "the conclusion must be carried in the paper's own words").toContain(
      "but not fluid restriction",
    );
    // The absence that travels with it: nobody re-ran the design in-window.
    expect(notes).toMatch(/RE-RANDOMISED RATE INDEPENDENTLY OF TONICITY|re-randomised RATE/i);
    // It must not be read as overturning the restriction recommendation, which
    // rests on fluid overload rather than on sodium.
    expect(notes).toMatch(/rests on fluid overload rather than on sodium/i);
    // Traceable, and on the caution surface as well as in the notes.
    expect(
      hollidaySegar.references.some((r) => "pmid" in r && r.pmid === "19818450"),
      "Neville 2010 must be a cited reference, not prose only",
    ).toBe(true);
    expect(cautions).toMatch(/Neville 2010/);
  });

  /**
   * The daily-ceiling question is CLOSED, not open. The four figures are already
   * asserted above; what is asserted here is the stronger claim that replaced
   * "the guidelines disagree" — none was ever derived, so re-searching is waste.
   */
  it("records the absent daily ceiling as settled rather than as disagreement", () => {
    expect(hollidaySegar.notes.en).toMatch(/NO EVIDENCE-BASED DAILY CEILING\s+EXISTS/);
    expect(cautions).toMatch(/NO EVIDENCE-BASED DAILY CEILING EXISTS/);
    // And no cap is applied, which the sweep above proves numerically.
    expect(hollidaySegar.notes.en).toMatch(/no daily cap is applied/i);
  });

  it("ships no 70 kg anchor as an original-source claim", () => {
    // The 20–70 kg third segment rests on a secondary description of a figure
    // nobody inspected. 60 kg is the anchor; 70 kg appears only as arithmetic.
    expect(hollidaySegar.notes.en).toContain("60 kg");
    expect(hollidaySegar.notes.en).toMatch(/70 kg anchor[^.]*UNVERIFIED/);
  });
});
