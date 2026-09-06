import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { saturatingSpo2Notice } from "../value-notices";
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
 * SpO₂:FiO₂ (SpO₂ ≤97% only — Table 1 footnote, and the ratio's own
 * derivation window in Khemani 2009/2012). Research + full sourcing:
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
 *
 * The final band is not a paediatric band. Matics & Sanchez-Pinto derived pSOFA
 * in children 21 years and younger (≤252 months) and state that the >216-month
 * MAP and creatinine cut points are identical to adult SOFA's. So a patient over
 * 216 months is scored against adult thresholds by design — worth surfacing to
 * the reader (see `notes`), not worth branching on.
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
 * Respiratory subscore from the PaO₂:FiO₂ ratio.
 *
 * THE NON-SUPPORT CAP IS STRUCTURALLY ENTAILED BY THE PUBLISHED TABLE, NOT AN
 * INVENTION OF OURS (psofa.md Limitations; Verification rounds 4–5).
 * Table 1 gates subscores 3 and 4 on RESPIRATORY SUPPORT — "with respiratory
 * support" is the row condition it prints — and no band below 3 carries any
 * support requirement at all. A patient who is not on respiratory support
 * therefore cannot satisfy either criterion however low the ratio falls, and
 * 2 — the highest band carrying no support requirement — is the only value
 * left. The paper prints no sentence saying "cap at 2" because it does not need
 * one; the cap follows from the criteria as published. It was carried as an
 * unsourced claim through round 3 on the mistaken view that a rule the paper
 * does not spell out must be ours; the marker was withdrawn as mis-attributed,
 * not resolved by new evidence. Re-searching this cannot help.
 *
 * Note what that argument does and does not depend on: only on WHICH bands are
 * gated, never on what counts as support. It therefore holds identically under
 * either reading of the term below.
 *
 * WHAT COUNTS AS SUPPORT IS THE PART THE SOURCE LEAVES OPEN. Table 1 prints
 * "with respiratory support" and never defines it, so this implementation's
 * reading — invasive OR non-invasive support both satisfy the gate, which is
 * what the `resp_support` input accepts — is ours, not the paper's. A narrower
 * reading (invasive ventilation only) is not excluded by the source, and it
 * would cap a child on non-invasive support alone at 2 where this code allows
 * 3 or 4. It is disclosed in `notes` and on the field rather than marked
 * [NEEDS SOURCE], because the gate itself IS sourced; what is unsourced would
 * be any claim about which reading the authors intended, and none is made.
 * Through v1.2.0 the comments, notes and research note all stated this gate as
 * "mechanical ventilation" — narrower than both the printed table and the code
 * underneath, which has always accepted non-invasive support. Corrected in
 * v1.3.0; no computed subscore moved.
 *
 * Do NOT generalise the cap to sibling scores: `phoenix.ts` is built the
 * opposite way, scoring an unsupported patient 0 on respiratory however low
 * the ratio, with even 1 point requiring at least non-invasive support. That
 * contrast is no longer a structural inference from two printed tables — the
 * Phoenix task force publishes its SQL, which derives one support flag
 * (`fio2 > 0.21 OR vent = 1`) and multiplies the ratio tiers by it, so its
 * floor at 0 is as explicit in code as pSOFA's ceiling at 2 is entailed by
 * this table. Same child, same ratio, off support: pSOFA 2 and Phoenix 0.
 */
function respiratoryFromPf(pf: number, support: boolean): number {
  if (pf >= 400) return 0;
  if (pf >= 300) return 1; // 300–399
  if (pf >= 200) return 2; // 200–299
  if (!support) return 2; // 3/4 are gated on respiratory support, so an unsupported patient stops here
  if (pf >= 100) return 3; // 100–199 with support
  return 4; // <100 with support
}

