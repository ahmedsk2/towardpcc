import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { bilirubinMgdl, creatinineMgdl } from "../units/concentration";
import { fractionWithPercent } from "../units/fraction";
import { mmhgWithKpa } from "../units/pressure";
import type { UnitSpec } from "../units/types";
import { NO_UNIT } from "../units/types";

/**
 * pSOFA — Pediatric Sequential Organ Failure Assessment (Matics &
 * Sanchez-Pinto, JAMA Pediatr 2017; PMID 28783810). Six organ subscores
 * (0–4) summed to a 0–24 total. Cardiovascular and renal thresholds are
 * age-adjusted; respiratory uses PaO₂:FiO₂ when a PaO₂ is available, else
 * SpO₂:FiO₂ (SpO₂ ≤97% only). Research + full sourcing:
 * docs/research/scores/psofa.md.
 */

interface AgeBand {
  /** MAP (mmHg) at/above which cardiovascular subscore is 0 (else 1). */
  readonly mapMin: number;
  /**
   * Serum creatinine (mg/dL) lower cut points [S1, S2, S3, S4]:
   * cr < S1 → 0, [S1,S2) → 1, [S2,S3) → 2, [S3,S4) → 3, cr ≥ S4 → 4.
   */
  readonly creatinineCuts: readonly [number, number, number, number];
}

/**
 * Age-adjusted cardiovascular-MAP and renal-creatinine thresholds by age band
 * (Matics 2017, Table 1). Returning literal objects (no array indexing) keeps
 * the lookup total and type-safe under noUncheckedIndexedAccess.
 */
function ageBand(ageMonths: number): AgeBand {
  if (ageMonths < 1) return { mapMin: 46, creatinineCuts: [0.8, 1.0, 1.2, 1.6] }; // <1 month
  if (ageMonths < 12) return { mapMin: 55, creatinineCuts: [0.3, 0.5, 0.8, 1.2] }; // 1–11 months
  if (ageMonths < 24) return { mapMin: 60, creatinineCuts: [0.4, 0.6, 1.1, 1.5] }; // 12–23 months
  if (ageMonths < 60) return { mapMin: 62, creatinineCuts: [0.6, 0.9, 1.6, 2.3] }; // 24–59 months
  if (ageMonths < 144) return { mapMin: 65, creatinineCuts: [0.7, 1.1, 1.8, 2.6] }; // 60–143 months
  if (ageMonths <= 216) return { mapMin: 67, creatinineCuts: [1.0, 1.7, 2.9, 4.2] }; // 144–216 months
  return { mapMin: 70, creatinineCuts: [1.2, 2.0, 3.5, 5.0] }; // >216 months
}

/**
 * Respiratory subscore from the PaO₂:FiO₂ ratio. Subscores 3–4 require
 * respiratory support; a ratio in a 3/4 band without support is capped at 2
 * (the highest non-support band) — an implementation convention, NOT paper
 * text (psofa.md Limitations [NEEDS SOURCE]).
 */
function respiratoryFromPf(pf: number, support: boolean): number {
  if (pf >= 400) return 0;
  if (pf >= 300) return 1; // 300–399
  if (pf >= 200) return 2; // 200–299
  if (!support) return 2; // capping convention, not cited (psofa.md [NEEDS SOURCE])
  if (pf >= 100) return 3; // 100–199 with support
  return 4; // <100 with support
}

/**
 * Respiratory subscore from the SpO₂:FiO₂ ratio. The published bands share
 * endpoint values (264); at an exact boundary the higher (worse) subscore is
 * assigned — a worst-value convention, not paper text (psofa.md Limitations).
 * Subscores 3–4 require respiratory support; otherwise capped at 2.
 */
function respiratoryFromSf(sf: number, support: boolean): number {
  if (sf >= 292) return 0;
  if (sf > 264) return 1; // 264–291 (264 exact → higher band, below)
  if (sf >= 221) return 2; // 221–264
  if (!support) return 2; // capping convention, not cited (psofa.md [NEEDS SOURCE])
  if (sf >= 148) return 3; // 148–220 with support
  return 4; // <148 with support
}

