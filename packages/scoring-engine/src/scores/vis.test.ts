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

  // Bounds: 0 lower bound is inherent (an infusion cannot be negative); upper
  // bounds are input-validity limits (vis.md [NEEDS SOURCE]).
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
