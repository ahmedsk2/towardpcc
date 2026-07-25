import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { percent } from "../units/fraction";
import { kgWithLbAndG } from "../units/mass";

/**
 * Pediatric burn fluid resuscitation — a THERAPY/DOSING estimate, not a
 * severity score. It outputs a STARTING 24-hour crystalloid (lactated Ringer's)
 * volume and its first-8-hour half, then leaves the interpretation empty on
 * purpose: the number is titrated to urine output, it is not a risk band.
 *
 * Two weight-based formulas are emitted so the user sees each named method
 * rather than a silently-picked one (ADR-0002 / PRD §6.3): pediatric Parkland
 * and pediatric modified Brooke. Both use the SAME pediatric coefficient
 * (3 mL/kg/%TBSA — StatPearls NBK537190 / NBK534227), so their 24-h volumes
 * converge; the adult coefficients differ (Parkland 4 mL, modified Brooke 2 mL)
 * and are intentionally NOT computed here so the tool never hands back an adult
 * volume that could over-resuscitate a child (fluid-creep harm; see notes).
 *
 * For children, Holliday-Segar maintenance fluid is ADDED on top of the
 * resuscitation volume (adults get none). Research + full sourcing:
 * docs/research/scores/burn-resuscitation.md.
 */

/**
 * Holliday-Segar 24-hour maintenance WATER volume (mL/day): 100 mL/kg for the
 * first 10 kg, +50 mL/kg for the next 10 kg (10-20), +20 mL/kg for each kg
 * above 20 (Holliday & Segar 1957, PMID 13431307).
 */
function hollidaySegarMaintenanceMl(weightKg: number): number {
  if (weightKg <= 10) return 100 * weightKg;
  if (weightKg <= 20) return 1000 + 50 * (weightKg - 10);
  return 1500 + 20 * (weightKg - 20);
}

const PEDIATRIC_COEFF_ML = 3; // mL/kg/%TBSA — pediatric Parkland & modified Brooke

