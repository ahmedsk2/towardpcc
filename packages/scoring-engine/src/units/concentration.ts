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

/** Serum creatinine: canonical mg/dL, accepts µmol/L. */
export const creatinineMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [umolPerLForCreatinine],
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

/** Total bilirubin: canonical mg/dL, accepts µmol/L. */
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

/** Blood lactate: canonical mmol/L, accepts mg/dL. */
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
