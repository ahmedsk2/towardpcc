import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fibrinogenMgdl, lactateMmol } from "../units/concentration";
import { fractionWithPercent, percent } from "../units/fraction";
import { NO_UNIT } from "../units/types";
import { mmhgWithKpa } from "../units/pressure";

/**
 * Phoenix Sepsis Score (2024) — the SCCM Task Force pediatric-sepsis diagnostic
 * criterion. Total 0–13 = sum of four organ-system components:
 *   respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2).
 *
 * Sepsis = suspected/confirmed infection AND total ≥ 2.
 * Septic shock = sepsis AND cardiovascular component ≥ 1 (a cardiovascular
 * point specifically — not merely total ≥ 2).
 *
 * Missing inputs contribute 0 to their component (reference-package convention);
 * the score therefore reflects DOCUMENTED dysfunction, not proven absence of it.
 *
 * Only the numeric total GCS (3–15) is consumed — no GCS response-descriptor
 * wording is reproduced (that is a separate instrument; see notes/ipStatus).
 *
 * Research + full sourcing: docs/research/scores/phoenix.md.
 */

const VASOACTIVE_UNIT = NO_UNIT; // count of distinct agents (dimensionless)

/**
 * Age-banded MAP sub-score (2c). Age bands are left-inclusive, half-open
 * [low, high); thresholds are JAMA 2024 Table 2 (cross-checked against the
 * `phoenix` reference package). 2 pts if MAP < low, 1 pt if low ≤ MAP < high,
 * 0 pts if MAP ≥ high. The half-open form scores non-integer MAP (e.g. 43.67)
 * exactly as the reference code does.
 */
function mapPoints(ageMonths: number, map: number): number {
  let low: number;
  let high: number;
  if (ageMonths < 1) {
    low = 17;
    high = 31;
  } else if (ageMonths < 12) {
    low = 25;
    high = 39;
  } else if (ageMonths < 24) {
    low = 31;
    high = 44;
  } else if (ageMonths < 60) {
    low = 32;
    high = 45;
  } else if (ageMonths < 144) {
    low = 36;
    high = 49;
  } else {
    low = 38;
    high = 52;
  }
  if (map < low) return 2;
  if (map < high) return 1;
  return 0;
}

