import type { UnitConversion, UnitSpec } from "./types";

/**
 * Clinical concentration units where the pSOFA / SOFA thresholds are specified
 * in mg/dL but labs frequently report SI (µmol/L). Conversion factors are the
 * standard molar-mass-derived clinical factors reproduced in
 * docs/research/scores/psofa.md (creatinine ÷88.42, bilirubin ÷17.104).
 */

/**
 * Creatinine: molar mass 113.12 g/mol ⇒ 1 mg/dL = 88.42 µmol/L.
 * µmol/L → mg/dL divides by 88.42 (psofa.md "Inputs" conversions).
 */
export const CREATININE_UMOL_PER_MGDL = 88.42;

export const umolPerLForCreatinine: UnitConversion = {
  unit: "µmol/L",
  toCanonical: (umol) => umol / CREATININE_UMOL_PER_MGDL,
  fromCanonical: (mgdl) => mgdl * CREATININE_UMOL_PER_MGDL,
};

/**
 * Serum creatinine: canonical mg/dL, accepts µmol/L.
 *
 * `canonicalDecimals: 2` — serum creatinine is reported to two decimals in
 * mg/dL by clinical convention, and every mg/dL cut point these scores apply is
 * stated at one or two decimals (KDIGO 0.3 / 4.0; pSOFA age bands 0.3 … 5.0;
 * PRISM 0.85 / 0.9 / 1.3). Two decimals is therefore the measurement's real
 * precision in this unit, not a number tuned to a threshold.
 *
 * It is also the fix for a threshold-boundary defect on the µmol/L path. KDIGO
 * Table 2 PRINTS its own SI equivalents — "≥0.3 mg/dL (≥26.5 µmol/L)" and
 * "increase in SCr to ≥4.0 mg/dL (≥353.6 µmol/L)" (kdigo-aki.md §Step 1;
 * corroborated by the Merck reproduction at 26.52 / 353.60). Unrounded, the
 * guideline's own 353.6 µmol/L converts to 3.999095 mg/dL and FAILS `>= 4.0`,
 * staging a Stage-3 creatinine as Stage 1. At two decimals it converts to 4.00
 * and stages correctly, while a genuinely sub-threshold 349.3 µmol/L still
 * converts to 3.95 and correctly does not cross. Same for the rise criterion:
 * a 26.5 µmol/L rise resolves to a 0.30 mg/dL rise.
 *
 * Rounding applies only to a µmol/L entry; an mg/dL entry is the clinician's
 * own figure and is passed through untouched (see UnitSpec.canonicalDecimals).
 */
export const creatinineMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [umolPerLForCreatinine],
  canonicalDecimals: 2,
};

/**
 * Total bilirubin: molar mass 584.66 g/mol ⇒ 1 mg/dL = 17.104 µmol/L.
 * µmol/L → mg/dL divides by 17.104 (psofa.md "Inputs" conversions).
 */
export const BILIRUBIN_UMOL_PER_MGDL = 17.104;

export const umolPerLForBilirubin: UnitConversion = {
  unit: "µmol/L",
  toCanonical: (umol) => umol / BILIRUBIN_UMOL_PER_MGDL,
  fromCanonical: (mgdl) => mgdl * BILIRUBIN_UMOL_PER_MGDL,
};

/**
 * Total bilirubin: canonical mg/dL, accepts µmol/L.
 *
 * Deliberately NO `canonicalDecimals`. pSOFA states its hepatic bands in mg/dL
 * only and supplies a conversion FACTOR ("to convert to µmol/L, multiply by
 * 17.104"), not a printed µmol/L cut point (psofa.md §3 Hepatic + §Inputs) —
 * unlike KDIGO, which prints its SI equivalents as thresholds. So 34.2 µmol/L
 * is an arithmetic conversion of 2 mg/dL that nobody published, and 34.2 ÷
 * 17.104 = 1.99953 mg/dL is genuinely below the 2.0 band. Rounding it up to
 * 2.0 would move a real measurement into a worse subscore to satisfy a number
 * no source states. See units/concentration.test.ts, which pins that.
 */
export const bilirubinMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [umolPerLForBilirubin],
};

/**
 * Lactate: molar mass ≈ 90.08 g/mol ⇒ 1 mmol/L = 90.08 mg/L = 9.008 mg/dL,
 * rounded to 9.01 by clinical convention (the factor cited in
 * docs/research/scores/phoenix.md "Unit-conversion reference values").
 * The Phoenix cardiovascular thresholds are specified in mmol/L, so mmol/L is
 * canonical and mg/dL is the accepted alternate.
 */
export const LACTATE_MGDL_PER_MMOL = 9.01;

export const mgdlPerLForLactate: UnitConversion = {
  unit: "mg/dL",
  toCanonical: (mgdl) => mgdl / LACTATE_MGDL_PER_MMOL,
  fromCanonical: (mmol) => mmol * LACTATE_MGDL_PER_MMOL,
};

