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
  version: "1.2.0",
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
      note: "Reproduces KDIGO Table 2 including the '<18 years, eGFR < 35' Stage-3 branch. Corroborating secondary source ONLY. Its urine-output rows are laid out as a rate ladder, which is an easy thing to implement from by mistake; the (rate, duration) row structure this calculator implements is taken from the primary guideline itself (first reference above), not from this reproduction.",
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
      note: "SECONDARY SUPPORT — the paediatric Lee 2022 above is the primary support here, and this is kept only for what Lee does not test. It compared MDRD against CKD-EPI, an assumed GFR of 100 as well as KDIGO's suggested 75, and age/sex-standardised reference tables: every method built on an assumed GFR of 75 missed over half of all AKI; CKD-EPI at an assumed GFR of 100 tracked overall incidence best but still misassigned stages; the lowest creatinine measured during the admission over-called AKI by about a fifth yet correlated best with the reference value. CAUTION — 247 ADULTS with Plasmodium knowlesi malaria in Malaysian Borneo, so adult single-infection evidence, no longer relied on for any paediatric claim. It is also the reason the notes do not present 'the adult literature' as uniform: this adult cohort found back-calculation UNDER-detecting AKI, the same direction Lee found in children, not the over-estimation Lee contrasts against.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-08-10",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-09-03",
      reason: "formula-correction",
      summary:
        "Reads a birthday entered in DAYS as that birthday. Age is stored in years and days convert at 365.25, so a sixth birthday of 2191 days became 5.9986 years and a tenth of 3652 days became 9.9986. Anything that floors or bands on whole years then read the child as a year younger. The conversion now snaps to a whole year when the day count is within one day of one, which is the largest the drift can be: 365.25 averages the leap cycle exactly, so a true birthday is always within 0.75 days of the integer. Ages entered in years or months were already exact and are unchanged, and an age more than a day from a birthday is untouched. Found 2026-09-03 by an independent recompute of every calculator from its published source. On this score an eighteenth birthday entered in days left KDIGO's under-18 estimated-GFR route to Stage 3 open on an adult.",
    },
    {
      version: "1.2.0",
      date: "2026-09-03",
      reason: "formula-correction",
      summary:
        "Stages a recorded urine output of zero exactly as it stages the anuria box. A five-year-old with 0 mL/kg/h sustained 12 hours or more returned Stage 2 flagged as a floor with the box unticked, and Stage 3 with it ticked — the same patient one stage apart on whether a second control was used, in what this score's own notes call the dangerous direction. Table 2's fourth row is anuria for 12 hours or more, and a rate of zero is anuria: there is no urine. The score already entailed anuria into the rows built on 0.5 mL/kg/h so that a patient described in words was not under-staged against one described in millilitres; this closes the other half. NO THRESHOLD IS INVENTED, which is the reason anuria remains a separate clinical flag: zero is not a cutoff KDIGO declined to give. Any positive rate is unchanged and still needs the box — 0.01 mL/kg/h is oliguria, not anuria. Founder decision of 2026-09-03, from an independent recompute of every calculator against its published source.",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "KDIGO AKI staging is a set of factual numeric cut-points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations); facts and mathematical criteria are not copyrightable and may be implemented directly with attribution. No proprietary response-descriptor prose is reproduced — every option label and explanation here is written in this project's own words. The bedside Schwartz equation is likewise a formula (kdigo-aki.md IP status).",
  },
  formula: defineText(
    "kdigo.formula",
    "KDIGO stage is the maximum of two independently evaluated axes, never a sum. SERUM-CREATININE AXIS: 1.5–1.9× baseline, or a rise of ≥ 0.3 mg/dL, is Stage 1; 2.0–2.9× baseline is Stage 2; ≥ 3.0× baseline, renal replacement therapy initiated, an estimated GFR < 35 mL/min/1.73 m² (patients under 18 years only), or a creatinine ≥ 4.0 mg/dL is Stage 3. The ≥ 4.0 mg/dL route is not standalone: KDIGO requires the AKI definition (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline) to be met first, so a chronically elevated creatinine that never rose is not Stage 3 AKI. With no baseline entered, ≥ 4.0 mg/dL reports Stage 3 flagged as not settled. URINE-OUTPUT AXIS: the four Table 2 rows are (rate, duration) pairs, not rate bands, and each is tested independently with the highest satisfied row governing. < 0.5 mL/kg/h for 6 to under 12 hours is Stage 1; < 0.5 mL/kg/h for 12 hours or more is Stage 2; < 0.3 mL/kg/h for 24 hours or more is Stage 3; anuria for 12 hours or more is Stage 3. Branching on the rate first is the classic defect: 0.25 mL/kg/h for 8 hours is Stage 1, not Stage 3. A rate < 0.5 mL/kg/h held for less than 6 hours meets no row. Anuria is a clinical flag, because KDIGO defines no millilitre figure and none is invented here, and it necessarily satisfies the < 0.5 mL/kg/h rows too, so anuria for 6 to under 12 hours is Stage 1. UNRESOLVABLE AXIS: when the duration is missing, or “12 hours or more” is chosen with a rate < 0.3 mL/kg/h leaving the 24-hour row open, the stage shown is the highest certain stage with a “≥” flag, which is KDIGO’s own Table 10 notation. No duration is ever guessed, and the flag is set only where an open row could change the answer.",
  ),
  notes: defineText(
    "kdigo.notes",
    "Stage 0 means the KDIGO definition is not met on the criteria entered, which is not proof that AKI is absent. Higher stage associates with mortality and renal replacement therapy in the outcome literature, but the staging is a classification, not a treatment threshold. BASELINE CREATININE IS THE HARDEST INPUT. With no prior value, enter the LOWEST creatinine of this admission: in 710 critically ill children with true baselines it detected AKI with sensitivity 87.8% and specificity 71.0% (Lee 2022, 7-day window). Do not back-calculate from an assumed GFR of 75, which is KDIGO’s own appendix suggestion: in the same children it was 31.5% sensitive and missed roughly two thirds of the AKI. The direction reverses between adults and children, so adult reassurance that back-calculation over-diagnoses must not be carried across, and under-staging is the dangerous direction in a PICU. Record which window the entered value came from. KDIGO defines the ≥ 0.3 mg/dL rise as a rise WITHIN 48 HOURS; this calculator applies it as current minus the baseline you enter, with no window, so a baseline from weeks or months back can produce Stage 1 from a rise that was never acute. There is no paediatric modification of the urine-output thresholds. pRIFLE is a separate instrument and is neither reproduced nor blended in here. The bedside Schwartz equation (0.413 × height in cm ÷ serum creatinine in mg/dL) behind the eGFR branch was validated at roughly 1 to 16 years, so do not extrapolate it to neonates. KDIGO does not state which weight indexes the mL/kg/h [NEEDS SOURCE], nor is there a KDIGO-endorsed paediatric baseline rule [NEEDS SOURCE]. Conversion uses 1 mg/dL = 88.42 µmol/L with two-decimal rounding so KDIGO’s printed SI equivalents stage as intended (353.6 µmol/L resolves to 4.00 mg/dL).",
  ),
  calculate: (values) => {
    const ageYears = values.age.value; // years (canonical), required
    // Possibly absent since v3.1.0 — the urine-output axis stands on its own.
    const scr = values.scr?.value; // mg/dL (canonical), optional
    const baseline = values.scr_baseline?.value; // mg/dL (canonical)
    const uo = values.urine_output?.value; // mL/kg/h
    const duration = values.uo_duration?.value; // Table 2 band, or absent
    // A RECORDED ZERO IS ANURIA, not merely a rate below every cutoff.
    //
    // Until 2026-09-03 only the box counted, so a five-year-old with 0
    // mL/kg/h for 12 hours or more staged 2 with the box unticked and 3
    // with it ticked — the same patient, one stage apart, in what this
    // score's own notes call the dangerous direction. The mirror of this is
    // already argued below, where anuria is entailed into the < 0.5 rows so
    // a patient is not under-staged for being described in words rather
    // than millilitres; this closes the other half.
    //
    // It invents no threshold, which is the concern that kept anuria a
    // separate flag: zero is not a cutoff KDIGO declined to give, it is the
    // absence of urine. Any positive rate, however small, still needs the
    // box — 0.01 mL/kg/h is oliguria, not anuria.
    const anuria = values.anuria?.value === true || values.urine_output?.value === 0;
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