export const phoenix = defineScore({
  id: "phoenix",
  slug: "phoenix",
  name: "Phoenix Sepsis Score",
  version: "1.1.0",
  status: "published",
  category: "sepsis",
  inputs: [
    {
      id: "age_months",
      group: defineText("phoenix.group.patient", "Patient"),
      label: defineText("phoenix.age", "Age"),
      required: true,
      type: "numeric",
      unit: { canonical: "months" },
      // Validated cohort was < 18 y (< 216 months); MAP bands start at 0 months.
      min: 0,
      max: 215,
      step: 1,
      helpText: defineText(
        "phoenix.age.help",
        "In months. Determines the age-adjusted MAP band. The criteria were derived in children < 18 years and exclude newborns and infants < 37 weeks post-conceptional age.",
      ),
    },
    {
      id: "suspected_infection",
      group: defineText("phoenix.group.patient", "Patient"),
      label: defineText("phoenix.infection", "Suspected or confirmed infection"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "phoenix.infection.help",
        "Clinical judgment. Phoenix sepsis requires suspected/confirmed infection AND a score ≥ 2 — the score alone does not decide whether infection is present.",
      ),
    },
    {
      id: "resp_support",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.resp_support", "Respiratory support"),
      required: false,
      type: "categorical",
      options: [
        { value: "none", label: defineText("phoenix.resp_support.none", "No respiratory support") },
        {
          value: "any-support",
          label: defineText(
            "phoenix.resp_support.any",
            "Non-invasive support (supplemental O₂ or non-invasive ventilation)",
          ),
        },
        {
          value: "imv",
          label: defineText("phoenix.resp_support.imv", "Invasive mechanical ventilation"),
        },
      ],
      helpText: defineText(
        "phoenix.resp_support.help",
        "The 1-point tier needs any support; the 2- and 3-point tiers need invasive mechanical ventilation. A low ratio with no support scores 0.",
      ),
    },
    {
      id: "pao2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.pao2", "Arterial PaO₂"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // input-validity bound, not a cited threshold (research lists "20–200 typical"
      // as a typical range; upper widened to a physiologic ceiling so a legitimately
      // high PaO₂ on supplemental O₂ is not falsely rejected).
      min: 20,
      max: 700,
      helpText: defineText(
        "phoenix.pao2.help",
        "From an arterial blood gas. Used for the PaO₂:FiO₂ (P/F) ratio when available; otherwise SpO₂:FiO₂ is used. Accepts mmHg or kPa.",
      ),
    },
    {
      id: "fio2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: false,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "phoenix.fio2.help",
        "Room air is 0.21. Needed for the P/F or S/F ratio. Accepts a fraction or a percentage.",
      ),
    },
    {
      id: "spo2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.spo2", "Pulse-oximeter oxygen saturation (SpO₂)"),
      required: false,
      type: "numeric",
      unit: percent,
      // input-validity bound, not a cited threshold. The S/F ratio is only VALID at
      // SpO₂ ≤ 97 (that gate is applied in calculate); a measured SpO₂ of 98–100 is
      // still valid data (it simply yields no S/F), so max is 100, not 97.
      min: 50,
      max: 100,
      helpText: defineText(
        "phoenix.spo2.help",
        "Used for the SpO₂:FiO₂ (S/F) ratio only when SpO₂ ≤ 97% (above that the ratio saturates and is uninformative). Prefer PaO₂:FiO₂ when an arterial gas is available.",
      ),
    },
    {
      id: "n_vasoactives",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.n_vasoactives", "Number of distinct vasoactive agents"),
      required: false,
      type: "numeric",
      unit: VASOACTIVE_UNIT,
      min: 0,
      max: 6,
      step: 1,
      helpText: defineText(
        "phoenix.n_vasoactives.help",
        "Count of distinct systemic vasoactive medications running (dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin): 0 → 0 pts, 1 → 1 pt, ≥ 2 → 2 pts.",
      ),
    },
    {
      id: "lactate",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.lactate", "Blood lactate"),
      required: false,
      type: "numeric",
      unit: lactateMmol,
      // input-validity bound, not a cited threshold (research "0.3–30").
      min: 0.3,
      max: 30,
      helpText: defineText(
        "phoenix.lactate.help",
        "0 pts if < 5, 1 pt if 5 to < 11, 2 pts if ≥ 11 mmol/L. Accepts mmol/L or mg/dL.",
      ),
    },
    {
      id: "map",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.map", "Mean arterial pressure (MAP)"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // input-validity bound, not a cited threshold (research "10–120"; upper widened
      // to a physiologic ceiling so an adolescent hypertensive value is not falsely
      // rejected — it scores 0 anyway).
      min: 10,
      max: 200,
      helpText: defineText(
        "phoenix.map.help",
        "Age-adjusted scoring (0–2 pts). May be computed as DBP + (SBP − DBP)/3. Accepts mmHg or kPa.",
      ),
    },
    {
      id: "platelets",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.platelets", "Platelet count"),
      required: false,
      type: "numeric",
      unit: { canonical: "10^3/uL" },
      // input-validity bound, not a cited threshold (research "5–1000").
      min: 5,
      max: 1000,
      helpText: defineText(
        "phoenix.platelets.help",
        "In ×10³/µL (K/µL). Contributes 1 coagulation point when < 100.",
      ),
    },
    {
      id: "inr",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.inr", "INR"),
      required: false,
      type: "numeric",
      unit: NO_UNIT,
      // input-validity bound, not a cited threshold (research "0.8–10").
      min: 0.8,
      max: 10,
      helpText: defineText(
        "phoenix.inr.help",
        "International normalized ratio (unitless). Contributes 1 coagulation point when > 1.3.",
      ),
    },
    {
      id: "ddimer",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.ddimer", "D-dimer"),
      required: false,
      type: "numeric",
      unit: { canonical: "mg/L FEU" },
      // input-validity bound, not a cited threshold (research "0.1–50").
      min: 0.1,
      max: 50,
      helpText: defineText(
        "phoenix.ddimer.help",
        "In mg/L fibrinogen-equivalent units (FEU). Contributes 1 coagulation point when > 2.",
      ),
    },
    {
      id: "fibrinogen",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.fibrinogen", "Fibrinogen"),
      required: false,
      type: "numeric",
      unit: fibrinogenMgdl,
      // input-validity bound, not a cited threshold (research "30–800").
      min: 30,
      max: 800,
      helpText: defineText(
        "phoenix.fibrinogen.help",
        "Contributes 1 coagulation point when < 100 mg/dL. Accepts mg/dL or g/L.",
      ),
    },
    {
      id: "gcs_total",
      group: defineText("phoenix.group.neurological", "Neurological"),
      label: defineText("phoenix.gcs", "Glasgow Coma Scale (total)"),
      required: false,
      type: "numeric",
      unit: NO_UNIT,
      min: 3,
      max: 15,
      step: 1,
      helpText: defineText(
        "phoenix.gcs.help",
        "Total GCS 3–15. Contributes 1 neurologic point when ≤ 10. Only the numeric total is used.",
      ),
    },
    {
      id: "fixed_pupils",
      group: defineText("phoenix.group.neurological", "Neurological"),
      label: defineText("phoenix.fixed_pupils", "Bilaterally fixed pupils"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "phoenix.fixed_pupils.help",
        "Contributes 1 neurologic point (additive with the GCS point; neurologic component caps at 2).",
      ),
    },
  ] as const,
  interpretation: [
    {
      id: "below-threshold",
      appliesTo: "phoenix_total",
      min: null,
      max: 2,
      label: defineText("phoenix.band.below", "0–1"),
      description: defineText(
        "phoenix.band.below.desc",
        "Below the Phoenix threshold: in a child with suspected infection this does not meet the Phoenix criterion for sepsis. Interpret in the full clinical context.",
      ),
    },
    {
      id: "meets-criterion",
      appliesTo: "phoenix_total",
      min: 2,
      max: null,
      label: defineText("phoenix.band.meets", "≥ 2"),
      description: defineText(
        "phoenix.band.meets.desc",
        "In a child with suspected/confirmed infection, meets the Phoenix criterion for sepsis. Reported in-hospital mortality in the derivation/validation cohorts was ~7.1% (higher-resource) and ~28.5% (lower-resource); with ≥ 1 cardiovascular point the septic-shock criterion is also met (~10.8% / ~33.5%). These are population associations, not individual predictions.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al; SCCM Pediatric Sepsis Definition Task Force. Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):675–686.",
      pmid: "38245897",
      doi: "10.1001/jama.2024.0196",
      note: "Primary derivation/validation; Table 2 is the score.",
    },
    {
      citation:
        "Schlapbach LJ, Watson RS, Sorce LR, et al; SCCM Pediatric Sepsis Definition Task Force. International Consensus Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):665–674.",
      pmid: "38245889",
      doi: "10.1001/jama.2024.0179",
      note: "Companion consensus definition (sepsis = suspected infection + Phoenix ≥ 2; septic shock).",
    },
    {
      citation:
        "DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD. phoenix: an R package and Python module for calculating the Phoenix pediatric sepsis score and criteria. JAMIA Open. 2024;7(3):ooae066.",
      doi: "10.1093/jamiaopen/ooae066",
      note: "Reference implementation by task-force members; source of the worked vignettes and the half-open MAP interval detail.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: four-organ Phoenix Sepsis Score with age-banded MAP, sepsis and septic-shock flags.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-01",
      summary:
        "Limitations now state the SpO₂ 97/98 discontinuity outright: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98, because S/F is undefined above 97 and the missing-input convention then contributes 0 — so a well-saturated child on maximal support can fall below the total ≥ 2 sepsis threshold on respiratory grounds alone. Both halves are per the paper and neither was stated; a reader could have taken the 0 for reassurance. The four component maxima (respiratory 0–3, cardiovascular 0–6, coagulation 0–2, neurologic 0–2) are now declared for the result panel, and the inputs carry organ-system group headings. No threshold or computed value changed.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Threshold/branch-rule clinical score — cutoffs, arithmetic, and age bands are facts/procedures, not copyrightable expression. The authors additionally released an open-source reference implementation (CRAN/PyPI) and open-access papers. Only the numeric total GCS is consumed; no GCS response-descriptor item wording is reproduced (phoenix.md IP status).",
  },
  missingAsNormal: true,
  formula: defineText(
    "phoenix.formula",
    "Total (0–13) = respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2), each per JAMA 2024 Table 2. Respiratory is scored only when respiratory support is present, from the PaO₂:FiO₂ (P/F) ratio when an arterial gas is available, otherwise the SpO₂:FiO₂ (S/F) ratio when SpO₂ ≤ 97%: on invasive mechanical ventilation, 3 pts if P/F < 100 (S/F < 148) or 2 pts if P/F < 200 (S/F < 220); on any support, 1 pt if P/F < 400 (S/F < 292); otherwise 0 (PaO₂ and MAP in mmHg, FiO₂ a fraction). Cardiovascular sums vasoactive points (0 agents → 0, 1 → 1, ≥ 2 → 2), lactate points (< 5 → 0, 5 to < 11 → 1, ≥ 11 → 2 mmol/L), and age-banded MAP points (2 if MAP < low, 1 if low ≤ MAP < high, 0 if MAP ≥ high, with half-open [low, high) thresholds by age band). Coagulation adds 1 point each — platelets < 100 ×10³/µL, INR > 1.3, D-dimer > 2 mg/L FEU, fibrinogen < 100 mg/dL — capped at 2; neurologic adds 1 point for GCS ≤ 10 and 1 for bilaterally fixed pupils, capped at 2. A missing input contributes 0 to its component. Sepsis is reported as 1 when infection is suspected/confirmed and total ≥ 2; septic shock as 1 when sepsis is met and the cardiovascular component ≥ 1.",
  ),
  notes: defineText(
    "phoenix.notes",
    "Diagnostic criterion, not a graded severity ladder: sepsis = suspected/confirmed infection AND total ≥ 2; septic shock = sepsis AND cardiovascular component ≥ 1 (a cardiovascular point, not merely total ≥ 2). The vasoactive sub-score is a COUNT of distinct agents (0/1/≥2), not the VIS. Missing inputs contribute 0 to their component (reference-package convention), so the score reflects documented dysfunction — a teaching UI should show a missing input as missing, not as normal. The S/F ratio is used only when SpO₂ ≤ 97%; P/F is preferred when an arterial gas is available. That gate has a consequence worth stating outright, because it runs against intuition: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98 — the ratio simply is not computable above 97, and the missing-input convention then contributes 0. A well-saturated child on maximal support can therefore fall below the total ≥ 2 sepsis threshold on respiratory grounds alone. Read that as ‘not measurable’, never as ‘not hypoxaemic’, and obtain a blood gas. Only the numeric total GCS (3–15) is consumed; the GCS response-descriptor wording is a separate instrument (Teasdale & Jennett) and is not reproduced or licensed by the Phoenix papers. The validated cohort was children < 18 years and excluded newborns during the birth hospitalization and infants < 37 weeks post-conceptional age — applying the score to those groups is outside the validated population. The 8-organ research extension Phoenix-8 is out of scope. The MAP age bands are implemented as half-open [low, high) intervals (matching the reference package) so non-integer MAP scores exactly. The per-input plausible min/max are input-validity guardrails, not published Phoenix thresholds (the research labels these ranges as heuristics, not published thresholds); pao2/spo2/map upper bounds were widened beyond the research's 'typical' ranges to avoid false rejections and are annotated in code.",
  ),
  /**
   * Component maxima are JAMA 2024 Table 2 as transcribed in phoenix.md, NOT
   * read back off `calculate` below — three of the four are computed (a sum or
   * a cap) rather than assigned, so inferring them from the code would launder
   * an assumption into a published range. They sum to 13, the published total
   * maximum, which is the arithmetic check that they are the right four.
   */
  composition: {
    total: "phoenix_total",
    components: [
      { id: "respiratory", max: 3 },
      { id: "cardiovascular", max: 6 },
      { id: "coagulation", max: 2 },
      { id: "neurologic", max: 2 },
    ],
  },
  calculate: (values) => {
    // ---- 1. Respiratory (0–3) ----
    const support = values.resp_support?.value ?? "none";
    let respiratory = 0;
    if (support !== "none") {
      const imv = support === "imv";
      const fio2 = values.fio2?.value;
      const pao2 = values.pao2?.value;
      const spo2 = values.spo2?.value;
      if (fio2 !== undefined && pao2 !== undefined) {
        const pf = pao2 / fio2; // both canonical: mmHg / fraction
        if (imv && pf < 100) respiratory = 3;
        else if (imv && pf < 200) respiratory = 2;
        else if (pf < 400) respiratory = 1;
        else respiratory = 0;
      } else if (fio2 !== undefined && spo2 !== undefined && spo2 <= 97) {
        const sf = spo2 / fio2; // SpO₂ (%) / fraction; valid only when SpO₂ ≤ 97
        if (imv && sf < 148) respiratory = 3;
        else if (imv && sf < 220) respiratory = 2;
        else if (sf < 292) respiratory = 1;
        else respiratory = 0;
      }
    }

    // ---- 2. Cardiovascular (0–6) = vasoactives + lactate + age-banded MAP ----
    const nVaso = values.n_vasoactives?.value ?? 0;
    const vasoPts = nVaso >= 2 ? 2 : nVaso >= 1 ? 1 : 0;

    const lactate = values.lactate?.value;
    const lactatePts = lactate === undefined ? 0 : lactate >= 11 ? 2 : lactate >= 5 ? 1 : 0;

    const map = values.map?.value;
    const mapPts = map === undefined ? 0 : mapPoints(values.age_months.value, map);

    const cardiovascular = vasoPts + lactatePts + mapPts;

    // ---- 3. Coagulation (0–2): 1 point each, capped at 2 ----
    let coag = 0;
    const platelets = values.platelets?.value;
    if (platelets !== undefined && platelets < 100) coag += 1;
    const inr = values.inr?.value;
    if (inr !== undefined && inr > 1.3) coag += 1;
    const ddimer = values.ddimer?.value;
    if (ddimer !== undefined && ddimer > 2) coag += 1;
    const fibrinogen = values.fibrinogen?.value;
    if (fibrinogen !== undefined && fibrinogen < 100) coag += 1;
    const coagulation = Math.min(coag, 2);

    // ---- 4. Neurologic (0–2): additive, capped at 2 ----
    let neuro = 0;
    const gcs = values.gcs_total?.value;
    if (gcs !== undefined && gcs <= 10) neuro += 1;
    if (values.fixed_pupils?.value === true) neuro += 1;
    const neurologic = Math.min(neuro, 2);

    const total = respiratory + cardiovascular + coagulation + neurologic;
    const sepsis = values.suspected_infection.value && total >= 2 ? 1 : 0;
    const septicShock = sepsis === 1 && cardiovascular >= 1 ? 1 : 0;

    return [
      {
        id: "respiratory",
        label: defineText("phoenix.out.respiratory", "Respiratory component"),
        value: respiratory,
        unit: "",
        precision: 0,
      },
      {
        id: "cardiovascular",
        label: defineText("phoenix.out.cardiovascular", "Cardiovascular component"),
        value: cardiovascular,
        unit: "",
        precision: 0,
      },
      {
        id: "coagulation",
        label: defineText("phoenix.out.coagulation", "Coagulation component"),
        value: coagulation,
        unit: "",
        precision: 0,
      },
      {
        id: "neurologic",
        label: defineText("phoenix.out.neurologic", "Neurologic component"),
        value: neurologic,
        unit: "",
        precision: 0,
      },
      {
        id: "phoenix_total",
        label: defineText("phoenix.out.total", "Phoenix Sepsis Score (total)"),
        value: total,
        unit: "",
        precision: 0,
      },
      {
        id: "sepsis",
        label: defineText("phoenix.out.sepsis", "Meets sepsis criterion (1 = yes)"),
        value: sepsis,
        unit: "",
        precision: 0,
      },
      {
        id: "septic_shock",
        label: defineText("phoenix.out.shock", "Meets septic-shock criterion (1 = yes)"),
        value: septicShock,
        unit: "",
        precision: 0,
      },
    ];
  },
});