/**
 * Respiratory subscore from the SpO₂:FiO₂ ratio.
 *
 * THE OVERLAP AT 264 IS IN THE SOURCE, NOT IN US — read directly from the
 * published table, 2026-08-03 (primary PDF of Matics & Sanchez-Pinto, JAMA
 * Pediatr 2017;171(10):e172352; psofa.md Verification round 3). Not a review
 * finding: the row prints 292 / 264–291 / 221–264 / 148–220 / <148, so 264 is
 * the lower bound of the subscore-1 row AND the upper bound of the subscore-2
 * row. The published table assigns an exact 264 to both rows at once, which
 * leaves no reading of it that avoids a tie-break.
 *
 * 220, by contrast, is printed ONCE — it ends the subscore-3 row and the next
 * row begins at 221 — so it needs no tie-break and deliberately gets none
 * below. (A round-1 secondary re-extraction claimed 220 was duplicated too;
 * the direct read shows it is not.)
 *
 * Ours is the worst-value rule — an exact 264 scores 2 — chosen because every
 * other pSOFA subscore takes the worst qualifying value in the window. That
 * choice is this implementation's, documented rather than derived, and the
 * upgraded provenance above does not change it: the paper still states no
 * tie-break (psofa.md Limitations).
 *
 * Subscores 3–4 are gated on respiratory support (invasive or non-invasive, as
 * this implementation reads the table's undefined term); without it the ratio
 * stops at 2, which the published table entails rather than this implementation
 * choosing it — see `respiratoryFromPf` above for the reasoning, the reading,
 * and the Phoenix contrast.
 */
