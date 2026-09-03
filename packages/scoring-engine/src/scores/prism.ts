import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { ageInYears } from "../units/age";
import { creatinineMgdl } from "../units/concentration";
import { electrolyteMeqL } from "../units/electrolytes";
import { bunMgdl, glucoseMgdl } from "../units/osmolytes";
import { mmhgWithKpa } from "../units/pressure";
import type { ScoreValue } from "../types";
import type { UnitSpec } from "../units/types";

/**
 * PRISM III and PRISM IV — Pediatric Risk of Mortality, in one calculator.
 *
 * They are combined here because they are not two scores. PRISM IV reuses PRISM
 * III's physiologic variables and thresholds unchanged — Pollack 2016 states
 * that the physiologic ranges for the PRISM variables have not changed — and
 * revises three other things: the collection window, the outcome definition,
 * and the mortality equation. So one set of physiologic entries yields one
 * score, and the window decides whether a citable, published equation exists to
 * turn that score into a probability at all.
 *
 * ONE WINDOW PRODUCES A PROBABILITY, and only one. PRISM IV does not use the
 * total: it splits the score into a neurologic subscore (pupils + mental
 * status, 0-16) and a non-neurologic subscore (the other 15 variables, 0-58),
 * weights them separately at 0.197 and 0.163 per point — a deliberate finding
 * that neurologic derangement carries more per point — and adds five
 * non-physiologic terms. Its coefficients are Table 3 of Pollack 2016, printed
 * in full in a paper whose stated objective included placing the algorithms in
 * the public domain.
 *
 * PRISM III MORTALITY — REMOVED 2026-08-03. Read this before restoring it.
 *
 * Pollack 1996 publishes the SCORE completely (Figure 1, p. 6: every variable,
 * every range, every point value, and the collection rules) and publishes NO
 * logistic coefficients. That was established by enumerating the paper's eight
 * tables and four figures against the full text: Table 3, the table the Results
 * section points to for the risk-factor models, is a model COMPARISON table —
 * chi-square, degrees of freedom, AIC, AUC, Hosmer-Lemeshow — and no regression
 * coefficient appears in it or anywhere else in the article. There is no
 * supplement.
 *
 * The III-12 and III-24 quadratics this file carried until 2026-08-03 were
 * therefore single-sourced to US patent 5,809,477, whose transcription has
 * known internal inconsistencies, and no page could be cited for them. That
 * fails the project rule that no clinical number ships without a citation and a
 * cited worked example. The paper's own author note additionally reserves the
 * equations for research use and states that non-research uses may attract
 * compensation, and the authors' own network draws the same line: the CPCCRN
 * PRISM III calculator returns SCORE, NEUROLOGIC and NON-NEUROLOGIC and no
 * mortality.
 *
 * They were also the score-only models, carrying no risk-factor adjustment, so
 * one number stood in for a spread that the published risk-adjusted model puts
 * between roughly 10% and 65% at a single score — over-predicting after surgery
 * and in diabetic ketoacidosis, under-predicting after CPR, with cancer, and
 * after a previous ICU admission.
 *
 * So the 12–24 hour window now yields the score and its two subscores and
 * NO probability. That absence is deliberate: it is not an error state and must
 * never be rendered as zero. THE SCORE ITSELF IS UNCHANGED for every window.
 *
 * SOURCES. The complete PRISM III threshold table is reproduced verbatim in US
 * patent 5809477A, whose inventor is the score's author, which bypasses the
 * paywalled 1996 paper for the parts the paper does publish. PRISM IV's
 * coefficients are Table 3 of Pollack 2016.
 *
 * INTELLECTUAL PROPERTY. The score is a table of physiologic cut-points; the
 * patent covering it shows status "Expired - Lifetime" with an anticipated
 * expiration of 2015-09-21, and PRISM IV's algorithms were placed in the public
 * domain by their authors. Neither of those facts reaches the PRISM III
 * mortality equations, which is the narrower reason they are gone. See
 * docs/decisions/ADR-tier-b-ip.md and docs/research/scores/prism.md.
 *
 * TWO KINDS OF HONEST ABSENCE, and they are the same rule. The 12–24 hour
 * window emits no probability because no citable equation exists for it. The
 * 4-hour window emits no probability when the patient has not been fully
 * described: PRISM IV's four admission-context covariates are each zero at
 * their reference level, so reading a blank as "contributes nothing" would
 * hand every clinician who skipped a question the OR/PACU, no-CPR, no-cancer,
 * no-low-risk-system curve. That is the reference-patient form of the defect
 * the 2026-08-03 removal fixed — one curve for every patient — and it is
 * refused here for the same reason. NEVER SUBSTITUTE THE REFERENCE LEVEL FOR
 * AN UNANSWERED QUESTION.
 *
 * NO PUBLISHED WORKED EXAMPLE EXISTS for either model — not in the 1996 paper,
 * the 2016 paper, the patent, or any secondary source. The cases in the test
 * file were constructed from the threshold table and are labelled as such. The
 * natural oracle is the authors' own CPCCRN calculators: both calculators'
 * input and output sets were read on 2026-08-03, and the PRISM IV calculator's
 * inputs match Table 3 one-to-one. What is still outstanding is that NO CASE
 * HAS BEEN ROUND-TRIPPED through either one, so the constructed fixtures
 * remain unreconciled against the authors' own implementation. [NEEDS SOURCE]
 * until that round-trip happens.
 */

/** Cells/mm3, as the source table prints them. */
const cellsPerMm3: UnitSpec = { canonical: "cells/mm³" };
/** Clotting times are reported in seconds with no routine alternate. */
const seconds: UnitSpec = { canonical: "s" };
/** pH and total CO2 are unitless / mmol/L with no routine alternate. */
const phUnits: UnitSpec = { canonical: "" };
const mmolPerLitre: UnitSpec = { canonical: "mmol/L" };
const beatsPerMinute: UnitSpec = { canonical: "bpm" };
const degreesC: UnitSpec = { canonical: "°C" };

/**
 * PRISM III age bands, verbatim from the patent: "Neonate = 0 to <1 month;
 * Infant = 1 month to <12 months; Child = 12 months to <144 months; Adolescent
 * >= 144 months."
 *
 * These are NOT the PRISM IV age categories, which split that first month in
 * two. One age input drives both; the two schemes are deliberately kept apart
 * rather than merged, because merging them would silently change a threshold.
 */
type Band = "neonate" | "infant" | "child" | "adolescent";

function bandFor(ageMonths: number): Band {
  if (ageMonths < 1) return "neonate";
  if (ageMonths < 12) return "infant";
  if (ageMonths < 144) return "child";
  return "adolescent";
}