/**
 * Blood lactate: canonical mmol/L, accepts mg/dL.
 *
 * Deliberately NO `canonicalDecimals`. Both scores that use it state their
 * lactate bands in mmol/L only and neither prints an mg/dL equivalent —
 * phoenix.md says the ×9.01 factor is a "general lab convention, not published
 * in the Phoenix paper", and pelod2.md says the same of its conversions. So
 * 45 mg/dL is not a published restatement of the 5 mmol/L cut point (5 mmol/L
 * is 45.05 mg/dL); 45 ÷ 9.01 = 4.9945 mmol/L is genuinely below 5, and rounding
 * it up would add a cardiovascular point to a real measurement that does not
 * meet the published threshold. See units/concentration.test.ts.
 */
export const lactateMmol: UnitSpec = {
  canonical: "mmol/L",
  alternates: [mgdlPerLForLactate],
};

/**
 * Fibrinogen: 100 mg/dL = 1 g/L (mg/dL → g/L is ×0.01; phoenix.md
 * "Unit-conversion reference values"). Phoenix specifies the threshold in
 * mg/dL, so mg/dL is canonical and g/L is the accepted alternate.
 */
export const gPerLForFibrinogen: UnitConversion = {
  unit: "g/L",
  toCanonical: (gL) => gL * 100,
  fromCanonical: (mgdl) => mgdl / 100,
};

/** Fibrinogen: canonical mg/dL, accepts g/L. */
export const fibrinogenMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [gPerLForFibrinogen],
};

/**
 * D-dimer, in fibrinogen-equivalent units. Phoenix states its threshold as
 * > 2 mg/L FEU, so mg/L FEU is canonical.
 *
 * WHY THE ALTERNATES EARN THEIR KEEP HERE MORE THAN ELSEWHERE. FEU reporting is
 * not standardised across laboratories: the same sample is issued as 2.5 mg/L
 * FEU, 2.5 µg/mL FEU or 2500 ng/mL FEU depending on the analyser. The first two
 * are numerically identical; the third is a THOUSAND-fold apart. A clinician
 * copying a ng/mL figure into a field expecting mg/L enters 2500 for a value of
 * 2.5 — and 2.5 crosses the 1-point threshold while 2500 does not even look
 * like a plausible D-dimer.
 *
 * The input's own 50 mg/L ceiling was already written as a guard against
 * exactly that, and it works: 2500 is refused. But refusing is a blunt answer
 * to a question the unit system can answer exactly, and it fails in the
 * dangerous direction for values that land INSIDE the range — 40 000 ng/mL FEU
 * would be rejected, while a genuine 40 mg/L would not, and a laboratory
 * reporting 1500 ng/mL FEU (a real 1.5 mg/L, below threshold) is refused
 * outright with no hint that the unit is the problem.
 *
 * µg/mL FEU is 1:1 with mg/L FEU. It is listed rather than left implicit
 * because a clinician holding a report that says µg/mL should not have to
 * satisfy themselves that the two are the same before typing a number into a
 * field labelled with the other one.
 */
export const ngPerMlFeuForDdimer: UnitConversion = {
  unit: "ng/mL FEU",
  toCanonical: (ngml) => ngml / 1000,
  fromCanonical: (mgl) => mgl * 1000,
};

/** µg/mL FEU and mg/L FEU are the same quantity; listed to spare the reader the conversion. */
export const ugPerMlFeuForDdimer: UnitConversion = {
  unit: "µg/mL FEU",
  toCanonical: (ugml) => ugml,
  fromCanonical: (mgl) => mgl,
};

/** D-dimer: canonical mg/L FEU, accepts ng/mL FEU (x1000) and µg/mL FEU (1:1). */
export const ddimerMgLFeu: UnitSpec = {
  canonical: "mg/L FEU",
  alternates: [ngPerMlFeuForDdimer, ugPerMlFeuForDdimer],
};

/**
 * Creatinine — SI orientation. PELOD-2 states its renal cutoffs in µmol/L
 * (Leteurtre 2013, Table 6 / Table 2), so scores that follow the paper's SI
 * units need a µmol/L-canonical creatinine spec — the inverse orientation of
 * `creatinineMgdl` above. Factor 88.4 µmol/L per mg/dL (molar mass 113.12 g/mol),
 * the standard clinical factor in docs/research/scores/pelod2.md (§Inputs).
 */
export const UMOL_PER_L_PER_MGDL_CREATININE = 88.4;

export const mgdlForCreatinine: UnitConversion = {
  unit: "mg/dL",
  toCanonical: (mgdl) => mgdl * UMOL_PER_L_PER_MGDL_CREATININE,
  fromCanonical: (umol) => umol / UMOL_PER_L_PER_MGDL_CREATININE,
};

/** Serum creatinine (SI orientation): canonical µmol/L, accepts mg/dL. */
export const creatinineUmolWithMgdl: UnitSpec = {
  canonical: "µmol/L",
  alternates: [mgdlForCreatinine],
};
