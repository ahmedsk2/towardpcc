import { describeScore } from "../testing/harness";
import { oiOsi } from "./oi-osi";

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

describeScore(oiOsi, (ctx) => {
  // Worked example 1 (oi-osi.md): MAP 20, FiO₂ 0.60, PaO₂ 60 → OI (20×0.60×100)/60 = 20
  // (PALICC-2 severe, OI ≥ 16). SpO₂ supplied only so OSI can also be emitted.
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 1 (oi-osi.md): OI = 1200/60 = 20, PALICC-2 severe (OI ≥ 16)",
    },
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 0.6, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
      spo2: { value: 90, unit: "%" },
    },
    [{ id: "oi", value: 20, tolerance: 0.1 }],
  );

  // Worked example 2 (oi-osi.md): MAP 15, FiO₂ 0.50, SpO₂ 92 (≤ 97, valid) →
  // OSI (15×0.50×100)/92 = 8.15 (PALICC-2 mild–moderate). PaO₂ supplied only so OI can also be emitted.
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 2 (oi-osi.md): OSI = 750/92 = 8.15, PALICC-2 mild–moderate",
    },
    {
      map_awp: { value: 15, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      pao2: { value: 90, unit: "mmHg" },
      spo2: { value: 92, unit: "%" },
    },
    [{ id: "osi", value: 8.15, tolerance: 0.1 }],
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
      spo2: { value: 90, unit: "%" },
    },
    [{ id: "oi", value: 20, tolerance: 0.1 }],
  );

  // Worked example 6 (oi-osi.md): MAP 10, FiO₂ 0.50, PaO₂ 150 → OI (10×0.50×100)/150 = 3.33,
  // below the OI ≥ 4 diagnostic criterion. SpO₂ supplied only so OSI can also be emitted.
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 6 (oi-osi.md): OI = 500/150 = 3.33, below OI ≥ 4 criterion",
    },
    {
      map_awp: { value: 10, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      pao2: { value: 150, unit: "mmHg" },
      spo2: { value: 90, unit: "%" },
    },
    [{ id: "oi", value: 3.33, tolerance: 0.1 }],
  );

  // Worked example 5 (oi-osi.md) is a neonatal OI↔OSI regression cross-check
  // (OI = 1.978×OSI − 6.743, Slaughter 2025), not a computation this engine performs, so it
  // has no workedExample here — the engine returns the direct OI/OSI formulas only.

  const base = {
    map_awp: { value: 20, unit: "cmH2O" },
    fio2: { value: 0.6, unit: "fraction" },
    pao2: { value: 60, unit: "mmHg" },
    spo2: { value: 90, unit: "%" },
  } as const;

  ctx.boundaryTest("map_awp", "min", base);
  ctx.boundaryTest("map_awp", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  ctx.boundaryTest("pao2", "min", base);
  ctx.boundaryTest("pao2", "max", base);
  ctx.boundaryTest("spo2", "min", base);
  ctx.boundaryTest("spo2", "max", base);

  // Worked example 4 (oi-osi.md): the OSI validity guard. SpO₂ 99 > 97 must be rejected —
  // OSI is not interpretable above 97% (dissociation curve plateau; Thomas 2010 / PALICC-2).
  ctx.rejectsImplausible(
    "an SpO₂ above the 97% OSI validity ceiling",
    {
      map_awp: { value: 12, unit: "cmH2O" },
      fio2: { value: 0.4, unit: "fraction" },
      pao2: { value: 90, unit: "mmHg" },
      spo2: { value: 99, unit: "%" },
    },
    { inputId: "spo2", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 0.1, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
      spo2: { value: 90, unit: "%" },
    },
    { inputId: "fio2", code: "out-of-range" },
  );

  // PALICC-2 (2023) OI bands: diagnosis OI ≥ 4, severe OI ≥ 16.
  ctx.interpretationBoundary("oi", 4, "oi-below-threshold", "oi-mild-moderate");
  ctx.interpretationBoundary("oi", 16, "oi-mild-moderate", "oi-severe");
  // PALICC-2 (2023) OSI bands: diagnosis OSI ≥ 5, severe OSI ≥ 12.
  ctx.interpretationBoundary("osi", 5, "osi-below-threshold", "osi-mild-moderate");
  ctx.interpretationBoundary("osi", 12, "osi-mild-moderate", "osi-severe");
});
