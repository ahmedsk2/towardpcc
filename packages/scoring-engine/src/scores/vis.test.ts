import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { vis } from "./vis";

// All worked examples are the vectors published in docs/research/scores/vis.md
// ("Worked examples" section), derived step-by-step from the Gaies et al. 2010
// formula (PMID 19794327). VIS is continuous, so outputs use a float tolerance.
const gaies = {
  citation:
    "Gaies MG, et al. Vasoactive-inotropic score ... after cardiopulmonary bypass. Pediatr Crit Care Med. 2010;11(2):234–238.",
  pmid: "19794327",
};

const TOL = 1e-9;

describeScore(vis, (ctx) => {
  // Example 1 (vis.md): dopamine 5 + 100×epinephrine 0.05 = 5 + 5 = 10.
  // Non-running drugs omitted (default 0 contribution).
  ctx.workedExample(
    { ...gaies, locator: "Worked example 1 — inotrope-only, VIS = 10" },
    {
      dopamine: { value: 5, unit: "mcg/kg/min" },
      epinephrine: { value: 0.05, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 10, tolerance: TOL }],
  );

  // Example 2 (vis.md): 5 + 0 + 100×0.1 + 10×0.5 + 10000×0.0003 + 100×0.1
  //                   = 5 + 10 + 5 + 3 + 10 = 33.
  ctx.workedExample(
    { ...gaies, locator: "Worked example 2 — multi-agent with vasopressin, VIS = 33" },
    {
      dopamine: { value: 5, unit: "mcg/kg/min" },
      epinephrine: { value: 0.1, unit: "mcg/kg/min" },
      milrinone: { value: 0.5, unit: "mcg/kg/min" },
      vasopressin: { value: 0.0003, unit: "units/kg/min" },
      norepinephrine: { value: 0.1, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 33, tolerance: TOL }],
  );

  // Example 2 re-entered with vasopressin in milliunits/kg/min (0.3 → 0.0003):
  // the unit conversion must reproduce VIS = 33 (the documented unit trap).
  ctx.workedExample(
    { ...gaies, locator: "Worked example 2 — vasopressin entered as milliunits/kg/min, VIS = 33" },
    {
      dopamine: { value: 5, unit: "mcg/kg/min" },
      epinephrine: { value: 0.1, unit: "mcg/kg/min" },
      milrinone: { value: 0.5, unit: "mcg/kg/min" },
      vasopressin: { value: 0.3, unit: "milliunits/kg/min" },
      norepinephrine: { value: 0.1, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 33, tolerance: TOL }],
  );

  // Example 3 (vis.md): all drugs 0 (all inputs omitted) → VIS = 0.
  ctx.workedExample(
    { ...gaies, locator: "Worked example 3 — no vasoactive support, VIS = 0" },
    {},
    [{ id: "vis", value: 0, tolerance: TOL }],
  );

  // The two numbers the 2026-08-04 dichotomisation correction turns on, pinned as
  // arithmetic so a future silent re-reversal cannot pass. Gaies 2010 Table 1 (p235)
  // puts group 4 at 20–24 in the FIRST 24h and 15–19 in hours 24–48; groups 4+5 are
  // the high-VIS arm, so high VIS = max ≥20 in the first 24h OR ≥15 in hours 24–48.
  // 15 is therefore a SECOND-period boundary — a published review's ">15 in the first
  // 24h" reading would drag the whole of group 3 (15–19 first period) into the high arm.
  // The calculator applies neither number; it emits the continuous VIS these compare against.
  ctx.workedExample(
    {
      ...gaies,
      locator: "Table 1 p235 — VIS = 20, the group-4 lower bound for the FIRST 24 h",
    },
    {
      dopamine: { value: 10, unit: "mcg/kg/min" },
      epinephrine: { value: 0.1, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 20, tolerance: TOL }],
  );

  ctx.workedExample(
    {
      ...gaies,
      locator:
        "Table 1 p235 — VIS = 15, the group-4 lower bound for hours 24–48 (NOT the first-period cut)",
    },
    {
      dopamine: { value: 5, unit: "mcg/kg/min" },
      epinephrine: { value: 0.1, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 15, tolerance: TOL }],
  );

  // Example 4 core-VIS portion (vis.md): dopamine 3 + 100×0.05 + 10×0.25
  //                                    = 3 + 5 + 2.5 = 10.5 (levosimendan term excluded).
  ctx.workedExample(
    { ...gaies, locator: "Worked example 4 (core Gaies VIS on same inputs) = 10.5" },
    {
      dopamine: { value: 3, unit: "mcg/kg/min" },
      epinephrine: { value: 0.05, unit: "mcg/kg/min" },
      milrinone: { value: 0.25, unit: "mcg/kg/min" },
    },
    [{ id: "vis", value: 10.5, tolerance: TOL }],
  );

  // Bounds: 0 lower bound is inherent (an infusion cannot be negative); the upper
  // bounds are a local input-validity convention — no per-drug maximum dose is
  // published for VIS (confirmed absent, vis.md), so nothing here is clinical.
  ctx.boundaryTest("dopamine", "min", {});
  ctx.boundaryTest("dopamine", "max", {});
  ctx.boundaryTest("epinephrine", "max", {});
  ctx.boundaryTest("vasopressin", "min", {});
  ctx.boundaryTest("vasopressin", "max", {});

  ctx.rejectsImplausible(
    "a negative dopamine infusion rate",
    { dopamine: { value: -1, unit: "mcg/kg/min" } },
    { inputId: "dopamine", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "a vasopressin rate above the units/kg/min validity ceiling (likely a milliunits mix-up)",
    { vasopressin: { value: 0.02, unit: "units/kg/min" } },
    { inputId: "vasopressin", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "vasopressin entered in an unsupported unit",
    { vasopressin: { value: 3, unit: "mcg/kg/min" } },
    { inputId: "vasopressin", code: "unknown-unit" },
  );
});

/**
 * Content pins. The registry gate checks the version/changelog invariant for
 * every score in one loop, so it stops at the first score that breaks — a
 * sibling score failing means VIS's own invariant goes unchecked. It is
 * re-asserted here so this score is never covered only by someone else's
 * passing run.
 *
 * The rest guard claims that `calculate` cannot reach: VIS computes no
 * threshold, so these live only in prose, which is exactly the kind of claim
 * that regresses silently. Each one stops a specific WRONG statement — none of
 * them requires the notes to be long, so condensing the text is free and only
 * re-introducing an error costs anything.
 */
describe("vis carries the corrected Gaies 2010 dichotomisation", () => {
  it("declares the version its newest changelog entry describes", () => {
    const dates = vis.changelog.map((e) => e.date);
    expect(dates, "changelog must read oldest-first").toEqual(
      [...dates].sort((a, b) => a.localeCompare(b)),
    );
    expect(vis.version).toBe(vis.changelog[vis.changelog.length - 1]?.version);
    expect(vis.version).toBe("1.0.0");
  });

  it("defines high VIS by BOTH periods, not by a single first-24h number", () => {
    expect(vis.notes.en, "Gaies 2010 dichotomised on two windows, not one").toContain(
      "20 or more in the first 24 h or 15 or more in hours 24–48",
    );
  });

  it("attaches the 15 threshold only to hours 24–48, never to the first 24 h", () => {
    const notes = vis.notes.en;
    // The regression guarded against is a published review's ">15 in the first
    // 24 h", which drags the whole of Gaies 2010's group 3 (15–19 in the first
    // period) out of the low-VIS arm and into the high one. Rather than require
    // the wrong phrase be quoted and corrected — prose the notes no longer
    // carry — every occurrence of the number has to sit in the SECOND window,
    // so a first-period reading of 15 fails here however it comes back worded.
    const positions: number[] = [];
    for (let i = notes.indexOf("15"); i !== -1; i = notes.indexOf("15", i + 1)) {
      positions.push(i);
    }
    expect(positions.length, "the 15 threshold must still be stated").toBeGreaterThan(0);
    for (const at of positions) {
      expect(
        notes.slice(at, at + 30),
        "15 is a second-period boundary in Gaies 2010, never a first-24h cut",
      ).toContain("hours 24–48");
    }
  });

  it("gives both Gaies pairings with their rules, now that both are stateable", () => {
    const notes = vis.notes.en;
    expect(notes, "2010 effect size").toContain("8.1");
    expect(notes, "2014 effect size").toContain("6.5");
  });

  it("applies no cut-point, and says why none is applied", () => {
    const notes = vis.notes.en;
    expect(notes, "no cohort's cut-point may be presented as the cut-point").toContain(
      "No cut-point is applied",
    );
    expect(notes, "the reported optima do not converge on one number").toContain("roughly 10–30");
    expect(vis.interpretation, "no band may be applied automatically").toHaveLength(0);
  });

  it("excludes the newer agents as a decision, not as an oversight", () => {
    const notes = vis.notes.en;
    expect(notes, "the exclusion is a positive decision, not a gap").toContain(
      "excluded as a positive decision",
    );
    expect(notes, "and the reason is that the proposed coefficients disagree").toContain(
      "disagree up to 100-fold",
    );
    // "The output is always a true Gaies VIS" stays true only while the inputs
    // ARE the Gaies six: a seventh drug would falsify that sentence without
    // touching a word of it, so pin the roster the sentence is claiming.
    expect(
      vis.inputs.map((i) => i.id),
      "phenylephrine and the newer agents are absent by decision",
    ).toEqual([
      "dopamine",
      "dobutamine",
      "epinephrine",
      "milrinone",
      "vasopressin",
      "norepinephrine",
    ]);
  });

  it("keeps the input maxima flagged as local bounds with no clinical authority", () => {
    const notes = vis.notes.en;
    // The maxima are this project's own convention. Nothing may present them as
    // dosing guidance, and no source may be implied for a ceiling VIS does not
    // publish — the absence was searched for and confirmed, not merely unfound.
    expect(notes, "no published per-drug ceiling may be implied").toContain(
      "No per-drug dose ceilings are published for VIS",
    );
    expect(notes, "the maxima carry no clinical authority").toContain(
      "local validity bounds with no clinical authority",
    );
  });
});
