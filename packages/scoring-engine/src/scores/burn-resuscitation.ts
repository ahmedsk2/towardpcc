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
 * resuscitation volume (adults get none) — here at EVERY accepted weight, with
 * no threshold, which is the AWMF 006/128 structure. The circulating 30 kg
 * figure is real (ABA, via Pisano 2021 Table 2) but centre practice runs
 * 20-40 kg, one centre uses age <1 y and one adds none, so `cautions` states
 * the range rather than a single number. Research + full sourcing:
 * docs/research/scores/burn-resuscitation.md — see its 2016-2026 evidence
 * review (R.0-R.10), whose first finding is that inside that window NO primary
 * derivation exists for any coefficient this score uses.
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
  version: "1.2.1",
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
    {
      citation:
        "Greenhalgh DG, Cartotto R, Taylor SL, et al. Burn resuscitation practices in North America: results of the Acute Burn ResUscitation Multicenter Prospective Trial (ABRUPT). Ann Surg. 2023;277(3):512-519. (379 adults >=20% TBSA across 21 centres; 24-h delivered volume 4.6 +/- 2.2 mL/kg/%TBSA; time 0 is the time of injury; mean 1553 +/- 1782 mL already given before arrival; states 4 mL/kg/%TBSA is accurate and a 2 mL/kg/%TBSA goal may not be feasible.)",
      doi: "10.1097/SLA.0000000000005166",
      note: "Cited here for the controversy it creates with the 2024 ABA CPG, not to settle it. Adult data; it licenses no paediatric coefficient.",
    },
    {
      citation:
        "Pisano C, Fabia R, Shi J, et al. Variation in acute fluid resuscitation among pediatric burn centers. Burns. 2021;47(3):545-550. (Table 2 tabulates five ABA-verified paediatric burn centres plus the ABA column: maintenance IV fluid initiated below 30 kg per ABA, 20-40 kg across centres, one centre by age <1 year; source of the 25 kg / 20% TBSA five-centre spread of 1500-3560 mL.)",
      doi: "10.1016/j.burns.2020.04.013",
    },
    {
      citation:
        "Vasileiadis V, Najem S, Reinshagen K, et al. Fluid management and outcomes in children with burns, German Burn Registry 2015-2022. Eur J Pediatr. 2024;183:5479-5488. (407 children <16 y with >=15% TBSA across 30 centres; 86.5% received less than Parkland plus Holliday-Segar maintenance; six of the seven children who died were under-resuscitated.)",
      doi: "10.1007/s00431-024-05797-9",
    },
    {
      citation:
        "Stevens JV, Prieto NS, Ridelman E, et al. Weight-based versus body surface area-based fluid resuscitation predictions in pediatric burn patients. Burns. 2023;49(1):120-128. (110 children; Galveston underpredicts delivered volume; Fig. A.1 gives the Children's Hospital of Michigan algorithm with its time-of-injury clock, pre-arrival subtraction step and urine targets of 0.8-1.2 mL/kg/h at <=30 kg and 0.3-0.7 mL/kg/h above it.)",
      doi: "10.1016/j.burns.2022.03.007",
    },
    {
      citation:
        "DGKCH, DGV, DGKJ, et al. Behandlung thermischer Verletzungen im Kindesalter. AWMF S2k-Leitlinie 006/128, Version 3.0, 15.08.2024 (valid to 14.08.2029). (Holliday-Segar maintenance for ALL children with no weight threshold; an added burn requirement of 3-4 mL/kg/%TBSA from 15% TBSA; urine 1-2 mL/kg/h in infants and toddlers and 0.5-1 mL/kg/h at school age; Empfehlung 10, 12/12 consensus, do not initially exceed 10 mL/kg/h; all fluid statements graded expert consensus, evidence level IV.)",
      url: "https://register.awmf.org/de/leitlinien/detail/006-128",
      note: "The authoritative locator is the AWMF register number 006/128 with version 3.0 dated 15.08.2024; the URL is the register's detail page for that number.",
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
    {
      version: "1.2.0",
      date: "2026-08-03",
      summary:
        "Adds a 2016-2026 evidence review. No coefficient, input, output or computed volume changed — every change is to what the page says about the numbers it already produced. Five references are added (ABRUPT 2023, Pisano 2021, the German Burn Registry 2024, Stevens 2023, AWMF S2k 006/128 v3.0) and five cautions with them. The framing fact goes first: inside a ten-year window there is NO primary derivation for any coefficient this score uses — everything in that window is restatement, audit or consensus. The 30 kg maintenance threshold is no longer implied to be a fact; it is real and traceable to the ABA via Pisano's Table 2, but centre practice runs 20-40 kg, one centre uses age <1 year, one adds none, and the German national guideline applies maintenance to all children with no threshold, which is the structure this score already had. Eight live controversies are surfaced as controversies, the first being the ABA's own 2 mL/kg/%TBSA adult starting rate (2 studies, 88 patients) against ABRUPT's finding a year later that 4 is accurate and 2 may not be feasible (379 patients, 21 centres). The clock section now states the gap rather than implying completeness: pre-arrival fluid must be subtracted and is not, no elapsed-time input exists, and no infusion rate is emitted. Urine-output targets are widened to the real disagreement — the >30 kg target spans 0.3-1.0 mL/kg/h and the banding variable itself is disputed (developmental stage vs weight, switching at 20-40 kg). Pisano's worked example is carried whole: for a 5-year-old, 25 kg, 20% TBSA the estimated 24-h requirement runs 1500-3560 mL across five centres, and this score's own 1500 mL is the bottom of it. Over-resuscitation is no longer presented as the only failure direction: 86.5% of children in the German registry received LESS than Parkland plus maintenance, and six of the seven who died were under-resuscitated. Four new [NO SOURCE] markers are recorded (the 8h/16h split, any maintenance weight threshold, the paediatric urine-output goal, and any head-to-head outcome comparison of the paediatric formulas); the pre-existing marker for a graded paediatric starting-coefficient CPG is CONFIRMED, not closed.",
      reason: "new-reference",
    },
    {
      version: "1.2.1",
      date: "2026-08-03",
      summary:
        "Relabels five sourcing gaps from 'not found' to SETTLED-ABSENT. No coefficient, input, output, computed volume or clinical statement changed — only what the page claims about the state of the evidence. The 8-h/16-h split, any maintenance weight threshold at 20/30/40 kg, the optimal paediatric hourly urine-output goal, any paediatric equivalent of the ABA CPG, and any head-to-head OUTCOME comparison of Cincinnati, Galveston and Parkland in children were each established NOT TO EXIST rather than merely not located, so they are recorded as closed and are not to be re-searched. Two qualifications travel with that: the 8-h/16-h finding is settled-absent pending the 1968 Baxter & Shires primary, which was not read directly, so the claim rests on the secondary literature; and the paediatric-CPG absence is now stated positively (Cartotto 2024 scopes itself to adults with 20% TBSA or more) rather than as a marker awaiting a search. Where these absences bite is unchanged and still stated: each is a place where the printed numbers are convention rather than evidence.",
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
  cautions: [
    defineText(
      "burn.caution.prearrival",
      "Fluid already given is NOT subtracted here, and no infusion rate is emitted. The resuscitation clock runs from the TIME OF INJURY, and published protocols deduct pre-arrival volume before dividing what is left over the hours that remain — ABRUPT measured a mean of 1553 mL (SD 1782) already given before burn-centre arrival in adults, at a mean 2.9 hours from injury. This calculator takes neither an elapsed-time nor a fluid-given input, so the first-8-hour figure it shows is HALF THE 24-HOUR VOLUME COUNTED FROM THE BURN, not the volume still to be infused. Subtract what has already run, and divide the remainder by the hours left in the 8-hour window, by hand.",
    ),
    defineText(
      "burn.caution.coefficient",
      "The starting coefficient is contested, and by the same organisation. The 2024 ABA CPG recommends starting adults at 2 mL/kg/%TBSA on the strength of exactly two studies totalling 88 patients, neither of which showed an outcome difference. One year earlier ABRUPT — 379 adults across 21 US and Canadian burn centres, documented hourly — found a delivered 24-hour volume of 4.6 mL/kg/%TBSA (SD 2.2) and concluded that for burns over 20% TBSA the Parkland target of 4 is accurate and that a 2 mL/kg/%TBSA goal may not be feasible. Same organisation, one year apart, shared authors. Both are ADULT findings and neither licenses a paediatric coefficient. The 3 mL/kg/%TBSA used here is the common paediatric convention, and inside a 2016-2026 evidence window it has no primary derivation at all.",
    ),
    defineText(
      "burn.caution.maintenance-threshold",
      "This score adds Holliday-Segar maintenance for every weight it accepts, with NO threshold — do not read that as the settled position. The commonly quoted 30 kg figure is real and traceable to the ABA through Pisano's 2021 five-centre tabulation, where it is the weight BELOW which maintenance is added rather than above which it is withdrawn. But published paediatric burn-centre practice runs 20 kg to 40 kg, one centre uses age under 1 year instead of any weight, and one adds no separate maintenance at all. The German national paediatric guideline (AWMF 006/128, 2024) applies maintenance to all children with no weight threshold, which is the structure implemented here. No derivation exists for any of these values. Use your local protocol's threshold, not this one, if they differ.",
    ),
    defineText(
      "burn.caution.centre-variation",
      "The same child gets very different volumes at different centres, and this one sits at the bottom of the range. Pisano's published example: a 5-year-old weighing 25 kg with a 20% TBSA burn has an estimated 24-hour requirement of 1500 mL to 3560 mL — 3.0 to 7.1 mL/kg/%TBSA — depending only on which of five ABA-verified paediatric burn centres they arrive at. This score returns 3 x 25 x 20 = 1500 mL for that child, the LOW end of that 2.4-fold spread, and 3100 mL once maintenance is added. Delivered volumes in the same cohorts averaged 6.35 mL/kg/%TBSA overall, with one centre at 9.09. Treat the figure shown as a starting point inside a wide published range, not as the requirement.",
    ),
    defineText(
      "burn.caution.both-directions",
      "Under-resuscitation is a real failure direction too. Over-resuscitation (fluid creep) is the harm most often named, and it is why the 2024 ABA CPG lowered the adult starting rate — but in the German Burn Registry (407 children, 30 centres) 86.5% received LESS than Parkland plus Holliday-Segar maintenance, and six of the seven children who died were under-resuscitated relative to it. That registry's own length-of-stay effect estimates are weak and its authors say the over-resuscitation effect is probably overestimated and imprecisely estimated, so build no warning threshold on either finding. Titrate to the patient in both directions.",
    ),
  ],
  notes: defineText(
    "burn.notes",
    "Therapy/dosing formula, not a severity score — it outputs a STARTING crystalloid volume that is then titrated to urine output, not a risk band; interpretation is intentionally empty. Fluid is lactated Ringer's (LR). Give HALF of the 24-h resuscitation volume in the first 8 hours and the remaining half over the next 16 hours, with the clock started at the TIME OF THE BURN, not arrival — late presentation compresses the remaining first-8-h volume into fewer hours (the rate changes, not the volume). THE CLOCK, AND WHAT THIS CALCULATOR DOES NOT DO WITH IT. Published protocols do two things this tool does not. They anchor time 0 at the injury and then subtract fluid ALREADY GIVEN before dividing what is left over the hours remaining in the 8-hour window — ABRUPT anchored every hourly observation to the burn, recorded a mean 2.9 h (SD 2.6) from burn to burn-centre arrival, and found patients had already received a mean 1553 mL (SD 1782) by then, which is not a rounding matter. This score has no elapsed-time input, no fluid-already-given input, and emits no infusion rate; its first-8-hour figure is simply half the 24-hour volume, measured from the burn. That is a gross volume, not the volume still to be infused, and the subtraction and the division are left to be done by hand. The 8-h/16-h split itself has no derivation, and that is now a [SETTLED-ABSENT] finding rather than a search still running: no controlled derivation of the split exists, it is absent from the 2024 ABA CPG (which does not address it in any of its ten PICO questions), and absent from every source in a 2016-2026 review — universal in practice, derived nowhere. One qualifier is owed: the 1968 primary (Baxter & Shires) has NOT been read directly, so 'absent from the original' rests on the secondary literature that restates it rather than on the paper itself; the finding is settled-absent pending that one primary, not merely unfound. %TBSA counts second- and third-degree (partial + full thickness) burn only and, in children, must be estimated with the age-adjusted Lund-Browder chart, NOT the Rule of Nines (a child's head is a much larger fraction of BSA). THE LUND-BROWDER CHART, AND ITS SOURCING. The chart now ships as verified data alongside this score: 19 body segments across 6 age bands, per side for paired segments (each cell is one limb, so both hands together are 5% and both adult lower limbs 40%). Its provenance is stated exactly, and fact by fact, because the facts do not share a source. The values are after Lund & Browder (1944), as reproduced in the US Department of Defense Joint Trauma System Burn Care CPG Lund Browder Burn Estimate & Diagram worksheets, and the three dates that go with them — Infant (July 2025), Pediatric (June 2025), Adult (June 2025) — are the individual WORKSHEET dates, not the guideline's. The guideline identifier and its own date, Burn Care CPG ID 12 dated 10 June 2025, come from the JTS CPG index at jts.health.mil and were checked there on 2026-08-03. The 1944 paper itself was NOT obtained (Surgery, Gynecology & Obstetrics vol. 79 is not digitised in any reachable open repository), so this is an attribution to a dated modern reproduction and not a claim on the 1944 original; whether the 19-row tabular layout appears in that form in 1944 is unconfirmed. Age bands are birth to <1, 1 to <5, 5 to <10, 10 to <15, 15 to <16 and 16+ years, so a 3-year-old is scored on the 1-year column and a 7-year-old on the 5-year column. The head falls 19 -> 17 -> 13 -> 11 -> 9 -> 7% with age while the thighs and lower legs take up exactly what the head loses, so every column sums to exactly 100 — which is asserted on every release, because MOST Lund-Browder charts in circulation do not. Lundin & Alsbjorn (Burns 2013;39(4):819-820) traced the common 101% defect to a typographic error that makes one aspect of each hand 1.5% instead of 1.25%, i.e. each hand 3% instead of 2.5%, adding 1.0 to every column; a second, less-documented defect prints half a thigh at age 10 as 4.5 instead of 4.25, making each thigh 9% instead of 8.5% and inflating the 10-14 column alone. This table carries the values that close at 100. Do not use any Lund-Browder chart you have not summed yourself. LIMITATIONS OF THE CHART ITSELF: the anthropometric substrate is roughly a century old — Lund and Browder did not measure these proportions but assembled them from Berkow (1924) and Boyd (1935), behind which sit Du Bois (1915) and Funke (1858) — and none of it has been revalidated against modern population data. The chart was never developed or validated by an expert panel using stringent scientific principles or defined protocols; concurrent validity against computerised planimetry appears high, but its other clinimetric properties are largely unstudied, and Lund and Browder themselves claimed applicability to 95.5% of the population rather than all of it. It does not account for obesity, breast size, pregnancy, or amputated body parts, each of which shifts relative body proportions. Simple erythema (superficial/first-degree burn) is EXCLUDED from %TBSA; the JTS worksheets carry a separate first-degree column explicitly marked not to be added to the total. Inter-rater variability is substantial and grows with burn size — overestimation is the commoner direction of error outside burn centres, and an error either way beyond about 10% is associated with real morbidity. The chart is data here, not an input: %TBSA is still entered as a single number the clinician has already estimated. Pediatric Parkland and pediatric modified Brooke both use 3 mL/kg/%TBSA, so their 24-h volumes converge; the ADULT coefficients differ (Parkland 4 mL, modified Brooke 2 mL) and are NOT emitted here to avoid over-dosing a child. For CHILDREN, Holliday-Segar maintenance fluid — commonly a 5%-dextrose-containing fluid (limited glycogen stores -> hypoglycemia risk) — is added ON TOP of the LR resuscitation volume (adults get no separate maintenance); the surface-area Galveston/Cincinnati formulas instead fold maintenance in but require height/BSA and are not computed here. THE MAINTENANCE WEIGHT THRESHOLD IS NOT ONE NUMBER. This score adds maintenance at every weight it accepts, with no threshold at all. The 30 kg figure in wide circulation is real and traceable — it is the ABA position as tabulated in Pisano's 2021 comparison of five ABA-verified paediatric burn centres, and it is the weight BELOW which maintenance is ADDED, not one above which it is withdrawn — but the same table shows the five centres using <20 kg, <20 kg, <30 kg, <40 kg and age under 1 year, and one supplying no additional maintenance IV fluid at all. The German national paediatric guideline (AWMF S2k 006/128, 2024) carries no weight threshold anywhere and applies Holliday-Segar maintenance to all children, which is the structure used here; the German Burn Registry applied Parkland-plus-maintenance to every child under 16 with a burn of 15% TBSA or more on the same basis. No derivation exists for 20, 30 or 40 kg, and that is [SETTLED-ABSENT]: these are pragmatic brackets, not the output of any derivation study, and looking for one again will not find one. Follow local protocol where it differs. TITRATE TO URINE OUTPUT, AND THE TARGETS GENUINELY DISAGREE. Children are commonly given 1.0-1.5 mL/kg/h (StatPearls), with a widely cited split of 1 mL/kg/h below 30 kg and 0.5 mL/kg/h at or above it (Romanowski & Palmieri 2017), and infants sometimes ~1-2 mL/kg/h; adults ~0.5 mL/kg/h (2024 ABA CPG), against which ABRUPT actually achieved 0.87 (SD 0.51). Three distinct disagreements sit inside that: (a) the target ABOVE 30 kg spans 0.3-1.0 mL/kg/h once the Children's Hospital of Michigan protocol reported by Stevens 2023 is included, which sets 0.8-1.2 mL/kg/h at 30 kg or under and 0.3-0.7 mL/kg/h above it — lower than every other source and lower than the adult band, so displaying a single 0.5 for a 35 kg child picks one end of a threefold range; (b) the BANDING VARIABLE itself differs — AWMF 006/128 bands by developmental stage (infants and toddlers 1-2 mL/kg/h, school age 0.5-1) while North American sources band by weight, and those are not interchangeable, because a large 5-year-old and a small 9-year-old fall on opposite sides; (c) the weight at which the band switches ranges 20-40 kg across the same five centres. The optimal paediatric hourly goal is [SETTLED-ABSENT] — the published targets are expert and review consensus only, Romanowski & Palmieri and AWMF 006/128 both state the optimum as undefined, and AWMF grades all its fluid statements expert consensus, evidence level IV. There is no study to find that settles it. Read urine output alongside blood pressure, lactate and clinical state: oliguria in intra-abdominal hypertension is renal hypoperfusion, not hypovolaemia, and more fluid is the wrong answer to it. EVIDENCE WINDOW, STATED PLAINLY. Restricting the evidence to 2016-2026 finds NO primary derivation for any coefficient in this score. Parkland (1968), Brooke (1953), Galveston (1980), Cincinnati and Holliday-Segar (1957) all predate that window by decades, and everything published inside it is restatement, practice audit or consensus synthesis. The numbers are conventions with 40-70 year provenance, in use and unre-derived. EIGHT LIVE CONTROVERSIES, PRESENTED AS CONTROVERSIES AND NOT AS SETTLED. (1) The adult starting coefficient — the 2024 ABA CPG recommends 2 mL/kg/%TBSA on exactly two studies totalling 88 patients, neither showing an outcome difference, while ABRUPT 2023 reports a delivered 4.6 mL/kg/%TBSA (SD 2.2) in 379 patients across 21 centres and states that 4 is accurate for burns over 20% TBSA and that a 2 mL/kg/%TBSA goal may not be feasible; same organisation, one year apart, shared authors, and the CPG could not resolve it because ABRUPT had no 2-versus-4 comparator arm. (2) The 'modified Brooke' coefficient is given as 2, as 2-3, and as 3 by three peer-reviewed in-window sources for the same label — which is why all four Parkland and Brooke outputs here print their coefficient rather than relying on a formula name. The maintenance and combined-total outputs name no coefficient because neither is a coefficient formula. (3) The paediatric maintenance threshold: below 30 kg per the ABA, 20-40 kg in practice, or none at all per AWMF. (4) The urine-output banding variable: weight, or developmental stage. (5) The target above 30 kg: 0.3-0.7, or 0.5-1.0. (6) The direction of paediatric error: over-resuscitation in North America, under-resuscitation in the DACH registry. (7) Surface-area versus weight basis: Galveston underpredicts what is actually delivered (Stevens 2023), yet BSA-based formulas are argued to suit patients of 20 kg or less. (8) The inhalation-injury coefficient: two centres escalate to 6 mL/kg/%TBSA against the ABA's 3-4, and one of them withdrew its 6 in 2019 — this score offers no inhalation modifier, because any that is offered needs a date and a source attached. HOW WIDE THE SPREAD REALLY IS. Pisano's worked example is the honest limitation line: a 5-year-old weighing 25 kg with a 20% TBSA burn has an estimated 24-hour requirement of 1500 mL to 3560 mL — 3.0 to 7.1 mL/kg/%TBSA — depending only on which of five centres they reach. This score returns 1500 mL for that child, the bottom of that span, and 3100 mL with maintenance included. Delivered volumes ran higher still: 6.35 mL/kg/%TBSA overall across those five centres, from 5.10 to 9.09 by centre, and 6.6-7.6 in Stevens' single-centre cohort, against 4.6 in adults. FLUID CREEP (over-resuscitation) is a documented harm; the 2024 ABA CPG lowered the ADULT starting coefficient to 2 mL/kg/%TBSA to counter it, but that CPG is adults-only and does NOT license a 2 mL pediatric starting rate — there is no graded paediatric CPG for the starting coefficient, because there is no paediatric equivalent of the ABA CPG at all. That is [SETTLED-ABSENT], not unfound: the 2024 CPG (Cartotto 2024) scopes itself explicitly to adults with burns of 20% TBSA or more and frames every PICO question that way, and a 2016-2026 search located no paediatric counterpart. The paediatric starting coefficient therefore rests on convention, and will until somebody writes one. BUT OVER-RESUSCITATION IS NOT THE ONLY FAILURE DIRECTION. In the German Burn Registry — 407 children across 30 centres in Germany, Switzerland and Austria — 86.5% received LESS than Parkland plus Holliday-Segar maintenance, and six of the seven children who died were under-resuscitated relative to it. Its length-of-stay effect estimates are weak (the excess-volume arm's confidence interval crosses 1; only the restriction arm reaches significance, only in the unimputed model, at an 11% reduction) and its authors say the over-resuscitation effect is probably overestimated and can only be estimated imprecisely, so no warning threshold should be built on either result. The cohort is also scald-predominant toddlers with a median age of 1, and its comparator includes maintenance, so 'below Parkland-plus-maintenance' is an easier bar to fall under than 'above Parkland'. NO GUIDELINE ENDORSES A VOLUME CEILING: the 2024 ABA CPG recommends selective intra-abdominal and intra-ocular pressure monitoring instead, a monitoring trigger rather than a cap, and the Ivy index (250 mL/kg/24 h) and the 6 mL/kg/%TBSA trigger both originate outside the evidence window and are endorsed as thresholds by no current guideline. The one hard in-window paediatric bound is AWMF 006/128's Empfehlung 10 (12/12 consensus): in children with 10% TBSA or more, use isotonic crystalloid and do not initially exceed 10 mL/kg body weight per hour. Some references retain 4 mL/kg/%TBSA for children (relying on maintenance to cover baseline needs); centers differ, so the coefficient is institution-specific. FIVE THINGS ARE [SETTLED-ABSENT], WHICH IS A STRONGER STATEMENT THAN 'NOT FOUND'. Each was searched and established not to exist, so they are recorded as closed rather than pending, and re-searching them is wasted work: (1) the derivation of the 8-h/16-h split — no controlled derivation, with the single qualifier that the 1968 Baxter & Shires primary was not read directly; (2) the derivation of any maintenance weight threshold at 20, 30 or 40 kg — pragmatic brackets, never tested; (3) the optimal hourly urine-output goal in children — expert and review consensus only; (4) any paediatric equivalent of the ABA CPG — the 2024 CPG scopes itself to adults with 20% TBSA or more, and no paediatric counterpart exists; (5) any head-to-head OUTCOME comparison of Cincinnati, Galveston and Parkland in children — Stevens 2023 compares predictions against volume delivered, not against outcome, and no trial exists. These are absences in the literature, not gaps in this review; each one is a place where the numbers this calculator prints are convention rather than evidence, and that is the honest reading of them. Every computed volume is a starting estimate to be titrated, never a fixed prescription. Weight bounds (0.5-150 kg) are input-validity limits, not cited clinical thresholds.",
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
          "Parkland (pediatric 3 mL/kg/%TBSA) — first-8-h LR volume (half, from time of burn)",
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
          "Modified Brooke (pediatric 3 mL/kg/%TBSA) — first-8-h LR volume (half, from time of burn)",
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
