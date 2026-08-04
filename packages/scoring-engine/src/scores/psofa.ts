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
  version: "1.4.0",
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
        "Invasive or non-invasive support both count here. Table 1 gates respiratory subscores 3–4 on being on respiratory support and never says what counts as support, so treating non-invasive support as sufficient is this calculator's reading rather than the paper's. Without support the respiratory subscore is capped at 2. High-flow nasal cannula falls inside that broad reading and counts here — worth knowing because the major paediatric registries go the other way: PICANet and ANZPIC both exclude high flow from the ventilation field they collect, so the same child counts as supported on this score and as not ventilated in either registry.",
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
      date: "2026-07-25",
      summary:
        "Initial release: six age-adjusted pSOFA organ subscores and the 0–24 total (Matics 2017).",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "Sourcing corrections. NO NUMBER MOVED — no threshold, age band, subscore or total changed. (1) Missing-as-normal was labelled an implementation convention of this platform; it is the paper's own rule, stated in the Methods of Matics & Sanchez-Pinto 2017, and is now attributed there. That marker is withdrawn because it was our mistake, not a gap. (2) The absence of physiologic plausibility bounds for PaO₂, platelets, bilirubin, MAP and creatinine is now stated as confirmed-absent from the paper rather than as an unfound source: the min/max on those inputs are this platform's input-validity windows and were never clinical thresholds. (3) The SpO₂:FiO₂ overlap at 264 is now attributed where it belongs — JAMA Pediatr Table 1 itself prints 264 in both the subscore-1 and subscore-2 rows, so the source assigns no single value there; taking the worse subscore remains our documented tie-break. (4) The SpO₂ ≤97% ceiling is cited twice over, to the paper's Table 1 footnote and to the ratio's derivation window (SpO₂ 80–97%) in Khemani 2009 and 2012, both now in the reference list. (5) Age caveat added: the cohort was children ≤21 years and the paper states the >216-month MAP and creatinine cut points are adult SOFA's, so a patient over 216 months is scored against adult thresholds. (6) The neonatal caveat was too strong — pSOFA has a <1-month band and is defined there, it simply was not derived for that population; nSOFA (Wynn & Polin 2020, now cited) is the instrument derived for preterm very-low-birth-weight infants.",
      reason: "new-reference",
    },
    {
      version: "1.2.0",
      date: "2026-08-04",
      summary:
        "The last unsourced claim on this score is closed, and NO NUMBER MOVED — no threshold, band, subscore or total changed, and the non-support cap still returns 2 exactly as before. What changed is its attribution. The cap was carried as an implementation convention flagged for clinical sign-off, on the view that a rule the paper never states in words must be ours. It is not: the published table attaches a support requirement to subscores 3 and 4 and to no lower band, so a patient who is not on respiratory support cannot meet either criterion however low the ratio falls and 2 is the only band that remains. [As shipped, this entry called that a MECHANICAL-VENTILATION requirement and said the table attaches it. The table's row condition is respiratory support; the narrowing was this entry's own paraphrase, and it is corrected here rather than left standing because it misstates the source on a page a clinician reads. See v1.3.0 — the reasoning is unaffected, since it turns on which bands are gated and not on what counts as support.] The cap is structurally entailed by the criteria as published, so the marker is withdrawn as mis-labelled rather than resolved by new evidence, and pSOFA now carries no unsourced claim at all. Added with it, because the entailment is easy to over-generalise: Phoenix is structured the opposite way — an unsupported patient scores 0 on its respiratory criterion however low the ratio, and even 1 point requires at least non-invasive support, so the same child can be pSOFA respiratory 2 and Phoenix respiratory 0 simultaneously. The notes now state that contrast so a reader moving between the two scores does not assume the ratio alone means the same thing in both.",
      reason: "clarification",
    },
    {
      version: "1.3.0",
      date: "2026-08-04",
      summary:
        "The respiratory-support gate is now stated the way the published table states it, and NO NUMBER MOVED — no threshold, band, subscore or total changed, and the code was already doing this. v1.2.0 described the gate on subscores 3 and 4 as a MECHANICAL-VENTILATION requirement, in the notes, in the code comments and in the research note. That is narrower than the source: JAMA Pediatr Table 1 prints the row condition as being on respiratory support, which is also how round-1 verification read it against the full text, and it is narrower than this calculator, whose respiratory-support field has always accepted invasive or non-invasive support. So the shipped text asserted a stricter gate than the code applied — a clinically material gap for any child on non-invasive support alone, who was described as capped at 2 while actually being scored 3 or 4. The gate is now stated once, the same way, everywhere: subscores 3 and 4 require respiratory support. The argument that an unsupported patient cannot exceed 2 is restated in those terms and is strengthened rather than weakened by the correction, because it depends only on which bands are gated — 3 and 4 are, no lower band is — and not at all on what counts as support, so it holds under either reading. Newly disclosed with it: the paper prints the term and never defines it, so counting non-invasive support as satisfying the gate is this calculator's reading and not the paper's, and a reader who applies the narrower one will score a child on non-invasive support alone lower than this calculator does. That disclosure is a documented implementation reading of an undefined term, in the same class as the SpO₂:FiO₂ tie-break at 264 — the gate itself is sourced, and no claim is made about which reading the authors intended — so pSOFA still carries no unsourced claim. The v1.2.0 entry above is amended in place for the same reason, since it too told the reader the published table requires mechanical ventilation; the amendment is marked in brackets there rather than made silently.",
      reason: "clarification",
    },
    {
      version: "1.4.0",
      date: "2026-08-04",
      summary:
        "NO NUMBER MOVED — no threshold, age band, subscore, total or input bound changed, and nothing that computed before is rejected now. Three things gain a source and one finding is new. (1) THE INPUT BOUNDS WERE ALL LABELLED OURS; NOW SOME OF THEM MATCH A PUBLISHED RANGE. Matics & Sanchez-Pinto still publish none — that is unchanged and still confirmed absent from the paper — but published plausibility ranges for the same analytes exist elsewhere, and every bound on this score has now been compared against them. FiO₂ 0.21–1.00, SpO₂ 0–100 and GCS 3–15 are identical to the reasonable-value table published in the Phoenix implementation notes; the SpO₂ match arrives together with that table's own statement that a value above 97 is unusable for an SpO₂:FiO₂ ratio, which reaches this calculator's ≤97% gate from a source independent of this paper's Table 1 footnote. PaO₂, MAP, creatinine, bilirubin and platelets are all NARROWER here than any published range and are deliberately kept, with the published alternative now named beside each; the age window is deliberately WIDER than Phoenix's [0, 216) and must stay so, because that is Phoenix's eligibility domain and pSOFA's cohort ran to 252 months. The four vasoactive infusion-rate windows have no published comparator of any kind. (2) VPS, PC4 AND PHIS PUBLISH NO PUBLIC PLAUSIBILITY BOUNDS — a confirmed negative rather than an unfinished search, recorded because it explains why two honest implementations of one score disagree about what they will accept. (3) THE PHOENIX CONTRAST IS NOW SOURCED FROM PHOENIX'S PUBLISHED CODE rather than inferred from comparing two printed tables. Their SQL derives one support flag — FiO₂ above 0.21 or invasive ventilation — and multiplies every ratio tier by it, so Phoenix's floor at 0 is explicit in code exactly as this score's ceiling at 2 is entailed by its table. The mechanism, not just the outcome, is now stated: Phoenix multiplies by a support flag, pSOFA attaches a support condition to its top two bands only. (4) NEW, AND USER-VISIBLE: high-flow nasal cannula falls inside the broad reading of respiratory support used here and so counts, while PICANet and ANZPIC both exclude high flow from the ventilation field they collect — the same child is supported for this score and not ventilated in either registry. The support field's help text now says so, since that is the moment the question is answered. Recorded as unretrieved and not to be assumed: no cohort has quantified how much the CPAP-versus-high-flow choice shifts this score's distribution. Nothing in this entry re-opens the respiratory-support gate settled in v1.3.0: subscores 3 and 4 require respiratory support, the term is undefined in the paper, and reading it broadly remains this calculator's disclosed choice.",
      reason: "new-reference",
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
    "pSOFA total = respiratory + coagulation + hepatic + cardiovascular + neurologic + renal, six organ subscores (each 0–4) summed to 0–24 (Matics & Sanchez-Pinto 2017); the total and all six subscores are reported. Respiratory uses PaO₂:FiO₂ = PaO₂ ÷ FiO₂ when a PaO₂ is present (≥400 → 0, 300–399 → 1, 200–299 → 2, 100–199 → 3, <100 → 4), otherwise SpO₂:FiO₂ = SpO₂ ÷ FiO₂ but only when SpO₂ ≤97% (≥292 → 0, 264–291 → 1, 221–264 → 2, 148–220 → 3, <148 → 4; the published bands print 264 in two rows at once, and an exact 264 is resolved here to the worse subscore 2); subscores 3–4 require respiratory support, and a 3/4-band ratio without support is capped at 2. Coagulation from platelets (×10³/µL): ≥150 → 0, 100–149 → 1, 50–99 → 2, 20–49 → 3, <20 → 4. Hepatic from total bilirubin (mg/dL): <1.2 → 0, 1.2–1.9 → 1, 2.0–5.9 → 2, 6.0–11.9 → 3, ≥12 → 4. Cardiovascular is the worse of the MAP subscore (0 if MAP ≥ the age-band threshold, else 1) and the vasoactive subscore (dobutamine any dose or dopamine ≤5 → 2; dopamine >5 or epinephrine ≤0.1 or norepinephrine ≤0.1 → 3; dopamine >15 or epinephrine >0.1 or norepinephrine >0.1 → 4, doses in µg/kg/min). Neurologic from total GCS: 15 → 0, 13–14 → 1, 10–12 → 2, 6–9 → 3, <6 → 4. Renal from serum creatinine (mg/dL) against age-band cut points ≥ the level-4, -3, -2, or -1 threshold. MAP thresholds and creatinine cut points are age-adjusted across seven age bands (<1, 1–11, 12–23, 24–59, 60–143, 144–216, >216 months); missing oxygenation, MAP, or vasoactive inputs score that organ 0.",
  ),
  notes: defineText(
    "psofa.notes",
    "Each subscore is the worst qualifying value in the assessment window; the total is their sum (0–24). Missing data is scored as normal (0) for that organ — this is the paper's own rule and not a convention of this platform: the Methods of Matics & Sanchez-Pinto 2017 state that a variable not measured within a 24-hour period was taken as normal, consistent with the original SOFA criteria. It still means a partially entered case reads lower than a fully entered one, so read a low total together with how much was supplied. A PaO₂:FiO₂ or SpO₂:FiO₂ falling in a subscore-3/4 band without respiratory support is capped at 2, the highest band carrying no support requirement. THAT CAP IS THE PUBLISHED TABLE'S OWN STRUCTURE, NOT A RULE THIS CALCULATOR ADDED, and it is no longer flagged as unsourced: subscores 3 and 4 each carry the table's respiratory-support requirement and no lower band carries any support requirement, so a patient who is not on respiratory support cannot satisfy either criterion however low the ratio falls, and 2 is the only band left. The paper prints no sentence spelling that out because it does not need one — the cap is entailed by the criteria as published rather than asserted on top of them. It was previously flagged as this implementation's own on the mistaken view that a rule the paper never states in words must be an invention. WHAT THE SOURCE DOES LEAVE OPEN IS WHAT COUNTS AS SUPPORT. Table 1 gates those two bands on being on respiratory support and never defines the term, so this calculator's reading — invasive or non-invasive support both satisfy the gate, which is what the respiratory-support field accepts — is ours and not the paper's. A narrower reading, invasive ventilation only, is not ruled out by the source; under it a child on non-invasive support alone would cap at 2 where this calculator allows 3 or 4. The cap argument above is unaffected either way, because it turns on which bands are gated and not on what counts as support. DO NOT CARRY THE CAP ACROSS TO OTHER SCORES: Phoenix is structured the opposite way in the same situation. There a patient on no respiratory support scores 0 on the respiratory criterion however low the ratio goes, and even 1 point requires at least non-invasive support — so the same child can be pSOFA respiratory 2 and Phoenix respiratory 0 at once. Two scores, two structures; a reader moving between them should not assume that the ratio alone means the same thing in both. THAT CONTRAST IS NOW SOURCED FROM PHOENIX'S OWN PUBLISHED CODE rather than inferred from comparing two printed tables. The Phoenix task force publishes the SQL: it derives a single support flag — true when FiO₂ exceeds 0.21 or the child is invasively ventilated — and multiplies its ratio tiers by that flag, so the floor at 0 is explicit in their code exactly as the ceiling at 2 is entailed by pSOFA's table. The mechanism is the difference: Phoenix multiplies every tier by a support flag, pSOFA attaches a support condition only to its top two bands. Neither is to be harmonised to the other, and a reader comparing the two numbers is looking at a documented divergence between instruments, not at a disagreement about the child. HIGH-FLOW NASAL CANNULA IS WHERE THIS BITES IN PRACTICE. Phoenix counts high flow explicitly as respiratory support, and it falls inside the broad reading used here, so a child on high flow satisfies the support gate on both scores. The major paediatric registries go the other way: PICANet and ANZPIC both EXCLUDE high-flow nasal cannula from the mechanical-ventilation field they collect. The same child is therefore ‘supported’ for both of these scores and ‘not ventilated’ in either registry — which matters as soon as a score is read next to registry-derived case-mix or ventilation figures. What has NOT been retrieved, and must not be assumed: no cohort has quantified how much choosing CPAP over high flow, or counting high flow on one side and not the other, shifts the distribution of either score. The direction is obvious; the magnitude is unknown. The second rule that is genuinely this implementation's is likewise a documented choice, and this one is forced by the source: the published SpO₂:FiO₂ bands overlap, because JAMA Pediatr Table 1 prints 264 as both the lower bound of the subscore-1 row and the upper bound of the subscore-2 row, so the table assigns an exact 264 to two rows at once; this calculator resolves it to the worse subscore (2), in keeping with pSOFA's worst-value rule. SpO₂:FiO₂ is used only when no PaO₂ is available and only at SpO₂ ≤97%; that ceiling is the paper's own (Table 1 footnote) and matches the window the ratio was derived over, SpO₂ 80–97% in Khemani 2009 and 2012. An SpO₂ >97% with no PaO₂ scores respiratory 0. Matics & Sanchez-Pinto specify no physiologic plausibility bounds for PaO₂, platelets, bilirubin, MAP or creatinine — confirmed absent from the paper, not merely unlocated — so the min/max on those inputs are this platform's input-validity windows and carry no clinical meaning; prefer institutional analyzer limits. THAT REMAINS TRUE OF THE PAPER, BUT THE WINDOWS ARE NO LONGER UNCHECKABLE. Published plausibility ranges for the same analytes exist elsewhere, and every bound here has now been compared against them. Identical to a published range: FiO₂ 0.21–1.00, SpO₂ 0–100, and GCS 3–15, all three matching the reasonable-value table published in the Phoenix implementation notes — the SpO₂ match arriving with the published statement that a value above 97 is unusable for an SpO₂:FiO₂ ratio, which is the same ≤97% gate applied here and reaches it from a source independent of this paper's own Table 1 footnote. Narrower here than any published range, and DELIBERATELY UNCHANGED: PaO₂ 20–600 against a published range open above (and PICANet's tighter 3–60 kPa, 22–450 mmHg); MAP 10–150 against 1–300; creatinine 0.1–20 against 0–50; bilirubin 0.1–50 against a published total bilirubin range of 0–100; platelets 1–1000 against a range with no upper bound at all. NO BOUND ON THIS SCORE MOVED as a result — a form field refusing a typo does a different job from a data pipeline's outlier filter, and every window here already sits well outside the highest cut point it has to admit. One bound is deliberately WIDER than a published one and must stay so: age runs to 250 months here, where Phoenix declares [0, 216); that is Phoenix's eligibility domain, not a plausibility bound, and pSOFA's cohort ran to 252 months with a top band of >216, so importing 216 would refuse adolescents this score was derived on. The four vasoactive infusion-rate windows have no published comparator of any kind — the only published figure for vasoactive support in this family is Phoenix's count of distinct agents, integer 0–6, which is a different quantity. Second published comparator, from a different tradition: the PICANet Admission Dataset Definitions Manual v5.4 (November 2020), which publishes collection ranges including PaO₂ 3–60 kPa (22–450 mmHg), lactate 0.2–15.0 mmol/L, systolic pressure 20–180 with a check above 200, and base excess −30 to +20; no newer PICANet manual exists, confirmed. Provenance, so it is not overclaimed: the Phoenix reasonable-value table was read from that package's implementation-notes documentation, and the machine-readable units file that page refers to could not be retrieved, so nothing here is cited to that file. AND THE SILENCE ELSEWHERE IS ITSELF A FINDING: VPS, PC4 and PHIS publish NO public numeric plausibility or edit-check bounds — confirmed negative, theirs being proprietary rules behind login. That is why independent implementations of the same score disagree about what they will accept: for most inputs there is no public standard to converge on. Age: pSOFA was derived in children 21 years and younger, and the paper states that the >216-month MAP and creatinine cut points are identical to adult SOFA's, so a patient over 216 months is being scored against adult thresholds rather than paediatric ones. Neonates: the <1-month band exists, so pSOFA is defined rather than undefined there, but it was not derived in that population; nSOFA (Wynn & Polin, Pediatr Res 2020; a 0–15 scale) is the score derived for preterm very-low-birth-weight infants with late-onset sepsis. The >8 interpretation cut point is a single-center, statistically-derived threshold on the encounter maximum pSOFA and is descriptive, not directive.",
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
