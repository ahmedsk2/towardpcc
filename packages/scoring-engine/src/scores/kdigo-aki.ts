import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { creatinineMgdl } from "../units/concentration";
import type { UnitSpec } from "../units/types";

/**
 * KDIGO AKI staging (pediatric) — KDIGO 2012 acute-kidney-injury classification.
 *
 * NOT a summed score: it classifies into an INTEGER Stage 0–3 as the MAXIMUM of
 * two independent axes (KDIGO Table 2) — a serum-creatinine axis and a
 * urine-output axis. RRT and, in children, an estimated GFR < 35 mL/min/1.73 m²
 * force Stage 3. Stage 0 means the KDIGO definition of AKI is not met on the
 * criteria entered.
 *
 * This is a PEDIATRIC calculator: the eGFR < 35 branch of Stage 3 is exclusive
 * to patients < 18 years in KDIGO Table 2, so an eGFR is applied whenever one is
 * supplied (do not supply an eGFR for an adult — see notes). Serum creatinine is
 * canonical mg/dL (accepts µmol/L via the shared concentration unit); urine
 * output is entered directly as a sustained rate in mL/kg/h.
 *
 * Research + full sourcing: docs/research/scores/kdigo-aki.md.
 */

/** Urine output as a sustained rate; canonical-only, no unit conversion. */
const ML_PER_KG_H: UnitSpec = { canonical: "mL/kg/h" };
/** Estimated GFR (bedside Schwartz); canonical-only, no unit conversion. */
const EGFR_UNIT: UnitSpec = { canonical: "mL/min/1.73m2" };

