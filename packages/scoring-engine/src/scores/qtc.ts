import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { bpmWithRr, msWithSeconds } from "../units/cardiac";

/**
 * Corrected QT interval (QTc) — the two classic heart-rate corrections of the
 * QT interval, emitted side by side:
 *
 *   Bazett (1920):     QTc = QT / √RR        (RR in seconds)
 *   Fridericia (1920): QTc = QT / RR^(1/3)   (RR in seconds; cube root of RR)
 *
 * with RR = 60 / HR. Both estimate the QT the patient would have at HR 60
 * (RR = 1 s), where the correction factor is 1 and QTc = QT. Bazett over-corrects
 * at fast rates and under-corrects at slow rates, so both are shown and the
 * pediatric prolongation bands are applied only to the Bazett value (the
 * literature's thresholds were Bazett-derived). Research + full sourcing:
 * docs/research/scores/qtc.md.
 *
 * Not a clinical device: a prolonged QTc is a screening flag, not a diagnosis.
 */
export const qtc = defineScore({
  id: "qtc",
  slug: "qtc",
  name: "Corrected QT interval (QTc — Bazett & Fridericia)",
  version: "1.0.0",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "qt",
      label: defineText("qtc.qt", "Measured QT interval"),
      required: true,
      type: "numeric",
      unit: msWithSeconds,
      // Input-validity bounds, not a cited threshold (qtc.md: ~200–700 ms sanity guards).
      min: 200,
      max: 700,
      helpText: defineText(
        "qtc.qt.help",
        "QT measured from QRS onset to end of the T wave (lead II or V5), U wave excluded. Accepts ms or s; QTc is returned in the same unit (ms).",
      ),
    },
    {
      id: "hr",
      label: defineText("qtc.hr", "Heart rate (or R–R interval)"),
      required: true,
      type: "numeric",
      unit: bpmWithRr,
      // Input-validity bounds, not a cited threshold (qtc.md: ~30–250 bpm sanity guards,
      // equivalently RR ~0.24–2.0 s). Children run high rates, which is why the correction
      // choice matters.
      min: 30,
      max: 250,
      helpText: defineText(
        "qtc.hr.help",
        "Enter the heart rate in beats/min, or the R–R interval directly (unit ms or s). Internally converted to RR in seconds (RR = 60 / HR).",
      ),
    },
  ] as const,
  // Pediatric prolonged-QTc thresholds (Bazett-based): ≤440 normal, 440–460 borderline,
  // >460 prolonged, ≥480 diagnostic-level for LQTS (qtc.md Interpretation bands;
  // Phan 2015; Andršová 2020). Ascending in "badness"; boundary ownership matches the
  // source wording (≤440, ≤460, ≥480), so upper bounds are inclusive up to 460 and the
  // 480 line is an inclusive lower bound. Applied ONLY to the Bazett QTc — the research
  // states these cutoffs are not equivalent for Fridericia.
  interpretation: [
    {
      id: "normal",
      appliesTo: "qtc_bazett",
      min: null,
      max: 440,
      maxInclusive: true,
      label: defineText("qtc.band.normal", "≤ 440 ms"),
      description: defineText(
        "qtc.band.normal.desc",
        "At or below the pediatric upper limit of normal for a Bazett-corrected QTc (Andršová 2020; Phan 2015).",
      ),
    },
    {
      id: "borderline",
      appliesTo: "qtc_bazett",
      min: 440,
      minInclusive: false,
      max: 460,
      maxInclusive: true,
      label: defineText("qtc.band.borderline", "> 440 to ≤ 460 ms"),
      description: defineText(
        "qtc.band.borderline.desc",
        "Borderline zone between the pediatric upper limit of normal (~440 ms) and the prolonged threshold (460 ms) for a Bazett QTc (Andršová 2020; Phan 2015).",
      ),
    },
    {
      id: "prolonged",
      appliesTo: "qtc_bazett",
      min: 460,
      minInclusive: false,
      max: 480,
      maxInclusive: false,
      label: defineText("qtc.band.prolonged", "> 460 to < 480 ms"),
      description: defineText(
        "qtc.band.prolonged.desc",
        "Above the pediatric prolonged-QTc threshold of 460 ms for a Bazett QTc (Phan 2015 endorsed 460 ms in infants/young children; Andršová 2020).",
      ),
    },
    {
      id: "markedly-prolonged",
      appliesTo: "qtc_bazett",
      min: 480,
      minInclusive: true,
      max: null,
      label: defineText("qtc.band.markedly-prolonged", "≥ 480 ms"),
      description: defineText(
        "qtc.band.markedly-prolonged.desc",
        "At or above the level Andršová 2020 cite as diagnostic of long QT syndrome for a Bazett QTc. QTc alone is not diagnostic — LQTS is established with full criteria (Schwartz score, symptoms, family history, genetics).",
      ),
    },
  ],
  references: [
    {
      citation:
        "Bazett HC. An analysis of the time-relations of electrocardiograms. Heart. 1920;7:353–370. Reprinted Ann Noninvasive Electrocardiol. 1997;2(2):177–194.",
      doi: "10.1111/j.1542-474X.1997.tb00325.x",
    },
    {
      citation:
        "Fridericia LS. Die Systolendauer im Elektrokardiogramm bei normalen Menschen und bei Herzkranken. Acta Med Scand. 1920;53:469–486. English translation Ann Noninvasive Electrocardiol. 2003;8(4):343–351.",
      doi: "10.1111/j.0954-6820.1920.tb18266.x",
    },
    {
      citation:
        "Phan DQ, Silka MJ, Lan Y-T, Chang R-KR. Comparison of formulas for calculation of the corrected QT interval in infants and young children. J Pediatr. 2015;166(4):960–964.",
      pmid: "25648293",
      doi: "10.1016/j.jpeds.2014.12.037",
    },
    {
      citation:
        "Andršová I, Hnatkova K, Helánová K, et al. Problems with Bazett QTc correction in paediatric screening of prolonged QTc interval. BMC Pediatr. 2020;20:558.",
      pmid: "33317470",
      doi: "10.1186/s12887-020-02460-8",
    },
    {
      citation:
        'Goldenberg I, Moss AJ, Zareba W. QT interval: how to measure it and what is "normal." J Cardiovasc Electrophysiol. 2006;17(3):333–336.',
      pmid: "16643414",
      doi: "10.1111/j.1540-8167.2006.00408.x",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: QTc by Bazett and Fridericia with pediatric Bazett-based prolongation bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Both corrections are mathematical formulas (√RR and RR^(1/3) normalizations) and the pediatric thresholds (440/460/480 ms) are numeric facts from the literature — neither is copyrightable (qtc.md IP status).",
  },
  formula: defineText(
    "qtc.formula",
    "Convert the heart rate to the R–R interval in seconds: RR = 60 ÷ HR (if you enter the R–R interval directly it is used as given). Bazett QTc = QT ÷ √RR. Fridericia QTc = QT ÷ RR^(1/3) (the cube root of RR). Both use RR in seconds and return QTc in the same unit as the QT you enter (milliseconds). At a heart rate of 60 (RR = 1 s) both corrections equal the raw QT.",
  ),
  notes: defineText(
    "qtc.notes",
    "Not a clinical device: a prolonged QTc is a screening flag, not a diagnosis of long QT syndrome (established with full criteria — Schwartz score, symptoms, family history, genetics). Formula choice changes the answer: Bazett over-corrects at fast rates and under-corrects at slow rates, so it systematically over-calls prolongation in children (who run high heart rates); when HR is outside ~60–100 bpm, Fridericia is the more defensible correction. Interpretation bands are applied ONLY to the Bazett QTc, because the pediatric 440/460/480 ms thresholds (Phan 2015; Andršová 2020) were derived with Bazett and the research states they are not equivalent for a Fridericia QTc; the Fridericia value is reported without bands. Adult sex-specific cutoffs (Goldenberg 2006) must not be applied to children. QTc is only as good as the QT measurement (lead, tangent method, U-wave exclusion, machine vs manual). [NEEDS SOURCE]: an authoritative pediatric QT/HR reference-interval table — the QT (~200–700 ms) and HR (~30–250 bpm) input bounds here are engineering sanity guards, not values from a fetched normative table. [NEEDS SOURCE]: the exact Goldenberg 2006 age/sex-binned millisecond boundaries could not be retrieved from an open full-text source.",
  ),
  calculate: (values) => {
    // Return RAW computed QTc; `precision` rounds for DISPLAY only, and the
    // interpretation bands match the raw Bazett value so a true QTc of 460.4
    // bands as prolonged even though it displays as 460.
    const qtMs = values.qt.value; // canonical ms
    const hr = values.hr.value; // canonical bpm (RR alternates already reduced to bpm)
    const rrSeconds = 60 / hr; // RR in seconds — the unit both formulas require (qtc.md)
    const bazett = qtMs / Math.sqrt(rrSeconds);
    const fridericia = qtMs / Math.cbrt(rrSeconds);
    return [
      {
        id: "qtc_bazett",
        label: defineText("qtc.out.bazett", "QTc (Bazett)"),
        value: bazett,
        unit: "ms",
        precision: 0,
      },
      {
        id: "qtc_fridericia",
        label: defineText("qtc.out.fridericia", "QTc (Fridericia)"),
        value: fridericia,
        unit: "ms",
        precision: 0,
      },
    ];
  },
});
