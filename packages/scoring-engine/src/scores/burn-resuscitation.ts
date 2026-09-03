import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import type { ScoreValue } from "../types";
import { percent } from "../units/fraction";
import { kgWithLbAndG } from "../units/mass";
import { hoursWithMinutes } from "../units/time";
import { litresWithMl } from "../units/volume";

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
    /**
     * The two inputs that turn this from a volume calculator into a rate one.
     *
     * BOTH ARE OPTIONAL, and that is deliberate. The 24-hour volumes are useful
     * on their own and were the whole of this score until v1.8.0; requiring an
     * elapsed time would refuse a clinician who only wants to know how much
     * fluid the day needs. The rate outputs appear only when BOTH are present,
     * because a rate computed from one of them silently assumes the other —
     * defaulting fluid-given to zero would print a confident rate for a child
     * who arrived with a litre already running.
     */
    {
      id: "time_since_burn_h",
      label: defineText("burn.elapsed", "Time elapsed since the burn"),
      required: false,
      type: "numeric",
      unit: hoursWithMinutes,
      // The window this score models runs from the burn to 24 h after it. Both
      // ends are admitted: 0 is a patient burned on arrival, 24 is one whose
      // resuscitation period has closed, and the notes state what each returns.
      min: 0,
      max: 24,
      helpText: defineText(
        "burn.elapsed.help",
        "Hours since the BURN, not since arrival — the eight-hour phase is timed from injury, so a child who took three hours to reach you has five hours left in it, not eight. Accepts minutes, which is usually the easier subtraction from a clock time. Enter this together with fluid already given to get infusion rates.",
      ),
    },
    {
      id: "fluid_given_ml",
      label: defineText("burn.given", "Resuscitation fluid already given"),
      required: false,
      type: "numeric",
      unit: litresWithMl,
      // Canonical LITRES (units/volume.ts), unlike every other quantity on this
      // score, which is mL. `calculate` multiplies by 1000 at the point of use
      // and says so there.
      min: 0,
      max: 10,
      helpText: defineText(
        "burn.given.help",
        "Resuscitation crystalloid given since the burn, from all sources including pre-hospital and the referring hospital — not maintenance, not blood, not the fluid used to carry drugs. Enter 0 if none. This is subtracted from the first-eight-hour allocation only.",
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
      note: "PRIMARY SOURCE — not a secondary review, a restatement or a review finding, and that distinction is the point, because this is where the two-phase split is actually derived rather than merely repeated. Three qualifications travel with it and must not be dropped: the derivation is in DOGS at 50% TBSA flame burn with plasma volume and functional extracellular fluid as the endpoints, not a human outcome trial and not paediatric; the doses are expressed as PERCENT OF BODY WEIGHT, not as mL/kg/%TBSA, so the paper fixes the two-phase shape of the schedule and not the coefficient this calculator uses; and on the paper's own figures the first eight hours carry two-thirds of the 24-hour volume, not the half in clinical use.",
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
      note: "Provenance, fact by fact, because these did not come from one place. (1) The per-segment percentages and the three worksheet dates above are the ones recorded in this project's implementation reference note (docs/research/scores/burn-resuscitation.md) from the three JTS worksheets; they are FORM dates, not the CPG's. (2) The guideline identifier and its own date — Burn Care, CPG ID 12, dated 10 June 2025 — come from the JTS CPG index at jts.health.mil on 2026-08-03; that reference note carries no CPG-level date, so this one is not sourced from it. (3) The chart of record is Lund CC, Browder NC, 'The estimation of areas of burns', Surg Gynecol Obstet 1944;79:352-358. That paper was NOT obtained — the volume is not digitised in a reachable open repository — so the values here are attributed 'after Lund & Browder (1944), as reproduced in the JTS worksheets', never to the 1944 original directly, and whether the 19-row tabular layout is a 1944 artefact or a later worksheet reformatting is unconfirmed.",
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
      note: "NOT A RIVAL COEFFICIENT, and the most tempting way to misread it. Its approximately 6 looks like a contradiction of the 3 mL/kg/%TBSA this score emits — two paediatric figures differing by a factor of two, with the objection running toward UNDER-resuscitation of small children. That reading is wrong. Its approximately 6 is a TOTAL 24-hour volume including maintenance, restating Graves 1988, whose own recommendation is to supply maintenance and initiate resuscitation at 3. What this reference does establish, and what it is cited for, is the clause quoted above: a SINGLE-FIGURE formula underestimates small children and overhydrates large ones — which is an argument for the two-part maintenance-plus-resuscitation shape this score already implements, and against applying any flat single figure (including 6) at every weight.",
    },
    {
      citation:
        "Graves TA, Cioffi WG, McManus WF, Mason AD Jr, Pruitt BA Jr. Fluid resuscitation of infants and children with massive thermal injury. J Trauma. 1988;28(12):1656-1659. (43 children aged 1.5-108 months, 25-89% TBSB, all <=25 kg. Average TOTAL 24-h fluid 6.3 +/- 2.2 cc/kg/%TBSB; NET resuscitation fluid, i.e. total minus calculated maintenance, 3.91 +/- 2.2 cc/kg/%TBSB. Recommends supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/%TBSB.)",
      pmid: "3199467",
      doi: "10.1097/00005373-198812000-00007",
      note: "SCOPE — only the two summary figures and the recommendation sentence are claimed from this reference, and nothing beyond them. THIS IS THE REFERENCE THAT RESOLVES THE APPARENT 3-VERSUS-6 CONFLICT, because it reports both numbers from one cohort and names which is which: 6.3 is the TOTAL, 3.91 the resuscitation component after maintenance is removed. It is also the source that vindicates this score's structure rather than merely permitting it — maintenance supplied, resuscitation initiated at 3, which is what `calculate` emits. Pre-window (1988) by the 2016-2026 review's rule, so it is a primary of record, not in-window evidence.",
    },
    {
      citation:
        "Merrell SW, Saffle JR, Sullivan JJ, Navar PD, Kravitz M, Warden GD. Fluid resuscitation in thermally injured children. Am J Surg. 1986;152(6):664-669. (177 children, mean burn 27% TBSA; mean TOTAL 24-h fluid 5.8 +/- 0.25 mL/kg/%TBSA.)",
      pmid: "3789292",
      note: "Carried for one purpose: independent corroboration that the ~6 mL/kg/%TBSA figure circulating for children is a TOTAL delivered volume and not a resuscitation coefficient, which is what makes it consistent with Graves' 3 plus maintenance rather than a rival to it.",
    },
    {
      citation:
        "Cartotto RC, Innes M, Musgrave MA, et al. How well does the Parkland formula estimate actual fluid resuscitation volumes? J Burn Care Rehabil. 2002;23(4):258-265. (n=31 adults >=15% TBSA; actual 24-h volume 6.7 +/- 2.8 mL/kg/%TBSA, exceeding the Parkland prediction in 84%; after the first 8 hours the infusion rate decreased 34% in 16 patients and increased 47% in 15, two-way ANOVA P<0.001.)",
      pmid: "12142578",
      note: "ADULT, single centre, n=31, and PRE-WINDOW (2002) — it licenses nothing paediatric and is not in-window evidence. Carried for one fact only: the change in infusion rate at the 8-hour mark is BIDIRECTIONAL and patient-dependent, which is what falsifies reading the printed first-8-hour figure as a description of delivery. It is the only measurement of the two phases' behaviour this review located, and that scarcity is itself recorded as a settled absence.",
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
      date: "2026-09-03",
      summary: "Initial published text.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Parkland, modified Brooke, and Holliday-Segar are arithmetic formulas built from coefficients (3 mL/kg/%TBSA; 100/50/20 mL/kg/day) and the 8h/16h split — facts, not copyrightable expression. No proprietary scale wording is reproduced (burn-resuscitation.md IP status). The Lund-Browder chart is reproduced as numbers only: the per-segment percentages are facts, while the chart's body diagrams and the JTS worksheet layout are expression and are not copied, and every segment label is this project's own anatomical wording.",
  },
  formula: defineText(
    "burn.formula",
    "24-hour resuscitation crystalloid (lactated Ringer’s) = 3 mL x weight (kg) x %TBSA. Pediatric Parkland and pediatric modified Brooke both use 3; the adult coefficients, 4 and 2, are deliberately not emitted. Give half in the first 8 h, timed from the burn, and the rest over the next 16 h. Holliday-Segar maintenance (100/50/20) is added on top at every weight, so the combined total is resuscitation plus maintenance. %TBSA counts 2nd- and 3rd-degree burn only, estimated by the age-adjusted Lund-Browder chart in children, never the Rule of Nines.",
  ),
  cautions: [
    defineText(
      "burn.caution.coefficient",
      "The 3 mL/kg/%TBSA coefficient is paediatric convention with no primary derivation in the 2016-2026 window. Starting coefficients across five ABA-verified paediatric burn centres run 2 to 4 with no modal value, and for the same 25 kg child with a 20% TBSA burn the centre estimates span 1500 to 3560 mL. This score returns the bottom of that spread, 1500 mL, or 3100 mL with maintenance added. Delivered volumes cluster near 6.35 mL/kg/%TBSA. Treat every output as a starting estimate to titrate, never a fixed prescription.",
    ),
  ],
  notes: defineText(
    "burn.notes",
    "INPUTS AND RATES. Weight 0.5 to 150 kg; %TBSA 0 to 100; optional time since burn (0 to 24 h) and resuscitation fluid already given (0 to 10 L, all sources including pre-hospital, not maintenance, blood, or drug carriers). Supply BOTH optional inputs to get infusion rates. Pre-arrival fluid is deducted from the first-8-h allocation only, a founder decision of 2026-08-08, where the alternative deducts from the 24-h total; the remainder is spread over the hours left in each phase. Past 8 h no first-phase rate is emitted, and the remaining volume persists as a shortfall, since concealing that a child is behind is the more dangerous silence. Neither input alone produces a rate: defaulting fluid-given to zero would print a confident rate for a child arriving with a litre already run. THE CLOCK RUNS FROM INJURY, NOT ARRIVAL. A child arriving 3 h post-burn has 5 h of the first phase left, and late presentation compresses the rate, not the volume. THE COEFFICIENT IS CONVENTION. The 3 mL/kg/%TBSA coefficient is paediatric convention with no primary derivation in the 2016-2026 window. Starting coefficients across five ABA-verified paediatric burn centres run 2 to 4 with no modal value, and for the same 25 kg child with a 20% TBSA burn the centre estimates span 1500 to 3560 mL. This score returns the bottom of that spread, 1500 mL, or 3100 mL with maintenance. NO INHALATION MODIFIER IS APPLIED HERE: protocols that escalate for inhalation injury run as high as 6 mL/kg/%TBSA, and this score emits the unmodified coefficient, so that adjustment has to be made outside it. Delivered volumes cluster near 6.35 mL/kg/%TBSA. Treat every output as a starting estimate to titrate, never a fixed prescription. MAINTENANCE BELOW ABOUT 4 kg. The Holliday-Segar line over-estimates a term neonate, and over-estimating maintenance compounds fluid creep in the patient least able to absorb it. The two resuscitation figures are unaffected. Replace the maintenance line, and the combined total containing it, with the unit’s neonatal regimen before prescribing. This calculator accepts from 0.5 kg on purpose so a burned neonate is never refused. THE MAINTENANCE WEIGHT THRESHOLD. Maintenance is added at every weight here, which is the AWMF 2024 structure. Published centre practice spans below 20 kg to below 40 kg, or age under 1 year, or none at all, and the circulating 30 kg figure is the ABA position as the weight below which maintenance is added. No derivation exists for any of them, so follow local protocol where it differs. THE 8-H/16-H SPLIT derives from a canine experiment, Baxter & Shires 1968, read from the source: 50% TBSA flame-burn dogs, with plasma volume and functional extracellular fluid as the endpoints, and on its own figures the first 8 h carried two-thirds, not half. No human or paediatric re-derivation exists, and no guideline states the split. Titrate to the patient, not to the fraction. UNDER-RESUSCITATION IS A REAL FAILURE DIRECTION TOO. In the German Burn Registry (407 children, 30 centres) 86.5% received less than Parkland plus maintenance, and six of the seven deaths were under-resuscitated relative to it. Effect estimates are weak, so no warning threshold is built on either direction. URINE-OUTPUT TARGETS GENUINELY DISAGREE: children commonly 1.0 to 1.5 mL/kg/h, infants about 1 to 2, adults about 0.5, one published protocol 0.3 to 0.7 above 30 kg, and AWMF bands by developmental stage instead of weight. The optimal paediatric goal is settled-absent. AWMF Empfehlung 10, by consensus, is not to initially exceed 10 mL/kg/h in children with 10% TBSA or more; that is stated here, not enforced. Read urine output with blood pressure, lactate, and the clinical state. Oliguria in intra-abdominal hypertension is not hypovolaemia. NO PAEDIATRIC GUIDELINE COVERS THE STARTING RATE. The 2024 ABA CPG, whose adult starting rate is 2 mL/kg/%TBSA, scopes itself to adults with 20% TBSA or more. No paediatric equivalent exists, which is settled-absent, and ABRUPT’s delivered 4.6 mL/kg/%TBSA in 379 adults contradicts the 2 within the same organisation. Neither licenses a paediatric coefficient. THE LUND-BROWDER CHART ships as verified data, 19 segments across 6 age bands, after Lund & Browder 1944 as reproduced in the 2025 JTS worksheets. Every column sums to exactly 100, which most circulating charts do not: the common 101% chart traces to a typographic hand-value error. It does not account for obesity, breast tissue, pregnancy, or amputation, and simple erythema is excluded from %TBSA.",
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
      // Maintenance runs flat across the whole 24 hours and is NOT subject to
      // the 8/16 split — the split is a property of the resuscitation volume
      // only. This was the one claim of four that survived adversarial
      // verification unanimously, so it is emitted unconditionally: it needs
      // nothing but weight, and dividing by 24 was hand-arithmetic for no
      // reason.
      {
        id: "maintenance_rate_ml_h",
        label: defineText("burn.maintRate", "Maintenance drip rate (constant across 24 h)"),
        value: maintenance24h / 24,
        unit: "mL/h",
        precision: 1,
      },
      ...resuscitationRates(resuscitation24h, weight, values),
    ];
  },
});