const monthsUnit: UnitSpec = { canonical: "months" };
/**
 * Blood pressure — mmHg only, deliberately. kPa is a blood-GAS convention; no
 * bedside monitor reports a mean arterial pressure in kPa, so an alternate here
 * would invite a unit that is never entered. The PaO₂ input above uses the
 * shared `mmhgWithKpa` spec instead, which is the distinction: tension vs
 * pressure, not one score vs another.
 */
const mmHgUnit: UnitSpec = { canonical: "mmHg" };
const vasoactiveUnit: UnitSpec = { canonical: "µg/kg/min" };
// ×10³/µL is numerically equal to ×10⁹/L (psofa.md conversions), so the alternate
// is a pure identity. One shared identity fn serves both directions: only
// toCanonical runs in the compute path, so a separate fromCanonical arrow would be
// never-invoked dead code (validation only ever converts input → canonical).
const identityCount = (v: number) => v;
const plateletUnit: UnitSpec = {
  canonical: "10^3/µL",
  alternates: [{ unit: "10^9/L", toCanonical: identityCount, fromCanonical: identityCount }],
};

export const psofa = defineScore({
  id: "psofa",
  slug: "psofa",
  name: "pSOFA (Pediatric SOFA)",
  version: "1.0.0",
  status: "published",
  category: "organ-dysfunction",
  inputs: [
    {
      id: "age_months",
      group: defineText("psofa.group.patient", "Patient"),
      label: defineText("psofa.age", "Patient age"),
      required: true,
      type: "numeric",
      unit: monthsUnit,
      // Bands cap at ">216 months"; 0–250 is a validity window (psofa.md age strata).
      min: 0,
      max: 250,
      step: 1,
      helpText: defineText(
        "psofa.age.help",
        "In months. Sets the age-adjusted cardiovascular (MAP) and renal (creatinine) thresholds.",
      ),
    },
    {
      id: "pao2",
      group: defineText("psofa.group.respiratory", "Respiratory"),
      label: defineText("psofa.pao2", "Arterial PaO₂"),
      required: false,
      type: "numeric",
      // Blood-gas tension: the SHARED spec, so kPa is accepted here exactly as
      // it is by every sibling that takes a PaO₂ (P/F, OI, Phoenix, PIM3,
      // PRISM) and by PELOD-2's PaCO₂. This input previously declared a
      // mmHg-only spec, which rejected kPa cleanly but made pSOFA the sole
      // outlier and forced a hand conversion on SI users — the population most
      // likely to make an arithmetic error. Canonical stays mmHg, so the
      // thresholds in `respiratoryFromPf` are unchanged and no computed
      // subscore moves.
      unit: mmhgWithKpa,
      // Input-validity bound, not a cited threshold (psofa.md [NEEDS SOURCE]).
      min: 20,
      max: 600,
      helpText: defineText(
        "psofa.pao2.help",
        "From an arterial blood gas. Accepts mmHg or kPa. When present, PaO₂:FiO₂ is used for the respiratory subscore.",
      ),
    },
    {
      id: "spo2",
      group: defineText("psofa.group.respiratory", "Respiratory"),
      label: defineText("psofa.spo2", "Pulse-oximetry SpO₂"),
      required: false,
      type: "numeric",
      unit: { canonical: "%" },
      min: 0,
      max: 100,
      helpText: defineText(
        "psofa.spo2.help",
        "Used only when no PaO₂ is available, and only if ≤97% (above that the ratio saturates).",
      ),
    },
    {
      id: "fio2",
      group: defineText("psofa.group.respiratory", "Respiratory"),
      label: defineText("psofa.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "psofa.fio2.help",
        "Room air is 0.21. Accepts a fraction or a percentage. Denominator of the oxygenation ratio.",
      ),
    },
    {
      id: "resp_support",
      group: defineText("psofa.group.respiratory", "Respiratory"),
      label: defineText("psofa.resp_support", "On respiratory support"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "psofa.resp_support.help",
        "Invasive or non-invasive ventilation. Required for respiratory subscores 3–4; without it the subscore is capped at 2.",
      ),
    },
    {
      id: "platelets",
      group: defineText("psofa.group.coagulation", "Coagulation"),
      label: defineText("psofa.platelets", "Platelet count"),
      required: true,
      type: "numeric",
      unit: plateletUnit,
      // Input-validity bound, not a cited threshold (psofa.md [NEEDS SOURCE]).
      min: 1,
      max: 1000,
      helpText: defineText("psofa.platelets.help", "In ×10³/µL (equal to ×10⁹/L)."),
    },
    {
      id: "bilirubin",
      group: defineText("psofa.group.hepatic", "Hepatic"),
      label: defineText("psofa.bilirubin", "Total bilirubin"),
      required: true,
      type: "numeric",
      unit: bilirubinMgdl,
      // Input-validity bound, not a cited threshold (psofa.md [NEEDS SOURCE]).
      min: 0.1,
      max: 50,
      helpText: defineText("psofa.bilirubin.help", "Accepts mg/dL or µmol/L."),
    },
    {
      id: "map",
      group: defineText("psofa.group.cardiovascular", "Cardiovascular"),
      label: defineText("psofa.map", "Mean arterial pressure"),
      required: false,
      type: "numeric",
      unit: mmHgUnit,
      // Input-validity bound, not a cited threshold (psofa.md [NEEDS SOURCE]).
      min: 10,
      max: 150,
      helpText: defineText(
        "psofa.map.help",
        "Sets cardiovascular subscore 0 vs 1 by age band. Vasoactive infusions override it for subscores 2–4.",
      ),
    },
    {
      id: "dopamine",
      group: defineText("psofa.group.cardiovascular", "Cardiovascular"),
      label: defineText("psofa.dopamine", "Dopamine infusion rate"),
      required: false,
      type: "numeric",
      unit: vasoactiveUnit,
      min: 0,
      max: 50,
      helpText: defineText("psofa.dopamine.help", "In µg/kg/min. 0 or omitted means not infusing."),
    },
    {
      id: "dobutamine",
      group: defineText("psofa.group.cardiovascular", "Cardiovascular"),
      label: defineText("psofa.dobutamine", "Dobutamine infusion rate"),
      required: false,
      type: "numeric",
      unit: vasoactiveUnit,
      min: 0,
      max: 40,
      helpText: defineText(
        "psofa.dobutamine.help",
        "In µg/kg/min. Any dose qualifies for cardiovascular subscore 2.",
      ),
    },
    {
      id: "epinephrine",
      group: defineText("psofa.group.cardiovascular", "Cardiovascular"),
      label: defineText("psofa.epinephrine", "Epinephrine infusion rate"),
      required: false,
      type: "numeric",
      unit: vasoactiveUnit,
      min: 0,
      max: 5,
      helpText: defineText(
        "psofa.epinephrine.help",
        "In µg/kg/min. 0 or omitted means not infusing.",
      ),
    },
    {
      id: "norepinephrine",
      group: defineText("psofa.group.cardiovascular", "Cardiovascular"),
      label: defineText("psofa.norepinephrine", "Norepinephrine infusion rate"),
      required: false,
      type: "numeric",
      unit: vasoactiveUnit,
      min: 0,
      max: 5,
      helpText: defineText(
        "psofa.norepinephrine.help",
        "In µg/kg/min. 0 or omitted means not infusing.",
      ),
    },
    {
      id: "gcs",
      group: defineText("psofa.group.neurological", "Neurological"),
      label: defineText("psofa.gcs", "Glasgow Coma Scale total"),
      required: true,
      type: "numeric",
      unit: NO_UNIT,
      // GCS total range (3–15) is the instrument's own definition.
      min: 3,
      max: 15,
      step: 1,
      helpText: defineText(
        "psofa.gcs.help",
        "Total GCS only (3–15). Document sedation/intubation confounders separately.",
      ),
    },
    {
      id: "creatinine",
      group: defineText("psofa.group.renal", "Renal"),
      label: defineText("psofa.creatinine", "Serum creatinine"),
      required: true,
      type: "numeric",
      unit: creatinineMgdl,
      // Input-validity bound, not a cited threshold (psofa.md renal table is age-banded).
      min: 0.1,
      max: 20,
      helpText: defineText(
        "psofa.creatinine.help",
        "Accepts mg/dL or µmol/L. Thresholds are age-adjusted.",
      ),
    },
  ] as const,
  interpretation: [
    {
      id: "lower",
      appliesTo: "total",
      min: null,
      max: 9,
      label: defineText("psofa.band.lower", "0–8"),
      description: defineText(
        "psofa.band.lower.desc",
        "At or below the >8 cut point reported by Matics & Sanchez-Pinto (2017). Lower maximum pSOFA was associated with lower observed in-hospital mortality in the single-center derivation cohort.",
      ),
    },
    {
      id: "elevated",
      appliesTo: "total",
      min: 9,
      max: null,
      label: defineText("psofa.band.elevated", ">8"),
      description: defineText(
        "psofa.band.elevated.desc",
        "Above the maximum-pSOFA cut point (>8) that best separated survivors from non-survivors in the derivation cohort (AUROC 0.94). This is a statistical association for the encounter maximum, not a treatment threshold.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Matics TJ, Sanchez-Pinto LN. Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children. JAMA Pediatr. 2017;171(10):e172352.",
      pmid: "28783810",
      doi: "10.1001/jamapediatrics.2017.2352",
    },
    {
      citation:
        "Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707-710.",
      pmid: "8844239",
      doi: "10.1007/BF01709751",
      note: "Adult SOFA lineage adapted by pSOFA; no adult-SOFA number is used directly here.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: six age-adjusted pSOFA organ subscores and the 0–24 total (Matics 2017).",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "pSOFA is a threshold/formula-based score; numeric cut points and scoring rules are facts, not copyrightable expression (psofa.md IP status). No verbatim scale-item prose is reproduced. The neurologic subscore consumes only the integer GCS total, so no GCS eye/verbal/motor response-descriptor wording is copied into this platform.",
  },
  missingAsNormal: true,
  formula: defineText(
    "psofa.formula",
    "pSOFA total = respiratory + coagulation + hepatic + cardiovascular + neurologic + renal, six organ subscores (each 0–4) summed to 0–24 (Matics & Sanchez-Pinto 2017); the total and all six subscores are reported. Respiratory uses PaO₂:FiO₂ = PaO₂ ÷ FiO₂ when a PaO₂ is present (≥400 → 0, 300–399 → 1, 200–299 → 2, 100–199 → 3, <100 → 4), otherwise SpO₂:FiO₂ = SpO₂ ÷ FiO₂ but only when SpO₂ ≤97% (≥292 → 0, 264–291 → 1, 221–264 → 2, 148–220 → 3, <148 → 4; an exact 264 takes the worse subscore 2); subscores 3–4 require respiratory support, and a 3/4-band ratio without support is capped at 2. Coagulation from platelets (×10³/µL): ≥150 → 0, 100–149 → 1, 50–99 → 2, 20–49 → 3, <20 → 4. Hepatic from total bilirubin (mg/dL): <1.2 → 0, 1.2–1.9 → 1, 2.0–5.9 → 2, 6.0–11.9 → 3, ≥12 → 4. Cardiovascular is the worse of the MAP subscore (0 if MAP ≥ the age-band threshold, else 1) and the vasoactive subscore (dobutamine any dose or dopamine ≤5 → 2; dopamine >5 or epinephrine ≤0.1 or norepinephrine ≤0.1 → 3; dopamine >15 or epinephrine >0.1 or norepinephrine >0.1 → 4, doses in µg/kg/min). Neurologic from total GCS: 15 → 0, 13–14 → 1, 10–12 → 2, 6–9 → 3, <6 → 4. Renal from serum creatinine (mg/dL) against age-band cut points ≥ the level-4, -3, -2, or -1 threshold. MAP thresholds and creatinine cut points are age-adjusted across seven age bands (<1, 1–11, 12–23, 24–59, 60–143, 144–216, >216 months); missing oxygenation, MAP, or vasoactive inputs score that organ 0.",
  ),
  notes: defineText(
    "psofa.notes",
    "Each subscore is the worst qualifying value in the assessment window; the total is their sum (0–24). Several rules are implementation conventions rather than paper text and are flagged for clinical sign-off [NEEDS SOURCE]: (1) a PaO₂:FiO₂ or SpO₂:FiO₂ in a subscore-3/4 band without respiratory support is capped at 2 (highest non-support band); (2) at the published SpO₂:FiO₂ boundary overlap (264) the higher subscore is assigned. SpO₂:FiO₂ is used only when no PaO₂ is available and only for SpO₂ ≤97% (above that it saturates); an SpO₂ >97% with no PaO₂ scores respiratory 0. Missing oxygenation, MAP, or vasoactive data is treated as normal (0) for that organ, following the SOFA missing-as-normal convention. Physiologic plausibility bounds for PaO₂, platelets, bilirubin, MAP, and creatinine are not specified in the paper [NEEDS SOURCE]; the min/max here are input-validity windows, not clinical thresholds — prefer institutional analyzer limits. The >8 interpretation cut point is a single-center, statistically-derived threshold on the encounter maximum pSOFA and is descriptive, not directive. pSOFA is derived and validated in children beyond the neonatal period; do not over-extend to term neonates without separate evidence (e.g. nSOFA) [NEEDS SOURCE].",
  ),
  composition: {
    total: "total",
    components: [
      { id: "respiratory", max: 4 },
      { id: "coagulation", max: 4 },
      { id: "hepatic", max: 4 },
      { id: "cardiovascular", max: 4 },
      { id: "neurologic", max: 4 },
      { id: "renal", max: 4 },
    ],
  },
  calculate: (values) => {
    const band = ageBand(values.age_months.value);

    // 1. Respiratory — PaO₂:FiO₂ preferred; SpO₂:FiO₂ (≤97% only) as fallback.
    const support = values.resp_support.value;
    const fio2 = values.fio2.value;
    let respiratory = 0;
    if (values.pao2 !== undefined) {
      respiratory = respiratoryFromPf(values.pao2.value / fio2, support);
    } else if (values.spo2 !== undefined && values.spo2.value <= 97) {
      respiratory = respiratoryFromSf(values.spo2.value / fio2, support);
    }

    // 2. Coagulation — platelets (×10³/µL).
    const plt = values.platelets.value;
    const coagulation = plt >= 150 ? 0 : plt >= 100 ? 1 : plt >= 50 ? 2 : plt >= 20 ? 3 : 4;

    // 3. Hepatic — total bilirubin (mg/dL).
    const bili = values.bilirubin.value;
    const hepatic = bili >= 12 ? 4 : bili >= 6 ? 3 : bili >= 2 ? 2 : bili >= 1.2 ? 1 : 0;

    // 4. Cardiovascular — age-banded MAP (0/1) vs vasoactive tiers (2–4); take the worst.
    let mapScore = 0;
    if (values.map !== undefined) {
      mapScore = values.map.value >= band.mapMin ? 0 : 1;
    }
    const dopa = values.dopamine?.value ?? 0;
    const dobu = values.dobutamine?.value ?? 0;
    const epi = values.epinephrine?.value ?? 0;
    const norepi = values.norepinephrine?.value ?? 0;
    let vaso = 0;
    if (dopa > 15 || epi > 0.1 || norepi > 0.1) {
      vaso = 4;
    } else if (dopa > 5 || (epi > 0 && epi <= 0.1) || (norepi > 0 && norepi <= 0.1)) {
      vaso = 3;
    } else if ((dopa > 0 && dopa <= 5) || dobu > 0) {
      vaso = 2;
    }
    const cardiovascular = Math.max(mapScore, vaso);

    // 5. Neurologic — total GCS.
    const gcs = values.gcs.value;
    const neurologic = gcs >= 15 ? 0 : gcs >= 13 ? 1 : gcs >= 10 ? 2 : gcs >= 6 ? 3 : 4;

    // 6. Renal — age-banded serum creatinine (mg/dL).
    const cr = values.creatinine.value;
    const [c1, c2, c3, c4] = band.creatinineCuts;
    const renal = cr >= c4 ? 4 : cr >= c3 ? 3 : cr >= c2 ? 2 : cr >= c1 ? 1 : 0;

    const total = respiratory + coagulation + hepatic + cardiovascular + neurologic + renal;

    const point = (id: string, label: string, value: number) => ({
      id,
      label: defineText(`psofa.out.${id}`, label),
      value,
      unit: "",
      precision: 0,
    });

    return [
      point("total", "Total pSOFA", total),
      point("respiratory", "Respiratory subscore", respiratory),
      point("coagulation", "Coagulation subscore", coagulation),
      point("hepatic", "Hepatic subscore", hepatic),
      point("cardiovascular", "Cardiovascular subscore", cardiovascular),
      point("neurologic", "Neurologic subscore", neurologic),
      point("renal", "Renal subscore", renal),
    ];
  },
});
