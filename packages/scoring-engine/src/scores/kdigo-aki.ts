import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { ageInYears } from "../units/age";
import { creatinineMgdl } from "../units/concentration";
import type { UnitSpec } from "../units/types";

/**
 * KDIGO AKI staging — KDIGO 2012 acute-kidney-injury classification.
 *
 * NOT a summed score: it classifies into an INTEGER Stage 0–3 as the MAXIMUM of
 * two independent axes (KDIGO Table 2) — a serum-creatinine axis and a
 * urine-output axis. RRT and, in patients under 18 years, an estimated GFR
 * < 35 mL/min/1.73 m² force Stage 3. Stage 0 means the KDIGO definition of AKI
 * is not met on the criteria entered.
 *
 * THE URINE-OUTPUT ROWS ARE (RATE, DURATION) PAIRS, NOT RATE BANDS. Table 2
 * states four rows and the highest one satisfied governs; a rate alone cannot
 * pick a row, because the same rate spans "no AKI" to Stage 3 across plausible
 * durations. So the duration is an asked-for banded input, anuria is its own
 * independent toggle, and when the axis cannot be resolved the score reports the
 * highest CERTAIN stage together with `stage_is_floor` — KDIGO's own "≥ 1"
 * notation from Chapter 2.4 Table 10 — rather than guessing a window.
 *
 * THE ≥ 4.0 mg/dL ROUTE TO STAGE 3 IS NOT STANDALONE. KDIGO's Chapter 2.1
 * rationale requires the Rec 2.1.1 definition (≥ 0.3 mg/dL rise, or ≥ 1.5×
 * baseline) to be met first, so a chronically elevated creatinine is not Stage 3
 * AKI — but gating it strictly would return Stage 0 for every patient entered
 * without a baseline, which is the more dangerous error here. With a baseline
 * the definition is assessed; without one the stage is reported as a floor.
 *
 * Age is required because the eGFR < 35 branch of Stage 3 exists only "in
 * patients < 18 years" (Table 2); without an age an adult's low eGFR staged 3 on
 * a paediatric branch. Serum creatinine is canonical mg/dL (accepts µmol/L via
 * the shared concentration unit); urine output is entered as a rate in mL/kg/h.
 *
 * Research + full sourcing: docs/research/scores/kdigo-aki.md.
 */

/** Urine output as a rate; canonical-only, no unit conversion. */
const ML_PER_KG_H: UnitSpec = { canonical: "mL/kg/h" };
/** Estimated GFR (bedside Schwartz); canonical-only, no unit conversion. */
const EGFR_UNIT: UnitSpec = { canonical: "mL/min/1.73m2" };

/** The four KDIGO Table 2 duration bands, as option values. */
type UoDuration = "under-6h" | "6-to-under-12h" | "12h-or-more" | "24h-or-more";

/**
 * Which Table 2 duration windows a band establishes, as
 * `[6 h ≤ d < 12 h, d ≥ 12 h, d ≥ 24 h]`.
 *
 * A lookup table rather than a branch chain so it can be read straight against
 * Table 2. Note "12 h or more" does NOT set the 24 h flag: the band asserts a
 * lower bound only, so the 24 h row is left open rather than assumed either way.
 */
type DurationWindows = readonly [boolean, boolean, boolean];
const DURATION_WINDOWS: Record<UoDuration, DurationWindows> = {
  "under-6h": [false, false, false],
  "6-to-under-12h": [true, false, false],
  "12h-or-more": [false, true, false],
  "24h-or-more": [false, true, true],
};
/** No band entered: every window is still possible, none is established. */
const ANY_DURATION: DurationWindows = [true, true, true];