/**
 * The infusion rates, which exist only when the clinician has told us BOTH how
 * long it is since the burn and how much has already run.
 *
 * WHY THIS IS A SEPARATE FUNCTION RETURNING A POSSIBLY-EMPTY LIST. The output
 * set is no longer fixed. Emitting a rate from one input while defaulting the
 * other would be worse than emitting nothing: defaulting fluid-given to zero
 * prints a confident rate for a child who arrived with a litre already running,
 * and that error runs toward over-resuscitation, which the notes document as a
 * real harm with a name (fluid creep).
 *
 * THE CLOCK STARTS AT THE BURN. This is the whole point of the feature and the
 * commonest bedside error the notes complain about: ABRUPT measured a mean 2.9 h
 * (SD 2.6) from burn to burn-centre arrival and a mean 1553 mL (SD 1782) already
 * given by then. A child three hours post-burn has FIVE hours left in the
 * eight-hour window, not eight, so the same remaining volume must run faster.
 * The volume does not change; the rate does.
 *
 * PRE-ARRIVAL FLUID COMES OFF THE FIRST-EIGHT-HOUR HALF ONLY, and that is a
 * decision, not a reading of the source. The research note prints two
 * reconcilable-looking readings and reconciles neither: subtract from the
 * 24-hour total (reducing both phases) or from the first-eight-hour allocation
 * (leaving the 8-24 h phase untouched). The founder chose the latter on
 * 2026-08-08. It over-delivers slightly when a large pre-arrival volume has
 * been given, and it was chosen with that stated.
 */
