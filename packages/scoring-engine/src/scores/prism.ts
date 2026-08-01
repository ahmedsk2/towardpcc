import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { ageInYears } from "../units/age";
import { creatinineMgdl } from "../units/concentration";
import { electrolyteMeqL } from "../units/electrolytes";
import { bunMgdl, glucoseMgdl } from "../units/osmolytes";
import { mmhgWithKpa } from "../units/pressure";
import type { UnitSpec } from "../units/types";

/**
 * PRISM III and PRISM IV — Pediatric Risk of Mortality, in one calculator.
 *
 * They are combined here because they are not two scores. PRISM IV reuses PRISM
 * III's physiologic variables and thresholds unchanged — Pollack 2016 states
 * that "the PRISM score for physiologic variables and their ranges did not
 * change" — and revises three other things: the collection window, the outcome
 * definition, and the mortality equation. So one set of physiologic entries
 * yields one score, and the window decides which published equation turns that
 * score into a probability.
 *
 * The equations differ in shape, not only in coefficients. PRISM III's
 * score-only models are quadratic in the TOTAL. PRISM IV does not use the total
 * at all: it splits the score into a neurologic subscore (pupils + mental
 * status, 0-16) and a non-neurologic subscore (the other 15 variables, 0-58),
 * weights them separately at 0.197 and 0.163 per point — a deliberate finding
 * that neurologic derangement carries more per point — and adds five
 * non-physiologic terms.
 *
 * SOURCES. The complete PRISM III threshold table and all six of its mortality
 * equations are reproduced verbatim in US patent 5809477A, whose inventor is
 * the score's author, which bypasses the paywalled 1996 paper. PRISM IV's
 * coefficients are Table 3 of Pollack 2016.
 *
 * INTELLECTUAL PROPERTY. The received wisdom that PRISM III is licence-only is
 * stale: US5809477A shows status "Expired - Lifetime" with an anticipated
 * expiration of 2015-09-21, and the PRISM IV abstract states the authors'
 * objective included "placing the algorithms (Pediatric Risk of Mortality IV)
 * in the public domain". See docs/decisions/ADR-tier-b-ip.md, which recorded
 * the earlier and more cautious reading.
 *
 * NO PUBLISHED WORKED EXAMPLE EXISTS for either model — not in the 1996 paper,
 * the 2016 paper, the patent, or any secondary source. The cases in the test
 * file were constructed from the threshold table and are labelled as such. The
 * natural oracle would be the authors' own CPCCRN calculators; they returned
 * HTTP 503 behind a rate-limit on every attempt, both during research and at
 * implementation. [NEEDS SOURCE] until one of them can be reached and
 * reconciled.
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
      label: defineText("prism.window", "Data collection window"),
      required: true,
      type: "categorical",
      options: [
        {
          value: "first_4h",
          label: defineText("prism.window.4", "First 4 hours of PICU care (PRISM IV)"),
        },
        {
          value: "first_12h",
          label: defineText("prism.window.12", "First 12 hours of PICU care (PRISM III-12)"),
        },
        {
          value: "first_24h",
          label: defineText("prism.window.24", "First 24 hours of PICU care (PRISM III-24)"),
        },
      ],
      helpText: defineText(
        "prism.window.help",
        "The window decides which published equation applies, so it is asked rather than assumed. PRISM IV uses the first 4 hours (laboratory values from 2 hours before admission through hour 4); PRISM III was derived on 12- and 24-hour windows. No probability is shown for a model whose window you did not collect — there is no published equation for PRISM III at 4 hours, and inventing one would be fabrication.",
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
        "Above 200 mg/dL scores 2. A whole-blood value should be increased by 10% before scoring.",
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
      helpText: defineText("prism.creat.help", "Age-banded; infant and child share one cutoff."),
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
    {
      id: "admission_source",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.source", "Admission source"),
      required: false,
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
        "PRISM IV only. Operating room or post-anaesthesia care is the reference category; an unplanned deterioration on an inpatient unit carries the heaviest weight of the four.",
      ),
    },
    {
      id: "cpr_24h",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.cpr", "CPR within 24 hours before admission"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "prism.cpr.help",
        "PRISM IV only. Cardiopulmonary resuscitation in the 24 hours preceding PICU admission.",
      ),
    },
    {
      id: "cancer",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.cancer", "Cancer, acute or chronic"),
      required: false,
      type: "boolean",
      helpText: defineText("prism.cancer.help", "PRISM IV only."),
    },
    {
      id: "low_risk_system",
      group: defineText("prism.group.admission-context", "Admission context"),
      label: defineText("prism.lowrisk", "Low-risk system of primary dysfunction"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "prism.lowrisk.help",
        "PRISM IV only: endocrine, haematologic, musculoskeletal or renal. The model's single protective term, and a large one.",
      ),
    },
  ],
  interpretation: [],
  // Bands are a CONTENT GAP here, not an absence by design: this score has
  // published mortality strata and they have not been authored yet. Saying so
  // is the difference between "no band applies" and "we have not written one".
  interpretationStatus: "pending",
  /**
   * The patent is expired and PRISM IV was placed in the public domain by its
   * authors, both verified rather than assumed — see the header and
   * docs/decisions/ADR-tier-b-ip.md, which recorded the earlier, more cautious
   * reading before either fact was checked.
   */
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "US patent 5,809,477 (Pollack), which reproduces the complete PRISM III table and all six mortality equations, shows status 'Expired - Lifetime' with an anticipated expiration of 2015-09-21. The PRISM IV abstract (Pollack 2016, PMID 26492059) states the work's objective included 'placing the algorithms (Pediatric Risk of Mortality IV) in the public domain', and the authors' own network publishes a free public calculator. The widely repeated claim that PRISM III is available only under licence predates the patent's expiry.",
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
  // `calculate`, not `compute`: validation and unit normalisation happen in the
  // defineScore wrapper, so this receives canonical, already-validated values
  // and a score author cannot forget either step (ADR-0002).
  calculate(values) {
    const ageYears = values.age.value;
    const ageMonths = ageYears * 12;
    const ageDays = ageYears * 365.25;
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

    // One probability, from the equation whose window was actually collected.
    // PRISM III has no published 4-hour equation and PRISM IV none for 12 or 24
    // hours, so the alternative would be presenting a number off its own window.
    const window = values.collection_window.value;
    let mortality: number;
    if (window === "first_4h") {
      const source = values.admission_source?.value;
      const logit =
        -5.776 +
        // PRISM IV's own age categories, which are NOT the PRISM III bands:
        // it splits the first month at 14 days, where PRISM III has one
        // neonate band. Expressed in days so the 14-day boundary is exact
        // rather than a converted fraction of a month.
        (ageDays < 14 ? 1.311 : ageMonths < 1 ? 0.968 : ageMonths < 12 ? 0.357 : 0) +
        (source === "another_hospital"
          ? 1.012
          : source === "inpatient"
            ? 1.626
            : source === "ed"
              ? 0.693
              : 0) +
        (values.cpr_24h?.value ? 1.082 : 0) +
        (values.cancer?.value ? 0.766 : 0) +
        (values.low_risk_system?.value ? -1.697 : 0) +
        0.197 * neurologic +
        0.163 * nonNeurologic;
      mortality = logistic(logit);
    } else if (window === "first_12h") {
      mortality = logistic(-5.5434 + 0.3441 * total - 0.00267 * total * total);
    } else {
      mortality = logistic(-6.0396 + 0.3544 * total - 0.00304 * total * total);
    }

    return [
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
      {
        id: "mortality_probability",
        // One id per string. A single id carrying three different texts would
        // corrupt the i18n scaffold, which keys translations by that id.
        label:
          window === "first_4h"
            ? defineText(
                "prism.out.mortality4",
                "PRISM IV predicted mortality (population estimate)",
              )
            : window === "first_12h"
              ? defineText(
                  "prism.out.mortality12",
                  "PRISM III-12 predicted mortality (population estimate)",
                )
              : defineText(
                  "prism.out.mortality24",
                  "PRISM III-24 predicted mortality (population estimate)",
                ),
        value: mortality * 100,
        unit: "%",
        precision: 2,
      },
    ];
  },
  formula: defineText(
    "prism.formula",
    "One physiologic score, two published mortality models. Seventeen variables are scored against age-banded thresholds and summed: 0 to 74, decomposing into a neurologic subscore (pupillary reflexes 0-11 plus mental status 0-5, maximum 16) and a non-neurologic subscore (the remaining fifteen variables, maximum 58). Several rows have shapes that are easy to get wrong. Acidosis is one row satisfied by either the lowest pH or the lowest total CO₂, awarded once at the worse tier. The highest pH is a separate row, so a patient whose pH swung from 6.9 to 7.6 scores on both. Total CO₂ likewise scores once at the low end and again at the high end. Prothrombin and partial thromboplastin time share a single row. PRISM III turns the total into a probability with a quadratic logistic equation, one for the 12-hour window and one for 24 hours. PRISM IV does not use the total: it weights the neurologic subscore at 0.197 per point and the non-neurologic at 0.163, and adds age, admission source, pre-admission CPR, cancer and low-risk system of primary dysfunction. Both finish with P = 1 / (1 + e^-R).",
  ),
  notes: defineText(
    "prism.notes",
    "PRISM estimates mortality risk for a POPULATION and is a case-mix and benchmarking instrument, not a bedside prognosis for the child in front of you. Summed across a cohort it gives an expected death count for a standardised mortality ratio; applied to one patient it says nothing actionable. PRISM III was derived on 1990s data and over-predicts substantially in modern cohorts, which is why PRISM IV was recalibrated on the 2011-2013 TOPICC cohort. The size of that gap is worth seeing rather than being told: the PRISM III-12 equation crosses 50% at a score of about 19 and reaches 96% by 35, while PRISM IV puts the same physiology near 52%. Both are implemented exactly as published — the divergence is the recalibration, not an error — but it means a PRISM III figure should not be read as a current estimate of anything. Where both are available, PRISM IV is the current model and PRISM III the historical comparator. The collection windows differ and are not interchangeable — PRISM IV uses the first 4 hours of PICU care with laboratory values from 2 hours before admission, PRISM III the first 12 or 24 hours — so this calculator asks which you collected and shows only the equation that matches it. Blank components score zero, so a partially entered score reads lower than the patient is. Mental status should be entered only for known or suspected acute CNS disease, and not within 2 hours of sedation, paralysis or anaesthesia. Whole-blood chemistry needs correcting before entry: glucose up by 10%, sodium by 3 mmol/L, potassium by 0.4 mmol/L. [NEEDS SOURCE]: no published worked example exists for either model, so the test cases were constructed from the threshold table and verified by arithmetic rather than against a published case; the authors' own CPCCRN calculators would be the natural oracle but returned HTTP 503 behind a rate limit at every attempt. The patent's printed neonate heart-rate band appears to contain an OCR error (215-255 against a >225 cutoff on the next line) and 215-225 is used here, following an independent reproduction. The glucose row prints 200 mg/dL and 11.0 mmol/L as if equivalent when 200 mg/dL is 11.1 mmol/L; the mg/dL limb is authoritative here. PRISM III's full eight-covariate equations are published but not implemented: they need admission-context variables this calculator does not collect, and the score-only quadratic model is the one that matches what is entered.",
  ),
  references: [
    {
      citation:
        "Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752.",
      pmid: "8706448",
      note: "The derivation paper. Paywalled; the complete threshold table and all six mortality equations are reproduced verbatim in the patent below, whose inventor is this paper's first author.",
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
      note: "Primary source for the full PRISM III threshold table, the scoring notes quoted in the help text, and all six mortality equations. Status: Expired - Lifetime, anticipated expiration 2015-09-21.",
    },
    {
      citation: "Collaborative Pediatric Critical Care Research Network. PRISM IV calculator.",
      url: "https://www.cpccrn.org/calculators/prismivcalculator/",
      note: "The authors' own implementation, and the natural oracle for reconciling this one. Returned HTTP 503 behind a rate limit at every attempt during research and implementation; not yet reconciled.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-31",
      reason: "initial-release",
      summary:
        "PRISM III and PRISM IV as one calculator: one physiologic score, and the mortality equation matching the collection window.",
    },
  ],
});
