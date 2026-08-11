import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import {
  LUND_BROWDER_AGE_BANDS,
  LUND_BROWDER_BAND_KEYS,
  LUND_BROWDER_SEGMENTS,
  lundBrowderBandForAgeMonths,
  lundBrowderBandTotal,
  lundBrowderPercent,
  lundBrowderTbsaPercent,
  type LundBrowderBandKey,
  type LundBrowderSegment,
} from "../data/lund-browder";
import { burnResuscitation } from "./burn-resuscitation";
// Imported to be READ, not exercised: the standalone maintenance score owns the
// 4 kg floor this score's prose talks about, and the cross-file test below reads
// that floor off it rather than hard-coding the number in two places. Aliased
// because `hollidaySegar` is already taken below by the 1957 citation source.
import { hollidaySegar as hollidaySegarScore } from "./holliday-segar";

// StatPearls has no PMID/DOI (Bookshelf), so worked examples cite it via locator.
const statPearlsParkland = {
  citation:
    "Baartmans MG, et al. Parkland Formula. StatPearls Publishing (Bookshelf NBK537190) + Holliday & Segar 1957 (PMID 13431307).",
};
const statPearlsBurn = {
  citation:
    "Mehta M, Tudor GJ. Burn Fluid Resuscitation. StatPearls Publishing (Bookshelf NBK534227) + Holliday & Segar 1957 (PMID 13431307).",
};
const hollidaySegar = {
  citation:
    "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823-832.",
  pmid: "13431307",
};

describeScore(burnResuscitation, (ctx) => {
  // Worked example 1 (burn-resuscitation.md §Worked examples): 15 kg, 25% TBSA.
  // Pediatric Parkland 3 x 15 x 25 = 1125 mL/24h; first 8 h = 562.5 mL.
  // Holliday-Segar maintenance = 10x100 + 5x50 = 1250 mL/day. Combined = 2375 mL.
  // Modified Brooke converges (same 3 mL peds coefficient) at 1125 mL.
  ctx.workedExample(
    {
      ...statPearlsParkland,
      locator: "Worked example 1 — 15 kg, 25% TBSA (modified-Parkland 3 mL + Holliday-Segar)",
    },
    { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } },
    [
      { id: "resuscitation_24h_ml", value: 1125 },
      { id: "resuscitation_first8h_ml", value: 562.5 },
      { id: "maintenance_24h_ml", value: 1250 },
      { id: "resuscitation_plus_maint_24h_ml", value: 2375 },
    ],
  );

  // Worked example 3 (burn-resuscitation.md): 20 kg, 30% TBSA.
  // Pediatric modified Brooke 3 x 20 x 30 = 1800 mL/24h; first 8 h = 900 mL.
  // Holliday-Segar maintenance = 10x100 + 10x50 = 1500 mL/day (upper edge of tier 2).
  // Parkland converges at 1800 mL.
  ctx.workedExample(
    {
      ...statPearlsBurn,
      locator: "Worked example 3 — 20 kg, 30% TBSA (modified-Brooke 3 mL + Holliday-Segar)",
    },
    { weight_kg: { value: 20, unit: "kg" }, tbsa_pct: { value: 30, unit: "%" } },
    [
      { id: "resuscitation_24h_ml", value: 1800 },
      { id: "maintenance_24h_ml", value: 1500 },
    ],
  );

  // Worked example 6 (burn-resuscitation.md): 26 kg → Holliday-Segar maintenance
  // = 10x100 + 10x50 + 6x20 = 1620 mL/day (exercises the >20 kg tier). TBSA is
  // arbitrary here (maintenance depends only on weight).
  ctx.workedExample(
    {
      ...hollidaySegar,
      locator: "Worked example 6 — 26 kg maintenance = 1620 mL/day (three-tier)",
    },
    { weight_kg: { value: 26, unit: "kg" }, tbsa_pct: { value: 20, unit: "%" } },
    [{ id: "maintenance_24h_ml", value: 1620 }],
  );

  // First maintenance tier (<=10 kg): 8 kg x 100 mL/kg/day = 800 mL/day
  // (Holliday & Segar 1957 first tier). Covers the low-weight branch.
  ctx.workedExample(
    { ...hollidaySegar, locator: "8 kg maintenance = 800 mL/day (first tier, 100 mL/kg/day)" },
    { weight_kg: { value: 8, unit: "kg" }, tbsa_pct: { value: 15, unit: "%" } },
    [{ id: "maintenance_24h_ml", value: 800 }],
  );

  // Worked example 7 (burn-resuscitation.md §Worked examples, and R.4): Pisano's
  // own published child — 5 years old, 25 kg, 20% TBSA — whose estimated 24-hour
  // requirement runs 1500-3560 mL depending only on which of five ABA-verified
  // paediatric burn centres they reach. This score returns the BOTTOM of that
  // span: 3 x 25 x 20 = 1500 mL, first 8 h 750 mL, maintenance
  // 1000 + 500 + 5x20 = 1600 mL, combined 3100 mL.
  ctx.workedExample(
    {
      citation:
        "Pisano C, Fabia R, Shi J, et al. Variation in acute fluid resuscitation among pediatric burn centers. Burns. 2021;47(3):545-550.",
      doi: "10.1016/j.burns.2020.04.013",
      locator:
        "Worked example 7 — 5-year-old, 25 kg, 20% TBSA (the five-centre 1500-3560 mL spread)",
    },
    { weight_kg: { value: 25, unit: "kg" }, tbsa_pct: { value: 20, unit: "%" } },
    [
      { id: "resuscitation_24h_ml", value: 1500 },
      { id: "resuscitation_first8h_ml", value: 750 },
      { id: "maintenance_24h_ml", value: 1600 },
      { id: "resuscitation_plus_maint_24h_ml", value: 3100 },
    ],
  );

  const base = { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } };
  ctx.boundaryTest("weight_kg", "min", base);
  ctx.boundaryTest("weight_kg", "max", base);
  ctx.boundaryTest("tbsa_pct", "min", base);
  ctx.boundaryTest("tbsa_pct", "max", base);

  ctx.rejectsImplausible(
    "a sub-neonatal weight below the 0.5 kg validity bound",
    { weight_kg: { value: 0.1, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } },
    { inputId: "weight_kg", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a %TBSA above 100%",
    { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 120, unit: "%" } },
    { inputId: "tbsa_pct", code: "out-of-range" },
  );
});

/**
 * The Lund-Browder chart, tested as data.
 *
 * `calculate` does not consume this table — `tbsa_pct` is still one number the
 * clinician has already estimated — so these are not `describeScore` worked
 * examples. They are the evidence that closed the score's [NEEDS SOURCE]
 * marker: the eight assertions from the reference note, of which the first
 * three are the ones that matter. Every circulating chart that sums to 101%
 * fails at least one of them.
 *
 * Every cell is a multiple of 0.5 and therefore exact in binary floating point,
 * so totals are asserted with `toBe`, never a tolerance. A tolerance here would
 * be the thing that let a 100.5 through.
 */