function resuscitationRates(
  resuscitation24h: number,
  weightKg: number,
  values: { time_since_burn_h?: { value: number }; fluid_given_ml?: { value: number } },
): ScoreValue[] {
  const elapsedH = values.time_since_burn_h?.value;
  // `fluid_given_ml` is canonical LITRES (units/volume.ts is litre-canonical),
  // unlike every other quantity on this score. Multiplying by 1000 here is
  // arithmetic on an already-canonical value, not a unit conversion, so it does
  // not breach the rule against converting inside `calculate`.
  const givenL = values.fluid_given_ml?.value;
  if (elapsedH === undefined || givenL === undefined) return [];
  const givenMl = givenL * 1000;

  const first8hVolume = resuscitation24h / 2;
  const next16hVolume = resuscitation24h / 2;

  // Clamped at zero: a child given more than the first-eight-hour allocation is
  // ahead, not owed a negative volume. The surplus is deliberately not shown as
  // a negative number, because a negative mL on a resuscitation page reads as a
  // defect rather than as information, and nothing published says what to do
  // with it. The notes say plainly that a zero here means "already met".
  const first8hRemaining = Math.max(0, first8hVolume - givenMl);

  let withheld = false;
  const out: ScoreValue[] = [
    {
      id: "resuscitation_first8h_remaining_ml",
      label: defineText(
        "burn.first8hRemaining",
        "First-8-h volume not yet given (allocation minus fluid already received)",
      ),
      value: first8hRemaining,
      unit: "mL",
      precision: 0,
    },
  ];

  // INSIDE the eight-hour window: the remaining volume over the hours left.
  // At exactly 8 h the divisor would be zero, which is why the boundary belongs
  // to the closed branch rather than this one.
  if (elapsedH < 8) {
    const hoursLeft = 8 - elapsedH;
    out.push({
      id: "resuscitation_first8h_hours_left",
      label: defineText("burn.first8hHoursLeft", "Hours left in the first-8-h window"),
      value: hoursLeft,
      unit: "h",
      precision: 2,
    });
    withheld =
      pushRateIfMeaningful(
        out,
        "resuscitation_first8h_rate_ml_h",
        defineText(
          "burn.first8hRate",
          "Rate for the remainder of the first 8 h (from time of burn)",
        ),
        first8hRemaining / hoursLeft,
        weightKg,
      ) || withheld;
  }
  // PAST eight hours this row is simply absent, and its absence is the signal
  // that the window has closed. `resuscitation_first8h_remaining_ml` is then a
  // SHORTFALL rather than a target — the same number carrying a different
  // meaning, which is why its label says "not yet given" rather than "still to
  // give". Emitting nothing at all here was considered and rejected: the notes
  // record under-resuscitation as the direction six of seven registry deaths
  // ran in, so silently dropping the fact that a child is behind is the more
  // dangerous failure.

  // The 8-24 h phase, spread over whatever remains of it. Same principle as
  // above — the volume is fixed and the rate absorbs the elapsed time. At
  // exactly 24 h the resuscitation period is over and no rate is emitted.
  const hoursLeftOverall = 24 - Math.max(elapsedH, 8);
  if (hoursLeftOverall > 0) {
    out.push({
      id: "resuscitation_next16h_hours_left",
      label: defineText("burn.next16hHoursLeft", "Hours left in the 8–24 h phase"),
      value: hoursLeftOverall,
      unit: "h",
      precision: 2,
    });
    withheld =
      pushRateIfMeaningful(
        out,
        "resuscitation_next16h_rate_ml_h",
        defineText("burn.next16hRate", "Rate for the 8–24 h phase (from time of burn)"),
        next16hVolume / hoursLeftOverall,
        weightKg,
      ) || withheld;
  }

  // S1 (round-3 review): say so, rather than leaving the reader to notice a row
  // that is not there. An absence is a weak signal on a page read under
  // pressure, and this one carries real information — the child is far enough
  // behind that the arithmetic no longer yields a rate any guideline supports.
  // Emitted only when a rate was actually computed and then withheld, never
  // when a phase has simply closed.
  if (withheld) {
    out.push({
      id: "rate_withheld_above_ceiling",
      label: defineText(
        "burn.rateWithheld",
        "Catch-up rate withheld — it exceeds the 10 mL/kg/h initial ceiling (1 = yes)",
      ),
      value: 1,
      unit: "",
      precision: 0,
    });
  }

  return out;
}

