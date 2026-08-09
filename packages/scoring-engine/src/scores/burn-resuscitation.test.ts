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
   * 4 kg because 100 mL/kg/day over-estimates a term neonate and a weight input
   * cannot implement an age-based scope rule. This score applies it from 0.5 kg.
   * Left unstated, the identical formula would be guarded on one page and
   * unguarded on the other, and a 1 kg patient would get a maintenance volume
   * here that the maintenance page refuses to compute at all.
   *
   * The resolution is disclosure, not a raised floor — burn resuscitation
   * applies to infants and rejecting a burned 3 kg neonate would withhold the
   * resuscitation volume too. So three things are asserted together, and any one
   * alone would leave a different wrong impression:
   *
   *  (1) the other score's floor is READ OFF IT, not hard-coded, so if that floor
   *      ever moves and this prose does not, this test fails rather than the two
   *      pages drifting apart again in silence;
   *  (2) the disclosure names which outputs the limit bites (maintenance, and the
   *      combined total containing it) and which it does not (both resuscitation
   *      figures), because "this page has a limitation" is not actionable;
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
    // Named by slug, so a reader can actually reach the other page.
    expect(prose).toContain("holliday-segar");
    expect(prose, "the other score's behaviour must be stated, not hinted at").toMatch(
      /refuses to compute below/i,
    );
    // The reason has to travel with it, or the limit reads as arbitrary.
    expect(prose).toMatch(/over-estimates a term neonate/i);
    expect(prose).toMatch(/70-80 mL\/kg\/day/);
    // The age-vs-weight impossibility IS the argument; without it the floor
    // reads as an arbitrary number somebody picked.
    expect(prose).toMatch(/weight input cannot implement/i);
    expect(prose, "the scopes must be said to be written in age").toMatch(
      /written in AGE|excludes? neonates .{0,40}\bAGE\b/,
    );
  });

  it("says which outputs the maintenance scope limit bites and which it does not", () => {
    expect(prose, "the divergence must be stated as deliberate").toMatch(
      /deliberate|by decision, not by oversight|on purpose/i,
    );
    expect(prose, "the reason for not raising this score's floor must be given").toMatch(
      /burned 3 kg neonate/i,
    );
    expect(prose, "the affected outputs must be named").toMatch(/combined total/i);
    expect(prose, "the unaffected outputs must be named").toMatch(
      /resuscitation (outputs|figures) are unaffected|resuscitation figures stand/i,
    );
    expect(prose, "the reader needs a replacement, not just a warning").toMatch(
      /day-of-life ladder/i,
    );
    // The direction matters: it compounds fluid creep rather than offsetting it.
    expect(prose).toMatch(/over-estimat\w* (of )?maintenance|OVER-estimating maintenance/i);
    // And the 4 kg is not to acquire a false pedigree on this page either.
    expect(prose).toMatch(/no guideline (anywhere )?states a weight below which/i);

    // It must be on the CALCULATOR surface, not in the notes only — this is the
    // one limitation that changes what a printed number means for a whole
    // population this score explicitly accepts.
    const keys = burnResuscitation.cautions?.map((c) => c.key) ?? [];
    expect(keys).toContain("burn.caution.maintenance-neonatal-scope");
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
    for (const figure of ["20", "30", "40"]) {
      expect(prose, `the maintenance-threshold range must name ${figure} kg`).toContain(figure);
    }
    expect(prose).toContain("Pisano");
    expect(prose).toMatch(/age under 1 year/i);
    expect(prose).toMatch(/no weight threshold/i);
    expect(prose).toContain("AWMF");
  });

  // ── §5 — the clock, and the gap this calculator USED to have ──────────────
  //
  // This test asserted the ABSENCE of a rate output until v1.8.0, and verified
  // that absence against the emitted values. It is INVERTED rather than
  // deleted: the prose that announced the gap is now a retraction, and the
  // retraction has to be as load-bearing as the claim it replaces.
  it("keeps the clock language and the ABRUPT figure that made the gap concrete", () => {
    expect(notes).toMatch(/TIME OF THE BURN/);
    // ABRUPT's measured pre-arrival volume is the number that made the gap
    // concrete rather than theoretical, and it is why the feature exists.
    expect(prose, "the mean pre-arrival volume must be stated").toContain("1553");
    expect(prose, "the 2.9 h burn-to-arrival mean must survive").toContain("2.9");
  });

  it("retracts the old 'no infusion rate' claim in place rather than deleting it", () => {
    // The file's established style: a claim that reached a reader is withdrawn
    // visibly, not quietly reworded. A reader who was told to do the arithmetic
    // by hand is owed the correction.
    expect(notes).toMatch(/UNTIL v1\.8\.0, AND NO LONGER DOES/i);
    expect(notes).toMatch(/retraction/i);
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
    expect(prose, "the >30 kg span must be stated").toContain("0.3-1.0");
    expect(prose, "the Stevens protocol band must be named").toContain("0.3-0.7");
    expect(prose).toContain("0.8-1.2");
    expect(prose, "the banding variable is itself disputed").toMatch(/developmental stage/i);
    expect(prose).toMatch(/1-2 mL\/kg\/h/);
  });

  /**
   * CONTROVERSY 9 IS PRACTICE VARIATION, NOT A DISPUTE ABOUT THE COEFFICIENT.
   *
   * Up to v1.5.0 controversy 9 pitted 3 against ~6 as rival figures for the same
   * quantity, which the Graves reconciliation shows was a category error. The
   * entry is rewritten rather than deleted, because something real survives it:
   * centres START in the range 2-4 with no modal value while delivering near
   * 6.35, and three of five centres' own guideline estimates came out
   * significantly BELOW their own delivery. That is a protocol-to-bedside gap.
   *
   * Asserting the p-values matters as much as the means: without them a future
   * edit could soften "significantly below" into "somewhat below" and lose the
   * only part of the finding that is statistically load-bearing.
   */
  it("states controversy 9 as practice variation, with the range and the three gaps", () => {
    expect(notes, "controversy 9 must survive, reframed").toMatch(
      /PAEDIATRIC STARTING COEFFICIENT ITSELF/,
    );
    expect(prose, "the starting range must be shown rather than a single figure").toMatch(
      /2, 3 or 4|2 to 4/,
    );
    expect(prose, "there is no modal starting value, and that must be said").toMatch(
      /no modal value/i,
    );
    // Delivered volume, and the three centres whose own guidelines undershot it.
    expect(prose).toContain("6.35");
    for (const [estimate, p] of [
      ["4.53", "p<0.001"],
      ["4.90", "p=0.002"],
      ["3.38", "p<0.0001"],
    ] as const) {
      expect(prose, `the ${estimate} vs 6.35 gap must be stated`).toContain(estimate);
      expect(prose, `the ${estimate} gap's significance must be stated`).toContain(p);
    }
    // And it must be framed as protocol-versus-practice, not as evidence that a
    // starting coefficient is too low — that is the claim being retracted.
    expect(prose).toMatch(
      /protocol[- ](to[- ])?(bedside|against practice)|Protocol against practice/i,
    );
    expect(prose).toMatch(
      /not evidence that (a|the printed) (starting )?coefficient is (set )?too low/i,
    );
  });

  // ── §7.3 — the best limitations line available ────────────────────────────
  it("carries Pisano's five-centre spread, and lands this score at the bottom of it", () => {
    expect(prose).toContain("1500 mL to 3560 mL");
    expect(prose).toContain("3.0 to 7.1");

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
    expect(notes).toMatch(/FLUID CREEP/);
  });

  // ── §8 — the eight controversies, surfaced as controversies ───────────────
  it("surfaces the adult-coefficient controversy with both sides and both sample sizes", () => {
    expect(prose, "the ABA CPG evidence base must be quantified").toContain("88 patients");
    expect(prose, "ABRUPT's cohort must be quantified").toContain("379");
    expect(prose).toContain("21");
    expect(prose).toMatch(/may not be feasible/i);
    // Neither side may be presented as having superseded the other.
    expect(prose).toMatch(/one year apart|same organisation/i);
    // Both are adult findings.
    expect(prose).toMatch(/adults-only|ADULT findings|adults only/i);
  });

  it("names all nine controversies", () => {
    const marks = [
      /modified Brooke/i, // 2 — the coefficient the name does not fix
      /maintenance/i, // 3 — the weight threshold
      /banding variable|developmental stage/i, // 4
      /0\.3-0\.7/, // 5 — the >30 kg target
      /under-resuscitat/i, // 6 — direction of error
      /Galveston/i, // 7 — BSA vs weight
      /inhalation/i, // 8 — the withdrawn 6 mL modifier
      /PAEDIATRIC STARTING COEFFICIENT ITSELF/i, // 9 — 3 against approximately 6
    ];
    for (const mark of marks) expect(prose, `controversy marker ${mark} missing`).toMatch(mark);
    // And controversy 1, which has its own test above.
    expect(prose).toMatch(/2 mL\/kg\/%TBSA/);
    // The count in the prose must match the list under it. It said EIGHT while
    // the ninth was missing; asserting the word is what stops it going stale again.
    expect(notes).toMatch(/NINE LIVE CONTROVERSIES/);
    expect(notes).not.toMatch(/EIGHT LIVE CONTROVERSIES/);
  });

  /**
   * THE 3 mL COEFFICIENT IS VINDICATED BY ITS OWN PRIMARY — and a warning this
   * score shipped one release earlier is WITHDRAWN here.
   *
   * v1.4.0 and v1.5.0 told readers that children may require approximately
   * 6 mL/kg/%TBSA against the 3 emitted here, and named the failure direction as
   * UNDER-resuscitation of small children. That was a category error. The ~6 is a
   * TOTAL 24-hour volume INCLUDING maintenance; 3 is resuscitation ALONE. Graves
   * 1988 (PMID 3199467) — the primary behind the 6 — reports both from one
   * cohort of 43 children (total 6.3 +/- 2.2, net resuscitation 3.91 +/- 2.2
   * cc/kg/%TBSB) and recommends supplying maintenance and initiating
   * resuscitation at 3, which is this score's exact structure.
   *
   * Four things are asserted together, because any one alone would leave a
   * different wrong impression:
   *
   *  (1) the retraction is VISIBLE — named as wrong and pinned to the versions
   *      that carried it, not quietly reworded. A reader was told this
   *      calculator might be under-dosing their patient; a silent rewrite would
   *      never reach them.
   *  (2) the reconciliation is SOURCED, with the primary's two figures and its
   *      recommendation quoted, rather than asserted as a compatibility claim;
   *  (3) the weight-dependence is stated AND verified against `compute` at two
   *      weights, because that is what makes this a reconciliation instead of an
   *      arithmetic coincidence — and it is the reason a flat 6 overhydrates the
   *      large child while this two-part shape does not;
   *  (4) the old under-resuscitation framing is asserted GONE, so a stale
   *      sentence cannot sit beside the retraction telling the reader the
   *      opposite.
   *
   * The coefficient is still 3 and the sweep in the first test of this block is
   * what holds it there — the finding vindicates the constant, so an edit moving
   * it upward now fails for a stronger reason than before.
   */
  it("withdraws the under-resuscitation warning and reconciles 3 against the ~6 total", () => {
    // ── (1) The retraction, visible and pinned to the releases that carried it ─
    expect(prose, "the withdrawn warning must be named as withdrawn").toMatch(
      /THAT WARNING IS WITHDRAWN/,
    );
    expect(notes, "the retracted framing must be named as wrong").toMatch(/THAT FRAMING WAS WRONG/);
    expect(notes, "the versions that carried it must be named").toMatch(/1\.4\.0 and 1\.5\.0/);
    expect(notes).toMatch(/rather than quietly reworded/i);
    // And it must reach the calculator surface, not the notes only — the claim
    // being withdrawn was itself displayed as a caution.
    const keys = burnResuscitation.cautions?.map((c) => c.key) ?? [];
    expect(keys).toContain("burn.caution.peds-coefficient-reconciled");
    expect(keys, "the contested-framing caution must not survive alongside it").not.toContain(
      "burn.caution.peds-coefficient-contested",
    );

    // ── (2) The reconciliation, sourced ───────────────────────────────────────
    expect(prose, "the two quantities must be distinguished").toMatch(
      /TOTAL 24-hour (fluid|volume)[^.]{0,40}INCLUD\w*\s+maintenance/i,
    );
    expect(prose).toMatch(/Graves/);
    expect(prose, "the TOTAL figure must be stated").toMatch(/6\.3 \+\/- 2\.2/);
    expect(prose, "the NET resuscitation figure is the load-bearing one").toMatch(
      /3\.91 \+\/- 2\.2/,
    );
    expect(prose, "the recommendation is quoted because it is the clearest statement").toContain(
      "supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/% TBSB",
    );
    // Corroboration that the larger circulating figure is a total, not a coefficient.
    expect(prose).toMatch(/Merrell/);
    expect(prose).toMatch(/5\.8 \+\/- 0\.25/);
    expect(prose).toMatch(/177 children/);
    // Palmieri stays cited — for the clause that now supports the two-part shape.
    expect(prose).toMatch(/Palmieri/);
    expect(prose, "the source must still be marked as read in full").toMatch(/read in full/i);
    expect(prose, "the quoted clause must be carried").toMatch(
      /underestimate needs in small children and overhydrate large children/,
    );
    // Both new primaries must be traceable references, not prose-only claims.
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

    // ── (3) The weight-dependence, verified rather than asserted ──────────────
    // Maintenance per kg per %TBSA FALLS as weight rises, so 3 + maintenance
    // approximates 6 in an infant and deliberately less in a larger child. That
    // is the whole reconciliation, so it is checked against `compute` at both
    // burn sizes the page prints worked numbers for.
    const perUnit = (id: string, kg: number, tbsa: number): number =>
      (outputsAt(kg, tbsa).get(id) ?? Number.NaN) / (kg * tbsa);
    const combined = (kg: number, tbsa: number): number =>
      perUnit("resuscitation_plus_maint_24h_ml", kg, tbsa);

    // The 40% TBSA pair printed in the caution and the notes.
    expect(combined(10, 40)).toBeCloseTo(5.5, 10);
    expect(combined(25, 40)).toBeCloseTo(4.6, 10);
    expect(combined(60, 40)).toBeCloseTo(3.9583, 3);
    // The 20% TBSA trio, retained from v1.4.0: the arithmetic was always right,
    // only the conclusion drawn from it was wrong.
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

    // ── (4) The withdrawn framing must be GONE, not merely outweighed ─────────
    expect(notes).not.toMatch(/NOT STRAIGHTFORWARDLY CONTRADICTORY/i);
    expect(prose).not.toMatch(/may systematically UNDER-resuscitate/i);
    expect(prose).not.toMatch(/contested from the OTHER side/i);
    expect(prose).not.toMatch(/differing by a factor of two/i);
    expect(prose, "the 3 must not still be presented as possibly too low").not.toMatch(
      /in a SMALL child it may under-resuscitate/i,
    );

    // The behaviour is unchanged: the emitted coefficient is still 3, and 6 is
    // discussed, never computed.
    const out = outputsAt(25, 20);
    expect(out.get("resuscitation_24h_ml")).toBe(1500);
    expect(out.get("resuscitation_24h_ml")).not.toBe(6 * 25 * 20);
  });

  /**
   * THE DELIVERY SHAPE — the first-8-hour figure is a schedule, not a
   * description of practice.
   *
   * The bidirectional finding is the load-bearing one: at the eight-hour mark
   * the rate went DOWN in 16 patients and UP in 15. A test asserting only "the
   * rate changes" would pass against a page that said practice front-loads even
   * harder, which is the opposite of what was measured.
   */
  it("carries the observed delivery shape, in both directions, with its limits", () => {
    expect(prose).toMatch(/6\.7/);
    expect(prose, "the proportion exceeding prediction must be stated").toMatch(/84%/);
    expect(prose, "the downward arm must be stated").toMatch(/34%/);
    expect(prose, "the upward arm must be stated").toMatch(/47%/);
    expect(prose).toMatch(/P<0\.001/);
    expect(prose, "the finding is bidirectional, not a single direction").toMatch(
      /bidirectional|DECREASED[\s\S]{0,120}INCREASED/,
    );
    // The three qualifications that stop it being over-read.
    expect(prose).toMatch(/n=31|31 adults/);
    expect(prose).toMatch(/PRE-WINDOW|pre-2016|pre-window/i);
    // The eight-hour boundary's rationale is a secondary attribution with a
    // hedge, and must not read as something the 1968 primary states.
    expect(notes).toMatch(/myocardial depression/i);
    expect(notes).toMatch(/not clearly enumerated/i);

    // And the schedule it is set against is still what is emitted: half.
    const out = outputsAt(25, 20);
    const parkland = out.get("resuscitation_24h_ml") ?? Number.NaN;
    expect(out.get("resuscitation_first8h_ml")).toBe(parkland / 2);

    // The reference must be traceable, not prose-only.
    expect(
      burnResuscitation.references.some((r) => "pmid" in r && r.pmid === "12142578"),
      "Cartotto 2002 must be a cited reference",
    ).toBe(true);
  });

  it("offers no inhalation-injury modifier, and says why", () => {
    expect(prose).toMatch(/no inhalation modifier|offers no inhalation/i);
    expect(prose).toContain("2019");
    // The output count is fixed at six; an inhalation branch would change it.
    expect(
      outputsAt(25, 20).size,
      "4 volumes + the maintenance rate; resuscitation rates need both new inputs",
    ).toBe(5);
  });

  // ── §0 and §9 — what the window shows, and what is still unsourced ────────
  it("states that no coefficient has an in-window derivation", () => {
    expect(notes).toContain("2016-2026");
    expect(notes).toMatch(
      /restatement, practice audit or consensus|restatement, practice audit, or consensus|restatement, audit or consensus/i,
    );
  });

  /**
   * SETTLED-ABSENT IS NOT THE SAME CLAIM AS UNFOUND, AND THE DISTINCTION IS THE
   * WHOLE POINT OF THIS TEST.
   *
   * "[NO SOURCE]" reads as an unfinished search and invites the next reader to
   * repeat it. Each of these five was searched and established not to exist — no
   * human or paediatric re-derivation of the 8-h/16-h split and no guideline
   * stating it, no derivation of any maintenance weight threshold, no study
   * fixing the paediatric urine-output goal, no paediatric ABA CPG, and no
   * head-to-head outcome trial of the three formulas. Recording that as closed
   * is what stops the work being redone.
   *
   * GAP 1 IS NARROWED, AND THE REGEX BELOW IS WHAT HOLDS IT NARROW. It used to
   * read "the derivation of the 8-h/16-h split", which was false — Baxter &
   * Shires 1968 derives it, in dogs. Only the human, paediatric and
   * guideline-level evidence is absent, so the topic is asserted in its narrowed
   * wording: a future edit widening it back to the whole topic fails here.
   *
   * What must NOT happen is the opposite error: a later edit deleting the
   * markers entirely, which would leave the page implying these numbers are
   * evidence-based. So both halves are asserted — the five topics survive AND
   * they carry the settled label, with none of the old open-search markers left
   * behind to contradict it.
   */
  it("records all eight gaps as SETTLED-ABSENT rather than as unfinished searches", () => {
    for (const topic of [
      /HUMAN or PAEDIATRIC re-derivation of the 8-h\/16-h split/,
      /20, 30 or 40 kg/,
      /optimal (paediatric )?hourly (urine-output )?goal|optimal hourly urine-output goal/i,
      /paediatric equivalent of the ABA CPG|no paediatric equivalent/i,
      /head-to-head/i,
      // Added 2026-08-04. (6) and (7) are the sharp ones: the fraction has never
      // been tested against outcomes, and the observed proportion has never been
      // published even though multicentre datasets hold the hourly volumes.
      /8h:16h FRACTION/,
      /0-8h versus 8-24h delivery proportion/,
      /paediatric-derived upper volume bound/,
    ]) {
      expect(notes, `the ${topic} gap must still be stated`).toMatch(topic);
    }

    // Eight topics, each labelled, and the count word must match the list — the
    // failure mode here is a list that grows while the sentence above it still
    // says five.
    expect((notes.match(/\[SETTLED-ABSENT\]/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(notes).toContain("EIGHT THINGS ARE [SETTLED-ABSENT]");
    expect(notes).not.toContain("FIVE THINGS ARE [SETTLED-ABSENT]");
    expect(notes).toContain("[SETTLED-ABSENT], WHICH IS A STRONGER STATEMENT THAN 'NOT FOUND'");

    // No stale open-search marker may survive alongside the settled ones, in
    // either spelling — a page that says both is telling the reader two things.
    expect(notes).not.toContain("[NO SOURCE]");
    expect(notes).not.toContain("[NEEDS SOURCE]");
  });

  /**
   * THE CORRECTED CLAIM, PINNED IN BOTH DIRECTIONS.
   *
   * Up to v1.2.1 this page asserted the 8-h/16-h split was absent from the 1968
   * Baxter & Shires original and derived nowhere. That was FALSE. The paper was
   * obtained and read directly from the source PDF on 2026-08-03; p883 both
   * states the split and reports it as the experimentally derived optimum.
   *
   * Three things have to hold together, and asserting only one of them would let
   * the page drift back into a different wrong claim:
   *
   *  (1) the split is sourced to the 1968 primary and said to be derived there;
   *  (2) the derivation's REACH is stated — dogs, 50% TBSA flame burn, plasma
   *      volume and functional ECF, not a human outcome trial and not paediatric.
   *      Part (1) without part (2) would overclaim in the opposite direction, and
   *      that is the failure this half of the test exists to prevent;
   *  (3) the residual gap survives, narrowed: no human re-derivation, nothing
   *      paediatric, and no guideline-level statement.
   *
   * The old claim is also asserted GONE, in both of its spellings, so a stale
   * sentence cannot sit alongside the correction telling the reader the opposite.
   */
  it("sources the 8-h/16-h split to Baxter & Shires 1968 and says it is derived there", () => {
    expect(notes).toMatch(/Baxter & Shires/);
    expect(prose).toMatch(/1968/);
    expect(notes).toContain("10.1111/j.1749-6632.1968.tb14738.x");
    expect(notes, "the primary must be stated as read directly, not via a review").toMatch(
      /READ DIRECTLY FROM THE SOURCE PDF|read directly from the source PDF/,
    );
    expect(notes).toMatch(/IS derived there|it IS derived/);

    // The paper's own dose figures, as paraphrase — the evidence that it is in
    // there at all rather than an assertion that it is.
    expect(prose).toMatch(/16-20%/);
    expect(prose).toMatch(/8-10%/);

    // The reference must exist and be traceable by that DOI.
    expect(
      burnResuscitation.references.some(
        (r) => "doi" in r && r.doi === "10.1111/j.1749-6632.1968.tb14738.x",
      ),
      "Baxter & Shires 1968 must be a cited reference, not just prose",
    ).toBe(true);

    // The old qualifier is gone: it said the primary had not been read, and it
    // had. No spelling of it may survive.
    expect(notes).not.toMatch(/not been read directly/i);
    expect(notes).not.toMatch(/settled-absent pending/i);

    // The old claim may still APPEAR — it has to, to be retracted — but only
    // inside the retraction. So the retraction itself is what is asserted:
    // named as wrong, and pinned to the versions that carried it, rather than
    // the text being quietly reworded and the reader left never knowing.
    expect(notes, "the previous claim must be named as wrong, not reworded away").toMatch(
      /THAT WAS WRONG/,
    );
    expect(notes).toMatch(/v1\.2\.1/);
    expect(notes).toMatch(/rather than quietly reworded/i);
    // And the changelog entry that carries the correction must say so too. It
    // is v1.3.0's entry, and it is NOT the newest any more — later releases have
    // landed on top of it. A retraction that only survives while it happens to
    // be the last entry is not a retraction, so it is looked up by version
    // rather than by position, and the newest-equals-version rule is asserted
    // separately.
    const correction = burnResuscitation.changelog.find((c) => c.version === "1.3.0");
    expect(correction?.summary).toMatch(/CORRECTS A FALSE CLAIM/);
    const newest = burnResuscitation.changelog.at(-1);
    expect(newest?.version).toBe(burnResuscitation.version);
  });

  it("states the derivation's reach — canine, 50% TBSA, and not paediatric", () => {
    expect(prose, "the species must be named").toMatch(/dogs|CANINE|canine/);
    expect(prose).toMatch(/50% TBSA flame burn/);
    expect(prose, "the endpoints must be named").toMatch(/plasma volume/i);
    expect(prose).toMatch(/functional extracellular fluid/i);
    expect(notes).toMatch(/not a human outcome trial/i);
    expect(notes).toMatch(/nothing about it is paediatric|not paediatric/i);

    // The two consequences that stop the 1968 paper being over-read: it fixes
    // the SHAPE, not this score's coefficient, and its optimum ratio is not the
    // 50/50 this score emits. The second is the load-bearing one — the score
    // ships half, and the derivation's optimum was two-thirds.
    expect(prose).toMatch(/PERCENT OF BODY WEIGHT|percent of body weight/);
    expect(prose).toMatch(/two-thirds/);

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

  it("declares a caution for each rule the review states as a rule", () => {
    // Nine since v1.5.0, and still nine at v1.6.0 — the seventh was REPLACED,
    // not removed. The sixth carries the 8-h/16-h correction: the split is
    // derived, in dogs, at a ratio this score does not use. The seventh used to
    // warn that the 3 mL coefficient might be too low against a ~6 mL paediatric
    // figure; at v1.6.0 it carries the withdrawal of that warning and the Graves
    // 1988 reconciliation instead, which is a correction a reader is owed on the
    // calculator surface rather than in the notes only. The eighth is the
    // observed delivery shape, neither half nor two-thirds but bidirectional
    // titration.
    // Both belong on the calculator surface rather than in the notes only,
    // because both change how the printed number should be read. The ninth is
    // the cross-file one: the maintenance component inherits the standalone
    // score's below-4 kg scope limit, which this score discloses instead of
    // enforcing, and that changes what the maintenance and combined figures mean
    // for every patient below it.
    expect(burnResuscitation.cautions).toHaveLength(9);
    // Every caution is non-trivial and uniquely keyed.
    const keys = burnResuscitation.cautions?.map((c) => c.key) ?? [];
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of burnResuscitation.cautions ?? []) {
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