export const kdigoAki = defineScore({
  id: "kdigo-aki",
  slug: "kdigo-aki",
  name: "KDIGO AKI staging (pediatric)",
  version: "1.0.0",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "scr",
      label: defineText("kdigo.scr", "Current serum creatinine"),
      required: true,
      type: "numeric",
      unit: creatinineMgdl,
      // input-validity bound, not a cited threshold (kdigo-aki.md lists ~0.1–15
      // mg/dL physiologic; precise pediatric norms are age-dependent and not in
      // KDIGO Table 2). The ≥ 4.0 mg/dL Stage-3 cutoff sits inside this range.
      min: 0.1,
      max: 15,
      helpText: defineText(
        "kdigo.scr.help",
        "The current measured serum creatinine. Accepts mg/dL or µmol/L. Drives the ×-baseline ratio and the ≥ 4.0 mg/dL Stage-3 threshold.",
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
        "The patient's baseline creatinine (known outpatient value, or a dynamic 7-day baseline). Needed for the ×-baseline ratio and the ≥ 0.3 mg/dL rise. Accepts mg/dL or µmol/L.",
      ),
    },
    {
      id: "urine_output",
      label: defineText("kdigo.urine_output", "Urine output (sustained rate)"),
      required: false,
      type: "numeric",
      unit: ML_PER_KG_H,
      // input-validity bound, not a cited threshold (kdigo-aki.md: rate 0 – ~10
      // mL/kg/h physiologic). 0 = anuria. The 0.5 / 0.3 mL/kg/h cutoffs are the
      // cited KDIGO thresholds, applied in calculate.
      min: 0,
      max: 10,
      helpText: defineText(
        "kdigo.urine_output.help",
        "Weight-indexed urine output in mL/kg/h, over the KDIGO collection window. < 0.5 is oliguric; < 0.3 is the Stage-3 threshold. Compute as volume ÷ weight ÷ hours.",
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
        "Estimated GFR in mL/min/1.73 m² (bedside Schwartz: 0.413 × height[cm] ÷ creatinine[mg/dL]). Only supply for a patient < 18 years: < 35 forces Stage 3 (pediatric-only KDIGO branch).",
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
        "The KDIGO 2012 definition of acute kidney injury is not met on the criteria entered. Interpret in the full clinical context; absence of a criterion here reflects the data provided, not proof that AKI is absent.",
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
        "KDIGO Stage 1 — the least severe AKI category: serum creatinine 1.5–1.9× baseline or a rise of ≥ 0.3 mg/dL, or urine output < 0.5 mL/kg/h. Higher stages are associated with worse outcomes in the literature; the stage is a descriptive classification, not a treatment threshold.",
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
        "KDIGO Stage 2 — an intermediate AKI category: serum creatinine 2.0–2.9× baseline (or the corresponding sustained urine-output criterion).",
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
        "KDIGO Stage 3 — the most severe AKI category: serum creatinine ≥ 3.0× baseline or ≥ 4.0 mg/dL, initiation of renal replacement therapy, urine output < 0.3 mL/kg/h, or — in a patient < 18 years — an estimated GFR < 35 mL/min/1.73 m².",
      ),
    },
  ],
  references: [
    {
      citation:
        "KDIGO Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1–138. Definition = Rec 2.1.1; staging = Rec 2.1.2 / Table 2.",
      doi: "10.1038/kisup.2012.1",
      note: "Primary source of record for every staging threshold and the max-of-two-axes rule.",
    },
    {
      citation:
        "Palevsky PM, et al. Reading between the (guide)lines — the KDIGO practice guideline on acute kidney injury in the individual patient. Kidney Int. 2014;85(1):49–61.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3877708/",
      note: "Reproduces KDIGO Table 2 verbatim including the '<18 years, eGFR < 35' Stage-3 branch; primary extraction source.",
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
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: KDIGO 2012 AKI staging (Stage 0–3) as the max of the serum-creatinine and urine-output axes, with the pediatric eGFR < 35 and RRT Stage-3 branches.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "KDIGO AKI staging is a set of factual numeric cut-points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations); facts and mathematical criteria are not copyrightable and may be implemented directly with attribution. No proprietary response-descriptor prose is reproduced. The bedside Schwartz equation is likewise a formula (kdigo-aki.md IP status).",
  },
  formula: defineText(
    "kdigo.formula",
    "KDIGO stage = the higher (maximum) of two independent axes. Serum-creatinine axis: Stage 1 if current creatinine is 1.5–1.9× baseline or has risen ≥ 0.3 mg/dL; Stage 2 if 2.0–2.9× baseline; Stage 3 if ≥ 3.0× baseline, or ≥ 4.0 mg/dL, or renal replacement therapy has started, or (in a child) estimated GFR < 35 mL/min/1.73 m². Urine-output axis: Stage 3 if < 0.3 mL/kg/h, Stage 1 if 0.3 to < 0.5 mL/kg/h (the KDIGO duration windows are assumed met). The reported stage is the maximum of the two axes; if neither axis is met the stage is 0 (AKI definition not met).",
  ),
  notes: defineText(
    "kdigo.notes",
    "Not a summed score: the serum-creatinine and urine-output axes are evaluated independently and the MAXIMUM stage governs — treating it as additive is wrong. This is a pediatric calculator: the eGFR < 35 mL/min/1.73 m² branch is exclusive to patients < 18 years in KDIGO Table 2 and is applied here whenever an eGFR is supplied, so do not enter an eGFR for an adult. Baseline creatinine is the hardest input — KDIGO does not fix a single pediatric baseline-creatinine method [NEEDS SOURCE for a KDIGO-endorsed pediatric baseline rule]; the baseline supplied here drives the ratio-based and ≥ 0.3 mg/dL-rise stages, and the ≥ 0.3 mg/dL rise is applied as (current − baseline) rather than a timed 48-hour delta. Urine output is entered as a single sustained rate: because a rate alone cannot distinguish the KDIGO duration windows (Stage 1 is < 0.5 mL/kg/h for 6–12 h; Stage 2 is < 0.5 mL/kg/h for ≥ 12 h), the < 0.5 (but ≥ 0.3) band is reported as Stage 1 (the minimum-guaranteed stage, not over-staged); assigning Stage 2 from urine output requires a confirmed ≥ 12 h window not captured by a single rate. The pediatric eGFR branch is contested for young children — GFR rises developmentally and the bedside Schwartz equation was validated ~1–16 y, so do not extrapolate to neonates without a neonatal-specific estimator [NEEDS SOURCE for a neonatal eGFR method]. The predecessor pediatric system pRIFLE (Akcan-Arikan 2007) is a separate instrument and is not reproduced here. Creatinine SI↔conventional conversion reuses the shared clinical factor (1 mg/dL = 88.42 µmol/L); KDIGO's rounded 26.5 / 353.6 µmol/L equivalents of the 0.3 / 4.0 mg/dL cutoffs are not used because the mg/dL values are authoritative. Higher KDIGO stage is associated with higher mortality and RRT risk in the outcome literature, but the staging itself is a classification, not a treatment threshold — keep any display descriptive. The per-input plausible min/max are input-validity guardrails, not published KDIGO thresholds.",
  ),
  calculate: (values) => {
    const scr = values.scr.value; // mg/dL (canonical), required
    const baseline = values.scr_baseline?.value; // mg/dL (canonical)
    const uo = values.urine_output?.value; // mL/kg/h
    const egfr = values.egfr?.value; // mL/min/1.73 m²
    const onRrt = values.rrt?.value === true;

    // Float tolerance so a value that IS a KDIGO cutoff but drifts under binary
    // subtraction/division (e.g. 3.3 − 3.0 = 0.29999…, a true 0.3 rise; a true
    // 2.0× ratio computing as 1.99999…) still meets the "≥" threshold. This is a
    // rounding guard on the comparison, not a clinical value.
    const EPS = 1e-9;

    // ---- Serum-creatinine axis (KDIGO Table 2) ----
    let scrStage = 0;
    if (baseline !== undefined) {
      const ratio = scr / baseline;
      if (ratio >= 3 - EPS)
        scrStage = 3; // ≥ 3.0× baseline → Stage 3
      else if (ratio >= 2 - EPS)
        scrStage = 2; // 2.0–2.9× baseline → Stage 2
      else if (ratio >= 1.5 - EPS) scrStage = 1; // 1.5–1.9× baseline → Stage 1
      // Absolute rise ≥ 0.3 mg/dL → at least Stage 1 (KDIGO Rec 2.1.1 / Stage 1).
      if (scr - baseline >= 0.3 - EPS && scrStage < 1) scrStage = 1;
    }
    if (scr >= 4) scrStage = 3; // absolute SCr ≥ 4.0 mg/dL → Stage 3
    if (egfr !== undefined && egfr < 35) scrStage = 3; // pediatric eGFR < 35 → Stage 3
    if (onRrt) scrStage = 3; // RRT started → Stage 3

    // ---- Urine-output axis (KDIGO Table 2; duration windows assumed met) ----
    let uoStage = 0;
    if (uo !== undefined) {
      if (uo < 0.3)
        uoStage = 3; // < 0.3 mL/kg/h (for ≥ 24 h / anuria) → Stage 3
      else if (uo < 0.5) uoStage = 1; // < 0.5 mL/kg/h → Stage 1 (see notes)
    }

    // ---- Final stage = max of the two axes ----
    const stage = Math.max(scrStage, uoStage);

    return [
      {
        id: "kdigo_stage",
        label: defineText("kdigo.out.stage", "KDIGO AKI stage"),
        value: stage,
        unit: "",
        precision: 0,
      },
    ];
  },
});