/** Systolic BP (minimum): 3 points in the band, 7 below it. */
function sbpPoints(band: Band, sbp: number): number {
  const [low, high] = {
    neonate: [40, 55],
    infant: [45, 65],
    child: [55, 75],
    adolescent: [65, 85],
  }[band] as [number, number];
  if (sbp < low) return 7;
  if (sbp <= high) return 3;
  return 0;
}

/** Heart rate (maximum): 3 points in the band, 4 above it. */
function heartRatePoints(band: Band, hr: number): number {
  // The patent's OCR prints the neonate 3-point band as "215-255", which cannot
  // be right given the >225 cutoff on the very next line. The independent Das
  // et al. reproduction prints 215-225, which is also the infant band, so 225
  // is used here.
  const [low, high] = {
    neonate: [215, 225],
    infant: [215, 225],
    child: [185, 205],
    adolescent: [145, 155],
  }[band] as [number, number];
  if (hr > high) return 4;
  if (hr >= low) return 3;
  return 0;
}

/** Creatinine (maximum), 2 points above the band's cutoff. Infant and child share one. */
function creatininePoints(band: Band, mgdl: number): number {
  const cutoff = { neonate: 0.85, infant: 0.9, child: 0.9, adolescent: 1.3 }[band];
  return mgdl > cutoff ? 2 : 0;
}

/** BUN (maximum). A two-band split — neonate against everyone else — not the four-band one. */
function bunPoints(band: Band, mgdl: number): number {
  return mgdl > (band === "neonate" ? 11.9 : 14.9) ? 3 : 0;
}

/**
 * Acidosis. ONE row satisfied by EITHER pH or total CO2, awarded once at the
 * worse tier — never 2 and 6, and never 2 twice because both analytes qualified.
 */
function acidosisPoints(phMin: number | undefined, tco2Min: number | undefined): number {
  if ((phMin !== undefined && phMin < 7.0) || (tco2Min !== undefined && tco2Min < 5)) return 6;
  if (
    (phMin !== undefined && phMin >= 7.0 && phMin <= 7.28) ||
    (tco2Min !== undefined && tco2Min >= 5 && tco2Min <= 16.9)
  ) {
    return 2;
  }
  return 0;
}

/**
 * Alkalosis, from pH MAXIMUM, and deliberately independent of the acidosis row.
 * The patent is explicit: "When there are both low and high ranges, PRISM III
 * points may be assigned for the low and the high ranges." A pH that swung from
 * 6.9 to 7.6 inside the window scores 6 + 3 = 9 from pH alone.
 */
function alkalosisPoints(phMax: number): number {
  if (phMax > 7.55) return 3;
  if (phMax >= 7.48) return 2;
  return 0;
}

/** Platelets (minimum). Note a merely low-normal 150,000 already scores 2. */
function plateletPoints(count: number): number {
  if (count < 50_000) return 5;
  if (count < 100_000) return 4;
  if (count <= 200_000) return 2;
  return 0;
}

/** PT/PTT: one row, either analyte, awarded once. Only the PTT cutoff is age-dependent. */
function clottingPoints(band: Band, pt: number | undefined, ptt: number | undefined): number {
  const pttCutoff = band === "neonate" ? 85.0 : 57.0;
  const hit = (pt !== undefined && pt > 22.0) || (ptt !== undefined && ptt > pttCutoff);
  return hit ? 3 : 0;
}

const logistic = (r: number): number => 1 / (1 + Math.exp(-r));

