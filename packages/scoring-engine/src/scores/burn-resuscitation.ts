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
 * the range rather than a single number.
 *
 * THAT TWO-PART SHAPE — MAINTENANCE SUPPLIED, RESUSCITATION INITIATED AT 3 — IS
 * WHAT THE PRIMARY EXPLICITLY RECOMMENDS. Graves 1988 (PMID 3199467) measured
 * both figures in the same 43 burned children: a TOTAL 24-h volume of 6.3 and a
 * NET resuscitation requirement of 3.91 cc/kg/%TBSB, and recommends supplying
 * maintenance and initiating resuscitation at 3. A previous revision of this
 * file read the circulating ~6 as a RIVAL coefficient and warned that the 3
 * emitted here might under-resuscitate; that was a category error — 6 is a
 * total including maintenance, 3 is resuscitation alone — and it is retracted
 * at v1.6.0. See the coefficient constant below and research note R.11.
 *
 * THAT MAINTENANCE TERM DIVERGES FROM THE STANDALONE `holliday-segar` SCORE ON
 * PURPOSE, AND BOTH PAGES SAY SO. The standalone maintenance calculator REFUSES
 * below 4 kg, because 100 mL/kg/day over-estimates a term neonate substantially
 * and a weight input cannot implement the age-based scope rule the guidelines
 * actually write. The identical arithmetic runs here from this score's own
 * 0.5 kg floor, and that floor is deliberately NOT raised: burn resuscitation
 * genuinely applies to infants, and turning away a burned 3 kg neonate would
 * withhold the resuscitation volume too, which is the worse failure. So the
 * divergence is disclosed rather than removed — `cautions` and `notes` state
 * that below roughly 4 kg the maintenance output, and the combined total that
 * contains it, sit outside the range their own calculator will compute, while
 * the two resuscitation figures are unaffected. Research + full sourcing:
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
 *
 * THIS IS THE SAME FUNCTION THE STANDALONE `holliday-segar` SCORE COMPUTES, and
 * the two scores apply it over different domains: that one rejects below 4 kg,
 * this one runs from 0.5 kg. Do not "fix" that by raising this score's weight
 * minimum — the reason for keeping it is in the header above, and the scope
 * limitation it inherits is disclosed in `cautions` and `notes` instead, which
 * is what stops the two pages contradicting each other silently. If the
 * standalone score's floor ever moves, the figure quoted in this score's prose
 * moves with it: the colocated test pins the two together.
 */
function hollidaySegarMaintenanceMl(weightKg: number): number {
  if (weightKg <= 10) return 100 * weightKg;
  if (weightKg <= 20) return 1000 + 50 * (weightKg - 10);
  return 1500 + 20 * (weightKg - 20);
}

/**
 * mL/kg/%TBSA — pediatric Parkland & modified Brooke.
 *
 * VINDICATED BY THE PRIMARY, NOT MERELY UNCHANGED (research note R.11, corrected
 * 2026-08-04). Versions 1.4.0 and 1.5.0 of this score told readers that children
 * may require approximately 6 mL/kg/%TBSA against the 3 emitted here, i.e. that
 * this coefficient might UNDER-resuscitate small children. THAT FRAMING WAS
 * WRONG and is retracted at v1.6.0: the ~6 is a TOTAL 24-hour volume INCLUDING
 * maintenance, while 3 is resuscitation ALONE.
 *
 * Graves 1988 (J Trauma 28(12):1656-9, PMID 3199467) — the primary behind the 6 —
 * measured both in one cohort of 43 burned children of 25 kg or less: total
 * 6.3 +/- 2.2 cc/kg/%TBSB, and net resuscitation, after subtracting calculated
 * maintenance, 3.91 +/- 2.2. Its recommendation is to supply maintenance volume
 * and initiate burn resuscitation at 3 cc/kg/%TBSB — which is exactly the shape
 * this score implements. Merrell 1986 (PMID 3789292; 177 children, mean burn 27%
 * TBSA, 5.8 +/- 0.25 mL/kg/%TBSA) corroborates that the larger figure is a total.
 *
 * The equivalence is weight-dependent BY DESIGN: maintenance per kg per %TBSA
 * falls as weight rises, so 3 + maintenance approximates 6 in an infant and
 * deliberately less in a larger child. Do not "fix" this constant upward — a
 * flat single figure of 6 is what overhydrates the large child.
 */
const PEDIATRIC_COEFF_ML = 3;

