import { describeScore } from "../testing/harness";
import { bsaMosteller } from "./bsa-mosteller";

// All expected values are derived step-by-step from the Mosteller formula in
// the primary source and reproduced in docs/research/scores/bsa-mosteller.md
// (Worked Examples A–D). BSA is a continuous output, so continuous tolerances
// are used; the exact-rational Example B is pinned tightly.
const mosteller = {
  citation:
    "Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.",
  pmid: "3657876",
  doi: "10.1056/NEJM198710223171717",
};

describeScore(bsaMosteller, (ctx) => {
  // Example A (bsa-mosteller.md): 170 cm, 70 kg → sqrt(11900/3600) = 1.8181 m²
  // (independently cross-checked by an external calculator at 1.8181).
  ctx.workedExample(
    { ...mosteller, locator: "Worked Example A (170 cm, 70 kg → 1.8181 m²)" },
    { height_cm: { value: 170, unit: "cm" }, weight_kg: { value: 70, unit: "kg" } },
    [{ id: "bsa", value: 1.8181, tolerance: 0.0001 }],
  );

  // Example B (bsa-mosteller.md): 100 cm, 16 kg → sqrt(1600/3600) = sqrt(4/9)
  // = 2/3 exactly. Exact closed-form root → tight tolerance (float regression
  // anchor).
  ctx.workedExample(
    { ...mosteller, locator: "Worked Example B (100 cm, 16 kg → 2/3 m² exactly)" },
    { height_cm: { value: 100, unit: "cm" }, weight_kg: { value: 16, unit: "kg" } },
    [{ id: "bsa", value: 2 / 3, tolerance: 1e-9 }],
  );

  // Example C (bsa-mosteller.md): 60 cm, 5 kg → sqrt(300/3600) = 0.28868 m².
  ctx.workedExample(
    { ...mosteller, locator: "Worked Example C (60 cm, 5 kg → 0.28868 m²)" },
    { height_cm: { value: 60, unit: "cm" }, weight_kg: { value: 5, unit: "kg" } },
    [{ id: "bsa", value: 0.28868, tolerance: 0.0001 }],
  );

  // Example D (bsa-mosteller.md): 170 cm, 60 kg → sqrt(10200/3600) = 1.6833 m²
  // (reproduces the Omnicalculator worked example; the precise value is 1.68,
  // not the truncated 1.67).
  ctx.workedExample(
    {
      ...mosteller,
      locator: "Worked Example D (170 cm, 60 kg → 1.6833 m²; Omnicalculator cross-check)",
    },
    { height_cm: { value: 170, unit: "cm" }, weight_kg: { value: 60, unit: "kg" } },
    [{ id: "bsa", value: 1.6833, tolerance: 0.0001 }],
  );

  // Unit-conversion equivalent of Example A via pounds: 70 kg = 154.3234 lb;
  // height still 170 cm. Must convert lb → kg before computing → 1.8181 m².
  ctx.workedExample(
    { ...mosteller, locator: "Example A via pounds input (154.3234 lb = 70 kg)" },
    { height_cm: { value: 170, unit: "cm" }, weight_kg: { value: 154.3234, unit: "lb" } },
    [{ id: "bsa", value: 1.8181, tolerance: 0.001 }],
  );

  // Unit-conversion equivalent of Example B via metres: 1.00 m = 100 cm;
  // weight 16 kg. Must convert m → cm before computing → 2/3 m².
  ctx.workedExample(
    { ...mosteller, locator: "Example B via metres input (1.00 m = 100 cm)" },
    { height_cm: { value: 1.0, unit: "m" }, weight_kg: { value: 16, unit: "kg" } },
    [{ id: "bsa", value: 2 / 3, tolerance: 1e-9 }],
  );

  // Both required numeric inputs get boundary coverage (satisfies the
  // describeScore afterAll rejection gate for height_cm and weight_kg).
  ctx.boundaryTest("height_cm", "min", {
    height_cm: { value: 100, unit: "cm" },
    weight_kg: { value: 16, unit: "kg" },
  });
  ctx.boundaryTest("height_cm", "max", {
    height_cm: { value: 100, unit: "cm" },
    weight_kg: { value: 16, unit: "kg" },
  });
  ctx.boundaryTest("weight_kg", "min", {
    height_cm: { value: 100, unit: "cm" },
    weight_kg: { value: 16, unit: "kg" },
  });
  ctx.boundaryTest("weight_kg", "max", {
    height_cm: { value: 100, unit: "cm" },
    weight_kg: { value: 16, unit: "kg" },
  });

  // Explicit implausible-input rejections (zero/negative and transposed-unit
  // style errors the range checks are meant to catch).
  ctx.rejectsImplausible(
    "a zero weight (physically impossible, below the 0.3 kg floor)",
    { height_cm: { value: 100, unit: "cm" }, weight_kg: { value: 0, unit: "kg" } },
    { inputId: "weight_kg", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a 10 cm height (below the 30 cm floor — e.g. a transposed inch entry)",
    { height_cm: { value: 10, unit: "cm" }, weight_kg: { value: 16, unit: "kg" } },
    { inputId: "height_cm", code: "out-of-range" },
  );
});
