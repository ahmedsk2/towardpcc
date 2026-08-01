import { expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { fluidBalance } from "./fluid-balance";

/**
 * NO PUBLISHED PAEDIATRIC WORKED EXAMPLE EXISTS for either form of percent
 * cumulative fluid balance.
 *
 * Stated plainly rather than papered over. Neither Goldstein 2001, Sutherland
 * 2010 (which states the formula verbatim), Selewski 2011, Foland 2004, nor the
 * Pediatric ADQI consensus works a paediatric case end to end. The only
 * step-by-step case findable anywhere was a 100 kg ADULT in a device
 * manufacturer's protocol document — not paediatric and not citable as a
 * validation vector.
 *
 * So these cases are CONSTRUCTED from the two published formulae, and the
 * `locator` on every source below says so, following the precedent this
 * repository set for PRISM.
 *
 * AND THIS IS MATERIALLY SAFER THAN PRISM'S EQUIVALENT SITUATION, which is worth
 * saying rather than leaving implied. PRISM's constructed cases stand in for a
 * 26-row threshold table where one mis-transcribed cut point yields a
 * plausible-looking wrong score no reader could catch by inspection. This score
 * is one subtraction and one division. There is no table, no branch and no
 * threshold — nothing to mis-transcribe — and every expected value below can be
 * verified by hand in seconds by anyone reading it.
 *
 * Each case additionally traps a specific way this score is easy to get wrong:
 * the sign of a negative balance, the intake/output order, and above all the
 * DENOMINATOR (both forms divide by the anchor weight, never the current one).
 */
const fluidForm = {
  citation:
    "Sutherland SM, Zappitelli M, Alexander SR, et al. Fluid overload and mortality in children receiving continuous renal replacement therapy. Am J Kidney Dis. 2010;55(2):316-325. Fluid-based formula stated verbatim.",
  pmid: "20042260",
  doi: "10.1053/j.ajkd.2009.10.048",
  locator: "constructed from the formula — no published paediatric worked example exists",
};

const weightForm = {
  citation:
    "Selewski DT, Cornell TT, Lombel RM, et al. Weight-based determination of fluid overload status and mortality in pediatric intensive care unit patients requiring continuous renal replacement therapy. Intensive Care Med. 2011;37(7):1166-1173.",
  pmid: "21533569",
  doi: "10.1007/s00134-011-2231-3",
  locator:
    "constructed from the weight-based formula — no published paediatric worked example exists",
};

const adqi = {
  citation:
    "Selewski DT, Barhight MF, Bjornstad EC, et al.; Pediatric Acute Disease Quality Initiative (ADQI) Consensus Committee. Fluid assessment, fluid balance, and fluid overload in sick children: a report from the Pediatric Acute Disease Quality Initiative (ADQI) conference. Pediatr Nephrol. 2024;39(3):955-979. Table 1 prints both formulae side by side without choosing between them.",
  pmid: "37934274",
  doi: "10.1007/s00467-023-06156-w",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10817849/",
  locator: "constructed from both formulae — no published paediatric worked example exists",
};

describeScore(fluidBalance, (ctx) => {
  // Example 1 (fluid-balance.md): A=10 kg, I=12 L, O=10 L.
  // (12 − 10) × 100 / 10 = +20.0 %; net balance +2000 mL. Exact — no tolerance.
  ctx.workedExample(
    {
      ...fluidForm,
      locator: `${fluidForm.locator}; A=10 kg, I=12 L, O=10 L → (12−10)×100/10 = 20%`,
    },
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
    },
    [
      { id: "pct_cfb_fluid_based", value: 20 },
      { id: "net_fluid_balance_ml", value: 2000 },
    ],
  );

  // Example 2 (fluid-balance.md): NEGATIVE balance — A=20 kg, I=8 L, O=11 L.
  // (8 − 11) × 100 / 20 = −15.0 %; net −3000 mL. A diuresing or ultrafiltered
  // child legitimately runs negative; the result must not be clamped at zero.
  // Also the SWAPPED-INTAKE/OUTPUT trap: reversing the pair gives +15.0 %, a
  // sign error no plausibility bound could catch (see the dedicated test below).
  ctx.workedExample(
    {
      ...fluidForm,
      locator: `${fluidForm.locator}; A=20 kg, I=8 L, O=11 L → (8−11)×100/20 = −15%`,
    },
    {
      anchor_weight: { value: 20, unit: "kg" },
      cumulative_intake: { value: 8, unit: "L" },
      cumulative_output: { value: 11, unit: "L" },
    },
    [
      { id: "pct_cfb_fluid_based", value: -15 },
      { id: "net_fluid_balance_ml", value: -3000 },
    ],
  );

  // Example 3 (fluid-balance.md): the two forms AGREE. A=10, I=12, O=10, W=12.
  // Fluid-based (12−10)×100/10 = 20 %; weight-based (12−10)×100/10 = 20 %.
  // The idealised case: every retained millilitre charted, all mass change fluid.
  ctx.workedExample(
    { ...adqi, locator: `${adqi.locator}; A=10 kg, I=12 L, O=10 L, W=12 kg → both forms 20%` },
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
      current_weight: { value: 12, unit: "kg" },
    },
    [
      { id: "pct_cfb_fluid_based", value: 20 },
      { id: "net_fluid_balance_ml", value: 2000 },
      { id: "pct_cfb_weight_based", value: 20 },
      { id: "weight_change_kg", value: 2 },
    ],
  );

  // Example 4 (fluid-balance.md): the two forms DISAGREE on the same patient.
  // A=10, I=12, O=10, W=11.5 → fluid-based 20.0 %, weight-based 15.0 %. The
  // 5-point gap is ~0.5 L that left the child uncharted (insensible loss), the
  // usual direction of disagreement.
  //
  // THIS IS THE WRONG-DENOMINATOR TRAP, and the single most load-bearing case in
  // the file. Both forms divide by the ANCHOR weight. Dividing the fluid-based
  // form by the current weight would give 2×100/11.5 = 17.4 %; dividing the
  // weight-based form by it would give 1.5×100/11.5 = 13.0 %. Both are
  // plausible-looking wrong numbers and both are excluded here — which only
  // works because anchor ≠ current in this case.
  ctx.workedExample(
    {
      ...adqi,
      locator: `${adqi.locator}; A=10 kg, I=12 L, O=10 L, W=11.5 kg → fluid 20%, weight 15% (denominator is the anchor, not 11.5)`,
    },
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
      current_weight: { value: 11.5, unit: "kg" },
    },
    [
      { id: "pct_cfb_fluid_based", value: 20 },
      { id: "pct_cfb_weight_based", value: 15 },
      { id: "weight_change_kg", value: 1.5 },
    ],
  );

  // Example 5 (fluid-balance.md): WEIGHT-BASED ONLY, neonate. A=3.5 kg,
  // W=3.85 kg → 0.35 × 100 / 3.5 = +10.0 %. No intake/output supplied, so no
  // fluid-based value is emitted. This is the population where the weight-based
  // form is generally preferred. Decimal kilograms leave float residue
  // (0.35 → 10.000000000000002), hence the tolerance.
  ctx.workedExample(
    { ...weightForm, locator: `${weightForm.locator}; A=3.5 kg, W=3.85 kg → 0.35×100/3.5 = 10%` },
    {
      anchor_weight: { value: 3.5, unit: "kg" },
      current_weight: { value: 3.85, unit: "kg" },
    },
    [
      { id: "pct_cfb_weight_based", value: 10, tolerance: 1e-9 },
      { id: "weight_change_kg", value: 0.35, tolerance: 1e-9 },
    ],
  );

  // Example 6 (fluid-balance.md): even balance. I = O → 0.0 %, 0 mL. Not a
  // special case in the arithmetic, and asserted so it never becomes one.
  ctx.workedExample(
    { ...fluidForm, locator: `${fluidForm.locator}; A=10 kg, I=O=10 L → 0%` },
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 10, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
    },
    [
      { id: "pct_cfb_fluid_based", value: 0 },
      { id: "net_fluid_balance_ml", value: 0 },
    ],
  );

  // Example 7 (fluid-balance.md): UNIT CONVERSION, millilitres — the unit every
  // flowsheet actually charts. 12000 mL / 10000 mL convert exactly to 12 L / 10 L
  // and reproduce Example 1 with no tolerance.
  ctx.workedExample(
    {
      ...fluidForm,
      locator: `${fluidForm.locator}; millilitre entry equals example 1: 12000 mL = 12 L, 10000 mL = 10 L`,
    },
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12000, unit: "mL" },
      cumulative_output: { value: 10000, unit: "mL" },
    },
    [
      { id: "pct_cfb_fluid_based", value: 20 },
      { id: "net_fluid_balance_ml", value: 2000 },
    ],
  );

  // Example 8 (fluid-balance.md): UNIT CONVERSION, pounds — BOTH weights convert
  // before anything is computed. 22.0462 lb = 10 kg, 24.25082 lb = 11 kg →
  // 1 × 100 / 10 = 10.0 %. Division by 2.20462 leaves float residue, hence the
  // tolerance; a bug that converted only one of the two weights would be off by
  // more than a factor of two, not by 1e-6.
  ctx.workedExample(
    {
      ...weightForm,
      locator: `${weightForm.locator}; pounds entry: 22.0462 lb = 10 kg anchor, 24.25082 lb = 11 kg current → 10%`,
    },
    {
      anchor_weight: { value: 22.0462, unit: "lb" },
      current_weight: { value: 24.25082, unit: "lb" },
    },
    [
      { id: "pct_cfb_weight_based", value: 10, tolerance: 1e-6 },
      { id: "weight_change_kg", value: 1, tolerance: 1e-6 },
    ],
  );

  // ---- Rejection + boundary coverage -------------------------------------

  const base = {
    anchor_weight: { value: 10, unit: "kg" },
    cumulative_intake: { value: 12, unit: "L" },
    cumulative_output: { value: 10, unit: "L" },
    current_weight: { value: 11, unit: "kg" },
  };

  ctx.boundaryTest("anchor_weight", "min", base);
  ctx.boundaryTest("anchor_weight", "max", base);
  ctx.boundaryTest("cumulative_intake", "min", base);
  ctx.boundaryTest("cumulative_intake", "max", base);
  ctx.boundaryTest("cumulative_output", "min", base);
  ctx.boundaryTest("cumulative_output", "max", base);
  ctx.boundaryTest("current_weight", "min", base);
  ctx.boundaryTest("current_weight", "max", base);

  // A zero anchor weight is not merely implausible, it is the denominator: the
  // formula is undefined there and would return ±Infinity rather than failing
  // loudly. Rejected before any arithmetic runs.
  ctx.rejectsImplausible(
    "a zero anchor weight (the denominator of both forms)",
    { anchor_weight: { value: 0, unit: "kg" } },
    { inputId: "anchor_weight", code: "out-of-range" },
  );

  // Cumulative volumes cannot be negative — that floor is inherent to the
  // quantity, not an engineering choice. A negative intake is almost certainly a
  // sign error on a balance that was meant to go in the output field.
  ctx.rejectsImplausible(
    "a negative cumulative intake",
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: -1, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
    },
    { inputId: "cumulative_intake", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "a negative cumulative output",
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "L" },
      cumulative_output: { value: -1, unit: "L" },
    },
    { inputId: "cumulative_output", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "a zero current weight",
    {
      anchor_weight: { value: 10, unit: "kg" },
      current_weight: { value: 0, unit: "kg" },
    },
    { inputId: "current_weight", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "a volume entered in an unsupported unit",
    {
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "dL" },
      cumulative_output: { value: 10, unit: "L" },
    },
    { inputId: "cumulative_intake", code: "unknown-unit" },
  );

  // ---- Conditional emission ----------------------------------------------
  //
  // Which form appears is the whole design of this score, so each combination is
  // pinned rather than left to follow from the worked examples above.

  const idsFor = (values: Parameters<typeof fluidBalance.compute>[0]): string[] => {
    const outcome = fluidBalance.compute(values);
    expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
    return outcome.ok ? outcome.result.values.map((v) => v.id) : [];
  };

  it("emits only the fluid-based form when just intake and output are supplied", () => {
    expect(
      idsFor({
        anchor_weight: { value: 10, unit: "kg" },
        cumulative_intake: { value: 12, unit: "L" },
        cumulative_output: { value: 10, unit: "L" },
      }),
    ).toEqual(["pct_cfb_fluid_based", "net_fluid_balance_ml"]);
  });

  it("emits only the weight-based form when just a current weight is supplied", () => {
    expect(
      idsFor({
        anchor_weight: { value: 10, unit: "kg" },
        current_weight: { value: 11, unit: "kg" },
      }),
    ).toEqual(["pct_cfb_weight_based", "weight_change_kg"]);
  });

  it("emits both forms when all four inputs are supplied", () => {
    expect(idsFor(base)).toEqual([
      "pct_cfb_fluid_based",
      "net_fluid_balance_ml",
      "pct_cfb_weight_based",
      "weight_change_kg",
    ]);
  });

  // HALF A PAIR IS NOT ZERO. Treating an unsupplied output as "nothing came out"
  // would return a confident wrong percentage instead of an absent one, so the
  // fluid-based form requires both halves. Both orders are pinned because they
  // are different code paths through the `&&`.
  it("emits no fluid-based form when output is missing from the pair", () => {
    expect(
      idsFor({
        anchor_weight: { value: 10, unit: "kg" },
        cumulative_intake: { value: 12, unit: "L" },
        current_weight: { value: 11, unit: "kg" },
      }),
    ).toEqual(["pct_cfb_weight_based", "weight_change_kg"]);
  });

  it("emits no fluid-based form when intake is missing from the pair", () => {
    expect(
      idsFor({
        anchor_weight: { value: 10, unit: "kg" },
        cumulative_output: { value: 10, unit: "L" },
        current_weight: { value: 11, unit: "kg" },
      }),
    ).toEqual(["pct_cfb_weight_based", "weight_change_kg"]);
  });

  // THE DOCUMENTED EMPTY CASE. `required` is a per-input flag and cannot express
  // "at least one of {the intake/output pair, current weight}", so an anchor
  // weight alone validates and computes to nothing. Pinned here so the behaviour
  // is a decision on the record rather than an accident, and so a future change
  // that starts emitting a fabricated 0 % here fails loudly.
  it("computes to no values at all when only the anchor weight is supplied", () => {
    expect(idsFor({ anchor_weight: { value: 10, unit: "kg" } })).toEqual([]);
  });

  // ---- Traps --------------------------------------------------------------

  // SWAPPED INTAKE/OUTPUT. The two fields are adjacent, identically shaped and
  // identically united, so transposing them is the easiest mistake available —
  // and it produces a perfectly plausible number of the wrong sign. Asserting
  // the exact negation is stronger than asserting either value alone.
  it("flips the sign, and only the sign, when intake and output are transposed", () => {
    const anchor = { value: 20, unit: "kg" } as const;
    const forward = fluidBalance.compute({
      anchor_weight: anchor,
      cumulative_intake: { value: 8, unit: "L" },
      cumulative_output: { value: 11, unit: "L" },
    });
    const swapped = fluidBalance.compute({
      anchor_weight: anchor,
      cumulative_intake: { value: 11, unit: "L" },
      cumulative_output: { value: 8, unit: "L" },
    });
    expect(forward.ok && swapped.ok).toBe(true);
    if (!forward.ok || !swapped.ok) return;
    const pct = (r: typeof forward) =>
      r.ok ? r.result.values.find((v) => v.id === "pct_cfb_fluid_based")?.value : undefined;
    expect(pct(forward)).toBe(-15);
    expect(pct(swapped)).toBe(15);
  });

  // WRONG DENOMINATOR, asserted directly rather than only implied by example 4.
  // Both forms divide by the anchor weight. This case is built so that every
  // wrong denominator gives a different, plausible answer: dividing by the
  // current weight gives 17.39 % (fluid) and 13.04 % (weight).
  it("divides both forms by the anchor weight, never the current weight", () => {
    const outcome = fluidBalance.compute({
      anchor_weight: { value: 10, unit: "kg" },
      cumulative_intake: { value: 12, unit: "L" },
      cumulative_output: { value: 10, unit: "L" },
      current_weight: { value: 11.5, unit: "kg" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const byId = new Map(outcome.result.values.map((v) => [v.id, v.value]));
    expect(byId.get("pct_cfb_fluid_based")).toBe(20);
    expect(byId.get("pct_cfb_weight_based")).toBe(15);
    // The two wrong denominators, named so the failure message is unambiguous.
    expect(byId.get("pct_cfb_fluid_based")).not.toBeCloseTo(17.391304347826086, 6);
    expect(byId.get("pct_cfb_weight_based")).not.toBeCloseTo(13.043478260869565, 6);
  });

  // ---- The discipline this score exists to hold ---------------------------
  //
  // The 10 % / 20 % figures are cohort-specific outcome associations measured at
  // CRRT initiation, not thresholds that classify a patient, and ADQI states
  // that no single threshold of positive fluid balance defines fluid overload
  // across all sick children. A future edit that renders them as bands — the
  // single most likely wrong change to this file — fails here.
  it("declares no interpretation bands, and declares that as not-applicable", () => {
    expect(fluidBalance.interpretation).toEqual([]);
    expect(fluidBalance.interpretationStatus).toBe("not-applicable");
  });
});