export const burnResuscitation = defineScore({
  id: "burn-resuscitation",
  slug: "burn-resuscitation",
  name: "Pediatric burn fluid resuscitation (Parkland / modified Brooke)",
  version: "1.7.0",
  status: "published",
  category: "fluids-resuscitation",
  inputs: [
    {
      id: "weight_kg",
      label: defineText("burn.weight", "Body weight"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      /**
       * Input-validity bound, not a cited threshold — and DELIBERATELY NOT
       * raised to the 4 kg at which the standalone `holliday-segar` score
       * rejects. Burn resuscitation applies to infants; refusing a burned 3 kg
       * neonate outright would withhold the resuscitation volume as well as the
       * maintenance one. What that score's floor means for the maintenance term
       * emitted here is disclosed in `cautions` and `notes` instead.
       */
      min: 0.5,
      // input-validity bound, not a cited threshold
      max: 150,
      helpText: defineText(
        "burn.weight.help",
        "Pediatric weight in kg (accepts lb or g). Drives the crystalloid dose and the Holliday-Segar maintenance volume. Below about 4 kg the maintenance figure is outside the scope of the standalone maintenance calculator on this site and must be replaced by a neonatal regimen — the resuscitation figures are unaffected. See cautions.",
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
        "Baxter CR, Shires T. Physiological response to crystalloid resuscitation of severe burns. Ann N Y Acad Sci. 1968;150(3):874-894. (The Parkland primary. p883 derives the eight-hour/sixteen-hour schedule experimentally: in a 50% TBSA flame-burn canine model the best plasma-volume and functional-extracellular-fluid response came from 16-20% of body weight in the first eight hours after the burn, at 20 cc/kg/h, maintained with a further 8-10% of body weight as lactated Ringer's, at 5 cc/kg/h, across the next sixteen. A figure legend on the same page describes a treatment schedule split the same way.)",
      doi: "10.1111/j.1749-6632.1968.tb14738.x",
      note: "READ DIRECTLY FROM THE SOURCE PDF, 2026-08-03 — not from a secondary review, a restatement or a review finding, and that distinction is the point. This reference corrects the claim this score carried at v1.2.1 and earlier, which asserted the split was absent from the 1968 original and derived nowhere. Three qualifications travel with it and must not be dropped: the derivation is in DOGS at 50% TBSA flame burn with plasma volume and functional extracellular fluid as the endpoints, not a human outcome trial and not paediatric; the doses are expressed as PERCENT OF BODY WEIGHT, not as mL/kg/%TBSA, so the paper fixes the two-phase shape of the schedule and not the coefficient this calculator uses; and on the paper's own figures the first eight hours carry two-thirds of the 24-hour volume, not the half in clinical use.",
    },
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
        "Palmieri TL, et al. Fluid Resuscitation of Severely Burned Children. ePlasty (PMC11166384). (States the adult 2 and 4 mL/kg/%TBSA coefficients, then that children require approximately 6 mL/kg/%TBSA burned, and that single-figure adult formulas may omit maintenance and 'underestimate needs in small children and overhydrate large children'.)",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11166384/",
      note: "FULL TEXT READ, 2026-08-04. CITED DIFFERENTLY SINCE v1.6.0, AND THE CHANGE IS A RETRACTION. At v1.4.0-v1.5.0 this reference was carried as a CONTRADICTION of the 3 mL/kg/%TBSA figure this score emits — two paediatric figures said to differ by a factor of two, with the objection running toward UNDER-resuscitation of small children. That reading was wrong. Its approximately 6 is a TOTAL 24-hour volume including maintenance, restating Graves 1988, whose own recommendation is to supply maintenance and initiate resuscitation at 3; there was never a rival coefficient. What this reference does establish, and what it is now cited for, is the clause quoted above: a SINGLE-FIGURE formula underestimates small children and overhydrates large ones — which is an argument for the two-part maintenance-plus-resuscitation shape this score already implements, and against applying any flat single figure (including 6) at every weight.",
    },
    {
      citation:
        "Graves TA, Cioffi WG, McManus WF, Mason AD Jr, Pruitt BA Jr. Fluid resuscitation of infants and children with massive thermal injury. J Trauma. 1988;28(12):1656-1659. (43 children aged 1.5-108 months, 25-89% TBSB, all <=25 kg. Average TOTAL 24-h fluid 6.3 +/- 2.2 cc/kg/%TBSB; NET resuscitation fluid, i.e. total minus calculated maintenance, 3.91 +/- 2.2 cc/kg/%TBSB. Recommends supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/%TBSB.)",
      pmid: "3199467",
      doi: "10.1097/00005373-198812000-00007",
      note: "ABSTRACT AND THE PUBLISHER ABSTRACT PAGE READ, 2026-08-04; the full body was NOT opened, so nothing beyond the two summary figures and the recommendation sentence is claimed from it. THIS IS THE REFERENCE THAT RESOLVES THE APPARENT 3-VERSUS-6 CONFLICT, because it reports both numbers from one cohort and names which is which: 6.3 is the TOTAL, 3.91 the resuscitation component after maintenance is removed. It is also the source that vindicates this score's structure rather than merely permitting it — maintenance supplied, resuscitation initiated at 3, which is what `calculate` emits. Pre-window (1988) by the 2016-2026 review's rule, so it is a primary of record, not in-window evidence.",
    },
    {
      citation:
        "Merrell SW, Saffle JR, Sullivan JJ, Navar PD, Kravitz M, Warden GD. Fluid resuscitation in thermally injured children. Am J Surg. 1986;152(6):664-669. (177 children, mean burn 27% TBSA; mean TOTAL 24-h fluid 5.8 +/- 0.25 mL/kg/%TBSA.)",
      pmid: "3789292",
      note: "ABSTRACT READ, 2026-08-04. Carried for one purpose: independent corroboration that the ~6 mL/kg/%TBSA figure circulating for children is a TOTAL delivered volume and not a resuscitation coefficient, which is what makes it consistent with Graves' 3 plus maintenance rather than a rival to it.",
    },
    {
      citation:
        "Cartotto RC, Innes M, Musgrave MA, et al. How well does the Parkland formula estimate actual fluid resuscitation volumes? J Burn Care Rehabil. 2002;23(4):258-265. (n=31 adults >=15% TBSA; actual 24-h volume 6.7 +/- 2.8 mL/kg/%TBSA, exceeding the Parkland prediction in 84%; after the first 8 hours the infusion rate decreased 34% in 16 patients and increased 47% in 15, two-way ANOVA P<0.001.)",
      pmid: "12142578",
      note: "ABSTRACT AND FIGURE CAPTIONS READ, 2026-08-04; full text not accessed. ADULT, single centre, n=31, and PRE-WINDOW (2002) — it licenses nothing paediatric and is not in-window evidence. Carried for one fact only: the change in infusion rate at the 8-hour mark is BIDIRECTIONAL and patient-dependent, which is what falsifies reading the printed first-8-hour figure as a description of delivery. It is the only measurement of the two phases' behaviour this review located, and that scarcity is itself recorded as a settled absence.",
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
    {
      version: "1.3.0",
      date: "2026-08-03",
      summary:
        "CORRECTS A FALSE CLAIM. Every version up to and including 1.2.1 stated that the 8-hour/16-hour split was absent from the 1968 Baxter & Shires original and derived nowhere, carrying it as a settled absence qualified only by the primary not having been read. THE FIRST HALF WAS WRONG. Baxter & Shires 1968 (Ann N Y Acad Sci 150(3):874-894, DOI 10.1111/j.1749-6632.1968.tb14738.x) has now been read directly from the source PDF, and p883 states the split explicitly and reports it as the experimentally derived optimum. The split therefore both ORIGINATES in the 1968 paper and IS derived there, and the paper is added as a reference. What the derivation is, is stated with it, because it is the part that governs how far the number travels: dogs, 50% TBSA flame burn, endpoints of plasma volume and functional extracellular fluid — no human outcome trial, no randomised comparison of one split against another, and nothing paediatric. Two consequences of the paper's own figures are recorded as this project's arithmetic rather than as claims the paper makes: the doses are given as percent of body weight rather than mL/kg/%TBSA, so 1968 fixes the shape of the schedule and not this calculator's coefficient; and in that canine optimum the first eight hours carried two-thirds of the 24-hour volume, where clinical practice and this calculator give half. The residual gap is kept but narrowed to its real scope — no human re-derivation, no paediatric derivation, and no guideline-level statement, the 2024 ABA CPG not addressing the split in any of its ten PICO questions — and only that narrowed residual stays SETTLED-ABSENT. A sixth caution carries the correction to the calculator surface. No coefficient, input, output or computed volume changed.",
      reason: "new-reference",
    },
    {
      version: "1.4.0",
      date: "2026-08-04",
      summary:
        "Surfaces a contradiction that runs OPPOSITE to every hazard this page was previously organised around, adds the observed delivery shape, and upgrades the absence list from five entries to eight. No coefficient, input, output or computed volume changed. (1) THE 3 mL FIGURE IS NOT UNCONTESTED. A paediatric review read in full (Palmieri et al., ePlasty, PMC11166384) states that children require approximately 6 mL/kg/%TBSA and that single-figure adult formulas may omit maintenance and 'underestimate needs in small children and overhydrate large children'. Everything this page said before framed over-resuscitation as the hazard and put 3 safely below the adult 4; this objection says a single weight-linear coefficient may systematically UNDER-resuscitate small children before maintenance is added. The coefficient is NOT changed — that is a clinical decision, not this review's — but a reader must not be left thinking 3 is settled, so it is stated as controversy 9 of nine and carried in its own caution. What the added maintenance does to the gap is stated as this project's arithmetic, not as a resolution: the combined figure is 8.0 mL/kg/%TBSA at 8 kg, 6.2 at 25 kg and 4.9 at 60 kg, so it is not a constant 6 and it moves in the direction the objection predicts. (2) THE 50/50 SPLIT IS A STARTING SCHEDULE, NOT A DESCRIPTION OF PRACTICE. Cartotto 2002 (PMID 12142578, abstract and figure captions read; 31 adults, single centre, pre-window) measured a delivered 24-hour volume of 6.7 +/- 2.8 mL/kg/%TBSA exceeding the Parkland prediction in 84%, and — the load-bearing finding — at the eight-hour mark the infusion rate DECREASED 34% in 16 patients while it INCREASED 47% in 15, two-way ANOVA P<0.001. Bidirectional and patient-dependent, at a magnitude no fixed fraction implies. Three figures are now on the record for the first eight hours: half (emitted here), two-thirds (the 1968 canine optimum), and in practice neither. (3) THE ABSENCE LIST GROWS TO EIGHT, all reconfirmed for 2016-2026. Three are new: no study tests the 8h:16h FRACTION against outcomes; no observed 0-8h versus 8-24h delivery proportion has ever been published, despite multicentre datasets holding hourly volumes; and no paediatric-derived upper volume bound exists. (4) The eight-hour breakpoint's rationale is recorded as not enumerated in the derivation — a secondary attributes it to myocardial-depression recovery at 4-8 h while conceding it is not clearly enumerated in the original, and it is carried as a secondary attribution with that hedge attached, not as a finding. The first-hand 2026-08-03 reading of the 1968 primary, and the 2:1 ratio it found, stand unchanged.",
      reason: "new-reference",
    },
    {
      version: "1.5.0",
      date: "2026-08-04",
      summary:
        "CLOSES A CONTRADICTION BETWEEN TWO PAGES OF THIS SITE. No coefficient, input bound, output or computed volume changed; the weight minimum stays 0.5 kg and every number this score printed at 1.4.0 it still prints. The standalone Holliday-Segar maintenance score now REFUSES to compute below 4 kg — 100 mL/kg/day over-estimates a term neonate substantially, the guideline scopes that exclude neonates are written in AGE rather than weight, and a weight input cannot implement an age rule. This score reimplements the identical 100/50/20 arithmetic and applies it from its own 0.5 kg floor, so until now the same formula was guarded on one page and unguarded on the other, and a 1 kg patient got a maintenance volume here that the maintenance page would not compute at all. THE FLOOR IS NOT COPIED ACROSS, AND THAT IS THE DECISION. Burn resuscitation genuinely applies to infants — one of Pisano's five centres bands by age under 1 year precisely because those patients exist — and rejecting a burned 3 kg neonate would withhold the resuscitation volume as well as the maintenance one, which is the worse failure. THE FIX IS DISCLOSURE, ON BOTH SURFACES. A ninth caution and a new notes section state that below roughly 4 kg the maintenance output, and the combined total that contains it, are outside the range their own calculator will compute and must be replaced by the unit's neonatal maintenance regimen or NICE's day-of-life ladder, while the two resuscitation outputs are unaffected because the 3 mL/kg/%TBSA coefficient carries no age assumption; that the direction of the error is OVER-estimation of maintenance in the first days of life, which compounds rather than offsets the fluid-creep hazard named elsewhere here; and that the 4 kg figure is the other score's own implementation proxy rather than a published threshold, since no guideline states a weight below which Holliday-Segar must not be used. The two pages now cross-reference each other by name instead of disagreeing silently, and the colocated test reads the standalone score's declared floor and fails if the number quoted in this prose ever stops matching it.",
      reason: "clarification",
    },
    {
      version: "1.6.0",
      date: "2026-08-04",
      summary:
        "WITHDRAWS A WARNING THIS SCORE SHIPPED ONE RELEASE AGO. No coefficient, input bound, output or computed volume changed — every number printed at 1.5.0 is printed unchanged at 1.6.0. THE RETRACTED CLAIM. Versions 1.4.0 and 1.5.0 told readers that children may require approximately 6 mL/kg/%TBSA against the 3 mL/kg/%TBSA this calculator emits, presented it as controversy 9 of nine with its own caution, and named the failure direction as UNDER-resuscitation of small children. A reader who saw it was told this calculator might be under-dosing their patient. THAT WAS A CATEGORY ERROR, and it is retracted in place rather than quietly reworded. The two figures never measured the same quantity: approximately 6 is a TOTAL 24-hour volume that INCLUDES maintenance, and 3 is the RESUSCITATION coefficient alone, to which this score already adds Holliday-Segar maintenance separately at every weight. WHAT THE PRIMARY ACTUALLY SAYS. Graves TA, Cioffi WG, McManus WF, Mason AD Jr, Pruitt BA Jr (J Trauma 1988;28(12):1656-9, PMID 3199467, DOI 10.1097/00005373-198812000-00007; abstract and publisher abstract page read, full body not opened) is the primary behind the 6 and reports both numbers from the same 43 children — aged 1.5-108 months, 25-89% TBSB, all 25 kg or under: average TOTAL 24-hour volume 6.3 +/- 2.2 cc/kg/%TBSB, and NET resuscitation fluid, the total minus calculated maintenance, 3.91 +/- 2.2. Its recommendation, quoted: 'We recommend supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/% TBSB.' That is this score's structure, coefficient for coefficient — so the finding VINDICATES the implementation rather than merely permitting it. Merrell SW et al. (Am J Surg 1986;152:664-9, PMID 3789292, abstract read; 177 children, mean burn 27% TBSA, mean total fluid 5.8 +/- 0.25 mL/kg/%TBSA) is added as corroboration that the larger circulating figure is a total. Both references are new. WHY IT IS A RECONCILIATION AND NOT A COINCIDENCE, WHICH IS THE PART v1.4.0 COULD NOT ANSWER. Maintenance expressed per kilogram per %TBSA FALLS as weight rises, because the Holliday-Segar tiers step down from 100 to 50 to 20 mL/kg/day while the resuscitation term stays linear in weight. So 3 plus maintenance lands near 6 in a small infant and deliberately below it in a larger child: at 40% TBSA a 10 kg infant gets 3 + 2.5 = 5.5 mL/kg/%TBSA and a 25 kg child 3 + 1.6 = 4.6, and at 20% TBSA the same sum gives 8.0 at 8 kg, 6.2 at 25 kg and 4.9 at 60 kg. A flat single figure of 6 applied at every weight is what would overhydrate the large child — the direction Palmieri et al. themselves predict for any single-figure formula — and the two-part shape used here is what avoids it. The Palmieri reference is kept and recited for that clause instead of for a contradiction it does not create. WHAT REMAINS A GENUINE CONTROVERSY, RESTATED AS PRACTICE VARIATION. Controversy 9 is rewritten rather than deleted: across five ABA-verified paediatric burn centres the STARTING coefficient runs 2 to 4 with no modal value, while delivered volumes cluster near 6.35 mL/kg/%TBSA, and three of the five centres' own guideline estimates came out significantly below what those centres actually delivered (4.53 vs 6.35, p<0.001; 4.90 vs 6.35, p=0.002; 3.38 vs 6.35, p<0.0001). That is a protocol-to-bedside gap closed by titration, not evidence that the printed coefficient is too low, and the count of nine live controversies is unchanged. The reason label is `new-reference` because obtaining the Graves primary is what forced the retraction, exactly as reading Baxter & Shires 1968 forced v1.3.0's; no closer label exists for a withdrawn claim that changes no output.",
      reason: "new-reference",
    },
    {
      version: "1.7.0",
      date: "2026-08-08",
      summary:
        "Collapses the Parkland and modified Brooke rows into ONE resuscitation volume. NO COEFFICIENT, INPUT BOUND OR COMPUTED NUMBER CHANGED — the emitted volume is the same 3 mL/kg/%TBSA figure both rows already carried, and maintenance and the combined total are untouched. Four rows carried two numbers, because in the source the two expressions were identical: `parkland24h` and `modBrooke24h` were literally the same multiplication. A clinician reading 'Parkland 1800 mL' beside 'modified Brooke 1800 mL' was being shown two named formulas agreeing, which is corroboration that does not exist — in PAEDIATRICS the two conventions coincide at 3 mL/kg/%TBSA, and it is only the ADULT forms that diverge (Parkland 4, modified Brooke 2). The remaining row is named for what it computes rather than for one of two interchangeable eponyms, and the notes continue to carry both adult coefficients by name so nobody concludes an adult figure was used. Output ids `parkland_peds_24h_ml`, `parkland_peds_first8h_ml`, `mod_brooke_peds_24h_ml` and `mod_brooke_peds_first8h_ml` are withdrawn and replaced by `resuscitation_24h_ml` and `resuscitation_first8h_ml`; `parkland_peds_plus_maint_24h_ml` becomes `resuscitation_plus_maint_24h_ml`. From the external calculator audit of 2026-08-08, finding F7.",
      reason: "output-withdrawn",
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
      "burn.caution.maintenance-neonatal-scope",
      "BELOW ABOUT 4 kg THE MAINTENANCE LINE IS OUT OF ITS OWN CALCULATOR'S SCOPE, AND THIS PAGE STILL SHOWS IT. The Holliday-Segar figure here is the same 100/50/20 mL/kg/day arithmetic as the standalone maintenance-fluids score on this site (holliday-segar), which REFUSES to compute below 4 kg: 100 mL/kg/day over-estimates a term neonate substantially — a 3.2 kg term neonate on day 2 needs roughly 70-80 mL/kg/day, while a well 3.2 kg two-month-old needs 100 — and every guideline scope that excludes neonates is written in AGE (term, 28 days, over 28 days, one month), which a weight input cannot implement. This calculator accepts from 0.5 kg on purpose and does not refuse, because burn resuscitation genuinely applies to infants and turning away a burned 3 kg neonate would withhold the resuscitation volume too. So the two pages differ by decision, not by oversight, and what changes below roughly 4 kg is what the maintenance number MEANS: the two resuscitation figures stand (the 3 mL/kg/%TBSA coefficient carries no age assumption), while the maintenance figure and the combined total that contains it sit outside the range their own calculator will compute and must be replaced by your unit's neonatal maintenance regimen — NICE's day-of-life ladder rises from 50-60 mL/kg/day on day 1 to 120-150 across the first 28 days — before anything is prescribed. The error runs toward OVER-estimating maintenance in the first days of life, so it compounds the fluid-creep hazard rather than offsetting it. The 4 kg figure is that score's own implementation proxy and not a published threshold: no guideline states a weight below which Holliday-Segar must not be used, so a unit using 3.5 or 5 contradicts nothing. Collecting postnatal age is what would replace the proxy on both pages.",
    ),
    defineText(
      "burn.caution.centre-variation",
      "The same child gets very different volumes at different centres, and this one sits at the bottom of the range. Pisano's published example: a 5-year-old weighing 25 kg with a 20% TBSA burn has an estimated 24-hour requirement of 1500 mL to 3560 mL — 3.0 to 7.1 mL/kg/%TBSA — depending only on which of five ABA-verified paediatric burn centres they arrive at. This score returns 3 x 25 x 20 = 1500 mL for that child, the LOW end of that 2.4-fold spread, and 3100 mL once maintenance is added. Delivered volumes in the same cohorts averaged 6.35 mL/kg/%TBSA overall, with one centre at 9.09. AND THE VARIATION IS IN PRACTICE, NOT IN WHETHER THE COEFFICIENT IS RIGHT. Those five centres START at 2, 3 or 4 mL/kg/%TBSA with no modal value, yet three of the five produced guideline estimates significantly BELOW their own delivered volumes: 4.53 against 6.35 (p<0.001), 4.90 against 6.35 (p=0.002) and 3.38 against 6.35 (p<0.0001). That is a gap between what protocols predict and what bedsides deliver, which titration is what closes — it is not evidence that any starting figure, this one included, is set too low. Treat the figure shown as a starting point inside a wide published range, not as the requirement.",
    ),
    defineText(
      "burn.caution.split-provenance",
      "The 8-hour/16-hour split IS derived — in dogs, and at a different ratio from the one shown here. Baxter & Shires 1968, read directly from the source PDF, gives the split on p883 as the experimentally optimal schedule in a 50% TBSA flame-burn CANINE model, with plasma volume and functional extracellular fluid as the endpoints: 16-20% of body weight over the first eight hours from the burn, then a further 8-10% as lactated Ringer's over the next sixteen. Two things follow, and neither is a reason to abandon the split. It is an ANIMAL derivation — there is no human re-derivation of it, none at all in children, and no guideline states it, the 2024 ABA CPG not addressing the split in any of its ten PICO questions. And on those same figures the first eight hours carried TWO-THIRDS of the 24-hour volume, not half; the halving in universal clinical use, and shown here, is not the ratio that experiment found optimal, and nothing published reconciles the two. Titrate to the patient rather than to the fraction.",
    ),
    defineText(
      "burn.caution.peds-coefficient-reconciled",
      "A PREVIOUS VERSION OF THIS PAGE WARNED THAT 3 mL/kg/%TBSA MIGHT BE TOO LOW. THAT WARNING IS WITHDRAWN, and it is withdrawn out loud because anyone who read it was told this calculator might be under-dosing their patient. It said children may require approximately 6 mL/kg/%TBSA against the 3 emitted here. The two figures were never rivals: approximately 6 is a TOTAL 24-hour volume INCLUDING maintenance, while 3 is the resuscitation coefficient ALONE, with Holliday-Segar maintenance added separately — which is what this page already does. Graves et al. 1988 (J Trauma 28(12):1656-9, PMID 3199467), the primary behind the 6, reports both from the same 43 burned children of 25 kg or less: total 24-hour fluid 6.3 +/- 2.2 cc/kg/%TBSB, and net resuscitation fluid, after subtracting calculated maintenance, 3.91 +/- 2.2. Its recommendation, quoted: 'We recommend supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/% TBSB.' Merrell et al. 1986 (PMID 3789292; 177 children, mean burn 27% TBSA) reports 5.8 +/- 0.25 mL/kg/%TBSA, again a total. The match is weight-dependent by design rather than by luck, because maintenance per kg per %TBSA FALLS as weight rises: at 40% TBSA a 10 kg infant receives 3 + 2.5 = 5.5 mL/kg/%TBSA, a 25 kg child 3 + 1.6 = 4.6 and a 60 kg adolescent about 3 + 1.0 = 4.0; at 20% TBSA the same sum gives 8.0 at 8 kg, 6.2 at 25 kg and 4.9 at 60 kg. A flat single figure of 6 applied at every weight is what would overhydrate the large child — which is the failure Palmieri et al. (ePlasty, read in full) predict for any single-figure formula, in their words 'underestimate needs in small children and overhydrate large children'. The two-part shape shown here is what avoids it, so the coefficient stands.",
    ),
    defineText(
      "burn.caution.delivery-shape",
      "Real delivery is not a fixed 50/50, and the printed first-8-hour figure is a starting schedule rather than a description of what a patient receives. In the only published measurement of the two phases' behaviour this review located (Cartotto 2002, 31 adults at one centre, abstract and figure captions read), the infusion rate at the eight-hour mark went DOWN 34% in 16 patients and UP 47% in 15 — bidirectional, patient-dependent, two-way ANOVA P<0.001 — while the actual 24-hour volume was 6.7 mL/kg/%TBSA (SD 2.8) and exceeded the Parkland prediction in 84%. That study is adult, single-centre and pre-2016, so it licenses nothing paediatric; it is cited because three different first-8-hour fractions are now on the record and none of them is what happens. Half is what this calculator emits, two-thirds is what the 1968 canine derivation found optimal, and in practice the rate is titrated in whichever direction the patient needs. Note also that the eight-hour boundary itself has no enumerated rationale: a secondary attributes it to burn-related myocardial depression recovering at 4-8 hours while conceding the rationale is not clearly enumerated in the original.",
    ),
    defineText(
      "burn.caution.both-directions",
      "Under-resuscitation is a real failure direction too. Over-resuscitation (fluid creep) is the harm most often named, and it is why the 2024 ABA CPG lowered the adult starting rate — but in the German Burn Registry (407 children, 30 centres) 86.5% received LESS than Parkland plus Holliday-Segar maintenance, and six of the seven children who died were under-resuscitated relative to it. That registry's own length-of-stay effect estimates are weak and its authors say the over-resuscitation effect is probably overestimated and imprecisely estimated, so build no warning threshold on either finding. Titrate to the patient in both directions.",
    ),
  ],
  notes: defineText(
    "burn.notes",
    "Therapy/dosing formula, not a severity score — it outputs a STARTING crystalloid volume that is then titrated to urine output, not a risk band; interpretation is intentionally empty. Fluid is lactated Ringer's (LR). Give HALF of the 24-h resuscitation volume in the first 8 hours and the remaining half over the next 16 hours, with the clock started at the TIME OF THE BURN, not arrival — late presentation compresses the remaining first-8-h volume into fewer hours (the rate changes, not the volume). THE CLOCK, AND WHAT THIS CALCULATOR DOES NOT DO WITH IT. Published protocols do two things this tool does not. They anchor time 0 at the injury and then subtract fluid ALREADY GIVEN before dividing what is left over the hours remaining in the 8-hour window — ABRUPT anchored every hourly observation to the burn, recorded a mean 2.9 h (SD 2.6) from burn to burn-centre arrival, and found patients had already received a mean 1553 mL (SD 1782) by then, which is not a rounding matter. This score has no elapsed-time input, no fluid-already-given input, and emits no infusion rate; its first-8-hour figure is simply half the 24-hour volume, measured from the burn. That is a gross volume, not the volume still to be infused, and the subtraction and the division are left to be done by hand. THE 8-H/16-H SPLIT — WHERE IT ACTUALLY COMES FROM, AND A CORRECTION TO WHAT THIS PAGE USED TO SAY. Every version of this page up to and including v1.2.1 stated that the split was absent from the 1968 Baxter & Shires original and derived nowhere. THAT WAS WRONG, and it is corrected here rather than quietly reworded, because a reader who saw the old claim is owed the correction. Baxter & Shires 1968 (Ann N Y Acad Sci 150(3):874-894, DOI 10.1111/j.1749-6632.1968.tb14738.x) has since been READ DIRECTLY FROM THE SOURCE PDF, on 2026-08-03, and p883 states the split explicitly and reports it as what the paper calls 'the optimum response': 16-20% of body weight given in the first eight hours after the burn, at 20 cc/kg/h, then a further 8-10% of body weight as lactated Ringer's, at 5 cc/kg/h, across the next sixteen hours; a figure legend on the same page describes a treatment schedule divided the same way, eight hours and then sixteen. So the split IS in the 1968 original and it IS derived there — experimentally, not by convention, and not from nowhere. WHAT THE DERIVATION ACTUALLY IS, WHICH IS THE PART THAT GOVERNS HOW FAR IT TRAVELS. It is an ANIMAL experiment: dogs, 50% TBSA flame burn, with plasma volume and functional extracellular fluid as the measured endpoints. It is not a human outcome trial, not a randomised comparison of one split against another, and nothing about it is paediatric. Two further things follow from the paper's own figures; they are this project's arithmetic on the doses it prints, not claims the paper makes. (a) Those doses are expressed as PERCENT OF BODY WEIGHT, not as mL/kg/%TBSA, so what 1968 fixes is the two-phase shape of the schedule and not the coefficient this calculator uses. (b) In that canine optimum the first eight hours carried TWICE what the next sixteen carried — 16% against 8%, i.e. two-thirds of the 24-hour volume — whereas clinical practice, and this calculator, give HALF in the first eight hours. The 50/50 halving in universal use is therefore not the ratio the derivation found optimal, and nothing published reconciles the two. AND A THIRD FIGURE, WHICH IS WHAT CLINICIANS ACTUALLY DO — NEITHER HALF NOR TWO-THIRDS. Cartotto 2002 (J Burn Care Rehabil 23(4):258-265, PMID 12142578; abstract and figure captions read on 2026-08-04, full text not accessed) measured 31 adults with burns of 15% TBSA or more: the actual 24-hour volume was 6.7 mL/kg/%TBSA (SD 2.8) and exceeded the Parkland prediction in 84% of them, and at the eight-hour mark the infusion rate DECREASED by 34% in 16 patients while it INCREASED by 47% in 15 (two-way ANOVA, P<0.001). Roughly half the cohort turned the rate down and roughly half turned it up, at magnitudes no fixed fraction implies: the practised shape is patient-dependent titration, not a fraction anybody delivers. Three qualifications travel with that study and none may be dropped — it is ADULT, it is n=31 at a single centre, and it is PRE-WINDOW (2002), so it is not in-window evidence and it licenses nothing paediatric. It is carried because it is the only published measurement of the two phases' behaviour this review located at all, which is itself the finding: see the settled-absent list below. WHY EIGHT HOURS, AND NOT SOME OTHER HOUR. The 1968 paper derives the two-phase schedule but does not enumerate why the boundary falls at eight. A secondary overview attributes it to burn-related myocardial depression recovering at 4-8 hours, while conceding in the same breath that the rationale is not clearly enumerated in the original. That is recorded here as a secondary attribution carrying its own hedge — not as a finding, and not as something Baxter & Shires state. WHAT REMAINS GENUINELY ABSENT, NARROWED TO ITS REAL SCOPE. No human re-derivation of the split exists, no paediatric derivation of it exists at any age, and no guideline states it: the 2024 ABA CPG does not address the split in any of its ten PICO questions, and no source in a 2016-2026 review derives it. THAT residual — the human and paediatric evidence, and the guideline-level statement — is [SETTLED-ABSENT] and is not to be re-searched. The split's origin and its animal derivation are no longer part of it. %TBSA counts second- and third-degree (partial + full thickness) burn only and, in children, must be estimated with the age-adjusted Lund-Browder chart, NOT the Rule of Nines (a child's head is a much larger fraction of BSA). THE LUND-BROWDER CHART, AND ITS SOURCING. The chart now ships as verified data alongside this score: 19 body segments across 6 age bands, per side for paired segments (each cell is one limb, so both hands together are 5% and both adult lower limbs 40%). Its provenance is stated exactly, and fact by fact, because the facts do not share a source. The values are after Lund & Browder (1944), as reproduced in the US Department of Defense Joint Trauma System Burn Care CPG Lund Browder Burn Estimate & Diagram worksheets, and the three dates that go with them — Infant (July 2025), Pediatric (June 2025), Adult (June 2025) — are the individual WORKSHEET dates, not the guideline's. The guideline identifier and its own date, Burn Care CPG ID 12 dated 10 June 2025, come from the JTS CPG index at jts.health.mil and were checked there on 2026-08-03. The 1944 paper itself was NOT obtained (Surgery, Gynecology & Obstetrics vol. 79 is not digitised in any reachable open repository), so this is an attribution to a dated modern reproduction and not a claim on the 1944 original; whether the 19-row tabular layout appears in that form in 1944 is unconfirmed. Age bands are birth to <1, 1 to <5, 5 to <10, 10 to <15, 15 to <16 and 16+ years, so a 3-year-old is scored on the 1-year column and a 7-year-old on the 5-year column. The head falls 19 -> 17 -> 13 -> 11 -> 9 -> 7% with age while the thighs and lower legs take up exactly what the head loses, so every column sums to exactly 100 — which is asserted on every release, because MOST Lund-Browder charts in circulation do not. Lundin & Alsbjorn (Burns 2013;39(4):819-820) traced the common 101% defect to a typographic error that makes one aspect of each hand 1.5% instead of 1.25%, i.e. each hand 3% instead of 2.5%, adding 1.0 to every column; a second, less-documented defect prints half a thigh at age 10 as 4.5 instead of 4.25, making each thigh 9% instead of 8.5% and inflating the 10-14 column alone. This table carries the values that close at 100. Do not use any Lund-Browder chart you have not summed yourself. LIMITATIONS OF THE CHART ITSELF: the anthropometric substrate is roughly a century old — Lund and Browder did not measure these proportions but assembled them from Berkow (1924) and Boyd (1935), behind which sit Du Bois (1915) and Funke (1858) — and none of it has been revalidated against modern population data. The chart was never developed or validated by an expert panel using stringent scientific principles or defined protocols; concurrent validity against computerised planimetry appears high, but its other clinimetric properties are largely unstudied, and Lund and Browder themselves claimed applicability to 95.5% of the population rather than all of it. It does not account for obesity, breast size, pregnancy, or amputated body parts, each of which shifts relative body proportions. Simple erythema (superficial/first-degree burn) is EXCLUDED from %TBSA; the JTS worksheets carry a separate first-degree column explicitly marked not to be added to the total. Inter-rater variability is substantial and grows with burn size — overestimation is the commoner direction of error outside burn centres, and an error either way beyond about 10% is associated with real morbidity. The chart is data here, not an input: %TBSA is still entered as a single number the clinician has already estimated. Pediatric Parkland and pediatric modified Brooke both use 3 mL/kg/%TBSA, so their 24-h volumes converge; the ADULT coefficients differ (Parkland 4 mL, modified Brooke 2 mL) and are NOT emitted here to avoid over-dosing a child. For CHILDREN, Holliday-Segar maintenance fluid — commonly a 5%-dextrose-containing fluid (limited glycogen stores -> hypoglycemia risk) — is added ON TOP of the LR resuscitation volume (adults get no separate maintenance); the surface-area Galveston/Cincinnati formulas instead fold maintenance in but require height/BSA and are not computed here. THE 3 mL PAEDIATRIC COEFFICIENT — AND A WARNING THIS PAGE CARRIED ONE RELEASE AGO, NOW WITHDRAWN. Versions 1.4.0 and 1.5.0 told readers that children may require approximately 6 mL/kg/%TBSA against the 3 this calculator emits, listed it as controversy 9 of nine, gave it its own caution, and named the failure direction as UNDER-resuscitation of small children. THAT FRAMING WAS WRONG. It is retracted here in place rather than quietly reworded, because a reader who saw it was told this calculator might be under-dosing their patient, and that reader is owed the retraction rather than a silently different sentence. THE TWO FIGURES NEVER MEASURED THE SAME QUANTITY. Approximately 6 is a TOTAL 24-hour volume that INCLUDES maintenance; 3 is the RESUSCITATION coefficient alone, to which this score adds Holliday-Segar maintenance separately at every weight it accepts. Comparing them was a category error, not a finding. THE PRIMARY BEHIND THE 6 SAYS SO ITSELF, AND RECOMMENDS PRECISELY WHAT IS IMPLEMENTED HERE. Graves TA, Cioffi WG, McManus WF, Mason AD Jr, Pruitt BA Jr, J Trauma 1988;28(12):1656-9, PMID 3199467, DOI 10.1097/00005373-198812000-00007 (abstract and the publisher abstract page read on 2026-08-04; the full body was NOT opened, so nothing beyond these figures is claimed from it) studied 43 children aged 1.5-108 months with 25-89% TBSB, all weighing 25 kg or less, and reported BOTH numbers from that one cohort: average TOTAL 24-hour fluid 6.3 +/- 2.2 cc/kg/%TBSB, and NET resuscitation fluid — the total MINUS calculated maintenance — 3.91 +/- 2.2 cc/kg/%TBSB. Its recommendation is quoted rather than paraphrased, because it is the clearest possible statement of the point: 'We recommend supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/% TBSB.' Maintenance supplied, resuscitation initiated at 3 — that is this score's structure, coefficient for coefficient, so the finding VINDICATES the design rather than merely tolerating it. Merrell SW et al., Am J Surg 1986;152:664-9, PMID 3789292 (abstract read) corroborates how the larger figure should be read: 177 children, mean burn 27% TBSA, mean TOTAL 24-hour fluid 5.8 +/- 0.25 mL/kg/%TBSA — again a total, again not a resuscitation coefficient. WHY THIS IS A RECONCILIATION AND NOT AN ARITHMETIC COINCIDENCE, WHICH IS THE QUESTION THE PREVIOUS VERSION COULD NOT ANSWER. Maintenance expressed per kilogram per %TBSA is not a constant: it FALLS as weight rises, because the Holliday-Segar tiers step down from 100 to 50 to 20 mL/kg/day while the resuscitation term stays linear in weight. So 3 plus maintenance approximates 6 in a small infant and lands deliberately lower in a larger child. The worked numbers are this project's own arithmetic on the formulas above, not claims any source makes. At 40% TBSA: a 10 kg infant gets 3 + 2.5 = 5.5 mL/kg/%TBSA (maintenance 1000 mL over 10 x 40), a 25 kg child 3 + 1.6 = 4.6 (1600 mL over 25 x 40), and a 60 kg adolescent 3 + about 1.0 = 4.0 (2300 mL over 60 x 40). At 20% TBSA the same sum gives 8.0 mL/kg/%TBSA at 8 kg, 6.2 at 25 kg and 4.9 at 60 kg. THE DECLINE IS THE FEATURE. A flat single figure of 6 applied at every weight would overhydrate the large child, which is exactly what Palmieri et al. (Fluid Resuscitation of Severely Burned Children, ePlasty, PMC11166384, read in full) predict of any single-figure formula when they write that it may 'underestimate needs in small children and overhydrate large children' — a sentence this page previously cited AGAINST its own design and which in fact describes the reason for it. WHAT IS STILL GENUINELY OPEN IS PRACTICE VARIATION, NOT THE COEFFICIENT. See controversy 9 below and the centre-variation caution: starting coefficients across five paediatric burn centres run 2 to 4 with no modal value, delivered volumes cluster near 6.35 mL/kg/%TBSA, and three of the five centres' own guideline estimates came out significantly BELOW what those centres actually delivered (4.53 against 6.35, p<0.001; 4.90 against 6.35, p=0.002; 3.38 against 6.35, p<0.0001). That is a gap between protocol and bedside, closed by titration; it is not evidence that a starting coefficient is set too low. THE MAINTENANCE WEIGHT THRESHOLD IS NOT ONE NUMBER. This score adds maintenance at every weight it accepts, with no threshold at all. The 30 kg figure in wide circulation is real and traceable — it is the ABA position as tabulated in Pisano's 2021 comparison of five ABA-verified paediatric burn centres, and it is the weight BELOW which maintenance is ADDED, not one above which it is withdrawn — but the same table shows the five centres using <20 kg, <20 kg, <30 kg, <40 kg and age under 1 year, and one supplying no additional maintenance IV fluid at all. The German national paediatric guideline (AWMF S2k 006/128, 2024) carries no weight threshold anywhere and applies Holliday-Segar maintenance to all children, which is the structure used here; the German Burn Registry applied Parkland-plus-maintenance to every child under 16 with a burn of 15% TBSA or more on the same basis. No derivation exists for 20, 30 or 40 kg, and that is [SETTLED-ABSENT]: these are pragmatic brackets, not the output of any derivation study, and looking for one again will not find one. Follow local protocol where it differs. AND AT THE OTHER END OF THE WEIGHT RANGE THE MAINTENANCE TERM HAS A SCOPE LIMIT THIS PAGE DOES NOT ENFORCE — STATED HERE BECAUSE THE OTHER PAGE ENFORCES IT. The maintenance figure emitted here is the same Holliday-Segar 100/50/20 mL/kg/day arithmetic as the standalone maintenance-fluids score on this site (holliday-segar), and THAT score refuses to compute below 4 kg. Its reason applies unchanged to the identical arithmetic here: 100 mL/kg/day over-estimates a term neonate substantially — NICE's day-of-life ladder starts at 50-60 mL/kg/day on day 1 and only reaches 120-150 towards the end of the first month, and a 3.2 kg term neonate on day 2 needs roughly 70-80 mL/kg/day where a well 3.2 kg two-month-old needs 100, the same entry giving two answers about a quarter apart — while every guideline scope that excludes neonates is written in AGE (term, 28 days, over 28 days, one month) and neither calculator collects postnatal age, so a weight input cannot implement the rule at all. THIS SCORE STILL ACCEPTS FROM 0.5 kg, AND THAT IS THE DELIBERATE PART. Burn resuscitation genuinely applies to infants — one of Pisano's five centres bands its maintenance rule by age under 1 year precisely because those patients exist — and refusing a burned 3 kg neonate outright would withhold the resuscitation volume as well as the maintenance one, which is the worse failure by some distance. So the divergence between the two pages is a decision rather than a disagreement, and it is written on both of them rather than left for a reader to discover by entering 1 kg twice. WHAT IT MEANS AT THE BEDSIDE, COMPONENT BY COMPONENT. Below roughly 4 kg the two resuscitation outputs are unaffected: the 3 mL/kg/%TBSA coefficient carries no age assumption, and its first-8-hour half is the same arithmetic. The MAINTENANCE output, and therefore the COMBINED TOTAL that contains it, are outside the range their own calculator will compute and should be replaced by the unit's neonatal maintenance regimen, or by the NICE day-of-life ladder, before anything is prescribed. The direction of the error is over-estimation of maintenance in the first days of life, so it compounds the fluid-creep hazard named elsewhere on this page rather than offsetting it, and it does so in the patient least able to absorb it. The 4 kg figure itself is the other score's own implementation proxy, chosen there and labelled there as that project's number: no guideline anywhere states a weight below which Holliday-Segar must not be used, so a unit that draws the line at 3.5 or 5 contradicts nothing published. Collecting postnatal age is what would replace the proxy, on both pages at once. TITRATE TO URINE OUTPUT, AND THE TARGETS GENUINELY DISAGREE. Children are commonly given 1.0-1.5 mL/kg/h (StatPearls), with a widely cited split of 1 mL/kg/h below 30 kg and 0.5 mL/kg/h at or above it (Romanowski & Palmieri 2017), and infants sometimes ~1-2 mL/kg/h; adults ~0.5 mL/kg/h (2024 ABA CPG), against which ABRUPT actually achieved 0.87 (SD 0.51). Three distinct disagreements sit inside that: (a) the target ABOVE 30 kg spans 0.3-1.0 mL/kg/h once the Children's Hospital of Michigan protocol reported by Stevens 2023 is included, which sets 0.8-1.2 mL/kg/h at 30 kg or under and 0.3-0.7 mL/kg/h above it — lower than every other source and lower than the adult band, so displaying a single 0.5 for a 35 kg child picks one end of a threefold range; (b) the BANDING VARIABLE itself differs — AWMF 006/128 bands by developmental stage (infants and toddlers 1-2 mL/kg/h, school age 0.5-1) while North American sources band by weight, and those are not interchangeable, because a large 5-year-old and a small 9-year-old fall on opposite sides; (c) the weight at which the band switches ranges 20-40 kg across the same five centres. The optimal paediatric hourly goal is [SETTLED-ABSENT] — the published targets are expert and review consensus only, Romanowski & Palmieri and AWMF 006/128 both state the optimum as undefined, and AWMF grades all its fluid statements expert consensus, evidence level IV. There is no study to find that settles it. Read urine output alongside blood pressure, lactate and clinical state: oliguria in intra-abdominal hypertension is renal hypoperfusion, not hypovolaemia, and more fluid is the wrong answer to it. EVIDENCE WINDOW, STATED PLAINLY. Restricting the evidence to 2016-2026 finds NO primary derivation for any coefficient in this score. Parkland (1968), Brooke (1953), Galveston (1980), Cincinnati and Holliday-Segar (1957) all predate that window by decades, and everything published inside it is restatement, practice audit or consensus synthesis. The numbers are conventions with 40-70 year provenance, in use and unre-derived. NINE LIVE CONTROVERSIES, PRESENTED AS CONTROVERSIES AND NOT AS SETTLED. (1) The adult starting coefficient — the 2024 ABA CPG recommends 2 mL/kg/%TBSA on exactly two studies totalling 88 patients, neither showing an outcome difference, while ABRUPT 2023 reports a delivered 4.6 mL/kg/%TBSA (SD 2.2) in 379 patients across 21 centres and states that 4 is accurate for burns over 20% TBSA and that a 2 mL/kg/%TBSA goal may not be feasible; same organisation, one year apart, shared authors, and the CPG could not resolve it because ABRUPT had no 2-versus-4 comparator arm. (2) The 'modified Brooke' coefficient is given as 2, as 2-3, and as 3 by three peer-reviewed in-window sources for the same label — which is why all four Parkland and Brooke outputs here print their coefficient rather than relying on a formula name. The maintenance and combined-total outputs name no coefficient because neither is a coefficient formula. (3) The paediatric maintenance threshold: below 30 kg per the ABA, 20-40 kg in practice, or none at all per AWMF. (4) The urine-output banding variable: weight, or developmental stage. (5) The target above 30 kg: 0.3-0.7, or 0.5-1.0. (6) The direction of paediatric error: over-resuscitation in North America, under-resuscitation in the DACH registry. (7) Surface-area versus weight basis: Galveston underpredicts what is actually delivered (Stevens 2023), yet BSA-based formulas are argued to suit patients of 20 kg or less. (8) The inhalation-injury coefficient: two centres escalate to 6 mL/kg/%TBSA against the ABA's 3-4, and one of them withdrew its 6 in 2019 — this score offers no inhalation modifier, because any that is offered needs a date and a source attached. (9) THE PAEDIATRIC STARTING COEFFICIENT ITSELF — still the controversy closest to the number on the screen, but REWRITTEN, because the version of it this page carried at 1.4.0 and 1.5.0 was wrong. It pitted 3 mL/kg/%TBSA against approximately 6 mL/kg/%TBSA as two rival figures for the same quantity; they are not, the 6 being a total that includes maintenance (see the retraction above), and that entry is withdrawn rather than kept for the count. What genuinely varies is where centres START: across the five ABA-verified paediatric burn centres the starting coefficient is 2, 3 or 4 with no modal value, so no single figure can be presented as the field's choice, and three of the five centres' own guideline estimates came out significantly below what those same centres delivered (4.53 vs 6.35 mL/kg/%TBSA, p<0.001; 4.90 vs 6.35, p=0.002; 3.38 vs 6.35, p<0.0001). Protocol against practice, not coefficient against coefficient — which is why the range is displayed and no starting figure is endorsed. HOW WIDE THE SPREAD REALLY IS. Pisano's worked example is the honest limitation line: a 5-year-old weighing 25 kg with a 20% TBSA burn has an estimated 24-hour requirement of 1500 mL to 3560 mL — 3.0 to 7.1 mL/kg/%TBSA — depending only on which of five centres they reach. This score returns 1500 mL for that child, the bottom of that span, and 3100 mL with maintenance included. Delivered volumes ran higher still: 6.35 mL/kg/%TBSA overall across those five centres, from 5.10 to 9.09 by centre, and 6.6-7.6 in Stevens' single-centre cohort, against 4.6 in adults. FLUID CREEP (over-resuscitation) is a documented harm; the 2024 ABA CPG lowered the ADULT starting coefficient to 2 mL/kg/%TBSA to counter it, but that CPG is adults-only and does NOT license a 2 mL pediatric starting rate — there is no graded paediatric CPG for the starting coefficient, because there is no paediatric equivalent of the ABA CPG at all. That is [SETTLED-ABSENT], not unfound: the 2024 CPG (Cartotto 2024) scopes itself explicitly to adults with burns of 20% TBSA or more and frames every PICO question that way, and a 2016-2026 search located no paediatric counterpart. The paediatric starting coefficient therefore rests on convention, and will until somebody writes one. BUT OVER-RESUSCITATION IS NOT THE ONLY FAILURE DIRECTION. In the German Burn Registry — 407 children across 30 centres in Germany, Switzerland and Austria — 86.5% received LESS than Parkland plus Holliday-Segar maintenance, and six of the seven children who died were under-resuscitated relative to it. Its length-of-stay effect estimates are weak (the excess-volume arm's confidence interval crosses 1; only the restriction arm reaches significance, only in the unimputed model, at an 11% reduction) and its authors say the over-resuscitation effect is probably overestimated and can only be estimated imprecisely, so no warning threshold should be built on either result. The cohort is also scald-predominant toddlers with a median age of 1, and its comparator includes maintenance, so 'below Parkland-plus-maintenance' is an easier bar to fall under than 'above Parkland'. NO GUIDELINE ENDORSES A VOLUME CEILING: the 2024 ABA CPG recommends selective intra-abdominal and intra-ocular pressure monitoring instead, a monitoring trigger rather than a cap, and the Ivy index (250 mL/kg/24 h) and the 6 mL/kg/%TBSA trigger both originate outside the evidence window and are endorsed as thresholds by no current guideline. The one hard in-window paediatric bound is AWMF 006/128's Empfehlung 10 (12/12 consensus): in children with 10% TBSA or more, use isotonic crystalloid and do not initially exceed 10 mL/kg body weight per hour. Some references retain 4 mL/kg/%TBSA for children (relying on maintenance to cover baseline needs); centers differ, so the coefficient is institution-specific. EIGHT THINGS ARE [SETTLED-ABSENT], WHICH IS A STRONGER STATEMENT THAN 'NOT FOUND'. Each was searched and established not to exist, so they are recorded as closed rather than pending, and re-searching them is wasted work. The list was five; a second confirmation pass restricted to 2016-2026 reconfirmed all five and added three more: (1) any HUMAN or PAEDIATRIC re-derivation of the 8-h/16-h split, and any guideline-level statement of it — this one is NARROWED, not the whole topic it used to be: the split's derivation as such is now SOURCED to Baxter & Shires 1968, read directly, where it is derived experimentally in dogs, so only the human, paediatric and guideline evidence is absent; (2) the derivation of any maintenance weight threshold at 20, 30 or 40 kg — pragmatic brackets, never tested; (3) the optimal hourly urine-output goal in children — expert and review consensus only; (4) any paediatric equivalent of the ABA CPG — the 2024 CPG scopes itself to adults with 20% TBSA or more, and no paediatric counterpart exists; (5) any head-to-head patient-OUTCOME comparison of Cincinnati, Galveston and Parkland in children — Stevens 2023 compares predictions against volume delivered, not against outcome, and no trial exists; (6) any study testing the 8h:16h FRACTION itself against outcomes — a narrower question than where the split came from, and a different one: whether giving half rather than two-thirds in the first eight hours changes what happens to the patient has never been randomised, compared or adjusted on, so the ratio in universal use has never been tested as a variable; (7) any published observed 0-8h versus 8-24h delivery proportion — and this is the one worth pausing on, because the data exist. ABRUPT collected hourly volumes on 379 adults across 21 centres for 48 hours and the German Burn Registry holds multicentre paediatric fluid data, yet no source reports what share of the 24-hour volume actually went in during the first eight. The nearest measurement is Cartotto 2002, which is adult, n=31 and pre-window, and reports the rate CHANGE at the eight-hour mark rather than the two phases' shares; (8) any paediatric-derived upper volume bound — no ceiling on total resuscitation volume has been derived in children, the Ivy index and the 6 mL/kg/%TBSA trigger being pre-window adult constructs used as outcome markers rather than endorsed thresholds, and AWMF's 10 mL/kg/h being expert consensus at evidence level IV and an early-phase RATE bound rather than a 24-hour volume ceiling. These are absences in the literature, not gaps in this review; each one is a place where the numbers this calculator prints are convention rather than evidence, and that is the honest reading of them. Every computed volume is a starting estimate to be titrated, never a fixed prescription. Weight bounds (0.5-150 kg) are input-validity limits, not cited clinical thresholds — and the 0.5 kg floor is retained deliberately rather than raised to the standalone maintenance score's 4 kg, for the reason set out above: this page discloses the maintenance term's scope limit instead of refusing the burned infant it exists to serve.",
  ),
  calculate: (values) => {
    const weight = values.weight_kg.value; // canonical kg
    const tbsa = values.tbsa_pct.value; // canonical %

    // Return RAW values; `precision` rounds for display only (no bands here).
    // ONE resuscitation volume, not two.
    //
    // Until v1.1.0 this emitted a Parkland pair and a modified Brooke pair, and
    // `parkland24h` and `modBrooke24h` were the same expression — so four rows
    // carried two numbers, and the panel implied two formulas had independently
    // agreed. They had not; in PAEDIATRICS the two conventions coincide at
    // 3 mL/kg/%TBSA, and it is only the ADULT forms that diverge (Parkland 4,
    // modified Brooke 2). A clinician reading two named rows showing the same
    // figure is being shown corroboration that does not exist.
    //
    // The row is now named for what it is. Which historical convention a reader
    // wants to call it is in the notes, along with both adult coefficients, so
    // nobody concludes an adult number was used here.
    const resuscitation24h = PEDIATRIC_COEFF_ML * weight * tbsa;
    const maintenance24h = hollidaySegarMaintenanceMl(weight);

    return [
      {
        id: "resuscitation_24h_ml",
        label: defineText(
          "burn.resus24h",
          "Crystalloid resuscitation (pediatric 3 mL/kg/%TBSA) — 24-h LR volume",
        ),
        value: resuscitation24h,
        unit: "mL",
        precision: 0,
      },
      {
        id: "resuscitation_first8h_ml",
        label: defineText(
          "burn.resus8h",
          "Crystalloid resuscitation — first-8-h LR volume (half, from time of burn)",
        ),
        value: resuscitation24h / 2,
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
        id: "resuscitation_plus_maint_24h_ml",
        label: defineText(
          "burn.combined24h",
          "Pediatric Parkland + maintenance — 24-h total (children)",
        ),
        value: resuscitation24h + maintenance24h,
        unit: "mL",
        precision: 0,
      },
    ];
  },
});
