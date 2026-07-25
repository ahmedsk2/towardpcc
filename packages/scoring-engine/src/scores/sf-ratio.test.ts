import { describeScore } from "../testing/harness";
import { sfRatio } from "./sf-ratio";

// Direct S/F worked examples are traced to pf-sf.md "Worked examples"; the
// PALICC-2 bands and the SpO₂ ≤ 97% guard carry the primary citation.
const palicc2 = {
  citation:
    "Emeriaud G, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS. Pediatr Crit Care Med. 2023;24(2):143–168.",
  pmid: "36661420",
};

describeScore(sfRatio, (ctx) => {
  // Worked example 2 (pf-sf.md): SpO₂ 90% (≤ 97, valid), FiO₂ 0.6 → S/F 150.
  // Diagnosis: S/F 150 ≤ 250 meets NIV-PARDS; severity: S/F ≤ 150 → severe.
  ctx.workedExample(
    { ...palicc2, locator: "worked example 2 — SpO₂ 90%, FiO₂ 0.6 → S/F 150 (severe NIV-PARDS)" },
    { spo2: { value: 90, unit: "%" }, fio2: { value: 0.6, unit: "fraction" } },
    [{ id: "sf_ratio", value: 150, tolerance: 1e-9 }],
  );

  // Same clinical case with FiO₂ entered as a percentage (60% → 0.6): the
  // unit must normalize before computing, yielding the identical S/F 150.
  ctx.workedExample(
    { ...palicc2, locator: "unit-conversion equivalent of worked example 2 (FiO₂ entered as %)" },
    { spo2: { value: 90, unit: "%" }, fio2: { value: 60, unit: "%" } },
    [{ id: "sf_ratio", value: 150, tolerance: 1e-9 }],
  );

  // Boundary coverage for both inputs.
  ctx.boundaryTest("spo2", "min", {
    spo2: { value: 90, unit: "%" },
    fio2: { value: 0.6, unit: "fraction" },
  });
  // spo2 "max" bound = 97: computes at 97, rejects just above — this is the
  // structural expression of the SpO₂ ≤ 97% validity constraint.
  ctx.boundaryTest("spo2", "max", {
    spo2: { value: 90, unit: "%" },
    fio2: { value: 0.6, unit: "fraction" },
  });
  ctx.boundaryTest("fio2", "min", {
    spo2: { value: 90, unit: "%" },
    fio2: { value: 0.6, unit: "fraction" },
  });
  ctx.boundaryTest("fio2", "max", {
    spo2: { value: 90, unit: "%" },
    fio2: { value: 0.6, unit: "fraction" },
  });

  // Worked example 7 (pf-sf.md): SpO₂ 99% > 97 → S/F is not interpretable and
  // must be rejected out-of-range, never scored (99/0.4 = 247.5 numerically).
  ctx.rejectsImplausible(
    "an SpO₂ above the 97% S/F validity ceiling (worked example 7)",
    { spo2: { value: 99, unit: "%" }, fio2: { value: 0.4, unit: "fraction" } },
    { inputId: "spo2", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    { spo2: { value: 90, unit: "%" }, fio2: { value: 0.1, unit: "fraction" } },
    { inputId: "fio2", code: "out-of-range" },
  );

  // PALICC-2 NIV-PARDS band switches at the cited S/F thresholds.
  // Descending "≤" cutpoints: the boundary value belongs to the worse band.
  ctx.expectBand("sf_ratio", 150, "severe"); // ≤ 150 is severe
  ctx.expectBand("sf_ratio", 151, "mild-moderate");
  ctx.expectBand("sf_ratio", 250, "mild-moderate"); // ≤ 250 meets NIV-PARDS criterion
  ctx.expectBand("sf_ratio", 251, "above-threshold");
});