describe("Lund-Browder chart (src/data/lund-browder.ts)", () => {
  const ALL_SEGMENT_IDS = LUND_BROWDER_SEGMENTS.map((s) => s.id);
  const num = (x: number | null | undefined): number => x ?? Number.NaN;
  const series = (id: string): number[] =>
    LUND_BROWDER_BAND_KEYS.map((band) => num(lundBrowderPercent(id, band)));

  // ── Assertion 1 — the invariant every defect breaks ────────────────────────
  it.each([...LUND_BROWDER_BAND_KEYS])("band %s sums to exactly 100", (band) => {
    expect(lundBrowderBandTotal(band)).toBe(100);
  });

  // ── Assertion 2 — Defect 1, the "101%" hand (Lundin & Alsbjørn 2013) ───────
  it("each hand is 2.5% in every band, never 3%", () => {
    for (const band of LUND_BROWDER_BAND_KEYS) {
      expect(lundBrowderPercent("hand_right", band)).toBe(2.5);
      expect(lundBrowderPercent("hand_left", band)).toBe(2.5);
    }
    // The defective charts carry 1.5 per aspect instead of 1.25, i.e. hand = 3,
    // which adds exactly 1.0 to every column.
    expect(lundBrowderTbsaPercent(["hand_right", "hand_left"], "adult")).toBe(5);
  });

  // ── Assertion 3 — Defect 2, thigh at 10-14 ────────────────────────────────
  it("each thigh is 8.5% in the 10-14 band, never 9%", () => {
    expect(lundBrowderPercent("thigh_right", "10")).toBe(8.5);
    expect(lundBrowderPercent("thigh_left", "10")).toBe(8.5);
    // 9 would put this column, and only this column, at 101.
    expect(lundBrowderBandTotal("10")).toBe(100);
  });

  // The heavily degraded scanned variant, pinned value by value.
  it("carries none of the degraded variant's four values", () => {
    expect(lundBrowderPercent("trunk_anterior", "1")).toBe(13); // not 17
    expect(lundBrowderPercent("buttock_right", "adult")).toBe(2.5); // not 2
    expect(lundBrowderPercent("hand_left", "adult")).toBe(2.5); // not 2
    expect(lundBrowderPercent("head", "10")).toBe(11); // not 10
  });

  // ── Assertion 4 — which rows move with age ────────────────────────────────
  it("marks exactly 5 segments variable and 14 constant, and the flag matches the data", () => {
    expect(LUND_BROWDER_SEGMENTS).toHaveLength(19);
    expect(LUND_BROWDER_SEGMENTS.filter((s) => s.variable).map((s) => s.id)).toEqual([
      "head",
      "thigh_right",
      "thigh_left",
      "leg_right",
      "leg_left",
    ]);
    expect(LUND_BROWDER_SEGMENTS.filter((s) => !s.variable)).toHaveLength(14);

    // Asserted in both directions: a value quietly made age-varying fails here
    // just as loudly as a variable row quietly frozen.
    const varies = (s: LundBrowderSegment): boolean =>
      LUND_BROWDER_BAND_KEYS.some((band) => s.values[band] !== s.values["0"]);
    for (const s of LUND_BROWDER_SEGMENTS) {
      expect(varies(s), `${s.id}: variable flag disagrees with its own values`).toBe(s.variable);
    }
  });

  // ── Assertion 5 — direction of the age trend ──────────────────────────────
  it("falls monotonically at the head and rises at thigh and lower leg", () => {
    const head = series("head");
    const thigh = series("thigh_right");
    const leg = series("leg_right");
    for (let i = 1; i < LUND_BROWDER_BAND_KEYS.length; i += 1) {
      expect(num(head[i])).toBeLessThan(num(head[i - 1]));
      expect(num(thigh[i])).toBeGreaterThan(num(thigh[i - 1]));
      // The lower leg is FLAT from birth to 1 (5 → 5) and rises thereafter, so
      // it is non-decreasing rather than strictly increasing. Asserting strict
      // here would be asserting a value the chart does not carry.
      expect(num(leg[i])).toBeGreaterThanOrEqual(num(leg[i - 1]));
    }
    expect(num(leg.at(-1))).toBeGreaterThan(num(leg[0]));
  });

  // ── Assertion 6 — the redistribution nets to zero ─────────────────────────
  it("redistributes head loss into the lower limbs, netting exactly zero", () => {
    const delta = (id: string): number =>
      num(lundBrowderPercent(id, "adult")) - num(lundBrowderPercent(id, "0"));
    expect(delta("head")).toBe(-12);
    expect(delta("thigh_right") + delta("thigh_left")).toBe(8);
    expect(delta("leg_right") + delta("leg_left")).toBe(4);
    const moved = ["head", "thigh_right", "thigh_left", "leg_right", "leg_left"];
    expect(moved.reduce((sum, id) => sum + delta(id), 0)).toBe(0);
    // Nothing else moved at all.
    for (const s of LUND_BROWDER_SEGMENTS.filter((x) => !x.variable)) {
      expect(delta(s.id), `${s.id} should be constant across age`).toBe(0);
    }
  });

  // ── Assertion 7 — a selection can never exceed 100 ────────────────────────
  it("cannot total more than 100% in any band, whatever is selected", () => {
    for (const band of LUND_BROWDER_BAND_KEYS) {
      // Every cell is positive, so the whole-body selection IS the maximum any
      // subset can reach — and it is exactly 100. That pair of facts is the
      // proof; the running total below is the demonstration.
      for (const s of LUND_BROWDER_SEGMENTS) expect(s.values[band]).toBeGreaterThan(0);
      expect(lundBrowderTbsaPercent(ALL_SEGMENT_IDS, band)).toBe(100);

      let running = 0;
      for (const id of ALL_SEGMENT_IDS) {
        running += num(lundBrowderPercent(id, band));
        expect(running).toBeLessThanOrEqual(100);
      }
    }
  });

  it("deduplicates a repeated segment rather than double-counting it", () => {
    expect(lundBrowderTbsaPercent(["head", "head", "head"], "0")).toBe(19);
    expect(lundBrowderTbsaPercent([...ALL_SEGMENT_IDS, ...ALL_SEGMENT_IDS], "adult")).toBe(100);
  });

  it("throws on an unknown segment id rather than silently under-counting the burn", () => {
    expect(() => lundBrowderTbsaPercent(["head", "tail"], "adult")).toThrow(
      /unknown Lund-Browder segment "tail"/,
    );
    expect(lundBrowderPercent("tail", "adult")).toBeNull();
  });

  // ── Assertion 8 — the age → column mapping, and its rejection ─────────────
  it.each([
    [0, "0"],
    [11, "0"],
    [12, "1"],
    [36, "1"], // a 3-year-old takes the "1" column
    [59, "1"],
    [60, "5"],
    [84, "5"], // a 7-year-old takes the "5" column
    [119, "5"],
    [120, "10"],
    [179, "10"],
    [180, "15"],
    [191, "15"],
    [192, "adult"],
    [1200, "adult"],
  ])("age %i months maps to band %s", (months, band) => {
    expect(lundBrowderBandForAgeMonths(months as number)).toBe(band as LundBrowderBandKey);
  });

  it("rejects an out-of-range age instead of clamping it into a band", () => {
    expect(lundBrowderBandForAgeMonths(-1)).toBeNull();
    expect(lundBrowderBandForAgeMonths(Number.NaN)).toBeNull();
    expect(lundBrowderBandForAgeMonths(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("declares contiguous ascending bands with only the adult band open-ended", () => {
    expect(LUND_BROWDER_AGE_BANDS.map((b) => b.key)).toEqual([...LUND_BROWDER_BAND_KEYS]);
    expect(LUND_BROWDER_AGE_BANDS[0]?.minMonths).toBe(0);
    for (let i = 1; i < LUND_BROWDER_AGE_BANDS.length; i += 1) {
      expect(LUND_BROWDER_AGE_BANDS[i]?.minMonths).toBe(LUND_BROWDER_AGE_BANDS[i - 1]?.maxMonths);
    }
    expect(LUND_BROWDER_AGE_BANDS.at(-1)?.maxMonths).toBeNull();
    expect(LUND_BROWDER_AGE_BANDS.slice(0, -1).every((b) => b.maxMonths !== null)).toBe(true);
  });

  // ── Per-side, not per-pair ────────────────────────────────────────────────
  it("gives one limb per cell, not the pair", () => {
    expect(lundBrowderTbsaPercent(["hand_left", "hand_right"], "adult")).toBe(5);
    // Both adult lower limbs: 2 x (thigh 9.5 + lower leg 7 + foot 3.5) = 40.
    const bothLegs = [
      "thigh_left",
      "leg_left",
      "foot_left",
      "thigh_right",
      "leg_right",
      "foot_right",
    ];
    expect(lundBrowderTbsaPercent(bothLegs, "adult")).toBe(40);
  });

  it("keeps left and right of every paired segment equal", () => {
    for (const right of LUND_BROWDER_SEGMENTS.filter((s) => s.id.endsWith("_right"))) {
      const leftId = right.id.replace(/_right$/, "_left");
      for (const band of LUND_BROWDER_BAND_KEYS) {
        expect(lundBrowderPercent(leftId, band), `${leftId} vs ${right.id} @ ${band}`).toBe(
          right.values[band],
        );
      }
    }
  });

  /**
   * Independent cross-check against the OTHER printed form of the same chart.
   *
   * The classic chart prints anterior and posterior outlines with an inset
   * giving A/B/C "half" values, where half means ONE ASPECT (front or back) of
   * ONE limb — not one of a pair. So B x 2 is a whole thigh. These figures come
   * from a different reproduction lineage (Miminas, Wounds UK 2007) than the
   * JTS worksheets the table above was taken from, so agreement here is a
   * genuine second opinion rather than a restatement.
   */
  it("doubles the printed A/B/C half-body inset exactly", () => {
    const halfHead: Record<LundBrowderBandKey, number> = {
      "0": 9.5,
      "1": 8.5,
      "5": 6.5,
      "10": 5.5,
      "15": 4.5,
      adult: 3.5,
    };
    const halfThigh: Record<LundBrowderBandKey, number> = {
      "0": 2.75,
      "1": 3.25,
      "5": 4,
      "10": 4.25, // 4.5 here is Defect 2
      "15": 4.5,
      adult: 4.75,
    };
    const halfLeg: Record<LundBrowderBandKey, number> = {
      "0": 2.5,
      "1": 2.5,
      "5": 2.75,
      "10": 3,
      "15": 3.25,
      adult: 3.5,
    };
    for (const band of LUND_BROWDER_BAND_KEYS) {
      expect(lundBrowderPercent("head", band)).toBe(halfHead[band] * 2);
      expect(lundBrowderPercent("thigh_left", band)).toBe(halfThigh[band] * 2);
      expect(lundBrowderPercent("leg_left", band)).toBe(halfLeg[band] * 2);
    }
  });
});

/**
 * The 2016-2026 evidence review, asserted as content rules.
 *
 * These are not coverage — every one of them is a statement the review says a
 * tool MUST make, or a number a tool must not silently pick. Each is asserted
 * on the shortest distinctive fragment rather than a whole sentence, so the
 * prose can be rewritten but the claim cannot be dropped.
 *
 * The numeric guards below matter more than the text ones. The coefficient is
 * the live controversy (§8.1): the ABA CPG says start adults at 2, ABRUPT says
 * 4 is what actually gets delivered and 2 may not be feasible, and a future
 * editor reading either one could reach for this file. The sweep pins 3 and
 * rejects both adult numbers explicitly.
 */
describe("2016-2026 evidence review — content and numeric rules", () => {
  const notes = burnResuscitation.notes.en;
  const cautions = burnResuscitation.cautions?.map((c) => c.en).join("\n") ?? "";
  const prose = `${notes}\n${cautions}`;

  const outputsAt = (weightKg: number, tbsaPct: number): Map<string, number> => {
    const outcome = burnResuscitation.compute({
      weight_kg: { value: weightKg, unit: "kg" },
      tbsa_pct: { value: tbsaPct, unit: "%" },
    });
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return new Map();
    return new Map(outcome.result.values.map((v) => [v.id, v.value]));
  };

  // ── The coefficient, pinned against both sides of the adult dispute ────────
  it("uses 3 mL/kg/%TBSA everywhere, and never the adult 2 or 4", () => {
    for (const weight of [0.5, 5, 12, 25, 40, 70, 150]) {
      for (const tbsa of [1, 15, 20, 55, 100]) {
        const out = outputsAt(weight, tbsa);
        const denominator = weight * tbsa;
        const resus = out.get("resuscitation_24h_ml") ?? Number.NaN;
        expect(resus / denominator, `${weight} kg / ${tbsa}% is not on 3 mL/kg/%TBSA`).toBeCloseTo(
          3,
          10,
        );
        // The two adult figures, rejected by name.
        expect(resus).not.toBeCloseTo(2 * denominator, 6);
        expect(resus).not.toBeCloseTo(4 * denominator, 6);
        // The 8-h figure is exactly half — a gross volume, not a remainder.
        expect(out.get("resuscitation_first8h_ml")).toBe(resus / 2);
        // ONE resuscitation volume is emitted, not a Parkland row and a
        // modified Brooke row carrying the same number. v1.1.0 collapsed them;
        // this stops the duplicate pair coming back.
        expect(out.has("mod_brooke_peds_24h_ml")).toBe(false);
        expect(out.has("parkland_peds_24h_ml")).toBe(false);
      }
    }
  });

  // ── Maintenance is added at every accepted weight, with no threshold ───────
  it("adds maintenance at every weight it accepts, including above 20, 30 and 40 kg", () => {
    // The three circulating thresholds, plus the weights either side of each.
    // If any of them were ever implemented, maintenance would drop to zero on
    // the far side of it and the combined total would collapse onto Parkland.
    for (const weight of [0.5, 19, 20, 21, 29, 30, 31, 39, 40, 41, 150]) {
      const out = outputsAt(weight, 20);
      const maintenance = out.get("maintenance_24h_ml") ?? Number.NaN;
      const parkland = out.get("resuscitation_24h_ml") ?? Number.NaN;
      expect(
        maintenance,
        `maintenance vanished at ${weight} kg — a threshold has been added`,
      ).toBeGreaterThan(0);
      expect(out.get("resuscitation_plus_maint_24h_ml")).toBe(parkland + maintenance);
    }
  });

  /**
   * THE CROSS-FILE RULE, MACHINE-CHECKED — the two pages must stop disagreeing.
   *
   * `hollidaySegarMaintenanceMl` in this score is the SAME arithmetic the
   * standalone `holliday-segar` score computes, and that score rejects below
   * 4 kg because 100 mL/kg/day over-estimates a term neonate. This score applies
   * it from 0.5 kg. Left unstated, the identical formula would be guarded on one
   * page and unguarded on the other, and a 1 kg patient would get a maintenance
   * volume here that the maintenance page refuses to compute at all.
   *
   * The resolution is disclosure, not a raised floor. Two things are asserted
   * here and a third in the test below, and any one alone would leave a
   * different wrong impression:
   *
   *  (1) the other score's floor is READ OFF IT, not hard-coded, so if that floor
   *      ever moves and this prose does not, this test fails rather than the two
   *      pages drifting apart again in silence;
   *  (2) the reason travels with the number, or the limit reads as arbitrary;
   *  (3) the BEHAVIOUR is unchanged and pinned — this score still computes across
   *      the whole overlap band, so a future edit "fixing" the inconsistency by
   *      copying the 4 kg floor across fails here.
   */
  it("agrees with the standalone maintenance score about where that score's floor is", () => {
    const hsWeight = hollidaySegarScore.inputs.find((i) => i.id === "weight");
    const hsFloor = hsWeight && "min" in hsWeight ? hsWeight.min : Number.NaN;
    expect(hsFloor, "the standalone Holliday-Segar score must declare a weight floor").toBe(4);

    // The figure quoted here is that score's, so it is asserted against that
    // score rather than against a literal repeated in two files.
    expect(prose, `the ${hsFloor} kg floor must be named on this page too`).toContain(
      `${hsFloor} kg`,
    );
    // The reason has to travel with it, or the limit reads as arbitrary.
    expect(prose).toMatch(/over-estimates a term neonate/i);
  });

  it("says which outputs the maintenance scope limit bites and which it does not", () => {
    // Not raising this score's floor is a decision, and its reason travels with
    // it: refusing a burned neonate would withhold the resuscitation volume as
    // well as the maintenance one.
    expect(prose, "the divergence must be stated as deliberate, with its reason").toMatch(
      /accepts from 0\.5 kg on purpose so a burned neonate is never refused/i,
    );
    expect(prose, "the affected outputs must be named").toMatch(/combined total/i);
    expect(prose, "the unaffected outputs must be named").toMatch(
      /resuscitation figures are unaffected/i,
    );
    // The direction matters: it compounds fluid creep rather than offsetting it.
    expect(prose).toMatch(/over-estimating maintenance/i);
  });

  /**
   * BEHAVIOUR IN THE OVERLAP BAND, PINNED.
   *
   * These are NOT cited worked examples and are deliberately not registered as
   * such: no source endorses a Holliday-Segar volume for a 3 kg patient — that is
   * the whole point of the disclosure. They assert only what this implementation
   * does, so that "fix the inconsistency by raising the floor" fails loudly.
   */
  it("still computes across the whole 0.5-4 kg band, resuscitation and maintenance alike", () => {
    const burnWeight = burnResuscitation.inputs.find((i) => i.id === "weight_kg");
    const burnFloor = burnWeight && "min" in burnWeight ? burnWeight.min : Number.NaN;
    expect(burnFloor, "the burn floor must stay below the maintenance score's").toBe(0.5);

    for (const weight of [0.5, 1, 2.5, 3, 3.9, 4]) {
      const out = outputsAt(weight, 20);
      // Resuscitation is untouched by the scope limit: still exactly 3 mL/kg/%TBSA.
      expect(out.get("resuscitation_24h_ml"), `${weight} kg left the 3 mL coefficient`).toBe(
        3 * weight * 20,
      );
      // Maintenance is still emitted — first tier, 100 mL/kg/day — rather than
      // suppressed, zeroed or rejected.
      expect(out.get("maintenance_24h_ml"), `maintenance vanished at ${weight} kg`).toBe(
        100 * weight,
      );
      expect(out.get("resuscitation_plus_maint_24h_ml")).toBe(3 * weight * 20 + 100 * weight);
      expect(out.size, "4 volumes + the always-available maintenance rate (v1.8.0)").toBe(5);
    }
  });

  it("states the threshold as a range with its sources, not as a single fact", () => {
    // No threshold is implemented here at all, and the page has to say so —
    // otherwise the circulating 30 kg reads as the rule this score follows.
    expect(prose, "the no-threshold structure must be stated").toMatch(/added at every weight/i);
    expect(prose, "the range of published practice must be shown").toMatch(
      /spans below 20 kg to below 40 kg/i,
    );
    expect(prose, "the non-weight alternative must survive").toMatch(/age under 1 year/i);
    expect(prose, "so must the centres that add none at all").toMatch(/or none at all/i);
    // The 30 kg is attributed to the body that holds it, not stated as fact.
    expect(prose).toMatch(/circulating 30 kg figure is the ABA position/i);
    expect(prose, "no threshold may acquire a derivation none of them has").toMatch(
      /No derivation exists for any of them/i,
    );
    expect(prose).toContain("AWMF");
  });

  // ── §5 — the clock the eight-hour window is timed from ────────────────────
  //
  // The commonest bedside error this page exists to prevent: reading the
  // first-8-h figure as eight hours from ARRIVAL. A child three hours post-burn
  // has five hours left in it, so the same volume must run faster.
  it("keeps the clock language that stops the 8 h being timed from arrival", () => {
    expect(notes).toMatch(/THE CLOCK RUNS FROM INJURY, NOT ARRIVAL/);
    // The worked instance is what makes the wrong reading fail out loud rather
    // than a reader having to derive the consequence themselves.
    expect(prose).toMatch(/arriving 3 h post-burn has 5 h of the first phase left/i);
    expect(prose, "late presentation moves the rate, not the volume").toMatch(
      /compresses the rate, not the volume/i,
    );
  });

  it("now takes the two inputs, and both are OPTIONAL", () => {
    const inputIds = burnResuscitation.inputs.map((i) => i.id);
    expect(inputIds).toEqual(["weight_kg", "tbsa_pct", "time_since_burn_h", "fluid_given_ml"]);
    for (const id of ["time_since_burn_h", "fluid_given_ml"]) {
      const input = burnResuscitation.inputs.find((i) => i.id === id);
      expect(input?.required, `${id} must stay optional`).toBe(false);
    }
  });

  it("emits NO resuscitation rate unless BOTH new inputs are supplied", () => {
    // Defaulting either one would print a confident rate built on an assumption
    // the clinician never made — and defaulting fluid-given to zero errs toward
    // over-resuscitation, which this page documents as a named harm.
    const partial = [
      { weight_kg: { value: 25, unit: "kg" }, tbsa_pct: { value: 20, unit: "%" } },
      {
        weight_kg: { value: 25, unit: "kg" },
        tbsa_pct: { value: 20, unit: "%" },
        time_since_burn_h: { value: 3, unit: "h" },
      },
      {
        weight_kg: { value: 25, unit: "kg" },
        tbsa_pct: { value: 20, unit: "%" },
        fluid_given_ml: { value: 0.5, unit: "L" },
      },
    ];
    for (const values of partial) {
      const outcome = burnResuscitation.compute(values as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const ids = outcome.result.values.map((v) => v.id);
      expect(ids).not.toContain("resuscitation_first8h_rate_ml_h");
      expect(ids).not.toContain("resuscitation_next16h_rate_ml_h");
      // Maintenance rate needs only weight, so it is always available and is
      // emitted unconditionally — dividing by 24 was hand-arithmetic for no
      // reason.
      expect(ids).toContain("maintenance_rate_ml_h");
    }
  });

  // ── §6.1 — the urine-output targets disagree, in three separate ways ──────
  it("carries the full urine-output disagreement rather than one number", () => {
    expect(prose, "the paediatric band must be stated").toMatch(
      /children commonly 1\.0 to 1\.5 mL\/kg\/h/,
    );
    expect(prose, "the infant band must be stated").toMatch(/infants about 1 to 2/);
    expect(prose, "the adult figure must be marked as the adult one").toMatch(/adults about 0\.5/);
    expect(prose, "the Stevens protocol band must be named").toMatch(/0\.3 to 0\.7 above 30 kg/);
    expect(prose, "the banding variable is itself disputed").toMatch(/developmental stage/i);
    // No single target may be presented as the settled one.
    expect(prose).toMatch(/optimal paediatric goal is settled-absent/i);
    // The one cited paediatric ceiling, and the fact that the page states it
    // rather than enforcing it on the reader's behalf.
    expect(prose).toMatch(/not to initially exceed 10 mL\/kg\/h/i);
    expect(prose).toMatch(/stated here, not enforced/i);
  });

  /**
   * WHAT IS PUBLISHED IS PRACTICE VARIATION, NOT A SETTLED COEFFICIENT.
   *
   * Centres START in the range 2-4 with no modal value while delivering near
   * 6.35. A page that printed 3 as the paediatric coefficient — full stop —
   * would be claiming a consensus that does not exist, so the range and the
   * delivered figure have to travel with the number this score emits.
   */
  it("shows the starting-coefficient range and the delivered figure, not one settled number", () => {
    expect(prose, "the starting range must be shown rather than a single figure").toMatch(
      /run 2 to 4 with no modal value/,
    );
    // Delivered volume — a different quantity from the starting coefficient,
    // and the reason the emitted number is a starting estimate.
    expect(prose).toContain("6.35");
    expect(prose, "the output must be framed as a starting estimate, not a prescription").toMatch(
      /starting estimate to titrate, never a fixed prescription/i,
    );
  });

  // ── §7.3 — the best limitations line available ────────────────────────────
  it("carries the five-centre spread, and lands this score at the bottom of it", () => {
    expect(prose).toContain("1500 to 3560 mL");
    expect(prose, "this score's place in that spread must be named").toMatch(
      /returns the bottom of that spread/i,
    );

    // The claim, verified rather than asserted: 25 kg / 20% TBSA is the low end.
    const out = outputsAt(25, 20);
    expect(out.get("resuscitation_24h_ml")).toBe(1500);
    expect(out.get("resuscitation_plus_maint_24h_ml")).toBe(3100);
    // Bottom of the span, and the combined figure still inside it.
    expect(out.get("resuscitation_24h_ml")).toBeLessThan(3560);
    expect(out.get("resuscitation_plus_maint_24h_ml")).toBeLessThan(3560);
    expect(out.get("resuscitation_plus_maint_24h_ml")).toBeGreaterThan(1500);
  });

  // ── §7.4 — over-resuscitation is not the only failure direction ───────────
  it("presents under-resuscitation as a real failure direction too", () => {
    expect(prose, "the German registry proportion must be stated").toContain("86.5%");
    expect(prose).toMatch(/six of the seven/i);
    expect(prose).toMatch(/under-resuscitat/i);
    // And the harm it is set against is still named, so neither replaces the other.
    expect(prose).toMatch(/fluid creep/i);
  });

  // ── §8 — the adult dispute, and why neither side reaches this page ─────────
  it("keeps the ABA 2 and ABRUPT's 4.6 as adult findings that license no paediatric number", () => {
    expect(prose, "the ABA CPG's own scope must be stated").toMatch(
      /scopes itself to adults with 20% TBSA or more/i,
    );
    expect(prose, "ABRUPT's cohort must be quantified and marked adult").toMatch(/379 adults/);
    // Neither side may be presented as having superseded the other.
    expect(prose).toMatch(/same organisation/i);
    // The load-bearing sentence: an adult starting rate is not a paediatric one,
    // and the paediatric guideline that would settle it does not exist.
    expect(prose).toMatch(/Neither licenses a paediatric coefficient/i);
    expect(prose).toMatch(/No paediatric equivalent exists, which is settled-absent/i);
  });

  /**
   * THE TWO-PART SHAPE — MAINTENANCE SUPPLIED, RESUSCITATION INITIATED AT 3 —
   * VERIFIED AGAINST `compute` RATHER THAN TAKEN FROM PROSE.
   *
   * The ~6 mL/kg/%TBSA figure that circulates for children is a TOTAL 24-hour
   * volume INCLUDING maintenance; the 3 emitted here is resuscitation ALONE.
   * Reading the 6 as a rival coefficient is the category error this score must
   * never make — it would put a flat 6 at every weight, which is what
   * overhydrates the large child.
   *
   * What makes that a reconciliation instead of an arithmetic coincidence is the
   * weight-dependence, and it is checked here rather than asserted: maintenance
   * per kg per %TBSA FALLS as weight rises, so 3 + maintenance approaches 6 in an
   * infant and deliberately less in a larger child. The mechanism is asserted
   * separately from the sum, because asserting only the combined figure would
   * pass against a score that got the same curve by tapering the coefficient.
   *
   * The two primaries that report both quantities from one cohort must stay
   * citable, so the attribution can be checked at the source rather than taken
   * from this file.
   */
  it("keeps 3 + maintenance approaching ~6 only in the infant, and keeps its primaries cited", () => {
    // The primaries that name which figure is which must be traceable
    // references, not prose-only claims.
    const refs = burnResuscitation.references;
    for (const [pmid, name] of [
      ["3199467", "Graves 1988"],
      ["3789292", "Merrell 1986"],
    ] as const) {
      expect(
        refs.some((r) => "pmid" in r && r.pmid === pmid),
        `${name} must be a cited reference, not just prose`,
      ).toBe(true);
    }
    expect(
      refs.some((r) => "doi" in r && r.doi === "10.1097/00005373-198812000-00007"),
      "the Graves DOI must be carried",
    ).toBe(true);

    // ── The weight-dependence, verified rather than asserted ──────────────────
    // Maintenance per kg per %TBSA FALLS as weight rises, so 3 + maintenance
    // approximates 6 in an infant and deliberately less in a larger child. That
    // is the whole reconciliation, so it is checked against `compute` at both
    // burn sizes this page prints worked numbers for.
    const perUnit = (id: string, kg: number, tbsa: number): number =>
      (outputsAt(kg, tbsa).get(id) ?? Number.NaN) / (kg * tbsa);
    const combined = (kg: number, tbsa: number): number =>
      perUnit("resuscitation_plus_maint_24h_ml", kg, tbsa);

    // The 40% TBSA pair printed in the caution and the notes.
    expect(combined(10, 40)).toBeCloseTo(5.5, 10);
    expect(combined(25, 40)).toBeCloseTo(4.6, 10);
    expect(combined(60, 40)).toBeCloseTo(3.9583, 3);
    // The 20% TBSA trio.
    expect(combined(8, 20)).toBeCloseTo(8.0, 6);
    expect(combined(25, 20)).toBeCloseTo(6.2, 6);
    expect(combined(60, 20)).toBeCloseTo(4.9166, 3);

    // The mechanism itself, asserted separately from the sum: it is the
    // MAINTENANCE term per kg per %TBSA that declines, while resuscitation stays
    // flat at 3. Asserting only the combined figure would pass against a score
    // that got the same curve by tapering the coefficient instead.
    for (const tbsa of [20, 40]) {
      let previous = Number.POSITIVE_INFINITY;
      for (const kg of [10, 25, 60]) {
        expect(perUnit("resuscitation_24h_ml", kg, tbsa)).toBeCloseTo(3, 10);
        const maintenancePerUnit = perUnit("maintenance_24h_ml", kg, tbsa);
        expect(
          maintenancePerUnit,
          `maintenance per kg per %TBSA must fall as weight rises (${kg} kg @ ${tbsa}%)`,
        ).toBeLessThan(previous);
        previous = maintenancePerUnit;
      }
    }
    expect(perUnit("maintenance_24h_ml", 10, 40)).toBeCloseTo(2.5, 10);
    expect(perUnit("maintenance_24h_ml", 25, 40)).toBeCloseTo(1.6, 10);

    // The behaviour is unchanged: the emitted coefficient is still 3, and 6 is
    // never computed.
    const out = outputsAt(25, 20);
    expect(out.get("resuscitation_24h_ml")).toBe(1500);
    expect(out.get("resuscitation_24h_ml")).not.toBe(6 * 25 * 20);
  });

  /**
   * THE FIRST-8-HOUR FIGURE IS A SCHEDULE, NOT A DESCRIPTION OF PRACTICE.
   *
   * The half this score prints is an allocation to titrate away from, and the
   * page has to say so: measured delivery does not follow it, and the 8-h/16-h
   * fraction itself is the part of the formula with the least behind it.
   */
  it("presents the first-8-h figure as a schedule to titrate, not what practice delivers", () => {
    expect(prose, "the fraction must not be presented as a target in itself").toMatch(
      /Titrate to the patient, not to the fraction/i,
    );
    expect(prose, "every output is a starting estimate").toMatch(
      /starting estimate to titrate, never a fixed prescription/i,
    );

    // And the schedule it is set against is still what is emitted: half.
    const out = outputsAt(25, 20);
    const parkland = out.get("resuscitation_24h_ml") ?? Number.NaN;
    expect(out.get("resuscitation_first8h_ml")).toBe(parkland / 2);
  });

  it("offers no inhalation-injury modifier", () => {
    // The output set is fixed; an inhalation branch would change it. Nothing in
    // the evidence base licenses a paediatric inhalation multiplier, so the
    // guard is on the emitted values rather than on prose about them.
    expect(
      outputsAt(25, 20).size,
      "4 volumes + the maintenance rate; resuscitation rates need both new inputs",
    ).toBe(5);
  });

  // ── §0 and §9 — what the window shows, and what is still unsourced ────────
  it("states that no coefficient has an in-window derivation", () => {
    expect(notes).toContain("2016-2026");
    expect(prose, "the coefficient must be labelled convention, not derivation").toMatch(
      /paediatric convention with no primary derivation in the 2016-2026 window/i,
    );
  });

  /**
   * THE CORRECTED CLAIM, PINNED IN BOTH DIRECTIONS.
   *
   * Up to v1.2.1 this page asserted the 8-h/16-h split was absent from the 1968
   * Baxter & Shires original and derived nowhere. That was FALSE. The paper was
   * obtained and read directly from the source PDF on 2026-08-03; p883 both
   * states the split and reports it as the experimentally derived optimum.
   *
   * Two things have to hold together, and asserting only one of them would let
   * the page drift back into a different wrong claim:
   *
   *  (1) the split is sourced to the 1968 primary and said to derive there,
   *      from the source rather than from a secondary restatement;
   *  (2) the derivation's REACH is stated — the test below — because part (1)
   *      alone would overclaim in the opposite direction.
   */
  it("sources the 8-h/16-h split to Baxter & Shires 1968 and says it is derived there", () => {
    expect(notes, "the split must be attributed, not left underived").toMatch(
      /THE 8-H\/16-H SPLIT derives from a canine experiment/,
    );
    expect(notes, "the primary must be stated as read at the source, not via a review").toMatch(
      /Baxter & Shires 1968, read from the source/,
    );
    expect(prose).toMatch(/1968/);

    // The reference must exist and be traceable by that DOI.
    expect(
      burnResuscitation.references.some(
        (r) => "doi" in r && r.doi === "10.1111/j.1749-6632.1968.tb14738.x",
      ),
      "Baxter & Shires 1968 must be a cited reference, not just prose",
    ).toBe(true);

    // The newest changelog entry is the declared version. Asserted relatively,
    // never against a literal, so a release cannot pass it by standing still.
    const newest = burnResuscitation.changelog.at(-1);
    expect(newest?.version).toBe(burnResuscitation.version);
  });

  it("states the derivation's reach — canine, 50% TBSA, and not paediatric", () => {
    expect(prose, "the species must be named").toMatch(/50% TBSA flame-burn dogs/);
    expect(prose, "the endpoints must be named").toMatch(/plasma volume/i);
    expect(prose).toMatch(/functional extracellular fluid/i);
    // The reach: nothing human, nothing paediatric, and no guideline behind it.
    expect(prose).toMatch(/No human or paediatric re-derivation exists/i);
    expect(prose).toMatch(/no guideline states the split/i);

    // The consequence that stops the 1968 paper being over-read: its optimum
    // ratio is not the 50/50 this score emits. That is the load-bearing half —
    // the score ships half, and the derivation's optimum was two-thirds.
    expect(prose).toMatch(/the first 8 h carried two-thirds, not half/);

    // And the halving it is set against must still actually be what is emitted,
    // or the caution describes a mismatch that no longer exists.
    const out = outputsAt(25, 20);
    const parkland = out.get("resuscitation_24h_ml") ?? Number.NaN;
    expect(out.get("resuscitation_first8h_ml")).toBe(parkland / 2);
  });

  // ── The five new references must actually be there and be traceable ───────
  it("cites the five sources this review rests on", () => {
    const refs = burnResuscitation.references;
    const blob = refs.map((r) => r.citation).join("\n");
    for (const name of ["ABRUPT", "Pisano", "German Burn Registry", "Stevens", "AWMF"]) {
      expect(blob, `the ${name} source must be cited`).toContain(name);
    }
    for (const doi of [
      // The 1968 primary, read directly — the reference that corrected the
      // "absent from the original" claim this score carried until v1.3.0.
      "10.1111/j.1749-6632.1968.tb14738.x",
      "10.1097/SLA.0000000000005166",
      "10.1016/j.burns.2020.04.013",
      "10.1007/s00431-024-05797-9",
      "10.1016/j.burns.2022.03.007",
    ]) {
      expect(
        refs.some((r) => "doi" in r && r.doi === doi),
        `reference with DOI ${doi} is missing`,
      ).toBe(true);
    }
    for (const ref of refs) {
      const traceable = "pmid" in ref || "doi" in ref || "url" in ref;
      expect(traceable, `untraceable reference: ${ref.citation.slice(0, 60)}`).toBe(true);
    }
  });

  it("keeps the coefficient caution on the calculator surface, not in the notes only", () => {
    // The one thing a reader must not miss is that the printed volume is a
    // starting estimate from a range of practice, not a prescription — so it
    // belongs on the calculator surface, where the number is, rather than in
    // notes nobody opens under pressure.
    const cautionList = burnResuscitation.cautions ?? [];
    const keys = cautionList.map((c) => c.key);
    expect(keys).toContain("burn.caution.coefficient");
    expect(
      cautionList.map((c) => c.en).join("\n"),
      "the caution must carry the titrate-not-prescribe rule itself",
    ).toMatch(/starting estimate to titrate, never a fixed prescription/i);

    // Every caution is non-trivial and uniquely keyed.
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of cautionList) {
      expect(c.key, "caution keys are namespaced under burn.caution").toMatch(/^burn\.caution\./);
      expect(c.en.length).toBeGreaterThan(120);
    }
  });
});

/**
 * F8 — elapsed time and fluid already given, and the rates they produce.
 *
 * The arithmetic is checked against a single worked patient so the numbers can
 * be followed by hand: 25 kg, 20% TBSA, which is Pisano's own published child
 * and already a worked example above.
 *
 *   24-h resuscitation = 3 x 25 x 20      = 1500 mL
 *   first-8-h half                        =  750 mL
 *   8-24 h half                           =  750 mL
 *   Holliday-Segar maintenance at 25 kg   = 1600 mL  -> 66.666 mL/h flat
 */
describe("F8 — elapsed-time and fluid-given rates", () => {
  const rates = (elapsedH: number, givenL: number, unit = "h") => {
    const outcome = burnResuscitation.compute({
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: elapsedH, unit },
      fluid_given_ml: { value: givenL, unit: "L" },
    } as never);
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return new Map<string, number>();
    return new Map(outcome.result.values.map((v) => [v.id, v.value]));
  };

  it("spreads the untouched first-8-h volume over 8 h when nothing has been given", () => {
    const out = rates(0, 0);
    expect(out.get("resuscitation_first8h_remaining_ml")).toBe(750);
    expect(out.get("resuscitation_first8h_rate_ml_h")).toBeCloseTo(750 / 8, 9); // 93.75
    expect(out.get("resuscitation_next16h_rate_ml_h")).toBeCloseTo(750 / 16, 9); // 46.875
  });

  /**
   * THE CASE THE FEATURE EXISTS FOR. ABRUPT measured a mean 2.9 h from burn to
   * burn-centre arrival and a mean 1553 mL already given. A child arriving at
   * 3 h with 500 mL in has 250 mL left to give over FIVE hours, not 750 over
   * eight — the volume falls and the rate rises, and doing that in your head
   * under pressure is what this replaces.
   */
  it("subtracts pre-arrival fluid and divides by the hours REMAINING", () => {
    const out = rates(3, 0.5);
    expect(out.get("resuscitation_first8h_remaining_ml")).toBe(250); // 750 - 500
    expect(out.get("resuscitation_first8h_rate_ml_h")).toBeCloseTo(250 / 5, 9); // 50
  });

  it("leaves the 8-24 h phase whole, per the chosen reading", () => {
    // Founder decision 2026-08-08: pre-arrival fluid comes off the first-8-h
    // allocation ONLY. The alternative reading reduces both phases. If this
    // ever flips, this assertion is the one that must change first.
    const withFluid = rates(3, 0.5);
    const without = rates(3, 0);
    expect(withFluid.get("resuscitation_next16h_rate_ml_h")).toBe(
      without.get("resuscitation_next16h_rate_ml_h"),
    );
  });

  it("clamps a child who is already ahead to zero rather than a negative volume", () => {
    const out = rates(3, 2); // 2000 mL given against a 750 mL allocation
    expect(out.get("resuscitation_first8h_remaining_ml")).toBe(0);
    expect(out.get("resuscitation_first8h_rate_ml_h")).toBe(0);
  });

  it("drops the first-phase rate once 8 h have passed, keeping the shortfall", () => {
    const out = rates(12, 0.25);
    // The window has closed; the row that remains is a SHORTFALL, and the
    // ABSENCE of the rate row is the signal. 750 - 250 = 500 mL never given.
    expect(out.has("resuscitation_first8h_rate_ml_h")).toBe(false);
    expect(out.get("resuscitation_first8h_remaining_ml")).toBe(500);
    // 8-24 h volume over the 12 h that remain of that phase.
    expect(out.get("resuscitation_next16h_rate_ml_h")).toBeCloseTo(750 / 12, 9); // 62.5
  });

  it("emits no rate at all at exactly 24 h, when the period is over", () => {
    const out = rates(24, 0);
    expect(out.has("resuscitation_first8h_rate_ml_h")).toBe(false);
    expect(out.has("resuscitation_next16h_rate_ml_h")).toBe(false);
    // Maintenance is not part of the resuscitation period and still runs.
    expect(out.get("maintenance_rate_ml_h")).toBeCloseTo(1600 / 24, 9);
  });

  it("never divides by zero at either boundary", () => {
    for (const h of [7.999, 8, 8.001, 23.999, 24]) {
      const out = rates(h, 0);
      for (const [id, v] of out) {
        expect(Number.isFinite(v), `${id} at ${h} h is ${v}`).toBe(true);
      }
    }
  });

  it("accepts the elapsed time in minutes, which is how a burn time is recorded", () => {
    // 180 min = 3 h — must match the hours path exactly, since 8 - elapsed is
    // what the rate divides by.
    const byMinutes = rates(180, 0.5, "min");
    const byHours = rates(3, 0.5);
    expect(byMinutes.get("resuscitation_first8h_rate_ml_h")).toBeCloseTo(
      byHours.get("resuscitation_first8h_rate_ml_h") ?? Number.NaN,
      9,
    );
  });

  it("runs maintenance flat across 24 h, not on the 8/16 split", () => {
    // The one claim of four that survived adversarial verification unanimously.
    for (const h of [0, 3, 8, 12, 24]) {
      expect(rates(h, 0).get("maintenance_rate_ml_h")).toBeCloseTo(1600 / 24, 9);
    }
  });
});

/**
 * R3 (round-2 re-test, 2026-08-09) — the rate had no upper bound.
 *
 * v1.8.0 divided the remaining volume by the hours left, which diverges as the
 * window closes: 7,500 mL/h at 7.9 h, 75,000 mL/h at 7.99 h, for a 25 kg child.
 *
 * THE v1.8.0 TEST ASSERTED `Number.isFinite` AT THESE EXACT BOUNDARIES AND
 * PASSED, because 75,000 is finite. That is the lesson worth keeping: it tested
 * that a number existed, not that it meant anything. These tests assert
 * PLAUSIBILITY instead, as a property swept across the domain rather than at a
 * handful of chosen points.
 */
describe("R3 — no emitted rate exceeds the only cited paediatric ceiling", () => {
  const AWMF = 10; // mL/kg/h, AWMF 006/128 Empfehlung 10

  const ratesFor = (weightKg: number, tbsa: number, elapsedH: number, givenL: number) => {
    const outcome = burnResuscitation.compute({
      weight_kg: { value: weightKg, unit: "kg" },
      tbsa_pct: { value: tbsa, unit: "%" },
      time_since_burn_h: { value: elapsedH, unit: "h" },
      fluid_given_ml: { value: givenL, unit: "L" },
    } as never);
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    if (!outcome.ok) return [];
    return outcome.result.values.filter((v) => v.unit === "mL/h");
  };

  it("never prints a rate above 10 mL/kg/h, anywhere in the domain", () => {
    for (const weight of [0.5, 5, 12, 25, 40, 70, 150]) {
      for (const tbsa of [1, 20, 55, 100]) {
        for (const elapsed of [0, 1, 3, 6, 7, 7.5, 7.9, 7.99, 8, 8.01, 12, 20, 23.9, 23.99, 24]) {
          for (const given of [0, 0.25, 2]) {
            for (const v of ratesFor(weight, tbsa, elapsed, given)) {
              // Maintenance is a flat 24 h drip and is not a resuscitation rate;
              // it is bounded by Holliday-Segar and exempt from this ceiling.
              if (v.id === "maintenance_rate_ml_h") continue;
              const perKg = v.value / weight;
              expect(
                perKg,
                `${v.id} = ${v.value} mL/h = ${perKg.toFixed(1)} mL/kg/h at ${weight} kg, ${tbsa}%, ${elapsed} h, ${given} L given`,
              ).toBeLessThanOrEqual(AWMF);
            }
          }
        }
      }
    }
  });

  it("withholds the rate rather than clamping it, and still shows both halves", () => {
    // 25 kg / 20% at 7.9 h: 750 mL owed over 0.1 h = 7,500 mL/h = 300 mL/kg/h.
    const outcome = burnResuscitation.compute({
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: 7.9, unit: "h" },
      fluid_given_ml: { value: 0, unit: "L" },
    } as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const byId = new Map(outcome.result.values.map((v) => [v.id, v.value]));
    // No rate — and crucially no CLAMPED rate either. A 250 mL/h here would be
    // the page substituting its own number for the formula's.
    expect(byId.has("resuscitation_first8h_rate_ml_h")).toBe(false);
    // Both halves of the division the clinician now has to make themselves.
    expect(byId.get("resuscitation_first8h_remaining_ml")).toBe(750);
    expect(byId.get("resuscitation_first8h_hours_left")).toBeCloseTo(0.1, 9);
  });

  it("still emits an ordinary rate when one is meaningful", () => {
    // Same child at 3 h with 500 mL in: 250 mL over 5 h = 50 mL/h = 2 mL/kg/h.
    const out = ratesFor(25, 20, 3, 0.5);
    const first = out.find((v) => v.id === "resuscitation_first8h_rate_ml_h");
    expect(first?.value).toBeCloseTo(50, 9);
  });

  it("emits nothing rather than NaN when weight and volume conspire", () => {
    // Covers the non-finite guard: at exactly 24 h no phase remains at all.
    const out = ratesFor(25, 20, 24, 0);
    expect(out.filter((v) => v.id !== "maintenance_rate_ml_h")).toHaveLength(0);
    for (const v of out) expect(Number.isFinite(v.value)).toBe(true);
  });
});

/**
 * S1 (round-3 review, 2026-08-09) — the withheld-rate cue.
 *
 * The flag must fire for the RIGHT reason. A row missing because the phase has
 * closed is an ordinary state; a row missing because the rate diverged past the
 * ceiling is a finding about the patient, and only the second warrants saying
 * so on screen.
 */
describe("S1 — the page says when a catch-up rate was withheld", () => {
  const flagFor = (elapsedH: number, givenL: number) => {
    const outcome = burnResuscitation.compute({
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: elapsedH, unit: "h" },
      fluid_given_ml: { value: givenL, unit: "L" },
    } as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return undefined;
    return outcome.result.values.find((v) => v.id === "rate_withheld_above_ceiling")?.value;
  };

  it("fires when the rate diverged past the ceiling", () => {
    // 7.9 h, nothing given: 750 mL over 0.1 h = 300 mL/kg/h.
    expect(flagFor(7.9, 0)).toBe(1);
  });

  it("stays silent when the rate is ordinary", () => {
    expect(flagFor(3, 0.5)).toBeUndefined();
    expect(flagFor(0, 0)).toBeUndefined();
  });

  it("stays silent when a phase has merely CLOSED, which is not the same thing", () => {
    // Past 8 h the first-phase row is absent because there is no window left,
    // not because a computed rate was refused. Flagging that would cry wolf.
    expect(flagFor(12, 0.25)).toBeUndefined();
    // At exactly 24 h no phase remains at all.
    expect(flagFor(24, 0)).toBeUndefined();
  });

  it("is a flag, not a rate — no unit, integer precision", () => {
    const outcome = burnResuscitation.compute({
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: 7.9, unit: "h" },
      fluid_given_ml: { value: 0, unit: "L" },
    } as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const f = outcome.result.values.find((v) => v.id === "rate_withheld_above_ceiling");
    expect(f?.unit).toBe("");
    expect(f?.precision).toBe(0);
  });
});