export const kdigoAki = defineScore({
  id: "kdigo-aki",
  slug: "kdigo-aki",
  name: "KDIGO AKI staging (pediatric)",
  version: "3.2.1",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "age",
      label: defineText("kdigo.age", "Age"),
      required: true,
      type: "numeric",
      unit: ageInYears,
      // input-validity bound, not a cited threshold. It extends well past 18
      // DELIBERATELY: the eGFR branch is gated on age < 18, so an adult must be
      // enterable and stage correctly rather than be rejected or, worse, be
      // staged on a branch KDIGO restricts to children.
      min: 0,
      max: 120,
      helpText: defineText(
        "kdigo.age.help",
        "Patient age (accepts years, months or days). KDIGO's estimated-GFR < 35 mL/min/1.73 m² route to Stage 3 applies only to patients under 18 years, so the age is what keeps that branch off an adult. Nothing else in the staging is age-dependent — the urine-output thresholds are identical for children and adults.",
      ),
    },
    {
      id: "scr",
      label: defineText("kdigo.scr", "Current serum creatinine"),
      /**
       * OPTIONAL SINCE v3.1.0, and the reason is in the guideline's own grammar.
       *
       * KDIGO 2012 Rec 2.1.1 defines AKI as "any of the following", and the
       * third bullet is "Urine volume <0.5 ml/kg/h for 6 hours" — a criterion
       * that names no creatinine. Chapter 2.4 then scopes the baseline
       * requirement to the creatinine route explicitly: "staging requires
       * reference to a baseline SCr WHEN SCr CRITERIA ARE USED." Requiring a
       * creatinine before any staging could happen therefore refused a child
       * with documented oliguria and no bloods drawn — a patient the guideline
       * defines as having AKI.
       *
       * Read from the official PDF on 2026-08-08, not from a reproduction. The
       * research note's provenance header recorded HTTP 403 on the KDIGO site;
       * that was a user-agent artifact and is corrected there.
       *
       * WHAT THIS DOES NOT LICENSE. No sentence in the guideline authorises a
       * urine-output-only stage in those words, and no worked example exists —
       * Tables 7 and 10 are creatinine-only. So the support is structural
       * (disjunctive definition + a self-contained urine-output column + a
       * max-over-criteria staging rule) rather than quoted, and a stage reached
       * that way is labelled as single-axis rather than presented as a plain
       * KDIGO stage. See `scr_axis_not_assessed`.
       */
      required: false,
      type: "numeric",
      unit: creatinineMgdl,
      // input-validity bound, not a cited threshold (kdigo-aki.md lists ~0.1–15
      // mg/dL physiologic; precise pediatric norms are age-dependent and not in
      // KDIGO Table 2). The ≥ 4.0 mg/dL Stage-3 cutoff sits inside this range.
      min: 0.1,
      max: 15,
      helpText: defineText(
        "kdigo.scr.help",
        "The current measured serum creatinine. Accepts mg/dL or µmol/L. Drives the ×-baseline ratio and the ≥ 4.0 mg/dL Stage-3 threshold. That threshold is not read on its own: KDIGO requires the AKI definition (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline) to be met first, so a value of 4.0 or above entered without a baseline is reported as Stage 3 but flagged as not settled — a chronically high creatinine that never rose is not Stage 3 AKI.",
      ),
    },
    {
      id: "scr_baseline",
      label: defineText("kdigo.scr_baseline", "Baseline serum creatinine"),
      required: false,
      type: "numeric",
      unit: creatinineMgdl,
      // input-validity bound, not a cited threshold (same physiologic range as
      // current creatinine; kdigo-aki.md §Inputs).
      min: 0.1,
      max: 15,
      helpText: defineText(
        "kdigo.scr_baseline.help",
        "The patient's baseline creatinine (known outpatient value, or a dynamic 7-day baseline). Needed for the ×-baseline ratio, for the ≥ 0.3 mg/dL rise, and to settle the ≥ 4.0 mg/dL Stage-3 route — without it a high creatinine cannot be told apart from a chronically high one. Accepts mg/dL or µmol/L. WITH NO PRIOR VALUE ON FILE, the surrogate the PAEDIATRIC evidence supports is the LOWEST creatinine measured during this admission — in 710 children aged 1 month to 18 years it detected AKI with sensitivity 87.8% and specificity 71.0% (Lee 2022, DOI 10.23876/j.krcp.21.120). Do not use KDIGO's own appendix suggestion of back-calculating from an assumed GFR of 75 mL/min/1.73 m²: in those same children it was 31.5% sensitive and put AKI incidence at 19.1% against a true 58.7%, missing roughly two thirds of it. Under-staging is the dangerous direction in a PICU, and adult reports that back-calculation OVER-estimates AKI do not transfer — in children it under-estimates severely. Whatever is entered, it is a surrogate, and the stage it produces should be read as such.",
      ),
    },
    {
      id: "urine_output",
      label: defineText("kdigo.urine_output", "Urine output (rate)"),
      required: false,
      type: "numeric",
      unit: ML_PER_KG_H,
      // input-validity bound, not a cited threshold (kdigo-aki.md: rate 0 – ~10
      // mL/kg/h physiologic). The 0.5 / 0.3 mL/kg/h cutoffs are the cited KDIGO
      // thresholds, applied in calculate against the duration band.
      min: 0,
      max: 10,
      helpText: defineText(
        "kdigo.urine_output.help",
        "Weight-indexed urine output in mL/kg/h over the collection window. Compute as volume ÷ weight ÷ hours. The rate alone does not give a stage — Table 2 pairs each rate with a duration, so enter the window below as well.",
      ),
    },
    {
      id: "uo_duration",
      label: defineText("kdigo.uo_duration", "How long that rate has been sustained"),
      required: false,
      type: "categorical",
      options: [
        {
          value: "under-6h",
          label: defineText("kdigo.uo_duration.lt6", "Less than 6 hours"),
        },
        {
          value: "6-to-under-12h",
          label: defineText("kdigo.uo_duration.6to12", "6 hours to under 12 hours"),
        },
        {
          value: "12h-or-more",
          label: defineText("kdigo.uo_duration.ge12", "12 hours or more"),
        },
        {
          value: "24h-or-more",
          label: defineText("kdigo.uo_duration.ge24", "24 hours or more"),
        },
      ],
      helpText: defineText(
        "kdigo.uo_duration.help",
        "The KDIGO Table 2 window, as bands rather than free-typed hours — the bands are what the table states, and an hours box invites false precision about a figure read off a nursing chart. The boundaries are the guideline's own: 6 hours to under 12 is a different row from 12 or more. Pick '24 hours or more' when the window has reached 24 hours; '12 hours or more' asserts only 12, so it leaves the 24-hour Stage-3 row open — and where that open row could actually raise the stage (a rate below 0.3 mL/kg/h) the result is reported as a lower bound. Where it could not, the result is settled and no bound is shown.",
      ),
    },
    {
      id: "anuria",
      label: defineText("kdigo.anuria", "Anuria"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "kdigo.anuria.help",
        "Anuria is a row of its own in Table 2 — anuria for 12 hours or more is Stage 3, whatever the rate rows say. Enter it as the clinical finding it is: KDIGO defines no millilitre figure for anuria and nephrology has no agreed one either, so no rate is invented for it here. What it does establish without any number is that the output is below every positive cutoff: there is no urine, so anuria is necessarily under 0.5 mL/kg/h and satisfies the rows built on that threshold too — anuria for 6 hours to under 12 hours is Stage 1. Enter the measured rate as well if you have one; it can only make the answer more specific.",
      ),
    },
    {
      id: "egfr",
      label: defineText("kdigo.egfr", "Estimated GFR (pediatric, bedside Schwartz)"),
      required: false,
      type: "numeric",
      unit: EGFR_UNIT,
      // input-validity bound, not a cited threshold (physiologic eGFR range).
      // The < 35 mL/min/1.73 m² Stage-3 cutoff sits inside this range.
      min: 1,
      max: 200,
      helpText: defineText(
        "kdigo.egfr.help",
        "Estimated GFR in mL/min/1.73 m² (bedside Schwartz: 0.413 × height[cm] ÷ creatinine[mg/dL]). < 35 forces Stage 3, but only for a patient under 18 years — the age entered above gates it, so an eGFR supplied for an adult is ignored on this branch.",
      ),
    },
    {
      id: "rrt",
      label: defineText("kdigo.rrt", "Renal replacement therapy started"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "kdigo.rrt.help",
        "Initiation of dialysis / CRRT. When yes, KDIGO assigns Stage 3 regardless of the creatinine and urine-output axes.",
      ),
    },
  ] as const,
  // Ascending integer stages (higher = more severe). Each band captures exactly
  // one integer stage: [min, max) with the default (min inclusive, max exclusive).
  interpretation: [
    {
      id: "stage-0",
      appliesTo: "kdigo_stage",
      min: null,
      max: 1,
      label: defineText("kdigo.band.0", "Stage 0 (no AKI by KDIGO criteria)"),
      description: defineText(
        "kdigo.band.0.desc",
        "The KDIGO 2012 definition of acute kidney injury is not met on the criteria entered. Interpret in the full clinical context; absence of a criterion here reflects the data provided, not proof that AKI is absent. Check whether the result is flagged as a lower bound: when a low urine output was entered without a duration window, the urine-output axis could not be evaluated at all, and that is not the same finding as no AKI.",
      ),
    },
    {
      id: "stage-1",
      appliesTo: "kdigo_stage",
      min: 1,
      max: 2,
      label: defineText("kdigo.band.1", "Stage 1"),
      description: defineText(
        "kdigo.band.1.desc",
        "KDIGO Stage 1 — the least severe AKI category: serum creatinine 1.5–1.9× baseline or a rise of ≥ 0.3 mg/dL, or urine output < 0.5 mL/kg/h sustained for 6 hours to under 12 hours. Higher stages are associated with worse outcomes in the literature; the stage is a descriptive classification, not a treatment threshold.",
      ),
    },
    {
      id: "stage-2",
      appliesTo: "kdigo_stage",
      min: 2,
      max: 3,
      label: defineText("kdigo.band.2", "Stage 2"),
      description: defineText(
        "kdigo.band.2.desc",
        "KDIGO Stage 2 — an intermediate AKI category: serum creatinine 2.0–2.9× baseline, or urine output < 0.5 mL/kg/h sustained for 12 hours or more.",
      ),
    },
    {
      id: "stage-3",
      appliesTo: "kdigo_stage",
      min: 3,
      max: null,
      label: defineText("kdigo.band.3", "Stage 3"),
      description: defineText(
        "kdigo.band.3.desc",
        "KDIGO Stage 3 — the most severe AKI category: serum creatinine ≥ 3.0× baseline, or ≥ 4.0 mg/dL once the AKI definition itself is met, initiation of renal replacement therapy, urine output < 0.3 mL/kg/h for 24 hours or more, anuria for 12 hours or more, or — in a patient under 18 years — an estimated GFR < 35 mL/min/1.73 m². Check whether the result is flagged as not settled: a creatinine of 4.0 mg/dL or above entered with no baseline reaches this stage on the value alone, and a baseline showing no acute rise would take it back out of AKI altogether.",
      ),
    },
  ],
  references: [
    {
      citation:
        "KDIGO Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1–138. Definition = Rec 2.1.1; staging = Rec 2.1.2 / Table 2 (p. 19); indeterminate-staging precedent = Chapter 2.4, Table 10 (p. 30).",
      doi: "10.1038/kisup.2012.1",
      note: "Primary source of record for every staging threshold, the max-of-two-axes rule, the four (rate, duration) urine-output rows, and the '≥ 1' / '?' notation used when an axis cannot be resolved.",
    },
    {
      citation:
        "Palevsky PM, et al. Reading between the (guide)lines — the KDIGO practice guideline on acute kidney injury in the individual patient. Kidney Int. 2014;85(1):49–61.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3877708/",
      note: "Reproduces KDIGO Table 2 including the '<18 years, eGFR < 35' Stage-3 branch. Corroborating secondary source, and the extraction source for v1.0.0 — its urine-output rows are laid out as a rate ladder, which is how that release came to branch on the rate first. The (rate, duration) row structure implemented from v2.0.0 is taken from the primary guideline itself (first reference above), not from this reproduction.",
    },
    {
      citation:
        "Schwartz GJ, Muñoz A, Schneider MF, et al. New equations to estimate GFR in children with CKD. J Am Soc Nephrol. 2009;20(3):629–637.",
      pmid: "19158356",
      doi: "10.1681/ASN.2008030287",
      note: "Bedside equation eGFR = 0.413 × height(cm) ÷ SCr(mg/dL) used by the Stage-3 pediatric branch; validated ~1–16 y.",
    },
    {
      citation:
        "Palevsky PM, et al. KDOQI US Commentary on the 2012 KDIGO Clinical Practice Guideline for Acute Kidney Injury. Am J Kidney Dis. 2013;61(5):649–672.",
      pmid: "23499048",
      doi: "10.1053/j.ajkd.2013.02.349",
      note: "National-society commentary confirming the KDIGO definition and staging.",
    },
    {
      citation:
        "Lee YJ, Park YS, Park SJ, Jhang WK. Comparison of methods for estimating baseline serum creatinine to predict acute kidney injury in critically ill children. Kidney Res Clin Pract. 2022;41(3):322–331.",
      doi: "10.23876/j.krcp.21.120",
      note: "PRIMARY support for the surrogate-baseline guidance, and it is PAEDIATRIC — 710 patients aged 1 month to 18 years, single centre, all with a measured baseline within 3 months to compare against. The lowest creatinine within 7 days of PICU admission performed best (ICC 0.62; AKI sensitivity 87.8%, specificity 71.0%; misclassification 19.2%; kappa 0.60; incidence 63.5% against a true 58.7%, a slight OVER-estimate). Back-calculation from an assumed eGFR was far worse and worse in the dangerous direction (sensitivity 31.5%, specificity 98.3%, misclassification 40.3%; incidence 19.1% against the same true 58.7%). The paper contrasts this with adult reports of back-calculation OVER-estimating AKI — the direction reverses in children. Note the 7-day window is the paper's choice, not a standard.",
    },
    {
      citation:
        "Cooper DJ, Plewes K, Grigg MJ, Patel A, Rajahram GS, William T, Hiemstra TF, Wang Z, Barber BE, Anstey NM. An Evaluation of Commonly Used Surrogate Baseline Creatinine Values to Classify AKI During Acute Infection. Kidney Int Rep. 2021;6(3):645–656.",
      pmid: "33732979",
      doi: "10.1016/j.ekir.2020.12.020",
      note: "SECONDARY since v3.1.0 — superseded as the primary support by the paediatric Lee 2022 above, and kept only for what Lee does not test. It compared MDRD against CKD-EPI, an assumed GFR of 100 as well as KDIGO's suggested 75, and age/sex-standardised reference tables: every method built on an assumed GFR of 75 missed over half of all AKI; CKD-EPI at an assumed GFR of 100 tracked overall incidence best but still misassigned stages; the lowest creatinine measured during the admission over-called AKI by about a fifth yet correlated best with the reference value. CAUTION — 247 ADULTS with Plasmodium knowlesi malaria in Malaysian Borneo, so adult single-infection evidence, no longer relied on for any paediatric claim. It is also the reason the notes do not present 'the adult literature' as uniform: this adult cohort found back-calculation UNDER-detecting AKI, the same direction Lee found in children, not the over-estimation Lee contrasts against.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: KDIGO 2012 AKI staging (Stage 0–3) as the max of the serum-creatinine and urine-output axes, with the pediatric eGFR < 35 and RRT Stage-3 branches.",
      reason: "initial-release",
    },
    {
      version: "2.0.0",
      date: "2026-08-03",
      summary:
        "Urine-output axis corrected: KDIGO Table 2's four rows are (rate, duration) pairs, so all four are now evaluated independently and the highest satisfied governs. The previous rate-first branch made Stage 2 unreachable, under-staged < 0.5 mL/kg/h for ≥ 12 h as Stage 1, and over-staged 0.25 mL/kg/h for 8 h as Stage 3. Adds a banded duration input (< 6 h / 6 to < 12 h / ≥ 12 h / ≥ 24 h) and an anuria toggle that carries its own Table 2 row: anuria is given no invented numeric rate, but because the absence of urine is necessarily below 0.5 mL/kg/h it satisfies the < 0.5 rows too, so anuria for 6 to under 12 hours is Stage 1 rather than Stage 0. Reports an unresolvable urine-output axis as a lower bound (new `stage_is_floor` output, KDIGO Table 10's '≥' notation) instead of guessing a window, flagged only where an open row could actually raise the stage. Adds a required age input and gates the eGFR < 35 Stage-3 criterion on age under 18 years, as KDIGO Table 2 restricts it. Notes and formula rewritten: the previous text claimed the duration windows were 'assumed met', which was untrue and applied asymmetrically, and the notes now disclose that the creatinine SI conversion uses this project's shared 88.42 µmol/L per mg/dL where KDIGO prints 88.4.",
      reason: "formula-correction",
    },
    {
      version: "2.0.1",
      date: "2026-08-03",
      summary:
        "Two sourcing questions closed, no computed value changed. (1) ANURIA: the absence of a numeric definition is now recorded as a CONFIRMED absence rather than an unfound source — KDIGO defines no millilitre figure for anuria, and no single agreed nephrology definition exists to borrow, because the term is deliberately clinical. The existing behaviour is unchanged and now has a positive justification: anuria stays a clinical flag, is given no invented rate, and still entails the < 0.5 mL/kg/h rows. (2) CREATININE CONVERSION: the 88.42 µmol/L per mg/dL shared constant against KDIGO's printed 88.4 is recorded as settled and clinically immaterial rather than an open item. The two differ by ~0.02% and cross no published threshold — the 4.0 mg/dL Stage-3 cutoff is 353.60 against 353.68 µmol/L — so no stage turns on it and the shared constant is deliberately left alone.",
      reason: "clarification",
    },
    {
      version: "3.0.0",
      date: "2026-08-03",
      summary:
        "The ≥ 4.0 mg/dL route to Stage 3 is no longer standalone — the deviation disclosed at v2.0.0 is now resolved rather than documented. KDIGO's Chapter 2.1 rationale requires the Rec 2.1.1 definition (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline) to be satisfied before the absolute-creatinine route applies, so a chronically elevated creatinine with no acute rise was being called Stage 3 AKI when it is not AKI at all. Gating it strictly would have made the opposite and more dangerous error — Stage 0 for every patient entered without a baseline — so the two cases are now split. With a baseline and a qualifying rise, ≥ 4.0 mg/dL is a settled Stage 3, unchanged. With a baseline and no qualifying rise, the route no longer fires and the ratio and rise criteria stand alone: a chronic elevation stages as what it is. With no baseline at all, Stage 3 is still reported but the existing `stage_is_floor` output is set, so the stage is shown as a bound rather than asserted — a patient already Stage 3 by a settled route (RRT, eGFR < 35 under 18 years, ≥ 3.0× baseline, or a closed Stage-3 urine-output row) is not flagged. That flag's label changes accordingly: it now reads 'not settled' rather than 'a lower bound', because the stage can now be unsettled downward as well as upward and the old wording would have been false in the new case. Adds Cooper 2021 (Kidney Int Rep, PMID 33732979) and, with it, guidance on what to enter when no prior creatinine exists: the lowest creatinine measured during the admission is the surrogate the evidence supports, while KDIGO's own appendix suggestion of back-calculating from an assumed GFR of 75 mL/min/1.73 m² was found to miss more than half of all AKI. No back-calculation is implemented — it needs sex and race inputs this score does not collect, and race-based eGFR is contested in its own right.",
      reason: "formula-correction",
    },
    {
      version: "3.1.0",
      date: "2026-08-04",
      summary:
        "The surrogate-baseline guidance is now supported by PAEDIATRIC evidence instead of adult evidence, and NO COMPUTED STAGE CHANGES — the recommendation is the same one v3.0.0 made, and nothing in `calculate` is touched. What changes is what stands behind it. v3.0.0 named the lowest admission creatinine on the strength of Cooper 2021, a cohort of 247 adults with Plasmodium knowlesi malaria in Malaysian Borneo, and disclosed the extrapolation as an open gap. Lee 2022 (Kidney Res Clin Pract 2022;41(3):322-331) closes it: 710 critically ill children aged 1 month to 18 years, each with a measured baseline to compare against, in which the lowest creatinine within 7 days of PICU admission detected AKI with sensitivity 87.8% and specificity 71.0% (ICC 0.62, misclassification 19.2%, kappa 0.60, incidence 63.5% against a true 58.7%) while back-calculation from an assumed eGFR reached only 31.5% sensitivity and put incidence at 19.1% against that same true 58.7%. The [NEEDS SOURCE] for a paediatric surrogate-baseline validation is therefore withdrawn as answered. Three things are stated that were not stated before. (1) THE DIRECTION REVERSES: the paediatric study contrasts itself with adult reports of back-calculation OVER-estimating AKI, whereas in children it severely UNDER-estimates — and under-staging is the dangerous direction in a PICU, so a reader arriving from the adult literature would get this exactly backwards. (2) 'The adult literature' is not uniform, and the notes now say so rather than implying a clean adult-versus-child split: Cooper 2021 itself found assumed-GFR-75 methods missing more than half of all AKI, the same direction as the paediatric result. (3) The SCr-min window is NOT standardised — published definitions run from 3 days to 7 days to the whole hospitalisation, and the quoted operating characteristics are the 7-day ones the paediatric study used, so a different window is a different surrogate. Cooper 2021 is retained but demoted to a secondary citation, kept only for the comparisons Lee does not run (MDRD vs CKD-EPI, an assumed GFR of 100, age/sex-standardised reference tables). The separate marker for a KDIGO-ENDORSED paediatric baseline rule stays open and is now explicitly distinguished from it — no guideline endorses a method; the evidence for which method performs best is what became paediatric.",
      reason: "new-reference",
    },
    {
      version: "3.2.0",
      date: "2026-08-08",
      summary:
        "Serum creatinine becomes OPTIONAL, so a child with documented oliguria and no bloods drawn can be staged on the urine-output axis alone. NO EXISTING RESULT CHANGES: every entry that staged before stages identically, the thresholds and the max-over-axes rule are untouched, and a creatinine supplied as before behaves exactly as it did. THE PRIMARY WAS OBTAINED, which is what unblocked this. The research note recorded HTTP 403 from kdigo.org and worked from three reproductions; that was a user-agent artifact, and the official PDF (Kidney International Supplements 2012;2:19-36) was read directly on 2026-08-08. Rec 2.1.1 defines AKI as “any of the following” and its third bullet is “Urine volume <0.5 ml/kg/h for 6 hours” — a criterion naming no creatinine — while Chapter 2.4 scopes the baseline requirement to the other route in terms: “staging requires reference to a baseline SCr WHEN SCr CRITERIA ARE USED.” Requiring a creatinine before any staging could occur therefore refused a patient the guideline defines as having AKI. WHAT THE GUIDELINE DOES NOT DO IS AUTHORISE IT IN WORDS. No sentence licenses a urine-output-only stage explicitly, and NO WORKED EXAMPLE EXISTS — Tables 7 and 10 are creatinine-only. The support is structural: a disjunctive definition, a self-contained urine-output column in Table 2, and a staging rule that takes the criteria giving the highest stage. That is recorded as the basis rather than dressed up as a quotation. A NEW OUTPUT, `scr_axis_not_assessed`, marks a stage reached this way. It is deliberately NOT folded into `stage_is_floor`: that flag means an entered value left a Table 2 row open, and v3.0.0 renamed its label away from “a lower bound” precisely because an un-baselined creatinine can unsettle a stage DOWNWARD. The new flag implies no direction and must never render with a “≥”. A creatinine can only raise a urine-output-only stage, since staging takes the maximum — but that is a fact about the axes, not a bound on the number, and the two are kept apart so neither borrows the other’s authority. STILL OPEN, AND UNCHANGED BY THIS: KDIGO states it is not known how the urine-volume criteria should be applied (average versus persistent reduction), and gives no weight basis for mL/kg/h. Both were already true of every urine-output stage this score produced; making creatinine optional exposes them in more cases rather than introducing them. From the external calculator audit of 2026-08-08, finding F4 — whose description was itself half wrong, since it reported baseline creatinine as required when it has always been optional.",
      reason: "clarification",
    },
    {
      version: "3.2.1",
      date: "2026-08-08",
      summary:
        "Corrects the `scr_axis_not_assessed` output added hours earlier in v3.2.0. NO STAGE CHANGES — the flag has never fed a stage and does not now. Its label read “Creatinine axis not assessed — staged on urine output alone” and its value was set purely from the absence of a creatinine, so it made a FALSE statement in three reachable cases, each confirmed by execution: RRT alone (Stage 3, no urine output entered), eGFR < 35 in a child (Stage 3, no urine output entered), and an empty form (nothing staged at all). The eGFR case was self-contradictory — a bedside-Schwartz eGFR is derived FROM a creatinine, so the page denied an axis the reader’s own entry presupposes. Two fixes. The LABEL now claims only “Creatinine axis not assessed”, which is true whenever it fires. The VALUE is suppressed when the stage is already settled at 3 by a creatinine-independent route (RRT) or when an eGFR that fired the paediatric branch is present. An adult eGFR still leaves the flag set, because the < 18 y gate means that value settled nothing. Found by an adversarial review of the same day’s work; the v3.2.0 test suite had PINNED the wrong value for the RRT case, so the defect was locked in rather than caught.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "KDIGO AKI staging is a set of factual numeric cut-points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations); facts and mathematical criteria are not copyrightable and may be implemented directly with attribution. No proprietary response-descriptor prose is reproduced — every option label and explanation here is written in this project's own words. The bedside Schwartz equation is likewise a formula (kdigo-aki.md IP status).",
  },
  formula: defineText(
    "kdigo.formula",
    "KDIGO stage = the higher (maximum) of two independent axes. Serum-creatinine axis: Stage 1 if current creatinine is 1.5–1.9× baseline or has risen ≥ 0.3 mg/dL; Stage 2 if 2.0–2.9× baseline; Stage 3 if ≥ 3.0× baseline, or renal replacement therapy has started, or — in a patient under 18 years — estimated GFR < 35 mL/min/1.73 m². A creatinine of ≥ 4.0 mg/dL is also Stage 3, but only once the AKI definition itself is met (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline): with a baseline entered that is checked, so a chronically high creatinine that never rose stages on the ratio and rise criteria alone rather than jumping to 3; with no baseline entered it cannot be checked, so Stage 3 is reported with the 'stage is not settled' output set to 1 rather than either asserted or withheld. Urine-output axis: Table 2 states four (rate, duration) rows, not rate bands, and each is tested on its own with the highest satisfied row governing — < 0.5 mL/kg/h for 6 hours to under 12 hours is Stage 1; < 0.5 mL/kg/h for 12 hours or more is Stage 2; < 0.3 mL/kg/h for 24 hours or more is Stage 3; anuria for 12 hours or more is Stage 3. Anuria also counts as an output below 0.5 mL/kg/h for the first two rows, because there is no urine — so anuria for 6 hours to under 12 hours is Stage 1 — but no numeric rate is assigned to it. A rate below 0.5 mL/kg/h held for less than 6 hours satisfies no row and does not meet the AKI definition on this axis. The reported stage is the maximum of the two axes; if neither is met the stage is 0. Where the duration is not entered — or is '12 hours or more' while the rate is below 0.3 mL/kg/h, leaving the 24-hour row open — the urine-output axis cannot be resolved: the stage shown is then the highest CERTAIN stage, and the 'stage is not settled' output is 1, to be read as '≥' that stage, which is KDIGO's own notation for an unresolvable case in Chapter 2.4 Table 10. That output is set only where an open row could actually raise the stage. Where no open row could change the answer — a rate of 0.5 mL/kg/h or above satisfies no row at any window, a rate of 0.4 mL/kg/h can never reach the Stage-3 row, and nothing can exceed Stage 3 — the answer is settled and the flag stays 0. The same flag carries the un-baselined ≥ 4.0 mg/dL case described above, where the uncertainty runs the other way: the stage is the most the entered creatinine supports and a baseline could lower it. Either way the flag means the same thing to a reader — this is a bound, not a final stage, and a missing input would change it.",
  ),
  notes: defineText(
    "kdigo.notes",
    "Not a summed score: the serum-creatinine and urine-output axes are evaluated independently and the MAXIMUM stage governs — treating it as additive is wrong. URINE OUTPUT: KDIGO Table 2's urine-output rows are (rate, duration) PAIRS, not rate bands, and all four are tested independently with the highest satisfied row governing. Branching on the rate first is the classic implementation defect: 0.25 mL/kg/h for 8 hours is Stage 1, because 8 hours sits in the 6-to-under-12-hour window and the < 0.3 mL/kg/h row needs 24 hours — reading it as Stage 3 over-stages, and the same defect makes Stage 2 unreachable. A rate alone cannot select a row at all: 0.4 mL/kg/h is no AKI at 5 hours, Stage 1 at 8 hours and Stage 2 at 13 hours, so the duration is asked for rather than assumed. A rate below 0.5 mL/kg/h sustained for less than 6 hours meets no row — that is 'the AKI definition is not met on the urine-output criteria entered', not an error and not a graded Stage 0. WHEN THE URINE-OUTPUT AXIS CANNOT BE RESOLVED the stage shown is the highest stage that is CERTAIN and the 'stage is not settled' output is set to 1 — read the stage as '≥' — but only where an open row could actually raise it. The axis is open when a rate below 0.5 mL/kg/h or anuria is entered with no duration band, and also when the band is '12 hours or more' while the rate is below 0.3 mL/kg/h, since that band does not exclude 24 hours and the Stage-3 row stays open. The flag stays 0 wherever the open rows could not change the answer: a rate of 0.5 mL/kg/h or above satisfies no row at any window, a rate of 0.4 mL/kg/h caps the axis at Stage 2, and nothing can exceed Stage 3. Reporting '≥ 2' for an answer already settled at 2 is false caution, and it erodes the flag exactly where it has to mean something. No duration is ever guessed: assuming the shortest qualifying window systematically under-stages, assuming the longest over-stages, and KDIGO supplies no default — its Chapter 2.1 research recommendations state it is not yet settled how the urine-volume criteria should be applied at all. The '≥' notation is the guideline's own: Chapter 2.4 Table 10 records a case as '≥ 1' and another as '?' rather than guessing. ANURIA is a Table 2 row of its own — anuria for 12 hours or more is Stage 3 — and it is treated here as a clinical flag rather than a number. THAT IS A CONFIRMED ABSENCE, NOT AN UNANSWERED QUESTION: KDIGO gives no numeric definition of anuria anywhere in Table 2 or the Chapter 2.1 rationale, and nephrology has no single agreed numeric definition to borrow — the term is deliberately left to clinical judgement. Searching for one again will not produce one, and any millilitre figure attached to the word here would be this calculator's invention rather than the guideline's, so none is attached. What anuria does establish without any number is that the output is below every positive cutoff: the absence of urine is necessarily below 0.5 mL/kg/h, so it satisfies the Stage 1 row (6 hours to under 12 hours) and the Stage 2 row (12 hours or more) as well, and the highest satisfied row governs as usual. Treating anuria as satisfying nothing below 12 hours returned Stage 0 for a child with no urine for 8 hours, while a recorded rate of 0 over the same window returned Stage 1 — the same patient under-staged for being described in words rather than millilitres, which is the dangerous direction. The < 0.3 mL/kg/h row is the one place that entailment is deliberately NOT applied: it fires only at 24 hours or more, and every window establishing 24 hours also establishes the 12 hours at which the anuria row is already Stage 3, so it could not change an answer. Enter the measured rate as well when one is available. WEIGHT BASIS: KDIGO does not state which weight the mL/kg/h is indexed to [NEEDS SOURCE for a KDIGO-endorsed weight basis], so the rate is applied exactly as entered and this calculator takes no position. KDIGO also records that the urine-output criteria are less well validated than the creatinine criteria, that drugs (ACE inhibitors are its example), fluid balance and diuretics need clinical judgement, and that in very obese patients the criteria can capture patients with normal urine output. AGE: age is required because the estimated-GFR < 35 mL/min/1.73 m² route to Stage 3 exists only 'in patients < 18 years' (Table 2) — an eGFR entered for a patient aged 18 or over does not stage on that branch. There is no pediatric modification of the urine-output thresholds: 0.5 and 0.3 mL/kg/h at 6 / 12 / 24 hours apply to children unchanged. The predecessor pediatric system pRIFLE (Akcan-Arikan 2007) uses different durations, is a separate instrument, and is neither reproduced nor blended in here. BASELINE CREATININE is the hardest input — KDIGO does not fix a single pediatric baseline-creatinine method [NEEDS SOURCE for a KDIGO-endorsed pediatric baseline rule]. That marker is about GUIDELINE ENDORSEMENT and is still open; it is not the same question as which surrogate performs best, which now has a paediatric answer (Lee 2022, below) and is closed. The baseline supplied here drives the ratio-based and ≥ 0.3 mg/dL-rise stages, and the ≥ 0.3 mg/dL rise is applied as (current − baseline) rather than a timed 48-hour delta. THE ≥ 4.0 mg/dL ROUTE TO STAGE 3 IS NOT STANDALONE, and this is where the baseline earns its keep. KDIGO's Chapter 2.1 rationale requires the Rec 2.1.1 creatinine-change definition (≥ 0.3 mg/dL within 48 h, or ≥ 1.5× baseline) to be satisfied FIRST — a deliberate 2012 departure from AKIN's wording, made to bring definition and staging into parity. A chronically elevated creatinine that never rose is therefore not Stage 3 AKI; it is not AKI. Three cases, and only the third is a compromise. (1) A baseline is entered and the rise qualifies: ≥ 4.0 mg/dL is Stage 3, settled. (2) A baseline is entered and the rise does NOT qualify: the route does not fire at all and the ratio and rise criteria stand on their own — a chronic elevation stages as what it is, which is the whole point of asking for the baseline. (3) NO baseline is entered: the definition cannot be assessed either way, so Stage 3 is reported but the 'stage is not settled' output is set. Gating case 3 strictly would return Stage 0 for every patient entered without a prior value, and in a PICU that under-staging is the more dangerous error by a wide margin — reporting it as a bound neither under-stages nor claims more than the entered number supports. A patient who is already Stage 3 by a settled route (RRT, eGFR < 35 under 18 years, ≥ 3.0× baseline, or a closed Stage-3 urine-output row) is NOT flagged, because nothing about that answer is open. WHAT TO ENTER WHEN THERE IS NO PRIOR CREATININE: the LOWEST creatinine measured during this admission. It is a value the bedside already has, and THE EVIDENCE BEHIND IT IS NOW PAEDIATRIC RATHER THAN BORROWED FROM ADULTS. Lee 2022 (Kidney Res Clin Pract 2022;41(3):322-331, DOI 10.23876/j.krcp.21.120) took 710 critically ill children aged 1 month to 18 years who each had a real measured baseline on file, and asked which surrogate reproduces it. The lowest creatinine within 7 days of PICU admission won: agreement with the true baseline ICC 0.62, AKI detected with sensitivity 87.8% and specificity 71.0%, misclassification 19.2%, kappa 0.60, and an AKI incidence of 63.5% against a true 58.7% — a slight OVER-estimate. Back-calculating a baseline from an assumed eGFR, which is what KDIGO's own appendix suggests via MDRD from an assumed GFR of 75 mL/min/1.73 m², was far worse in the same children and worse in the direction that matters: sensitivity 31.5% (specificity 98.3%, misclassification 40.3%), and an AKI incidence of 19.1% against the same true 58.7% — roughly two thirds of the AKI in the cohort simply not seen. DO NOT BACK-CALCULATE. THE DIRECTION REVERSES BETWEEN ADULTS AND CHILDREN, AND ANYONE REASONING FROM ADULT PAPERS WILL GET THIS BACKWARDS: Lee 2022 contrasts its own finding with adult reports in which back-calculation OVER-estimates AKI, whereas in these children it UNDER-estimated severely. In a PICU that is the dangerous direction — an over-call gets reviewed and dropped at the next creatinine, a miss is never looked at again — so an adult paper's reassurance that back-calculation errs toward over-diagnosis must not be carried across. 'The adult literature' is not one voice on this either: Cooper 2021 (PMID 33732979), the adult cohort this score cited before the paediatric study existed, found assumed-GFR-75 methods MISSING more than half of all AKI, which is the same direction as the paediatric result rather than the opposite one. Whichever adult report a reader starts from, the instruction here is identical — enter a measured creatinine, do not compute one. THE SCr-MIN WINDOW IS NOT STANDARDISED, and the disagreement is worth seeing rather than smoothing over: published definitions of the 'lowest' creatinine run from 3 days, to 7 days, to the whole hospitalisation. Lee 2022 chose 7 days from PICU admission, so the operating characteristics above are 7-day characteristics; a different window is a different surrogate and does not inherit them. This calculator enforces no window — it asks for a number — so record which window the value entered came from. NO BACK-CALCULATION IS OFFERED HERE, deliberately: those equations need sex and race inputs this score does not collect, and race-based eGFR is contested in its own right, so the calculator asks for a number rather than manufacturing one. THE ADULT EVIDENCE IS KEPT ONLY FOR WHAT THE PAEDIATRIC STUDY DOES NOT TEST: Cooper 2021 (247 adults with Plasmodium knowlesi malaria in Malaysian Borneo) compared MDRD against CKD-EPI, an assumed GFR of 100 as well as 75, and age/sex-standardised reference tables, finding CKD-EPI at an assumed GFR of 100 tracked overall incidence best while still misassigning stages, and the lowest admission creatinine over-calling AKI by about a fifth while correlating with the reference value more closely than any estimate. It is single-infection adult evidence and is no longer the primary support for anything on this page. The pediatric eGFR branch is contested for young children — GFR rises developmentally and the bedside Schwartz equation was validated ~1–16 y, so do not extrapolate to neonates without a neonatal-specific estimator [NEEDS SOURCE for a neonatal eGFR method]. Creatinine SI↔conventional conversion reuses this project's shared clinical factor, 1 mg/dL = 88.42 µmol/L (creatinine's molar mass, 113.12 g/mol), whereas KDIGO itself prints the rounder 88.4. THIS IS SETTLED, NOT OPEN. The two differ by about 0.02% and cross no published threshold in either direction: KDIGO's own 4.0 mg/dL Stage-3 cutoff is 353.60 µmol/L at 88.4 and 353.68 at 88.42, and its 0.3 mg/dL rise is 26.52 against 26.53. Both resolve the guideline's printed SI thresholds to the same two-decimal mg/dL figure — 353.6 µmol/L → 4.00, a 26.5 µmol/L rise → 0.30 — so no stage, on this score or any other, turns on the choice. It is recorded as a documented and clinically immaterial implementation choice; the difference is disclosed here because the numbers should not appear to disagree silently, not because anything remains to be decided. The mg/dL cutoffs remain the authoritative ones, but a creatinine entered in µmol/L is converted and then rounded to the two decimal places creatinine is reported to in mg/dL, so KDIGO's own printed SI equivalents stage as the guideline intends: 353.6 µmol/L resolves to 4.00 mg/dL and meets the ≥ 4.0 Stage-3 criterion (unrounded it is 3.999095 and would miss it), and a 26.5 µmol/L rise resolves to a 0.30 mg/dL rise. Values genuinely below a cutoff are unaffected — 349.3 µmol/L resolves to 3.95 mg/dL and does not stage. A value entered in mg/dL is used exactly as typed. Higher KDIGO stage is associated with higher mortality and RRT risk in the outcome literature, but the staging itself is a classification, not a treatment threshold — keep any display descriptive. The per-input plausible min/max are input-validity guardrails, not published KDIGO thresholds; the age range deliberately extends past 18 years so that an adult stages correctly rather than being silently treated as a child.",
  ),
  calculate: (values) => {
    const ageYears = values.age.value; // years (canonical), required
    // Possibly absent since v3.1.0 — the urine-output axis stands on its own.
    const scr = values.scr?.value; // mg/dL (canonical), optional
    const baseline = values.scr_baseline?.value; // mg/dL (canonical)
    const uo = values.urine_output?.value; // mL/kg/h
    const duration = values.uo_duration?.value; // Table 2 band, or absent
    const anuria = values.anuria?.value === true;
    const egfr = values.egfr?.value; // mL/min/1.73 m²
    const onRrt = values.rrt?.value === true;

    // Float tolerance so a value that IS a KDIGO cutoff but drifts under binary
    // subtraction/division (e.g. 3.3 − 3.0 = 0.29999…, a true 0.3 rise; a true
    // 2.0× ratio computing as 1.99999…) still meets the "≥" threshold. This is a
    // rounding guard on the comparison, not a clinical value.
    const EPS = 1e-9;

    // ---- Serum-creatinine axis (KDIGO Table 2) ----
    let scrStage = 0;
    /**
     * Whether Rec 2.1.1's creatinine-change definition of AKI is ESTABLISHED —
     * a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline. Only assessable with a
     * baseline, which is the whole difficulty (see the ≥ 4.0 mg/dL block).
     *
     * Every route inside the block below is itself a Rec 2.1.1 criterion, so
     * "the block reached Stage 1 or higher" IS "the definition is met"; it is
     * read off `scrStage` rather than recomputed so the two cannot drift apart.
     */
    let akiDefinitionMet = false;
    if (scr !== undefined && baseline !== undefined) {
      const ratio = scr / baseline;
      if (ratio >= 3 - EPS)
        scrStage = 3; // ≥ 3.0× baseline → Stage 3
      else if (ratio >= 2 - EPS)
        scrStage = 2; // 2.0–2.9× baseline → Stage 2
      else if (ratio >= 1.5 - EPS) scrStage = 1; // 1.5–1.9× baseline → Stage 1
      // Absolute rise ≥ 0.3 mg/dL → at least Stage 1 (KDIGO Rec 2.1.1 / Stage 1).
      if (scr - baseline >= 0.3 - EPS && scrStage < 1) scrStage = 1;
      akiDefinitionMet = scrStage >= 1;
    }

    // ---- Absolute SCr ≥ 4.0 mg/dL → Stage 3, but NOT standalone ----
    //
    // KDIGO's Chapter 2.1 rationale (p. 21) requires the Rec 2.1.1 definition to
    // be satisfied FIRST — the 2012 change from AKIN's wording, made to bring
    // definition and staging into parity. So a chronically elevated creatinine
    // with no acute rise is not Stage 3 AKI, and staging it 3 is wrong.
    //
    // Gating it strictly is the OPPOSITE error and the worse one in a PICU: it
    // would return Stage 0 for every patient entered without a baseline, and a
    // baseline is exactly what is usually missing. So the two cases are split:
    //   • baseline present, definition met  → Stage 3, settled.
    //   • baseline present, definition NOT met → the route does not apply; the
    //     ratio/rise criteria above stand on their own (chronic elevation).
    //   • no baseline at all → Stage 3, but only as a FLOOR. `stage_is_floor`
    //     is set, so the answer asserts no more than the entered value supports
    //     and a reader holding a prior creatinine knows to enter it.
    if (scr !== undefined && scr >= 4 && akiDefinitionMet) scrStage = 3;
    /** Stage 3 claimed on ≥ 4.0 mg/dL alone, with no baseline to assess it. */
    const scrUnbaselined3 = scr !== undefined && scr >= 4 && baseline === undefined ? 3 : 0;

    // eGFR < 35 → Stage 3, but ONLY for a patient under 18 years. KDIGO Table 2
    // writes this branch as "in patients <18 years"; without the age gate an
    // adult's eGFR of 30 staged 3 on a criterion that does not apply to them.
    if (egfr !== undefined && egfr < 35 && ageYears < 18) scrStage = 3;
    if (onRrt) scrStage = 3; // RRT started → Stage 3

    // ---- Urine-output axis (KDIGO Table 2) ----
    // Four rows, each a (rate, duration) PAIR. Test all four independently and
    // take the highest satisfied — never branch on the rate first.
    //
    // ANURIA COUNTS AS AN OUTPUT BELOW 0.5 mL/kg/h. That is an entailment, not a
    // definition: the absence of urine is necessarily below every positive
    // cutoff, so the < 0.5 rows are satisfied without KDIGO having to give
    // anuria a number (it gives none, and none is invented here). Without it,
    // anuria for 6 to under 12 hours returned a settled Stage 0 while a recorded
    // rate of 0 over the same window returned Stage 1 — the same patient
    // under-staged for being described in words rather than millilitres.
    //
    // The < 0.3 row is deliberately left un-entailed. It fires only at ≥ 24 h,
    // and every band that establishes ≥ 24 h also establishes the ≥ 12 h at
    // which the anuria row is already Stage 3, so writing it in could not change
    // any answer — an unreachable claim, not a safeguard.
    const outputUnder05 = anuria || (uo !== undefined && uo < 0.5);
    const outputUnder03 = uo !== undefined && uo < 0.3;

    /** The four Table 2 rows, evaluated against the windows a band establishes. */
    const uoStageFor = (w: DurationWindows): number => {
      let s = 0;
      if (outputUnder05 && w[0]) s = Math.max(s, 1); // < 0.5 mL/kg/h, 6 to < 12 h
      if (outputUnder05 && w[1]) s = Math.max(s, 2); // < 0.5 mL/kg/h, ≥ 12 h
      if (outputUnder03 && w[2]) s = Math.max(s, 3); // < 0.3 mL/kg/h, ≥ 24 h
      if (anuria && w[1]) s = Math.max(s, 3); // anuria, ≥ 12 h
      return s;
    };

    // What the entered band makes CERTAIN, and the highest stage it still leaves
    // open. They differ only where a row is unsettled: no band at all, or
    // "12 h or more" with the 24 h row still reachable.
    const uoCertain = duration === undefined ? 0 : uoStageFor(DURATION_WINDOWS[duration]);
    const uoPossible =
      duration === undefined
        ? uoStageFor(ANY_DURATION)
        : duration === "12h-or-more"
          ? uoStageFor(DURATION_WINDOWS["24h-or-more"])
          : uoCertain;

    // ---- Final stage = max of the two axes ----
    //
    // Three quantities, not two, because the answer can be unsettled from either
    // end. `settled` is what the entered data ESTABLISHES; `ceiling` is the
    // highest stage still reachable once the unsettled urine-output rows are
    // allowed to fire; `stage` is what is reported, which is `settled` raised by
    // an un-baselined ≥ 4.0 mg/dL creatinine so that case is never under-staged.
    /**
     * Routes that settle the stage at 3 with no creatinine involved, or that
     * presuppose one. Used only to suppress `scr_axis_not_assessed`, never to
     * change a stage.
     */
    const scrAxisMoot = onRrt || (egfr !== undefined && egfr < 35 && ageYears < 18);

    const settled = Math.max(scrStage, uoCertain);
    const stage = Math.max(settled, scrUnbaselined3);
    const ceiling = Math.max(scrStage, uoPossible, scrUnbaselined3);

    // The stage is a bound rather than a final answer when it could still move:
    // UP, because an open urine-output row could raise it (`ceiling > stage`);
    // or DOWN, because ≥ 4.0 mg/dL carried it above what is established and a
    // baseline could withdraw that (`stage > settled`). Both collapse to 0 once
    // the answer is pinned — including when some OTHER route already settles
    // Stage 3 (RRT, eGFR < 35 under 18 y, ≥ 3.0× baseline, a closed Stage-3
    // urine-output row), since then `settled` is already 3 and nothing is open.
    const unsettled = ceiling > stage || stage > settled;

    return [
      {
        id: "kdigo_stage",
        label: defineText("kdigo.out.stage", "KDIGO AKI stage"),
        value: stage,
        unit: "",
        precision: 0,
      },
      {
        id: "stage_is_floor",
        label: defineText(
          "kdigo.out.floor",
          "Stage is not settled — read it as a bound, not a final stage (1 = yes)",
        ),
        value: unsettled ? 1 : 0,
        unit: "",
        precision: 0,
      },
      /**
       * A SEPARATE SIGNAL FROM `stage_is_floor`, and deliberately not folded
       * into it.
       *
       * `stage_is_floor` means a specific Table 2 row was left open by an
       * entered value AND closing it would change the answer. It carries a
       * DIRECTION in one case and not the other: v3.0.0 renamed its label from
       * "a lower bound" to "not settled" precisely because an un-baselined
       * creatinine ≥ 4.0 mg/dL can be unsettled DOWNWARD — the same patient with
       * a baseline on file may be Stage 0, a chronic 4.6 rather than an acute
       * 4.5. Reusing it here would resurrect the wording that release removed.
       *
       * This flag says only that the creatinine axis was never evaluated. It
       * implies no direction, and it must not be rendered with a "≥". A
       * creatinine can only ever RAISE a stage reached on urine output alone,
       * since staging takes the maximum over criteria — but that is a fact about
       * the axes, not a bound on this number, and the two are stated separately
       * so neither borrows the other's authority.
       */
      {
        id: "scr_axis_not_assessed",
        label: defineText("kdigo.out.scrAbsent", "Creatinine axis not assessed (1 = yes)"),
        // The label said "staged on urine output alone" for a few hours after
        // v3.2.0 and that was FALSE in three reachable cases, all verified by
        // execution: RRT alone, eGFR < 35 alone, and an empty form. None of the
        // three involves any urine output, and the first two are already Stage
        // 3 by a route that needs no creatinine. The label now claims only what
        // the value can support.
        //
        // The VALUE is narrowed to match. The creatinine axis is not "not
        // assessed" when the stage is already settled at 3 without it (RRT), and
        // saying so of an entered eGFR is self-contradictory — a bedside-Schwartz
        // eGFR is DERIVED from a creatinine, so the page would deny an axis the
        // reader's own input presupposes.
        value: scr === undefined && !scrAxisMoot ? 1 : 0,
        unit: "",
        precision: 0,
      },
    ];
  },
});
