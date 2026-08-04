import { describeScore } from "../testing/harness";
import { oxygenationIndex } from "./oxygenation-index";

// OI worked examples are traced to docs/research/scores/oi-osi.md; the PALICC-2
// severity bands carry the primary citation.
const palicc2 = {
  citation:
    "Emeriaud G, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
  pmid: "36661420",
};
const slaughter2025 = {
  citation:
    "Slaughter J, et al. Comparison of the oxygenation index and the oxygen saturation index as clinical indicators for neonatal ECMO. Front Pediatr. 2025;13:1586985.",
  pmid: "40630719",
};

describeScore(oxygenationIndex, (ctx) => {
  // Worked example 1 (oi-osi.md): MAP 20, FiO₂ 0.60, PaO₂ 60 → OI (20×0.60×100)/60 = 20
  // (PALICC-2 severe, OI ≥ 16). No SpO₂ needed — OI is arterial only.
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 1 (oi-osi.md): OI = 1200/60 = 20, PALICC-2 severe (OI ≥ 16)",
    },
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 0.6, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
    },
    [{ id: "oi", value: 20, tolerance: 0.1 }],
  );

  // Worked example 3 (oi-osi.md): the ×100 / FiO₂-convention equivalence. FiO₂ entered as
  // 60% converts to 0.60 canonical; (20×0.60×100)/60 = 20 — the same number the percentage
  // rendering (20×60)/60 gives. Proves the fraction+×100 form is applied consistently.
  ctx.workedExample(
    {
      ...slaughter2025,
      locator: "Worked example 3 (oi-osi.md): ×100 convention equivalence, OI = 20",
    },
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 60, unit: "%" },
      pao2: { value: 60, unit: "mmHg" },
    },
    [{ id: "oi", value: 20, tolerance: 0.1 }],
  );

  // Worked example 6 (oi-osi.md): MAP 10, FiO₂ 0.50, PaO₂ 150 → OI (10×0.50×100)/150 = 3.33,
  // below the OI ≥ 4 diagnostic criterion.
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 6 (oi-osi.md): OI = 500/150 = 3.33, below OI ≥ 4 criterion",
    },
    {
      map_awp: { value: 10, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      pao2: { value: 150, unit: "mmHg" },
    },
    [{ id: "oi", value: 3.33, tolerance: 0.1 }],
  );

  // ×100 CONVENTION ANCHOR (oi-osi.md worked example 7). Worked examples 1 and 3 above
  // both happen to fail if the ×100 is dropped, but neither says so — this one exists
  // to state it, with inputs chosen so the three candidate answers are orders of
  // magnitude apart rather than adjacent:
  //   correct, fraction + ×100 : (20 × 1.0 × 100) / 100 = 20
  //   ×100 dropped             : (20 × 1.0)       / 100 = 0.2    (100× too small)
  //   ×100 applied to a percent: (20 × 100 × 100) / 100 = 2000   (100× too large)
  // A tolerance of 0.1 cannot absorb either error, so what is pinned is the ORDER OF
  // MAGNITUDE of the FiO₂ convention, not just this row's arithmetic.
  ctx.workedExample(
    {
      ...slaughter2025,
      locator:
        "oi-osi.md worked example 7 — ×100 convention anchor: OI = 2000/100 = 20, not 0.2 and not 2000",
    },
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 1, unit: "fraction" },
      pao2: { value: 100, unit: "mmHg" },
    },
    [{ id: "oi", value: 20, tolerance: 0.1 }],
  );

  const base = {
    map_awp: { value: 20, unit: "cmH2O" },
    fio2: { value: 0.6, unit: "fraction" },
    pao2: { value: 60, unit: "mmHg" },
  } as const;

  ctx.boundaryTest("map_awp", "min", base);
  ctx.boundaryTest("map_awp", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  ctx.boundaryTest("pao2", "min", base);
  ctx.boundaryTest("pao2", "max", base);

  // One clinically-framed rejection per required input.
  ctx.rejectsImplausible(
    "a mean airway pressure below the positive-pressure floor",
    {
      map_awp: { value: 3, unit: "cmH2O" },
      fio2: { value: 0.6, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
    },
    { inputId: "map_awp", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 0.1, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
    },
    { inputId: "fio2", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "an implausibly low PaO₂",
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 0.6, unit: "fraction" },
      pao2: { value: 5, unit: "mmHg" },
    },
    { inputId: "pao2", code: "out-of-range" },
  );

  // PALICC-2 (2023) OI bands: diagnosis OI ≥ 4, severe OI ≥ 16 (ascending [min, max)).
  // Cutpoint 4: below → oi-below-threshold; at/above → oi-mild-moderate.
  ctx.expectBand("oi", 3.33, "oi-below-threshold"); // worked example 6 value
  ctx.expectBand("oi", 3.9, "oi-below-threshold");
  ctx.expectBand("oi", 4, "oi-mild-moderate"); // cutpoint belongs to the higher band
  ctx.expectBand("oi", 8, "oi-mild-moderate");
  // Cutpoint 16: below → oi-mild-moderate; at/above → oi-severe.
  ctx.expectBand("oi", 15.9, "oi-mild-moderate");
  ctx.expectBand("oi", 16, "oi-severe"); // cutpoint belongs to the higher band
  ctx.expectBand("oi", 20, "oi-severe"); // worked example 1 value
});