/**
 * The AWMF 006/128 Empfehlung 10 ceiling: in children with 10% TBSA or more, do
 * not INITIALLY exceed 10 mL/kg body weight per hour. 12/12 consensus, evidence
 * level IV.
 */
const AWMF_MAX_ML_PER_KG_PER_H = 10;

/**
 * Emit a rate ONLY while it is still a rate.
 *
 * THE DEFECT THIS CLOSES, found by the round-2 re-test on 2026-08-09 and
 * shipped by me the previous day. `remaining volume / hours left` has an
 * unbounded singularity: as elapsed time approaches the end of a phase the
 * denominator approaches zero and the quotient diverges. Measured on the live
 * arithmetic for a 25 kg child at 20% TBSA with nothing yet given:
 *
 *     6.00 h ->    375 mL/h  (15 mL/kg/h)
 *     7.90 h ->  7,500 mL/h  (300 mL/kg/h)
 *     7.99 h -> 75,000 mL/h  (3,000 mL/kg/h)
 *
 * Every one of those is arithmetically correct and none of them is a rate. A
 * five-figure mL/h on a resuscitation page is the kind of number that gets
 * transcribed under pressure.
 *
 * MY OWN TEST PASSED THROUGH ALL OF IT, which is the part worth remembering: it
 * asserted `Number.isFinite` at the boundaries, and 75,000 is perfectly finite.
 * Testing that a number exists is not testing that it means anything.
 *
 * WHY 10 mL/kg/h AND NOT A NUMBER I CHOSE. It is the only paediatric rate bound
 * in this score's evidence base, cited above and already stated in the notes.
 * Suppressing above it therefore withholds a figure no guideline supports,
 * rather than substituting one this project invented — and it deliberately does
 * NOT clamp: the page never prints a different number from the one the formula
 * produced. The volume still owed and the hours still left are always emitted,
 * so the clinician has both halves of the division and can make the call the
 * formula no longer can.
 */
function pushRateIfMeaningful(
  out: ScoreValue[],
  id: string,
  label: ReturnType<typeof defineText>,
  rateMlPerH: number,
  weightKg: number,
): boolean {
  // Written as `!(x <= ceiling)` rather than `x > ceiling` deliberately: the
  // negated form is also true for NaN and for Infinity, so one condition covers
  // the divergence, a zero divisor and a malformed input without a second
  // guard that no caller can currently reach. Asserting the property the rate
  // must HAVE beats enumerating the ways it can fail to have it.
  if (!(rateMlPerH / weightKg <= AWMF_MAX_ML_PER_KG_PER_H)) return true;
  out.push({ id, label, value: rateMlPerH, unit: "mL/h", precision: 1 });
  return false;
}