export const prism = defineScore({
  id: "prism",
  slug: "prism",
  name: "Pediatric Risk of Mortality (PRISM III and PRISM IV)",
  version: "1.0.0",
  status: "published",
  category: "mortality-severity",
  // Every laboratory component is optional and a blank one scores zero, so a
  // partially entered PRISM reads lower than the patient is. The form's
  // partial-result cue exists for exactly this and must stay on.
  missingAsNormal: true,
  inputs: [
    {
      id: "collection_window",
      group: defineText("prism.group.assessment", "Assessment"),
      /**
       * NAMED FOR THE DATA, NOT FOR THE OUTPUT.
       *
       * The options name the models, so the label has to carry what the choice
       * actually follows from. A clinician must pick the model whose data they
       * collected — not the one that yields a probability. "PRISM IV (score and
       * mortality probability)" is a tempting thing to click for its own sake,
       * and a 12-hour dataset scored as PRISM IV is a probability computed from
       * variables gathered over the wrong period. The label is the last thing
       * read before the click, so the constraint belongs there and not only in
       * the help text below it.
       */
      label: defineText("prism.window", "Model, by the data you collected"),
      required: true,
      type: "categorical",
      options: [
        {
          value: "first_4h",
          /**
           * "MORTALITY PROBABILITY", NEVER "MORTALITY RATIO".
           *
           * What PRISM IV emits is a predicted probability of hospital
           * mortality for ONE admission. A standardised mortality ratio is
           * observed deaths divided by expected deaths across a COHORT — a
           * different quantity, which this calculator does not compute. The
           * distinction is not pedantry here: this score's own caution cites
           * an SMR of 2.61 from the Riyadh validation, so a label reading
           * "ratio" would sit inches from a real SMR and invite exactly that
           * conflation.
           */
          label: defineText("prism.window.4", "PRISM IV (score and mortality probability)"),
        },
        /**
         * ONE PRISM III OPTION, NOT TWO — collapsed 2026-08-09.
         *
         * `first_12h` and `first_24h` returned BYTE-IDENTICAL output on
         * identical input, always: same seventeen variables, same age bands,
         * same cut-points, same point values. Verified by execution, not
         * assumed.
         *
         * The published distinction between PRISM III-12 and III-24 is a
         * distinction between two MORTALITY MODELS with different coefficients
         * and different calibration. This platform ships neither, deliberately
         * — those equations are not in Pollack 1996 and are separately
         * licensed. Offering two options named after two models whose only
         * difference we removed does not merely duplicate a choice; it invites
         * a clinician to believe the choice does something.
         *
         * The value is `first_12_24h` and not the retired `first_12h`, because
         * a value named for 12 hours that means 12-to-24 is a quiet lie in
         * every fragment it appears in. Both retired values are migrated at
         * the fragment decoder — `collection_window` is `required: true`, so an
         * unmapped legacy link does not lose the window, it returns
         * `invalid-category` and blocks the entire score.
         *
         * THE VALUE IDS STILL NAME PERIODS WHILE THE LABELS NAME MODELS, and
         * that is deliberate rather than an oversight. The ids are a wire
         * format baked into every link already shared; renaming them to
         * `prism_iv` / `prism_iii` would buy tidiness at the cost of another
         * migration and another chance to strand a link. The label is what a
         * clinician reads; the id is what a URL carries. They answer to
         * different constituencies.
         */
        {
          value: "first_12_24h",
          label: defineText("prism.window.12_24", "PRISM III (severity score only)"),
        },
      ],
      helpText: defineText(
        "prism.window.help",
        'CHOOSE BY THE DATA YOU HAVE, NOT BY THE OUTPUT YOU WANT. The two options are two models with two different collection periods, and each is only valid on the data it was built for. Scoring a 12-hour dataset as PRISM IV does not give you a probability for that patient; it gives you a probability computed from variables gathered over the wrong period. WHAT TO COLLECT, AND OVER WHAT PERIOD — this is the part that changes your answer. Enter the single most abnormal value reached inside the period for each variable: the lowest, the highest, or both where a row asks for both. PRISM IV — FIRST 4 HOURS: physiologic variables from the first 4 hours of PICU care ONLY, and laboratory variables from 2 hours BEFORE PICU admission through the first 4 hours. The two halves have different windows and the laboratory one starts before the child arrives — a gas or a chemistry drawn in the referring unit two hours out counts, while a blood pressure from the same moment does not. That split is the authors’ own (Pollack 2013, the ideal-time-interval study) and is exactly how their CPCCRN calculator states it. PRISM III — FIRST 12 OR 24 HOURS: the most abnormal value for each variable within the period you collected, whether that was the first 12 hours of PICU care or the first 24. THE 12- AND 24-HOUR COLLECTIONS ARE ONE OPTION HERE, and it is worth knowing why rather than assuming a field was lost. The SCORE is computed identically for both — same seventeen variables, same age bands, same cut-points — so no choice you could make between them would change a number on this page. What the published literature separates as PRISM III-12 and PRISM III-24 are two MORTALITY MODELS, with different coefficients and different calibration, and this platform ships neither: those equations are not in the source article and are separately licensed. Offering a choice whose only consequence has been removed would suggest the choice still does something. BUT THE PERIOD YOU COLLECTED STILL MATTERS TO HOW THE NUMBER READS. A longer period usually produces a HIGHER score, because it catches more extreme values, never because the arithmetic differs — so a PRISM III collected over 24 hours and one collected over 12 are not directly comparable, and a series should hold the period constant. Record which you used alongside the score if that comparison matters to you. WHAT THE CHOICE DECIDES is whether a mortality estimate can be shown. PRISM IV’s equation is published in full and is shown here, and it produces a probability only once all four admission-context questions have been answered — leave any of them blank and the score still appears while the probability is withheld, because a blank is not an answer of "no". PRISM III gives the score and its two subscores and no probability, because its mortality equations are not published in the source article and are separately licensed. The four admission-context questions belong to PRISM IV alone, so they are asked ONLY when PRISM IV is selected and are not shown at all under PRISM III — they are not hidden answers being ignored, they are questions with no destination there.',
      ),
    },
    {
      id: "age",
      group: defineText("prism.group.assessment", "Assessment"),
      label: defineText("prism.age", "Age"),
      required: true,
      type: "numeric",
      unit: ageInYears,
      min: 0,
      max: 18,
      helpText: defineText(
        "prism.age.help",
        "Sets the age band for blood pressure, heart rate, creatinine, BUN and PTT, and is separately a term in the PRISM IV equation. PRISM III bands: neonate under 1 month, infant 1 to under 12 months, child 12 months to under 12 years, adolescent 12 years and over.",
      ),
    },
    {
      id: "sbp_min",
      group: defineText("prism.group.cardiovascular", "Cardiovascular"),
      label: defineText("prism.sbp", "Systolic blood pressure (lowest)"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      min: 0,
      max: 300,
      helpText: defineText("prism.sbp.help", "The lowest value recorded in the window."),
    },
    {
      id: "temp_min",
      group: defineText("prism.group.cardiovascular", "Cardiovascular"),
      label: defineText("prism.tempmin", "Temperature (lowest)"),
      required: false,
      type: "numeric",
      unit: degreesC,
      min: 20,
      max: 45,
      helpText: defineText(
        "prism.tempmin.help",
        "Rectal, oral, blood or axillary. Under 33 °C scores 3; a patient with both a low and a high excursion still scores 3 once, not twice.",
      ),
    },
    {
      id: "temp_max",
      group: defineText("prism.group.cardiovascular", "Cardiovascular"),
      label: defineText("prism.tempmax", "Temperature (highest)"),
      required: false,
      type: "numeric",
      unit: degreesC,
      min: 20,
      max: 45,
      helpText: defineText("prism.tempmax.help", "Above 40.0 °C scores 3, on the same single row."),
    },
    {
      id: "mental_status_gcs",
      group: defineText("prism.group.neurological", "Neurological"),
      label: defineText("prism.mental", "Glasgow Coma Scale (lowest)"),
      required: false,
      type: "numeric",
      min: 3,
      max: 15,
      unit: { canonical: "" },
      helpText: defineText(
        "prism.mental.help",
        "Enter ONLY for a patient with known or suspected acute CNS disease; leave blank otherwise. Do not assess within 2 hours of sedation, paralysis or anaesthesia — use the closest period free of them. Under 8 scores 5. One of the two neurologic items.",
      ),
    },
    {
      id: "pupils",
      group: defineText("prism.group.neurological", "Neurological"),
      label: defineText("prism.pupils", "Pupillary reflexes"),
      required: true,
      type: "categorical",
      options: [
        { value: "both_reactive", label: defineText("prism.pupils.0", "Both reactive") },
        { value: "one_fixed", label: defineText("prism.pupils.7", "One fixed, one reactive") },
        { value: "both_fixed", label: defineText("prism.pupils.11", "Both fixed") },
      ],
      helpText: defineText(
        "prism.pupils.help",
        "A non-reactive pupil must be larger than 3 mm. Do not assess after iatrogenic dilation. At 11 points this is the heaviest single item in the score, and the other neurologic item.",
      ),
    },
    {
      id: "hr_max",
      group: defineText("prism.group.cardiovascular", "Cardiovascular"),
      label: defineText("prism.hr", "Heart rate (highest)"),
      required: false,
      type: "numeric",
      unit: beatsPerMinute,
      min: 0,
      max: 350,
      helpText: defineText(
        "prism.hr.help",
        "Do not assess during crying or iatrogenic agitation. Thresholds are age-banded.",
      ),
    },
    {
      id: "ph_min",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.phmin", "pH (lowest)"),
      required: false,
      type: "numeric",
      unit: phUnits,
      min: 6.5,
      max: 8,
      helpText: defineText(
        "prism.phmin.help",
        "Arterial, capillary or venous. Shares one row with the lowest total CO₂ — whichever is worse scores once, never both.",
      ),
    },
    {
      id: "ph_max",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.phmax", "pH (highest)"),
      required: false,
      type: "numeric",
      unit: phUnits,
      min: 6.5,
      max: 8,
      helpText: defineText(
        "prism.phmax.help",
        "A separate row from the lowest pH, and both can score in the same patient: the source is explicit that points may be assigned for the low and the high ranges together.",
      ),
    },
    {
      id: "tco2_min",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.tco2min", "Total CO₂ (lowest)"),
      required: false,
      type: "numeric",
      unit: mmolPerLitre,
      min: 0,
      max: 60,
      helpText: defineText(
        "prism.tco2min.help",
        "Total CO₂ or bicarbonate. Use a calculated bicarbonate from a blood gas only if total CO₂ is not measured routinely.",
      ),
    },
    {
      id: "tco2_max",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.tco2max", "Total CO₂ (highest)"),
      required: false,
      type: "numeric",
      unit: mmolPerLitre,
      min: 0,
      max: 60,
      helpText: defineText(
        "prism.tco2max.help",
        "Above 34.0 scores 4, independently of the lowest value's row.",
      ),
    },
    {
      id: "pco2_max",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.pco2", "PCO₂ (highest)"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      min: 0,
      max: 200,
      helpText: defineText("prism.pco2.help", "Arterial, capillary or venous."),
    },
    {
      id: "pao2_min",
      group: defineText("prism.group.acid-base-and-blood-gas", "Acid–base and blood gas"),
      label: defineText("prism.pao2", "PaO₂ (lowest)"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      min: 0,
      max: 700,
      helpText: defineText("prism.pao2.help", "Arterial measurements only."),
    },
    {
      id: "glucose_max",
      group: defineText("prism.group.chemistry", "Chemistry"),
      label: defineText("prism.glucose", "Glucose (highest)"),
      required: false,
      type: "numeric",
      unit: glucoseMgdl,
      min: 0,
      max: 1500,
      helpText: defineText(
        "prism.glucose.help",
        "Above 200 mg/dL scores 2 — in SI units, above 11.11 mmol/L (the cutoff is 200 ÷ 18, so 11.1 does not score and 11.2 does). The comparison is made in mg/dL after conversion, because that is the unit the source table is printed in. A whole-blood value should be increased by 10% before scoring.",
      ),
    },
    {
      id: "potassium_max",
      group: defineText("prism.group.chemistry", "Chemistry"),
      label: defineText("prism.k", "Potassium (highest)"),
      required: false,
      type: "numeric",
      unit: electrolyteMeqL,
      min: 0,
      max: 15,
      helpText: defineText(
        "prism.k.help",
        "Above 6.9 scores 3. A whole-blood value should be increased by 0.4 mmol/L before scoring.",
      ),
    },
    {
      id: "creatinine_max",
      group: defineText("prism.group.chemistry", "Chemistry"),
      label: defineText("prism.creat", "Creatinine (highest)"),
      required: false,
      type: "numeric",
      unit: creatinineMgdl,
      min: 0,
      max: 25,
      helpText: defineText(
        "prism.creat.help",
        "Age-banded; infant and child share one cutoff. Scores 2 above 0.85 mg/dL (neonate), 0.9 (infant and child) or 1.3 (adolescent) — approximately 75, 80 and 115 µmol/L. The comparison is made in mg/dL after conversion, and a value entered in µmol/L is rounded to 2 decimal places on the way, so a µmol reading sitting exactly on a cutoff (115 µmol/L becomes 1.30 mg/dL) does not score, while 1.301 mg/dL entered directly does. The published SI columns are themselves rounded, so treat either unit as a knife-edge at the boundary rather than as an exact equivalence.",
      ),
    },
    {
      id: "bun_max",
      group: defineText("prism.group.chemistry", "Chemistry"),
      label: defineText("prism.bun", "Blood urea nitrogen (highest)"),
      required: false,
      type: "numeric",
      unit: bunMgdl,
      min: 0,
      max: 300,
      helpText: defineText(
        "prism.bun.help",
        "A two-band split only: neonates above 11.9 mg/dL, everyone else above 14.9.",
      ),
    },
    {
      id: "wbc_min",
      group: defineText("prism.group.haematology", "Haematology"),
      label: defineText("prism.wbc", "White blood cell count (lowest)"),
      required: false,
      type: "numeric",
      unit: cellsPerMm3,
      min: 0,
      max: 200_000,
      helpText: defineText(
        "prism.wbc.help",
        "Only leukopenia scores: under 3,000 scores 4, and a high count scores nothing.",
      ),
    },
    {
      id: "platelets_min",
      group: defineText("prism.group.haematology", "Haematology"),
      label: defineText("prism.plt", "Platelet count (lowest)"),
      required: false,
      type: "numeric",
      unit: cellsPerMm3,
      min: 0,
      max: 2_000_000,
      helpText: defineText(
        "prism.plt.help",
        "Unusually shaped: a merely low-normal 150,000 already scores 2, 50,000-99,999 scores 4, and under 50,000 scores 5.",
      ),
    },
    {
      id: "pt_max",
      group: defineText("prism.group.haematology", "Haematology"),
      label: defineText("prism.pt", "Prothrombin time (highest)"),
      required: false,
      type: "numeric",
      unit: seconds,
      min: 0,
      max: 200,
      helpText: defineText(
        "prism.pt.help",
        "Shares one row with PTT. Above 22.0 s at any age; the row awards 3 once even when both analytes qualify.",
      ),
    },
    {
      id: "ptt_max",
      group: defineText("prism.group.haematology", "Haematology"),
      label: defineText("prism.ptt", "Partial thromboplastin time (highest)"),
      required: false,
      type: "numeric",
      unit: seconds,
      min: 0,
      max: 400,
      helpText: defineText(
        "prism.ptt.help",
        "Above 85.0 s in a neonate, above 57.0 s at every other age.",
      ),
    },
    /**
     * THE FOUR ADMISSION-CONTEXT COVARIATES: asked only where they mean
     * something, and `required: false` even there.
     *
     * They are PRISM IV's, and PRISM IV is one window of two. Since v2.5.0
     * they carry `showWhen` and are simply not asked on the 12–24 hour
     * window, where they mean nothing and are not collected. `runValidation`
     * drops a hidden input before the required check, so nothing that is not on
     * screen can reach `calculate`.
     *
     * They still may not be `required: true`, and `showWhen` does not change
     * that — it is the reason. `showWhen` and `required` may not be combined
     * (gated in registry-gate.test.ts): a hidden required input is rejected
     * with `missing-required` and makes the entire score permanently
     * uncomputable, no total and no subscores, while the blocking rail names a
     * field that is not in the DOM.
     *
     * `required: false` therefore does NOT mean "safe to leave blank" on the
     * window where they ARE asked. Every one is zero at its reference level, so
     * a blank that fell through to the equation would read as "from the
     * operating room, no CPR, no cancer, no low-risk system" — a claim about
     * the patient that nobody made. `calculate` conditions the requirement on
     * the window instead: on the 4-hour window a single blank withholds the
     * probability outright. See the guard in `calculate` and the test that
     * omits each one in turn.
     */
    {
      id: "admission_source",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.source", "Admission source"),
      required: false,
      // Blank does NOT score as normal here: it withholds the probability.
      // See the InputBase doc on this flag and the "TWO KINDS OF HONEST
      // ABSENCE" note at the top of this file.
      missingIsNotNormal: true,
      // ASKED ON THE 4-HOUR WINDOW ONLY. PRISM IV is the only model that reads
      // it, and `calculate` returns before every read of it on the other
      // window — so there it is a question with no destination.
      showWhen: { input: "collection_window", equals: ["first_4h"] },
      type: "categorical",
      options: [
        {
          value: "or_pacu",
          label: defineText("prism.source.or", "Operating room or post-anaesthesia care"),
        },
        { value: "ed", label: defineText("prism.source.ed", "Emergency department") },
        {
          value: "another_hospital",
          label: defineText("prism.source.hosp", "Another hospital"),
        },
        { value: "inpatient", label: defineText("prism.source.inp", "Inpatient unit") },
      ],
      helpText: defineText(
        "prism.source.help",
        "PRISM IV only. Operating room or post-anaesthesia care is the reference category; an unplanned deterioration on an inpatient unit carries the heaviest weight of the four. On the 4-hour window this must be answered before any probability is shown: leaving it blank withholds the estimate rather than assuming the operating-room reference.",
      ),
    },
    {
      id: "cpr_24h",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.cpr", "CPR within 24 hours before admission"),
      required: false,
      // Blank does NOT score as normal here: it withholds the probability.
      // See the InputBase doc on this flag and the "TWO KINDS OF HONEST
      // ABSENCE" note at the top of this file.
      missingIsNotNormal: true,
      // ASKED ON THE 4-HOUR WINDOW ONLY. PRISM IV is the only model that reads
      // it, and `calculate` returns before every read of it on the other
      // window — so there it is a question with no destination.
      showWhen: { input: "collection_window", equals: ["first_4h"] },
      type: "boolean",
      helpText: defineText(
        "prism.cpr.help",
        'PRISM IV only. Cardiopulmonary resuscitation in the 24 hours preceding PICU admission. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".',
      ),
    },
    {
      id: "cancer",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.cancer", "Cancer, acute or chronic"),
      required: false,
      // Blank does NOT score as normal here: it withholds the probability.
      // See the InputBase doc on this flag and the "TWO KINDS OF HONEST
      // ABSENCE" note at the top of this file.
      missingIsNotNormal: true,
      // ASKED ON THE 4-HOUR WINDOW ONLY. PRISM IV is the only model that reads
      // it, and `calculate` returns before every read of it on the other
      // window — so there it is a question with no destination.
      showWhen: { input: "collection_window", equals: ["first_4h"] },
      type: "boolean",
      helpText: defineText(
        "prism.cancer.help",
        'PRISM IV only. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".',
      ),
    },
    {
      id: "low_risk_system",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.lowrisk", "Low-risk system of primary dysfunction"),
      required: false,
      // Blank does NOT score as normal here: it withholds the probability.
      // See the InputBase doc on this flag and the "TWO KINDS OF HONEST
      // ABSENCE" note at the top of this file.
      missingIsNotNormal: true,
      // ASKED ON THE 4-HOUR WINDOW ONLY. PRISM IV is the only model that reads
      // it, and `calculate` returns before every read of it on the other
      // window — so there it is a question with no destination.
      showWhen: { input: "collection_window", equals: ["first_4h"] },
      type: "boolean",
      helpText: defineText(
        "prism.lowrisk.help",
        'PRISM IV only: endocrine, haematologic, musculoskeletal or renal. The model\'s single protective term, and a large one. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".',
      ),
    },
  ],
  interpretation: [],
  /**
   * "not-applicable" and NOT "pending": nothing is awaiting a later pass here,
   * and "pending" asserted strata that do not exist.
   *
   * PRISM IV outputs a CONTINUOUS PROBABILITY, not a band, so it has no
   * interpretation table to author. Its published calibration tables bin by
   * PREDICTED PROBABILITY, never by score — the correct design for a model
   * carrying covariates, because one score maps to different probabilities
   * depending on them — so there is no score-to-band curve there to transcribe
   * either. And PRISM III score-only has no published severity band at all;
   * inventing one is not an option.
   *
   * Set explicitly, because on this score the silence is a decision and should
   * read as one. Same call, for the same reason, as `pim3`, `pelod2`,
   * `fluid-balance` and `four-score`.
   *
   * CLOSED PERMANENTLY, NOT PENDING FURTHER SEARCH. Re-checked 2026-08-04 and
   * the negative is confirmed across the family: no paediatric mortality model
   * publishes endorsed severity tiers; registries report unit-level SMRs with
   * funnel plots and outlier detection rather than per-patient bands; and
   * calibration papers use predicted-probability intervals for goodness-of-fit
   * only. Independently, cutting a validated continuous prediction into
   * categories is argued against on statistical grounds — Altman DG, Royston P,
   * BMJ 2006;332(7549):1080 (PMID 16675816), "unnecessary for statistical
   * analysis and has some serious drawbacks"; Royston, Altman & Sauerbrei,
   * Stat Med 2006;25:127–141. Recorded in docs/research/scores/prism.md
   * § Interpretation bands. No user-visible text changed with this note.
   */
  interpretationStatus: "not-applicable",
  /**
   * `freely-reproducible` covers what this file actually ships: the SCORE, and
   * PRISM IV's equation. It is deliberately not stretched over PRISM III's
   * mortality equations — the reason those are no longer implemented. See the
   * header, docs/research/scores/prism.md and docs/decisions/ADR-tier-b-ip.md.
   */
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The PRISM III score — the variables, their age-banded ranges and every point value — is published in full in Pollack 1996 (Figure 1) and reproduced verbatim in US patent 5,809,477 (Pollack), which shows status 'Expired - Lifetime' with an anticipated expiration of 2015-09-21. PRISM IV's coefficients are printed in Table 3 of Pollack 2016 (PMID 26492059), whose stated objective included 'placing the algorithms (Pediatric Risk of Mortality IV) in the public domain', and the authors' own network publishes a free public calculator of it. PRISM III's MORTALITY equations are a separate matter and are NOT shipped: they appear in no table of the 1996 article, that paper's author note reserves them for research use and states that non-research uses may attract compensation, and their only source is the patent's transcription, which carries known internal inconsistencies and offers no page to cite. They are not shipped here in any form, and no PRISM III probability is emitted on any window.",
  },
  /**
   * The split PRISM IV weights separately, declared so the result panel can
   * draw it. Both maxima are this score's own `formula` text: pupillary
   * reflexes 0-11 plus mental status 0-5 gives the neurologic maximum of 16,
   * and the remaining fifteen variables give 58. They sum to 74, the published
   * PRISM III maximum, which the "caps at 74" case in the test file reaches.
   */
  composition: {
    total: "prism_total",
    components: [
      { id: "neurologic_subscore", max: 16 },
      { id: "non_neurologic_subscore", max: 58 },
    ],
  },
  /**
   * THE PROBABILITY IS DOWNSTREAM OF THE SUBSCORES, AND `from` SAYS SO.
   *
   * `["neurologic_subscore", "non_neurologic_subscore"]` and never
   * `["prism_total"]`. PRISM IV does not use the total: it weights the
   * neurologic subscore at 0.197 per point and the non-neurologic at 0.163, so
   * the two halves are not interchangeable and their sum is never formed. A
   * test in this file already guards against an implementation that summed
   * first; declaring the total here would put the same error on screen, in
   * words, where a clinician would read it as fact.
   *
   * Emitted only on the 4-hour window, and only once all four covariates are
   * answered. That is why the gate on this is one-directional.
   */
  derived: {
    id: "mortality_probability",
    from: ["neurologic_subscore", "non_neurologic_subscore"],
    label: defineText("prism.derived.label", "PRISM IV mortality estimate"),
    description: defineText(
      "prism.derived.desc",
      "Derived from the two subscores above, weighted separately — 0.197 per neurologic point and 0.163 per non-neurologic point — plus age and the four admission-context answers. It is not computed from the total. The figure is the estimated probability of HOSPITAL mortality for a FIRST PICU admission, for a POPULATION: summed across a cohort it gives an expected death count, and applied to one patient it says nothing actionable.",
    ),
    caution: defineText(
      "prism.derived.caution",
      "UN-CALIBRATED FOR THIS POPULATION. Every published Gulf and Middle Eastern cohort found PRISM under-predicting death. At King Fahad Medical City in Riyadh — 4,019 admissions from the same VPS database that supplies much of the world's PRISM data — observed mortality was 6.54% against 2.50% predicted, an SMR of 2.61, and 3.96 in infants of 12 months and under. Discrimination was fine (AUC 0.81); it is calibration that failed, which is the half this number depends on. Roughly half those deaths carried a DNR order and the SMR falls to 1.52 excluding them, so much of the gap is local end-of-life practice rather than model failure — which is itself why a North American calibration does not transfer. This applies to the PRISM IV figure above, which is not exempt merely because its equation is citable.",
    ),
  },
  // `calculate`, not `compute`: validation and unit normalisation happen in the
  // defineScore wrapper, so this receives canonical, already-validated values
  // and a score author cannot forget either step (ADR-0002).
  calculate(values) {
    const ageYears = values.age.value;
    // AGE ARRIVES IN YEARS, the canonical unit, and every band is stated in
    // months or days, so the conversion back is a floating-point round trip.
    // 14 days entered as days becomes 14/365.25 years and comes back as
    // 13.999999999999998, which `< 14` accepts: a two-week-old took the
    // "0 to <14 d" PRISM IV row and was over-predicted, 78.4% against 72.1%
    // on a full case. Found by an independent recompute on 2026-08-17; the
    // existing probe at ~21 days could not see it. Snapping to a millionth
    // of a unit removes the residue and cannot move any entry a clinician
    // could make — a millionth of a day is 0.09 seconds.
    const snap = (v: number) => Math.round(v * 1e6) / 1e6;
    const ageMonths = snap(ageYears * 12);
    const ageDays = snap(ageYears * 365.25);
    const band = bandFor(ageMonths);
    const num = (v: { value: number } | undefined): number | undefined => v?.value;

    const sbp = num(values.sbp_min);
    const tempMin = num(values.temp_min);
    const tempMax = num(values.temp_max);
    const gcs = num(values.mental_status_gcs);
    const hr = num(values.hr_max);
    const phMin = num(values.ph_min);
    const phMax = num(values.ph_max);
    const tco2Min = num(values.tco2_min);
    const tco2Max = num(values.tco2_max);
    const pco2 = num(values.pco2_max);
    const pao2 = num(values.pao2_min);
    const glucose = num(values.glucose_max);
    const potassium = num(values.potassium_max);
    const creatinine = num(values.creatinine_max);
    const bun = num(values.bun_max);
    const wbc = num(values.wbc_min);
    const platelets = num(values.platelets_min);
    const pt = num(values.pt_max);
    const ptt = num(values.ptt_max);

    // Neurologic subscore: pupils and mental status only, 0-16.
    const pupilPoints =
      values.pupils.value === "both_fixed" ? 11 : values.pupils.value === "one_fixed" ? 7 : 0;
    const mentalPoints = gcs !== undefined && gcs < 8 ? 5 : 0;
    const neurologic = pupilPoints + mentalPoints;

    // Non-neurologic subscore: the other fifteen variables, 0-58.
    const nonNeurologic =
      (sbp !== undefined ? sbpPoints(band, sbp) : 0) +
      ((tempMin !== undefined && tempMin < 33) || (tempMax !== undefined && tempMax > 40.0)
        ? 3
        : 0) +
      (hr !== undefined ? heartRatePoints(band, hr) : 0) +
      acidosisPoints(phMin, tco2Min) +
      (phMax !== undefined ? alkalosisPoints(phMax) : 0) +
      (pco2 !== undefined ? (pco2 > 75.0 ? 3 : pco2 >= 50.0 ? 1 : 0) : 0) +
      (tco2Max !== undefined && tco2Max > 34.0 ? 4 : 0) +
      (pao2 !== undefined ? (pao2 < 42.0 ? 6 : pao2 <= 49.9 ? 3 : 0) : 0) +
      (glucose !== undefined && glucose > 200 ? 2 : 0) +
      (potassium !== undefined && potassium > 6.9 ? 3 : 0) +
      (creatinine !== undefined ? creatininePoints(band, creatinine) : 0) +
      (bun !== undefined ? bunPoints(band, bun) : 0) +
      (wbc !== undefined && wbc < 3000 ? 4 : 0) +
      (platelets !== undefined ? plateletPoints(platelets) : 0) +
      clottingPoints(band, pt, ptt);

    const total = neurologic + nonNeurologic;

    // The score, for every window. Nothing below this line changes it.
    const scoreValues: ScoreValue[] = [
      {
        id: "prism_total",
        label: defineText("prism.out.total", "PRISM score"),
        value: total,
        unit: "",
        precision: 0,
      },
      {
        id: "neurologic_subscore",
        label: defineText("prism.out.neuro", "Neurologic subscore (pupils + mental status)"),
        value: neurologic,
        unit: "",
        precision: 0,
      },
      {
        id: "non_neurologic_subscore",
        label: defineText("prism.out.nonneuro", "Non-neurologic subscore"),
        value: nonNeurologic,
        unit: "",
        precision: 0,
      },
    ];

    // ONE probability, from the ONE window whose equation is published and
    // citable. PRISM IV's coefficients are Table 3 of Pollack 2016. PRISM III's
    // are in no table of Pollack 1996, so the 12–24 hour window returns
    // here with three values and no fourth — an absence the result rail renders
    // as nothing, never as 0%. See the header for the full finding.
    const window = values.collection_window.value;
    if (window !== "first_4h") return scoreValues;

    /**
     * THE SECOND HONEST ABSENCE. Above, a probability is withheld because no
     * citable equation exists for the window. Here it is withheld because the
     * patient has not been fully described.
     *
     * PRISM IV takes five non-physiologic covariates. Age is one of them and
     * can never be missing — the score itself requires it. The other four are
     * these, and every one of them contributes ZERO at its reference level:
     * admitted from the operating room or post-anaesthesia care, no CPR, no
     * cancer, no low-risk system of primary dysfunction. So an implementation
     * that lets a blank fall through to the equation does not compute "without
     * that term" — it computes the REFERENCE PATIENT, and quietly returns the
     * OR/PACU curve to every clinician who left a question unanswered. That is
     * the same defect as returning one curve for everybody, wearing a
     * different hat.
     *
     * An unanswered question is therefore answered with nothing. The score,
     * the neurologic subscore and the non-neurologic subscore still render;
     * the probability simply does not exist, exactly as on the 12–24 hour
     * window. It is never zero and never an error state.
     *
     * Why not `required: true` on the four inputs instead: they are PRISM IV's
     * alone and mean nothing on the 12–24 hour window, so an unconditional
     * requirement would reject a legitimate score-only entry. The requirement
     * is conditioned on the window, which is here.
     */
    const source = values.admission_source;
    const cpr = values.cpr_24h;
    const cancer = values.cancer;
    const lowRiskSystem = values.low_risk_system;
    if (
      source === undefined ||
      cpr === undefined ||
      cancer === undefined ||
      lowRiskSystem === undefined
    ) {
      return scoreValues;
    }

    const logit =
      -5.776 +
      // PRISM IV's own age categories, which are NOT the PRISM III bands:
      // it splits the first month at 14 days, where PRISM III has one
      // neonate band. Expressed in days so the 14-day boundary is exact
      // rather than a converted fraction of a month — exact only once the
      // round-trip residue is snapped off; see the age derivation above.
      (ageDays < 14 ? 1.311 : ageMonths < 1 ? 0.968 : ageMonths < 12 ? 0.357 : 0) +
      (source.value === "another_hospital"
        ? 1.012
        : source.value === "inpatient"
          ? 1.626
          : source.value === "ed"
            ? 0.693
            : 0) +
      (cpr.value ? 1.082 : 0) +
      (cancer.value ? 0.766 : 0) +
      (lowRiskSystem.value ? -1.697 : 0) +
      0.197 * neurologic +
      0.163 * nonNeurologic;

    return [
      ...scoreValues,
      {
        id: "mortality_probability",
        label: defineText(
          "prism.out.mortality4",
          "PRISM IV predicted hospital mortality, first PICU admission (population estimate)",
        ),
        value: logistic(logit) * 100,
        unit: "%",
        precision: 2,
      },
    ];
  },
  cautions: [
    defineText(
      "prism.caution.gulf",
      "Use the PRISM SCORE for severity and case-mix description, which is what it is good for here, and treat any PRISM mortality probability as uncalibrated for this region until it has been locally recalibrated. The Saudi findings behind that sit with the estimate itself, under the number they are about, rather than being repeated here.",
    ),
  ],

  formula: defineText(
    "prism.formula",
    "One physiologic score, one published mortality model. Choose the model by the data you collected, not by the output you want. PRISM IV covers the first 4 hours of PICU care, with laboratory values from 2 hours before admission through the first 4 hours (Pollack 2013), and gives the score and a mortality probability. PRISM III covers the first 12 or 24 hours and gives the score and its subscores only, with no probability. The 12- and 24-hour collections are one option here because the score arithmetic is identical for both. What the literature calls PRISM III-12 and PRISM III-24 are two mortality models this platform does not ship. A longer window catches more extreme values and so runs higher, so hold the collection period constant within any series and record which one was used. " +
      "Seventeen variables are scored against age-banded thresholds and summed, 0 to 74, decomposing into a neurologic subscore (pupillary reflexes 0 to 11 plus mental status 0 to 5, maximum 16) and a non-neurologic subscore (the other fifteen variables, maximum 58). The age bands are neonate under 1 month, infant 1 to under 12 months, child 12 months to under 12 years, and adolescent 12 years and over. Enter the single most abnormal value reached inside the window for each variable. Several row shapes are easy to get wrong. Acidosis is one row satisfied by either the lowest pH or the lowest total CO₂, scored once at the worse tier, while the highest pH is a separate row, so a pH swinging from 6.9 to 7.6 scores on both. Total CO₂ likewise scores once at the low end and again at the high end. Prothrombin and partial thromboplastin time share a single row, scored once even when both qualify. Both pupils fixed, each larger than 3 mm, is the heaviest single item at 11 points. Enter the Glasgow Coma Scale only for known or suspected acute CNS disease, and never within 2 hours of sedation, paralysis or anaesthesia. Correct whole-blood chemistry before entry: glucose up by 10%, potassium by 0.4 mmol/L. Blank components score zero, so a partially entered score reads lower than the patient is. " +
      "The PRISM IV probability is not computed from the total. It weights the neurologic subscore at 0.197 per point and the non-neurologic subscore at 0.163 per point, then adds age, admission source (operating room or post-anaesthesia care is the reference, and unplanned inpatient deterioration is the heaviest), CPR in the prior 24 hours, cancer, and low-risk system of primary dysfunction (endocrine, haematologic, musculoskeletal or renal, the model’s one protective term), and finishes with P = 1 / (1 + e^-R). That gives the estimated hospital mortality for a first PICU admission. The probability appears only when all four admission-context questions have been answered; a blank withholds it rather than assuming the reference patient.",
  ),
  notes: defineText(
    "prism.notes",
    "PRISM is a case-mix and benchmarking instrument for groups of patients, not a bedside prognosis for the child in front of you. " +
      "PRISM III shows no probability because Pollack 1996 prints the full score sheet and no regression coefficients, and the author note reserves the mortality equations for research use. The authors’ own network (CPCCRN) ships a score-only PRISM III calculator, which this implementation matches. PRISM IV’s coefficients, by contrast, were published with the stated objective of placing the algorithm in the public domain (Pollack 2016). " +
      "Regional calibration. In the largest Saudi cohort (Riyadh, n = 4,019 admissions) PRISM III under-predicted death: SMR 2.61 overall, 3.96 in infants of 12 months and under, and 1.52 after excluding DNR patients, with AUC 0.81. Discrimination travels between populations; calibration frequently does not. Use the score for severity and case-mix description, and treat any PRISM mortality probability as uncalibrated for this region until it has been locally recalibrated. These evaluations cover PRISM III, not PRISM IV. " +
      "Known source defects, handled explicitly. The patent’s neonate heart-rate band appears to carry an OCR error, printing 215-255 against a >225 cutoff; 215 to 225 is used here, following an independent reproduction. The glucose row prints 200 mg/dL and 11.0 mmol/L as if equivalent, and the mg/dL limb is authoritative: 200 mg/dL is 11.1 mmol/L. [NEEDS SOURCE]: no published worked example exists for either model, so the test fixtures were constructed from the threshold table, and round-trip reconciliation against the CPCCRN calculators is pending.",
  ),
  references: [
    {
      citation:
        "Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752.",
      pmid: "8706448",
      note: "The derivation paper, and the source of the score. It publishes the score sheet in full (Figure 1) and NO regression coefficients: its eight tables were enumerated against the full text and Table 3, the one the Results section points to for the risk-factor models, compares model fit (chi-square, df, AIC, AUC, Hosmer-Lemeshow) rather than listing coefficients. There is no supplement. Its author note reserves the mortality equations for research use and states that non-research uses may attract compensation.",
    },
    {
      citation:
        "Pollack MM, Holubkov R, Funai T, et al. The Pediatric Risk of Mortality Score: Update 2015. Pediatr Crit Care Med. 2016;17(1):2-9.",
      pmid: "26492059",
      doi: "10.1097/PCC.0000000000000558",
      note: "PRISM IV. Source of the subscore split and every coefficient in Table 3. Its stated objective included placing the algorithms in the public domain.",
    },
    {
      citation:
        "Pollack MM. Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care. US patent 5,809,477. 1998.",
      url: "https://patents.google.com/patent/US5809477A/en",
      note: "Primary source for the full PRISM III threshold table and the scoring notes quoted in the help text — the parts of the score the 1996 paper also publishes. Status: Expired - Lifetime, anticipated expiration 2015-09-21. It also states mortality equations the paper does not, but those are NOT implemented: the document is a single source for them, its transcription carries known internal inconsistencies, and it offers no page or table to cite.",
    },
    {
      citation: "Collaborative Pediatric Critical Care Research Network. PRISM IV calculator.",
      url: "https://www.cpccrn.org/calculators/prismivcalculator/",
      note: "The authors' own implementation, and the natural oracle for reconciling this one. Input and output sets read 2026-08-03: its input list matches Table 3 of Pollack 2016 one-to-one — same variables, same categories, same reference levels — and its reference age band tops out at 18 years. No case has been round-tripped through it, so the constructed fixtures here remain unreconciled against it.",
    },
    {
      citation: "Collaborative Pediatric Critical Care Research Network. PRISM III calculator.",
      url: "https://www.cpccrn.org/calculators/prismiiicalculator/",
      note: "Retrieved 2026-08-03. Takes the 17 physiologic variables and an age band and returns SCORE, NEUROLOGIC and NON-NEUROLOGIC — no mortality, and it collects no risk factors with which to produce one. Pollack's own network had the coefficients and shipped the score without them, which is the practice this calculator now matches.",
    },
    // Regional calibration, added 2026-08-04. The first evaluated PRISM III in
    // the Gulf; the second is a PIM3 study, cited because `notes` states its
    // figures and every figure this page states must resolve to a source.
    {
      citation:
        "Alkhalifah AS, AlSoqati A, Zahraa J. Performance of pediatric risk of mortality III and pediatric index of mortality scores in a tertiary pediatric intensive care unit in Saudi Arabia. Front Pediatr. 2022;10:926686.",
      doi: "10.3389/fped.2022.926686",
      note: "King Fahad Medical City, Riyadh; n = 3396, children under 14. Its conclusion for the models it evaluated was 'sufficient discrimination ability and poor calibration', with the worst calibration AND discrimination in infants under 12 months. PRISM III discriminated best in the 60-120-month band (AUC 0.87). It evaluated PRISM III, not PRISM IV.",
    },
    {
      citation:
        "Malhotra D, Nour N, El Halik M, Zidan M. Performance of Pediatric Index of Mortality 3 score in a tertiary pediatric ICU in Dubai. Dubai Med J. 2019;3(1):19–25.",
      doi: "10.1159/000505205",
      note: "A PIM3 evaluation, not a PRISM one, and cited here for that reason explicitly. Latifa Hospital, Dubai; n = 583, 46 deaths (7.9%). Stable findings: AUC 0.78 (95% CI 0.69-0.87), overall SMR 0.53, and SMR 2.1 in sepsis. Its predicted-probability strata contradict each other and are carried as unstable: SMR 2.67 in the 1-5% band against SMR 0.33 below a predicted probability of 14.3% and 0.72 above it, so the same paper shows under-prediction and over-prediction in the same low range depending on where the bands are cut. It is the second Gulf data point for the pattern that does hold — discrimination survives the move between populations, calibration does not — which is why this page carries it alongside the Riyadh series rather than only naming its own model.",
    },
    {
      citation:
        "Pollack MM, Dean JM, Butler J, et al. The ideal time interval for critical care severity-of-illness assessment. Pediatr Crit Care Med. 2013;14(5):448-453.",
      pmid: "23628831",
      note: "Source of the PRISM IV collection window this calculator states on the window field: physiologic variables from the first 4 hours of PICU care only, laboratory variables from 2 hours BEFORE admission through the first 4 hours. Added 2026-08-09, when that text was rewritten - the split was already being described on screen without naming where it came from. It is also the citation the authors' own CPCCRN calculators print beneath the same sentence.",
    },
    {
      citation:
        "Alkhalifah AS, AlSoqati A, Zahraa J. Performance of Pediatric Risk of Mortality III and Pediatric Index of Mortality III Scores in Tertiary Pediatric Intensive Unit in Saudi Arabia. Front Pediatr. 2022;10:926686.",
      pmid: "35874581",
      doi: "10.3389/fped.2022.926686",
      note: "FIRST-HAND — every figure below is taken from the paper itself (PMC9300935), not from a summary of it. 4,019 admissions across 2,620 patients at King Fahad Medical City, Riyadh, 2015-2019, drawn from the Virtual Pediatric Systems database. PRISM III SMR 2.61 (2.44-2.79) against PIM III 2.75; observed mortality 6.54% against 2.50% predicted; AUC-ROC 0.81 (0.79-0.84), rising to 0.87 (0.84-0.90) once DNR patients are excluded; SMR 3.96 (3.16-4.76) in infants 12 months and under; SMR 1.52 (1.24-1.80) excluding DNR. Authors' conclusion, quoted: 'Both models showed adequate discrimination ability, but poor calibration.'",
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
  ],
});
