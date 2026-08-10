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
 * Round-3 content pins (2026-08-04). The registry gate checks the
 * version/changelog invariant for every score in one loop, so it stops at the
 * first score that breaks — a sibling score failing means VIS's own invariant
 * goes unchecked. It is re-asserted here so this score is never covered only
 * by someone else's passing run.
 *
 * The rest pin the dichotomisation correction. VIS computes no threshold, so
 * nothing about these numbers is reachable through `calculate`: they live only
 * in prose, which is exactly the kind of claim that regresses silently. The
 * specific regression guarded against is the published review's ">15 in the
 * first 24 h", which moves the whole of group 3 (15–19 in the first period)
 * out of the low-VIS arm and into the high one.
 */
describe("vis carries the corrected Gaies 2010 dichotomisation", () => {
  it("declares the version its newest changelog entry describes", () => {
    const dates = vis.changelog.map((e) => e.date);
    expect(dates, "changelog must read oldest-first").toEqual(
      [...dates].sort((a, b) => a.localeCompare(b)),
    );
    expect(vis.version).toBe(vis.changelog[vis.changelog.length - 1]?.version);
    expect(vis.version).toBe("1.4.0");
  });

  it("states all five Table 1 groups across both periods", () => {
    const notes = vis.notes.en;
    // First-24h column, then the 24-48h column, in the table's own order.
    for (const band of ["10–14", "15–19", "20–24", "5–9"]) {
      expect(notes, `Table 1 band ${band} must be stated`).toContain(band);
    }
    expect(
      notes,
      "the two-period assignment rule is what makes the groups mean anything",
    ).toContain("highest group reached in EITHER period");
    expect(notes, "groups 4+5 are the high-VIS arm").toMatch(/groups 4 and 5/i);
  });

  it("defines high VIS by BOTH periods, not by a single first-24h number", () => {
    expect(vis.notes.en).toContain("20 or more in the first 24h OR 15 or more in hours 24–48");
  });

  it("names the wrong ‘>15 in the first 24 h’ reading as wrong rather than repeating it", () => {
    const notes = vis.notes.en;
    expect(notes).toContain("more than 15 in the first 24h");
    // Guarded so the phrase can only ever appear as the thing being corrected.
    const idx = notes.indexOf("more than 15 in the first 24h");
    expect(notes.slice(idx, idx + 260), "must be immediately marked wrong").toContain(
      "that is wrong",
    );
    expect(notes, "and the reason: 15–19 in period one is group 3").toContain("group 3");
  });

  it("records that our own earlier dual-period reading was the one that survived", () => {
    expect(vis.notes.en).toContain("restored rather than silently re-reversed");
  });

  it("gives both Gaies pairings with their rules, now that both are stateable", () => {
    const notes = vis.notes.en;
    expect(notes, "2010 effect size").toContain("8.1");
    expect(notes, "2014 effect size").toContain("6.5");
  });

  it("presents the cut-point spread as a controversy rather than one number", () => {
    const notes = vis.notes.en;
    expect(notes, "no convergence across studies").toContain("10 to 30");
    expect(notes, "paediatric septic shock cut").toContain("cut of 11");
    expect(notes).toContain("78.87%");
    expect(notes).toContain("72.22%");
    expect(notes).toContain("0.779");
    expect(notes, "non-transferability is the point of the spread").toContain(
      "cut-points do not transfer between populations",
    );
    expect(vis.interpretation, "no band may be applied automatically").toHaveLength(0);
  });

  it("explains the newer agents' exclusion by their disagreeing coefficients", () => {
    const notes = vis.notes.en;
    expect(notes).toContain("methylene blue 1 versus 20");
    expect(notes).toContain("angiotensin II 0.25 versus 25");
    expect(notes).toContain("olprinone 10 versus 25");
  });

  /**
   * The excluded coefficients do NOT share a provenance, and a sentence saying
   * they do is a false claim in both directions: it back-dates levosimendan and
   * phenylephrine (2026-07-25 pass) to the 2026-08-04 review, and it marks
   * levosimendan ×50 [NEEDS SOURCE] when vis.md records it confirmed against two
   * independently fetched variant full texts. Nothing computes these numbers, so
   * only prose can carry the error and only prose can catch it.
   */
  it("scopes the 2026-08-04 review attribution to the newer agents only", () => {
    const notes = vis.notes.en;
    expect(notes, "no blanket attribution over every excluded coefficient").not.toContain(
      "Every coefficient named in this paragraph",
    );
    expect(notes, "the newer-agent pairs are what the review supplied").toContain(
      "The three newer-agent pairs above are quoted from the 2026-08-04 review",
    );
  });

  it("keeps levosimendan ×50 sourced and phenylephrine ×10 honestly flagged", () => {
    const notes = vis.notes.en;
    expect(notes, "levosimendan ×50 has primary sourcing — never flag it unsourced").toContain(
      "Levosimendan ×50 is not unsourced at all",
    );
    expect(notes, "and it came from the 2026-07-25 pass, not the 2026-08-04 review").toMatch(
      /Levosimendan ×50 is not unsourced at all[^.]*2026-07-25 verification pass/,
    );
    expect(notes, "phenylephrine ×10 also predates the review").toMatch(
      /Phenylephrine ×10 comes from that same 2026-07-25 pass/,
    );
    expect(notes, "phenylephrine's own gap stays stated").toMatch(
      /Phenylephrine ×10[^.]*\[NEEDS SOURCE\] for a directly fetched primary/,
    );
  });
});
