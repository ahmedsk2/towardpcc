import { describeScore } from "../testing/harness";
import { burnResuscitation } from "./burn-resuscitation";

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
      { id: "parkland_peds_24h_ml", value: 1125 },
      { id: "parkland_peds_first8h_ml", value: 562.5 },
      { id: "mod_brooke_peds_24h_ml", value: 1125 },
      { id: "maintenance_24h_ml", value: 1250 },
      { id: "parkland_peds_plus_maint_24h_ml", value: 2375 },
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
      { id: "mod_brooke_peds_24h_ml", value: 1800 },
      { id: "mod_brooke_peds_first8h_ml", value: 900 },
      { id: "parkland_peds_24h_ml", value: 1800 },
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