function respiratoryFromSf(sf: number, support: boolean): number {
  if (sf >= 292) return 0;
  if (sf > 264) return 1; // 264–291, exclusive of 264 itself
  if (sf >= 221) return 2; // 221–264, inclusive of the overlapped 264 (worst-value tie-break)
  if (!support) return 2; // 3/4 are gated on respiratory support, so an unsupported patient stops here
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
  tagline: defineText(
    "psofa.tagline",
    "Sequential organ failure assessment adapted for children, six organ subscores",
  ),
  version: "1.1.1",
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
      // The derivation cohort was children 21 years and younger (≤252 months)
      // and the bands cap at ">216 months", so 0–250 sits inside the studied
      // range; it is our validity window, not a published bound (psofa.md age
      // strata). Above 216 months the thresholds are adult SOFA's — see `notes`.
      //
      // DO NOT IMPORT PHOENIX'S CEILING HERE. The Phoenix implementation notes
      // publish age [0, 216) months, and `phoenix.ts` declares exactly that —
      // but it is Phoenix's own ELIGIBILITY domain (children under 18), not a
      // plausibility bound for a paediatric age field. pSOFA's cohort ran to
      // 252 months and its top band is explicitly ">216 months", so the two
      // scores' age domains differ for a published reason. Adopting 216 here
      // would refuse adolescents pSOFA was derived on.
      min: 0,
      max: 250,
      step: 1,
      helpText: defineText(
        "psofa.age.help",
        "In months. Sets the age-adjusted cardiovascular (MAP) and renal (creatinine) thresholds. Above 216 months those thresholds are the adult SOFA cut points, not paediatric ones.",
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
      // Matics 2017 specifies NO plausibility bound for PaO₂ — confirmed absent
      // on full-text review, not merely unlocated (psofa.md). This is our
      // input-validity window; prefer institutional analyzer limits. Two
      // OUTSIDE published comparators exist and neither is adopted: the Phoenix
      // implementation notes' reasonable-value table gives PaO₂ [0, ∞) mmHg,
      // and PICANet's Admission Dataset Definitions Manual v5.4 gives 3–60 kPa
      // (22–450 mmHg). Ours sits between them, unchanged.
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
      // Matics 2017 publishes no bound; this pair happens to be IDENTICAL to
      // the Phoenix implementation notes' published SpO₂ range of [0, 100],
      // which also states separately that a value above 97 is unusable for an
      // SpO₂:FiO₂ ratio — the same ≤97% gate applied in `calculate` below, from
      // a source independent of Matics' Table 1 footnote.
      min: 0,
      max: 100,
      helpText: defineText(
        "psofa.spo2.help",
        "Used only when no PaO₂ is available, and only at ≤97% — above that the ratio saturates. The ≤97% ceiling is the paper's own (Matics 2017, Table 1 footnote) and matches the window the ratio was derived over (SpO₂ 80–97%, Khemani 2009/2012).",
      ),
    },
    {
      id: "fio2",
      group: defineText("psofa.group.respiratory", "Respiratory"),
      label: defineText("psofa.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      // Identical to the Phoenix implementation notes' published FiO₂ range
      // [0.21, 1.00]; also the physical range of the quantity.
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
        "Invasive or non-invasive support both count. Table 1 gates respiratory subscores 3–4 on being on respiratory support without defining it, so counting non-invasive support is this calculator's reading, not the paper's. Without support the respiratory subscore is capped at 2. High-flow nasal cannula counts here, although PICANet and ANZPIC exclude it from their ventilation field, so the same child reads as supported here and not ventilated there.",
      ),
    },
    {
      id: "platelets",
      group: defineText("psofa.group.coagulation", "Coagulation"),
      label: defineText("psofa.platelets", "Platelet count"),
      required: true,
      type: "numeric",
      unit: plateletUnit,
      // No published plausibility bound for platelets in Matics 2017 — confirmed
      // absent (psofa.md). Input-validity window only. The one outside published
      // range for this analyte (Phoenix implementation notes) is [0, ∞) ×10³/µL,
      // i.e. open above — no number to adopt, only a refusal to bound it.
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
      // No published plausibility bound for bilirubin in Matics 2017 — confirmed
      // absent (psofa.md). Input-validity window only; narrower than the one
      // outside published range, total bilirubin [0, 100] mg/dL in the Phoenix
      // implementation notes. Kept: 50 is already twice the top scoring band.
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
      // No published plausibility bound for MAP in Matics 2017 — confirmed
      // absent (psofa.md). The age-band MAP cut points below ARE published; this
      // pair is only the input-validity window around them. Narrower than the
      // one outside published range, MAP [1, 300] mmHg in the Phoenix
      // implementation notes; kept, since the highest cut point here is 70.
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
      // The four infusion-rate windows below are ours and have NO published
      // comparator of any kind — the only published bound for vasoactive
      // support in this family of scores is Phoenix's COUNT of distinct agents
      // (integer 0–6), which is a different quantity from a rate in µg/kg/min.
      // The DOSE cut points these windows sit around (5, 15, 0.1) are of course
      // published, in Matics 2017 Table 1.
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
      // GCS total range (3–15) is the instrument's own definition, and is also
      // published verbatim as a reasonable-value range in the Phoenix
      // implementation notes — the two agree, as they must.
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
      // The published renal cut points are age-banded (psofa.md renal table);
      // Matics 2017 states no plausibility bound for creatinine — confirmed
      // absent. This pair is the input-validity window only, and is narrower
      // than the one outside published range, creatinine [0, 50] mg/dL in the
      // Phoenix implementation notes. Kept: the highest cut point here is 5.0.
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
    {
      citation:
        "Khemani RG, Patel NR, Bart RD 3rd, Newth CJL. Comparison of the pulse oximetric saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children. Chest. 2009;135(3):662-668.",
      pmid: "19029434",
      doi: "10.1378/chest.08-2239",
      note: "Derivation of the SpO₂:FiO₂ ratio, restricted to SpO₂ 80–97% — the origin of the ≤97% ceiling pSOFA's Table 1 footnote applies.",
    },
    {
      citation:
        "Khemani RG, Thomas NJ, Venkatachalam V, et al. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309-1316.",
      pmid: "22202709",
      doi: "10.1097/CCM.0b013e31823bc61b",
      note: "Multicentre re-derivation of the SpO₂-based markers over the same SpO₂ 80–97% window.",
    },
    {
      citation:
        "Wynn JL, Polin RA. A neonatal sequential organ failure assessment score predicts mortality to late-onset sepsis in preterm very low birth weight infants. Pediatr Res. 2020;88(1):85-90.",
      pmid: "31394566",
      doi: "10.1038/s41390-019-0517-2",
      note: "nSOFA, the organ-dysfunction score derived FOR neonates (0–15). Named here so the neonatal caveat points somewhere; no nSOFA number is used in this score.",
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
      reason: "clarification",
      summary:
        "Says so when an SpO₂ above 97% is entered with no PaO₂. The SpO₂:FiO₂ ratio saturates above 97%, so the value is accepted and then discarded and the respiratory subscore stays 0 — with the field FILLED, which the form's partial-entry cue cannot see, because it watches for blanks. The number is unchanged; what is new is that the result now says why it is 0 and names the field, beside the subscore and beside the input. Found on 2026-09-03 by an audit of the text-condensing pass, which had removed the one sentence that disclosed it.",
    },
    {
      version: "1.1.1",
      date: "2026-09-06",
      summary:
        "Added a one-line description for the catalogue card and shortened field guidance to fit an info toggle. No rule, threshold or reference changed.",
      reason: "clarification",
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
    "pSOFA total = respiratory + coagulation + hepatic + cardiovascular + neurologic + renal: six organ subscores, each 0–4, summed to 0–24 (Matics & Sanchez-Pinto 2017). Respiratory uses P/F when a PaO₂ exists (≥400 → 0; 300–399 → 1; 200–299 → 2; 100–199 → 3; <100 → 4), otherwise S/F, only at SpO₂ ≤ 97% (≥292 → 0; 264–291 → 1; 221–264 → 2; 148–220 → 3; <148 → 4); an exact 264 resolves to the worse subscore (2), per the worst-value rule. Subscores 3–4 require respiratory support, so a 3/4-band ratio without support is capped at 2; that cap is entailed by the published table, not added here. Coagulation from platelets (×10³/µL): ≥150 → 0; 100–149 → 1; 50–99 → 2; 20–49 → 3; <20 → 4. Hepatic from total bilirubin (mg/dL): <1.2 → 0; 1.2–1.9 → 1; 2.0–5.9 → 2; 6.0–11.9 → 3; ≥12 → 4. Cardiovascular is the worse of the age-banded MAP subscore (0 or 1) and the vasoactive tier: dobutamine any dose or dopamine ≤5 → 2; dopamine >5 or epinephrine ≤0.1 or norepinephrine ≤0.1 → 3; dopamine >15 or epinephrine >0.1 or norepinephrine >0.1 → 4 (µg/kg/min). Neurologic from total GCS: 15 → 0; 13–14 → 1; 10–12 → 2; 6–9 → 3; <6 → 4. Renal from serum creatinine against age-banded cut points. Seven age bands (<1, 1–11, 12–23, 24–59, 60–143, 144–216, >216 months); above 216 months the MAP and creatinine cut points are adult SOFA’s. Missing data scores that organ 0, which is the paper’s own rule that a variable unmeasured in the 24 h window is taken as normal, so a partial entry reads lower than a complete one.",
  ),
  notes: defineText(
    "psofa.notes",
    "Missing data scores that organ 0. That is the paper’s own rule, a variable unmeasured in the 24 h window taken as normal, so a partial entry reads lower than a complete one. An SpO₂ above 97% with no PaO₂ falls into that trap WITHOUT the field being blank: the ratio is unusable above 97%, so the respiratory subscore is taken as 0 and the total reads lower than the child is. The published S/F table prints 264 in two rows at once, as the lower bound of the subscore-1 row and the upper bound of the subscore-2 row, so the source assigns an exact 264 to both; this calculator resolves it to the worse subscore (2), per the worst-value rule. Subscores 3–4 require respiratory support, and a 3/4-band ratio without support is capped at 2; that cap is entailed by the published table, not added here. What counts as support is undefined in the paper, and this calculator’s reading is that invasive or non-invasive support both qualify, high-flow included. Phoenix contrast, worth stating once: pSOFA attaches its support requirement to the top two respiratory bands, capping an unsupported child at 2, while Phoenix multiplies every tier by a support flag, flooring an unsupported child at 0. The same child at the same ratio can be pSOFA respiratory 2 and Phoenix respiratory 0 simultaneously. Both implement their own instrument correctly; neither should be harmonised to the other. A total above 8 sits above the maximum-pSOFA cut point that best separated survivors from non-survivors in the single-center derivation cohort (AUROC 0.94). That is a statistical association on the encounter maximum, not a treatment threshold. Scope: pSOFA was derived in children 21 years and younger. The <1-month band exists, but neonates were not the derivation population; nSOFA is the score derived for preterm very-low-birth-weight infants. Age input runs to 250 months deliberately, since the cohort ran to 252.",
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

    // An SpO₂ above 97 with no PaO₂ matched neither branch above, so the
    // subscore is 0 because a FILLED field was discarded, not because the
    // child is well. Say so on the value itself; the partial-entry cue
    // watches for blanks and cannot see this one.
    // P/F genuinely SUPERSEDES S/F here — the branch above is an `else if` —
    // so a PaO₂ means nothing was lost. FiO₂ is `required` on this score, so
    // its presence needs no test. Phoenix is the opposite on both counts;
    // see the condition there before copying either.
    const spo2Discarded =
      values.pao2 === undefined && values.spo2 !== undefined && values.spo2.value > 97;

    return [
      point("total", "Total pSOFA", total),
      {
        ...point("respiratory", "Respiratory subscore", respiratory),
        ...(spo2Discarded ? { notice: saturatingSpo2Notice(false) } : {}),
      },
      point("coagulation", "Coagulation subscore", coagulation),
      point("hepatic", "Hepatic subscore", hepatic),
      point("cardiovascular", "Cardiovascular subscore", cardiovascular),
      point("neurologic", "Neurologic subscore", neurologic),
      point("renal", "Renal subscore", renal),
    ];
  },
});
