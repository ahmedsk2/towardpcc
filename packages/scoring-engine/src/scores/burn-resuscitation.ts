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
 *
 * The Lund-Browder chart this score's %TBSA input must be estimated with lives
 * in `src/data/lund-browder.ts` — verified table, six age bands, per side. It
 * is deliberately NOT consumed here: `tbsa_pct` stays one number the clinician
 * has already estimated, and whether the calculator grows a per-segment picker
 * is an untaken product decision.
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
  version: "1.1.1",
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
    {
      citation:
        "US Department of Defense, Joint Trauma System. Burn Care Clinical Practice Guideline (CPG ID 12), Lund Browder Burn Estimate & Diagram worksheets: Infant (July 2025), Pediatric (June 2025), Adult (June 2025). Dated modern reproduction of the Lund-Browder chart and the source of the exact per-segment percentages shipped here; the adult worksheet prints a column total of 100, which is what makes the arithmetic self-checking.",
      url: "https://jts.health.mil/index.cfm/CPGs/cpgs",
      note: "Provenance, fact by fact, because these did not come from one place. (1) The per-segment percentages and the three worksheet dates above are the ones recorded in this project's implementation reference note (docs/research/scores/burn-resuscitation.md, compiled 2026-08-03) from the three JTS worksheets read in full; they are FORM dates, not the CPG's. (2) The guideline identifier and its own date — Burn Care, CPG ID 12, dated 10 June 2025 — were read directly from the JTS CPG index at jts.health.mil on 2026-08-03; that reference note carries no CPG-level date, so this one is not sourced from it. (3) The chart of record is Lund CC, Browder NC, 'The estimation of areas of burns', Surg Gynecol Obstet 1944;79:352-358. That paper was NOT obtained — the volume is not digitised in a reachable open repository — so the values here are attributed 'after Lund & Browder (1944), as reproduced in the JTS worksheets', never to the 1944 original directly, and whether the 19-row tabular layout is a 1944 artefact or a later worksheet reformatting is unconfirmed.",
    },
    {
      citation:
        "Lundin K, Alsbjorn B. The 101 percent in Lund-Browder charts - a commentary. Burns. 2013;39(4):819-820. (Traces the widely circulated 101% charts to a typographic error: one aspect of each hand is 1.25%, not 1.5%, so each hand is 2.5% and not 3%.)",
      pmid: "22980775",
      doi: "10.1016/j.burns.2012.08.016",
    },
    {
      citation:
        "Murari A, Singh KN. Lund and Browder chart - modified versus original: a comparative study. Acute Crit Care. 2019;34(4):276-281. (Open access; restates the 101% defect and the chart's clinimetric limitations.)",
      doi: "10.4266/acc.2019.00647",
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
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "Closes the Lund-Browder sourcing gap. The chart now ships as verified data (19 segments x 6 age bands, per side) attributed 'after Lund & Browder (1944), as reproduced in the JTS Burn Care CPG worksheets' — the 1944 paper was not obtained and the notes say so rather than claiming it. Limitations now state that the anthropometric substrate is roughly a century old and unrevalidated, that the chart was never validated by an expert panel, that erythema is excluded from %TBSA, and that two transcription defects circulate which put most published charts at 101% (hand 3% instead of 2.5%; thigh 9% instead of 8.5% at 10-14). Every band is gated to sum to exactly 100. No computed volume changed and no input was added — %TBSA is still entered as one number.",
      reason: "new-reference",
    },
    {
      version: "1.1.1",
      date: "2026-08-03",
      summary:
        "Provenance precision only — no number, input, output or attribution strength changed. The Lund-Browder sourcing statement previously read as though one document supplied everything; it now names a source per fact. The per-segment percentages and the worksheet dates (Infant July 2025; Pediatric and Adult June 2025) are FORM dates from this project's implementation reference note; the guideline identifier and its own date (Burn Care CPG ID 12, 10 June 2025) were read from the JTS CPG index at jts.health.mil on 2026-08-03, which is where that date actually came from and where the reference note has none; the 1944 original remains NOT obtained, so the attribution stays 'after Lund & Browder (1944), as reproduced in the JTS worksheets' and the 19-row layout stays unconfirmed as a 1944 artefact.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Parkland, modified Brooke, and Holliday-Segar are arithmetic formulas built from coefficients (3 mL/kg/%TBSA; 100/50/20 mL/kg/day) and the 8h/16h split — facts, not copyrightable expression. No proprietary scale wording is reproduced (burn-resuscitation.md IP status). The Lund-Browder chart is reproduced as numbers only: the per-segment percentages are facts, while the chart's body diagrams and the JTS worksheet layout are expression and are not copied, and every segment label is this project's own anatomical wording.",
  },
  formula: defineText(
    "burn.formula",
    "Pediatric Parkland: 24-h lactated Ringer's = 3 mL x weight(kg) x %TBSA; give half in the first 8 hours (timed from the burn), the rest over the next 16 hours. Pediatric modified Brooke uses the same 3 mL x weight x %TBSA. Holliday-Segar maintenance (children, added on top of resuscitation): 100 mL/kg/day for the first 10 kg, +50 mL/kg/day for each kg from 10-20 kg, +20 mL/kg/day for each kg above 20. Combined 24-h total = pediatric Parkland resuscitation + maintenance. %TBSA counts second- and third-degree burn only (Lund-Browder chart in children).",
  ),
  notes: defineText(
    "burn.notes",
    "Therapy/dosing formula, not a severity score — it outputs a STARTING crystalloid volume that is then titrated to urine output, not a risk band; interpretation is intentionally empty. Fluid is lactated Ringer's (LR). Give HALF of the 24-h resuscitation volume in the first 8 hours and the remaining half over the next 16 hours, with the clock started at the TIME OF THE BURN, not arrival — late presentation compresses the remaining first-8-h volume into fewer hours (the rate changes, not the volume). %TBSA counts second- and third-degree (partial + full thickness) burn only and, in children, must be estimated with the age-adjusted Lund-Browder chart, NOT the Rule of Nines (a child's head is a much larger fraction of BSA). THE LUND-BROWDER CHART, AND ITS SOURCING. The chart now ships as verified data alongside this score: 19 body segments across 6 age bands, per side for paired segments (each cell is one limb, so both hands together are 5% and both adult lower limbs 40%). Its provenance is stated exactly, and fact by fact, because the facts do not share a source. The values are after Lund & Browder (1944), as reproduced in the US Department of Defense Joint Trauma System Burn Care CPG Lund Browder Burn Estimate & Diagram worksheets, and the three dates that go with them — Infant (July 2025), Pediatric (June 2025), Adult (June 2025) — are the individual WORKSHEET dates, not the guideline's. The guideline identifier and its own date, Burn Care CPG ID 12 dated 10 June 2025, come from the JTS CPG index at jts.health.mil and were checked there on 2026-08-03. The 1944 paper itself was NOT obtained (Surgery, Gynecology & Obstetrics vol. 79 is not digitised in any reachable open repository), so this is an attribution to a dated modern reproduction and not a claim on the 1944 original; whether the 19-row tabular layout appears in that form in 1944 is unconfirmed. Age bands are birth to <1, 1 to <5, 5 to <10, 10 to <15, 15 to <16 and 16+ years, so a 3-year-old is scored on the 1-year column and a 7-year-old on the 5-year column. The head falls 19 -> 17 -> 13 -> 11 -> 9 -> 7% with age while the thighs and lower legs take up exactly what the head loses, so every column sums to exactly 100 — which is asserted on every release, because MOST Lund-Browder charts in circulation do not. Lundin & Alsbjorn (Burns 2013;39(4):819-820) traced the common 101% defect to a typographic error that makes one aspect of each hand 1.5% instead of 1.25%, i.e. each hand 3% instead of 2.5%, adding 1.0 to every column; a second, less-documented defect prints half a thigh at age 10 as 4.5 instead of 4.25, making each thigh 9% instead of 8.5% and inflating the 10-14 column alone. This table carries the values that close at 100. Do not use any Lund-Browder chart you have not summed yourself. LIMITATIONS OF THE CHART ITSELF: the anthropometric substrate is roughly a century old — Lund and Browder did not measure these proportions but assembled them from Berkow (1924) and Boyd (1935), behind which sit Du Bois (1915) and Funke (1858) — and none of it has been revalidated against modern population data. The chart was never developed or validated by an expert panel using stringent scientific principles or defined protocols; concurrent validity against computerised planimetry appears high, but its other clinimetric properties are largely unstudied, and Lund and Browder themselves claimed applicability to 95.5% of the population rather than all of it. It does not account for obesity, breast size, pregnancy, or amputated body parts, each of which shifts relative body proportions. Simple erythema (superficial/first-degree burn) is EXCLUDED from %TBSA; the JTS worksheets carry a separate first-degree column explicitly marked not to be added to the total. Inter-rater variability is substantial and grows with burn size — overestimation is the commoner direction of error outside burn centres, and an error either way beyond about 10% is associated with real morbidity. The chart is data here, not an input: %TBSA is still entered as a single number the clinician has already estimated. Pediatric Parkland and pediatric modified Brooke both use 3 mL/kg/%TBSA, so their 24-h volumes converge; the ADULT coefficients differ (Parkland 4 mL, modified Brooke 2 mL) and are NOT emitted here to avoid over-dosing a child. For CHILDREN, Holliday-Segar maintenance fluid — commonly a 5%-dextrose-containing fluid (limited glycogen stores -> hypoglycemia risk) — is added ON TOP of the LR resuscitation volume (adults get no separate maintenance); the surface-area Galveston/Cincinnati formulas instead fold maintenance in but require height/BSA and are not computed here. Titrate to urine output: children commonly 1.0-1.5 mL/kg/h (an alternative split is 1 mL/kg/h if <30 kg and 0.5 mL/kg/h if >=30 kg; infants sometimes ~1-2 mL/kg/h); adults ~0.5 mL/kg/h (2024 ABA CPG) — sources disagree by ~0.5 mL/kg/h, so the range is carried, not silently reduced to one number. FLUID CREEP (over-resuscitation) is a documented harm; the 2024 ABA CPG lowered the ADULT starting coefficient to 2 mL/kg/%TBSA to counter it, but that CPG is adults-only and does NOT license a 2 mL pediatric starting rate — a graded pediatric CPG for the starting coefficient is [NEEDS SOURCE]. Some references retain 4 mL/kg/%TBSA for children (relying on maintenance to cover baseline needs); centers differ, so the coefficient is institution-specific. Every computed volume is a starting estimate to be titrated, never a fixed prescription. Weight bounds (0.5-150 kg) are input-validity limits, not cited clinical thresholds.",
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