export const burnResuscitation = defineScore({
  id: "burn-resuscitation",
  slug: "burn-resuscitation",
  name: "Pediatric burn fluid resuscitation (Parkland / modified Brooke)",
  version: "1.0.0",
  status: "published",
  category: "fluids-resuscitation",
  inputs: [
    {
      id: "weight_kg",
      label: defineText("burn.weight", "Body weight"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      // input-validity bound, not a cited threshold
      min: 0.5,
      // input-validity bound, not a cited threshold
      max: 150,
      helpText: defineText(
        "burn.weight.help",
        "Pediatric weight in kg (accepts lb or g). Drives the crystalloid dose and the Holliday-Segar maintenance volume.",
      ),
    },
    {
      id: "tbsa_pct",
      label: defineText("burn.tbsa", "%TBSA burned (2nd + 3rd degree)"),
      required: true,
      type: "numeric",
      unit: percent,
      // Physical range of a percentage; %TBSA counts partial + full thickness only.
      min: 0,
      max: 100,
      helpText: defineText(
        "burn.tbsa.help",
        "Percent total body surface area with partial- or full-thickness burn, estimated by the Lund-Browder chart in children (NOT the Rule of Nines). Superficial/erythema is excluded.",
      ),
    },
  ] as const,
  // No interpretation bands: this is a dosing estimate titrated to urine output,
  // not a classifier (research: "This formula has no severity/interpretation bands").
  interpretation: [],
  references: [
    {
      citation:
        "Mehta M, Tudor GJ. Burn Fluid Resuscitation. StatPearls Publishing; updated 2023. (Parkland peds 3 mL, modified Brooke adult 2/peds 3 mL, LR, half in first 8 h, Lund-Browder, urine-output targets.)",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK534227/",
    },
    {
      citation:
        "Baartmans MG, et al. Parkland Formula. StatPearls Publishing. (4 mL adult / 3 mL pediatric; half in first 8 h from injury; pediatric maintenance addition; urine 1.0-1.5 mL/kg/h in children.)",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK537190/",
    },
    {
      citation:
        "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823-832. (100/50/20 mL/kg/day maintenance.)",
      pmid: "13431307",
    },
    {
      citation:
        "Romanowski KS, Palmieri TL. Pediatric burn resuscitation: past, present, and future. Burns Trauma. 2017;5:26. (Pediatric maintenance addition; dextrose for infants; SA-based formulas.)",
      pmid: "28879205",
      doi: "10.1186/s41038-017-0091-y",
    },
    {
      citation:
        "Cartotto R, Johnson LS, Savetamal A, et al. American Burn Association Clinical Practice Guidelines on Burn Shock Resuscitation. J Burn Care Res. 2024;45(3):565-589. (Adult starting rate 2 mL/kg/%TBSA to counter fluid creep; UOP 0.5 mL/kg/h; scope adults >=20% TBSA.)",
      pmid: "38051821",
      doi: "10.1093/jbcr/irad125",
    },
    {
      citation:
        "Institutional pediatric burn protocol assessment (modified Parkland 3 mL/%TBSA/kg/day; resuscitation triggers TBSA >=15% if <10 kg, >=20% if >=10 kg; mean UOP 1.74 mL/kg/h). J Burn Care Res 2025 abstract.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11958416/",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: pediatric Parkland + modified Brooke (3 mL/kg/%TBSA) with first-8-h split and Holliday-Segar maintenance.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Parkland, modified Brooke, and Holliday-Segar are arithmetic formulas built from coefficients (3 mL/kg/%TBSA; 100/50/20 mL/kg/day) and the 8h/16h split — facts, not copyrightable expression. No proprietary scale wording is reproduced (burn-resuscitation.md IP status).",
  },
  formula: defineText(
    "burn.formula",
    "Pediatric Parkland: 24-h lactated Ringer's = 3 mL x weight(kg) x %TBSA; give half in the first 8 hours (timed from the burn), the rest over the next 16 hours. Pediatric modified Brooke uses the same 3 mL x weight x %TBSA. Holliday-Segar maintenance (children, added on top of resuscitation): 100 mL/kg/day for the first 10 kg, +50 mL/kg/day for each kg from 10-20 kg, +20 mL/kg/day for each kg above 20. Combined 24-h total = pediatric Parkland resuscitation + maintenance. %TBSA counts second- and third-degree burn only (Lund-Browder chart in children).",
  ),
  notes: defineText(
    "burn.notes",
    "Therapy/dosing formula, not a severity score — it outputs a STARTING crystalloid volume that is then titrated to urine output, not a risk band; interpretation is intentionally empty. Fluid is lactated Ringer's (LR). Give HALF of the 24-h resuscitation volume in the first 8 hours and the remaining half over the next 16 hours, with the clock started at the TIME OF THE BURN, not arrival — late presentation compresses the remaining first-8-h volume into fewer hours (the rate changes, not the volume). %TBSA counts second- and third-degree (partial + full thickness) burn only and, in children, must be estimated with the age-adjusted Lund-Browder chart, NOT the Rule of Nines (a child's head is a much larger fraction of BSA). The exact Lund-Browder per-segment percentages by age are [NEEDS SOURCE] (summarized from tertiary burn references; the primary 1944 table was not fetched). Pediatric Parkland and pediatric modified Brooke both use 3 mL/kg/%TBSA, so their 24-h volumes converge; the ADULT coefficients differ (Parkland 4 mL, modified Brooke 2 mL) and are NOT emitted here to avoid over-dosing a child. For CHILDREN, Holliday-Segar maintenance fluid — commonly a 5%-dextrose-containing fluid (limited glycogen stores -> hypoglycemia risk) — is added ON TOP of the LR resuscitation volume (adults get no separate maintenance); the surface-area Galveston/Cincinnati formulas instead fold maintenance in but require height/BSA and are not computed here. Titrate to urine output: children commonly 1.0-1.5 mL/kg/h (an alternative split is 1 mL/kg/h if <30 kg and 0.5 mL/kg/h if >=30 kg; infants sometimes ~1-2 mL/kg/h); adults ~0.5 mL/kg/h (2024 ABA CPG) — sources disagree by ~0.5 mL/kg/h, so the range is carried, not silently reduced to one number. FLUID CREEP (over-resuscitation) is a documented harm; the 2024 ABA CPG lowered the ADULT starting coefficient to 2 mL/kg/%TBSA to counter it, but that CPG is adults-only and does NOT license a 2 mL pediatric starting rate — a graded pediatric CPG for the starting coefficient is [NEEDS SOURCE]. Some references retain 4 mL/kg/%TBSA for children (relying on maintenance to cover baseline needs); centers differ, so the coefficient is institution-specific. Every computed volume is a starting estimate to be titrated, never a fixed prescription. Weight bounds (0.5-150 kg) are input-validity limits, not cited clinical thresholds.",
  ),
  calculate: (values) => {
    const weight = values.weight_kg.value; // canonical kg
    const tbsa = values.tbsa_pct.value; // canonical %

    // Return RAW values; `precision` rounds for display only (no bands here).
    const parkland24h = PEDIATRIC_COEFF_ML * weight * tbsa;
    const modBrooke24h = PEDIATRIC_COEFF_ML * weight * tbsa;
    const maintenance24h = hollidaySegarMaintenanceMl(weight);

    return [
      {
        id: "parkland_peds_24h_ml",
        label: defineText(
          "burn.parkland24h",
          "Parkland (pediatric 3 mL/kg/%TBSA) — 24-h LR volume",
        ),
        value: parkland24h,
        unit: "mL",
        precision: 0,
      },
      {
        id: "parkland_peds_first8h_ml",
        label: defineText(
          "burn.parkland8h",
          "Parkland (pediatric) — first-8-h LR volume (half, from time of burn)",
        ),
        value: parkland24h / 2,
        unit: "mL",
        precision: 0,
      },
      {
        id: "mod_brooke_peds_24h_ml",
        label: defineText(
          "burn.brooke24h",
          "Modified Brooke (pediatric 3 mL/kg/%TBSA) — 24-h LR volume",
        ),
        value: modBrooke24h,
        unit: "mL",
        precision: 0,
      },
      {
        id: "mod_brooke_peds_first8h_ml",
        label: defineText(
          "burn.brooke8h",
          "Modified Brooke (pediatric) — first-8-h LR volume (half, from time of burn)",
        ),
        value: modBrooke24h / 2,
        unit: "mL",
        precision: 0,
      },
      {
        id: "maintenance_24h_ml",
        label: defineText(
          "burn.maint24h",
          "Holliday-Segar maintenance fluid — 24-h volume (children, added on top)",
        ),
        value: maintenance24h,
        unit: "mL",
        precision: 0,
      },
      {
        id: "parkland_peds_plus_maint_24h_ml",
        label: defineText(
          "burn.combined24h",
          "Pediatric Parkland + maintenance — 24-h total (children)",
        ),
        value: parkland24h + maintenance24h,
        unit: "mL",
        precision: 0,
      },
    ];
  },
});
