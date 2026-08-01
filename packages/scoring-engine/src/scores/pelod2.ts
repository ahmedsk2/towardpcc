import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { creatinineUmolWithMgdl, lactateMmol } from "../units/concentration";
import { mmhgWithKpa } from "../units/pressure";
import { NO_UNIT } from "../units/types";

/**
 * PELOD-2 (PEdiatric Logistic Organ Dysfunction-2) — descriptive severity score
 * for multiple-organ dysfunction in the PICU. 10 items across 5 organ systems,
 * total 0–33; MAP and creatinine are age-banded. A second output reports the
 * predicted in-hospital mortality derived from the published logit
 * (logit = -6.61 + 0.47 × score). Every threshold, coefficient, age band and the
 * logit are transcribed from Leteurtre 2013 (PMID 23685639, Tables 2/5/6).
 * Research + full sourcing: docs/research/scores/pelod2.md.
 */

/** Age band selection for MAP and creatinine (months). */
interface AgeBand {
  /** MAP (mmHg): ≥ mapZero → 0 pts. */
  readonly mapZero: number;
  /** MAP (mmHg): ≥ mapTwo → 2 pts. */
  readonly mapTwo: number;
  /** MAP (mmHg): ≥ mapThree → 3 pts; below → 6 pts. */
  readonly mapThree: number;
  /** Creatinine (µmol/L): ≥ creatinine2pt → 2 pts; below → 0. */
  readonly creatinine2pt: number;
}

/**
 * Age bands (months): 0–<1, 1–11, 12–23, 24–59, 60–143, ≥144. MAP lower bounds
 * and creatinine thresholds are the printed ranges of Leteurtre 2013 Table 6
 * (age cutoffs from Table 2). Ranges are encoded exactly as printed
 * (pelod2.md §Limitations: "Encode the printed ranges exactly").
 */
function ageBandFor(months: number): AgeBand {
  if (months < 1) return { mapZero: 46, mapTwo: 31, mapThree: 17, creatinine2pt: 70 };
  if (months < 12) return { mapZero: 55, mapTwo: 39, mapThree: 25, creatinine2pt: 23 };
  if (months < 24) return { mapZero: 60, mapTwo: 44, mapThree: 31, creatinine2pt: 35 };
  // Table 6 prints a one-value gap in this band (2 pts = 46–61, 3 pts = 32–44);
  // the ≥-cascade below scores MAP = 45 as 3 pts (the natural lower-band fill).
  if (months < 60) return { mapZero: 62, mapTwo: 46, mapThree: 32, creatinine2pt: 51 };
  if (months < 144) return { mapZero: 65, mapTwo: 49, mapThree: 36, creatinine2pt: 59 };
  return { mapZero: 67, mapTwo: 52, mapThree: 38, creatinine2pt: 93 };
}

/** Neurologic — GCS (lowest): ≥11 → 0, 5–10 → 1, 3–4 → 4. */
function gcsPoints(gcs: number): number {
  if (gcs >= 11) return 0;
  if (gcs >= 5) return 1;
  return 4;
}

/** Cardiovascular — lactate (mmol/L): <5 → 0, 5–10.9 → 1, ≥11 → 4. */
function lactatePoints(mmol: number): number {
  if (mmol >= 11) return 4;
  if (mmol >= 5) return 1;
  return 0;
}

/** Cardiovascular — MAP (mmHg), age-banded. */
function mapPoints(mmHg: number, band: AgeBand): number {
  if (mmHg >= band.mapZero) return 0;
  if (mmHg >= band.mapTwo) return 2;
  if (mmHg >= band.mapThree) return 3;
  return 6;
}

/** Renal — creatinine (µmol/L), age-banded: ≥ threshold → 2, else 0. */
function creatininePoints(umol: number, band: AgeBand): number {
  return umol >= band.creatinine2pt ? 2 : 0;
}

/**
 * Respiratory — PaO₂/FiO₂: ≥61 → 0, ≤60 → 2 (Table 6). The two printed bins
 * divide at 60/61; a fractional ratio in the open (60, 61) interval is treated
 * as normal (> 60 → 0).
 */
function pfPoints(ratio: number): number {
  return ratio <= 60 ? 2 : 0;
}

/** Respiratory — PaCO₂ (mmHg): ≤58 → 0, 59–94 → 1, ≥95 → 3. */
function paco2Points(mmHg: number): number {
  if (mmHg >= 95) return 3;
  if (mmHg >= 59) return 1;
  return 0;
}

/** Hematologic — WBC (×10⁹/L): >2 → 0, ≤2 → 2. */
function wbcPoints(count: number): number {
  return count <= 2 ? 2 : 0;
}

/** Hematologic — platelets (×10⁹/L): ≥142 → 0, 77–141 → 1, ≤76 → 2. */
function plateletPoints(count: number): number {
  if (count <= 76) return 2;
  if (count <= 141) return 1;
  return 0;
}

export const pelod2 = defineScore({
  id: "pelod2",
  slug: "pelod2",
  name: "PELOD-2 (Pediatric Logistic Organ Dysfunction-2)",
  version: "1.0.0",
  status: "published",
  category: "organ-dysfunction",
  inputs: [
    {
      id: "age_months",
      group: defineText("pelod2.group.patient", "Patient"),
      label: defineText("pelod2.age", "Patient age"),
      required: true,
      type: "numeric",
      unit: { canonical: "months" },
      // Bounds from the paper's inclusion window: premature newborns and
      // patients > 18 y (216 mo) were excluded (Leteurtre 2013, Methods).
      min: 0,
      max: 216,
      helpText: defineText(
        "pelod2.age.help",
        "In months. Selects the age band for mean arterial pressure and creatinine.",
      ),
    },
    {
      id: "gcs",
      group: defineText("pelod2.group.neurological", "Neurological"),
      label: defineText("pelod2.gcs", "Glasgow Coma Scale (lowest)"),
      required: true,
      type: "numeric",
      unit: NO_UNIT,
      // GCS instrument range (external scale; see notes/ipStatus).
      min: 3,
      max: 15,
      step: 1,
      helpText: defineText(
        "pelod2.gcs.help",
        "Lowest total GCS in the window; use the pre-sedation estimate if sedated.",
      ),
    },
    {
      id: "pupils",
      group: defineText("pelod2.group.neurological", "Neurological"),
      label: defineText("pelod2.pupils", "Pupillary reaction"),
      required: true,
      type: "categorical",
      options: [
        { value: "both_reactive", label: defineText("pelod2.pupils.reactive", "Both reactive") },
        { value: "both_fixed", label: defineText("pelod2.pupils.fixed", "Both fixed") },
      ],
      helpText: defineText(
        "pelod2.pupils.help",
        "A nonreactive pupil must be > 3 mm; do not assess after iatrogenic dilatation.",
      ),
    },
    {
      id: "lactate",
      group: defineText("pelod2.group.cardiovascular", "Cardiovascular"),
      label: defineText("pelod2.lactate", "Lactatemia"),
      required: true,
      type: "numeric",
      unit: lactateMmol,
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 30,
      helpText: defineText("pelod2.lactate.help", "Blood lactate. Accepts mmol/L or mg/dL."),
    },
    {
      id: "map",
      group: defineText("pelod2.group.cardiovascular", "Cardiovascular"),
      label: defineText("pelod2.map", "Mean arterial pressure"),
      required: true,
      type: "numeric",
      unit: { canonical: "mmHg" },
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 200,
      helpText: defineText(
        "pelod2.map.help",
        "Do not assess during crying or iatrogenic agitation. Scored against the age band.",
      ),
    },
    {
      id: "creatinine",
      group: defineText("pelod2.group.renal", "Renal"),
      label: defineText("pelod2.creatinine", "Serum creatinine"),
      required: true,
      type: "numeric",
      unit: creatinineUmolWithMgdl,
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 1500,
      helpText: defineText(
        "pelod2.creatinine.help",
        "Accepts µmol/L or mg/dL. Scored against the age band.",
      ),
    },
    {
      id: "pao2_fio2",
      group: defineText("pelod2.group.respiratory", "Respiratory"),
      label: defineText("pelod2.pf", "PaO₂/FiO₂ ratio"),
      required: true,
      type: "numeric",
      unit: NO_UNIT,
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 600,
      helpText: defineText(
        "pelod2.pf.help",
        "Arterial PaO₂ (mmHg) ÷ FiO₂ (0–1). Considered normal in cyanotic congenital heart disease.",
      ),
    },
    {
      id: "paco2",
      group: defineText("pelod2.group.respiratory", "Respiratory"),
      label: defineText("pelod2.paco2", "PaCO₂"),
      required: true,
      type: "numeric",
      unit: mmhgWithKpa,
      // input-validity bounds, not cited clinical thresholds (pelod2.md §Inputs).
      min: 10,
      max: 200,
      helpText: defineText(
        "pelod2.paco2.help",
        "Arterial, capillary, or venous. Accepts mmHg or kPa.",
      ),
    },
    {
      id: "invasive_vent",
      group: defineText("pelod2.group.respiratory", "Respiratory"),
      label: defineText("pelod2.vent", "Invasive mechanical ventilation"),
      required: true,
      type: "boolean",
      helpText: defineText("pelod2.vent.help", "Mask ventilation does not count as invasive."),
    },
    {
      id: "wbc",
      group: defineText("pelod2.group.haematological", "Haematological"),
      label: defineText("pelod2.wbc", "White blood cell count"),
      required: true,
      type: "numeric",
      unit: { canonical: "10^9/L" },
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 100,
      helpText: defineText("pelod2.wbc.help", "In ×10⁹/L (equivalently ×10³/µL)."),
    },
    {
      id: "platelets",
      group: defineText("pelod2.group.haematological", "Haematological"),
      label: defineText("pelod2.platelets", "Platelet count"),
      required: true,
      type: "numeric",
      unit: { canonical: "10^9/L" },
      min: 0,
      // input-validity bound, not a cited clinical threshold (pelod2.md §Inputs).
      max: 1000,
      helpText: defineText("pelod2.platelets.help", "In ×10⁹/L (equivalently ×10³/µL)."),
    },
  ] as const,
  interpretation: [],
  // Bands are a CONTENT GAP here, not an absence by design: this score has
  // published mortality strata and they have not been authored yet. Saying so
  // is the difference between "no band applies" and "we have not written one".
  interpretationStatus: "pending",
  references: [
    {
      citation:
        "Leteurtre S, Duhamel A, Salleron J, Grandbastien B, Lacroix J, Leclerc F; GFRUP. PELOD-2: an update of the PEdiatric logistic organ dysfunction score. Crit Care Med. 2013;41(7):1761–1773.",
      pmid: "23685639",
      doi: "10.1097/CCM.0b013e31828a2bbd",
    },
    {
      citation:
        "Leteurtre S, Duhamel A, Deken V, Lacroix J, Leclerc F; GFRUP. Daily estimation of the severity of organ dysfunctions in critically ill children by using the PELOD-2 score. Crit Care. 2015;19:324.",
      pmid: "26369662",
      doi: "10.1186/s13054-015-1054-y",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: 10-item PELOD-2 total (0–33) with age-banded MAP/creatinine and the published mortality logit as a secondary output.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "PELOD-2's algorithm, thresholds, coefficients and age bands are non-copyrightable facts; the authors state the score 'will be in the public domain' and may be freely used (Leteurtre 2013, Abstract/Discussion). Item labels (Both reactive/Both fixed, yes/no) are functional. GCS is an external instrument (Teasdale & Jennett) whose response-descriptor wording must be sourced separately if a GCS entry widget is built (pelod2.md IP status).",
  },
  formula: defineText(
    "pelod2.formula",
    "PELOD-2 total = sum of 10 organ-dysfunction items, range 0–33. Neurologic: Glasgow Coma Scale ≥ 11 → 0, 5–10 → 1, 3–4 → 4; pupils both fixed → 5 (both reactive → 0). Cardiovascular: lactate < 5 mmol/L → 0, 5–10.9 → 1, ≥ 11 → 4; mean arterial pressure (mmHg) is scored 0 / 2 / 3 / 6 against age-banded cutoffs (a descending cascade: ≥ the 0-point cutoff → 0, else ≥ the 2-point cutoff → 2, else ≥ the 3-point cutoff → 3, else → 6) for the six age bands 0–<1, 1–11, 12–23, 24–59, 60–143 and ≥ 144 months. Renal: serum creatinine (µmol/L) ≥ the age-band threshold → 2, else 0. Respiratory: PaO₂/FiO₂ ≤ 60 → 2 (> 60 → 0); PaCO₂ ≤ 58 mmHg → 0, 59–94 → 1, ≥ 95 → 3; invasive mechanical ventilation → 3 (none → 0). Hematologic: white-cell count ≤ 2 ×10⁹/L → 2 (> 2 → 0); platelets ≥ 142 ×10⁹/L → 0, 77–141 → 1, ≤ 76 → 2. All age-banded MAP and creatinine cutoffs are transcribed from Leteurtre 2013 (Table 6). A second output reports predicted in-hospital mortality = 1 ÷ (1 + e^−logit) × 100%, with logit = −6.61 + 0.47 × total (Leteurtre 2013).",
  ),
  // BESIDE THE NUMBER, not only in the prose below it.
  //
  // The hazard is stated in `notes` and rendered in a Limitations tab a reader
  // has to open. But it is result-invalidating: the source scores an unmeasured
  // variable as normal, this implementation rejects blanks outright — correctly
  // — and so the caller is instructed to enter a normal value for anything not
  // measured. A falsely low total therefore stays reachable, by the clinician's
  // hand rather than by the engine's, and `missingAsNormal` cannot flag it
  // because its predicate ("a blank NON-REQUIRED input") is vacuous here.
  cautions: [
    defineText(
      "pelod2.caution.unmeasured",
      "Every item is required, and an unmeasured variable must be entered as normal — as the source specifies. A dataset with unmeasured items therefore understates the score, and the total should not be read as complete unless every item was actually measured.",
    ),
  ],
  notes: defineText(
    "pelod2.notes",
    "PELOD-2 describes the severity of multiple-organ dysfunction; the authors frame it as a descriptor, not an individual mortality predictor. The predicted-mortality output is derived from the published logit (logit = -6.61 + 0.47 × score; probability = 1/(1 + exp(-logit))) and is a population-level association in the derivation cohort (France/Belgium, n=3,671, 6% mortality); it must not be read as an individual prognosis and requires recalibration before predictive use elsewhere. Each item uses the worst value in the scoring window; per the source an unmeasured variable is scored normal (0 points), so this tool requires every input and the caller must supply a normal value for anything not measured — a partial dataset can understate the score. Pupillary reaction is binary in the source (Both reactive = 0, Both fixed = 5); the paper gives NO point value for a unilateral fixed pupil [NEEDS SOURCE], so only 'Both fixed' scores here and unilateral findings need an explicit clinical-team rule. GCS is consumed only as a total-score band (3–4, 5–10, ≥11); the GCS instrument itself is external — verify descriptor-wording provenance wherever a GCS entry widget is built. MAP and creatinine thresholds are age-banded exactly as printed in Leteurtre 2013 Table 6. Context (not decision thresholds): observed in-PICU mortality rose with the number of dysfunctional organs (0→0.4%, 3→7.1%, 4→30.5%, 5→59.0%; Table 8), and the derivation-cohort predicted mortality is ≈0.1% at a total of 0, ≈1.4% at 5, ≈12.9% at 10, ≈60.8% at 15, ≈94.2% at 20 and ≈99.4% at 25.",
  ),
  // Maxima are Leteurtre 2013 Table 7, independently re-derived term by term
  // from the branches above in docs/research/scores/pelod2.md §Organ maxima
  // (9 + 10 + 2 + 8 + 4 = 33, the published ceiling). They are age-independent:
  // the age bands move the MAP/creatinine thresholds, not the point values.
  composition: {
    total: "pelod2",
    components: [
      { id: "neurologic", max: 9 },
      { id: "cardiovascular", max: 10 },
      { id: "renal", max: 2 },
      { id: "respiratory", max: 8 },
      { id: "haematologic", max: 4 },
    ],
  },
  calculate: (values) => {
    const band = ageBandFor(values.age_months.value);

    // The ten items grouped into the five organ systems of Leteurtre 2013
    // Table 6 — the published structure, not a grouping invented here. This is
    // a pure re-association of the SAME ten terms that were previously summed
    // inline: same terms, same order, integer addition, so `points` below is
    // the identical number it has always been. Every worked example asserts its
    // total, and the maxima (9/10/2/8/4 = 33) are derived term by term in
    // docs/research/scores/pelod2.md §Organ maxima and reconcile with Table 7.
    const neurologic = gcsPoints(values.gcs.value) + (values.pupils.value === "both_fixed" ? 5 : 0);
    const cardiovascular = lactatePoints(values.lactate.value) + mapPoints(values.map.value, band);
    const renal = creatininePoints(values.creatinine.value, band);
    const respiratory =
      pfPoints(values.pao2_fio2.value) +
      paco2Points(values.paco2.value) +
      (values.invasive_vent.value ? 3 : 0);
    const haematologic = wbcPoints(values.wbc.value) + plateletPoints(values.platelets.value);

    const points = neurologic + cardiovascular + renal + respiratory + haematologic;

    const logit = -6.61 + 0.47 * points;
    const mortalityPercent = (1 / (1 + Math.exp(-logit))) * 100;

    return [
      {
        id: "pelod2",
        label: defineText("pelod2.total", "PELOD-2 total"),
        value: points,
        unit: "",
        precision: 0,
      },
      {
        id: "neurologic",
        label: defineText("pelod2.organ.neurologic", "Neurologic"),
        value: neurologic,
        unit: "",
        precision: 0,
      },
      {
        id: "cardiovascular",
        label: defineText("pelod2.organ.cardiovascular", "Cardiovascular"),
        value: cardiovascular,
        unit: "",
        precision: 0,
      },
      {
        id: "renal",
        label: defineText("pelod2.organ.renal", "Renal"),
        value: renal,
        unit: "",
        precision: 0,
      },
      {
        id: "respiratory",
        label: defineText("pelod2.organ.respiratory", "Respiratory"),
        value: respiratory,
        unit: "",
        precision: 0,
      },
      {
        id: "haematologic",
        label: defineText("pelod2.organ.haematologic", "Haematologic"),
        value: haematologic,
        unit: "",
        precision: 0,
      },
      {
        id: "mortality_probability",
        label: defineText(
          "pelod2.mortality",
          "Predicted in-hospital mortality (population estimate)",
        ),
        value: mortalityPercent,
        unit: "%",
        precision: 2,
      },
    ];
  },
});
