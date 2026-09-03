import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import type { ScoreValue } from "../types";
import { albuminGdl, electrolyteMeqL } from "../units/electrolytes";

/**
 * Serum anion gap (AG), with the Figge (1998) albumin correction. The AG is an
 * arithmetic index of unmeasured anions from the routine electrolyte panel,
 * used to detect and classify metabolic acidosis (high- vs normal-AG) and, at
 * the low end, to flag hypoalbuminemia/paraproteinemia. Because albumin is the
 * dominant unmeasured anion, hypoalbuminemia lowers the AG and can MASK a
 * high-AG acidosis; the albumin correction (2.5 mEq/L per 1 g/dL fall in
 * albumin below 4.0) restores sensitivity.
 *
 *   AG          = Na − (Cl + HCO₃)                    [potassium-exclusive form]
 *   AG(K)       = (Na + K) − (Cl + HCO₃)              [potassium-inclusive form]
 *   AG_corrected = AG + 2.5 × (4.0 − albumin[g/dL])   [Figge 1998]
 *
 * This is a DIAGNOSTIC INDEX, not a directive severity score. Reference
 * intervals are strongly method-dependent (flame photometry vs modern
 * ion-selective electrodes) and lab-specific, so NO interpretation bands are
 * emitted — classify against the reporting lab's own interval (see notes).
 *
 * Outputs adapt to which optional inputs are supplied: the base (K-exclusive)
 * AG is always returned; the K-inclusive AG is added when potassium is given;
 * albumin-corrected versions of each are added when albumin is given. Both K
 * forms are surfaced rather than silently picking one — their reference
 * intervals differ (K-inclusive runs ~3.5–5 units higher).
 *
 * Research + full sourcing: docs/research/scores/anion-gap.md.
 */
export const anionGap = defineScore({
  id: "anion-gap",
  slug: "anion-gap",
  name: "Anion gap (with albumin correction)",
  version: "1.0.0",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "na",
      label: defineText("ag.na", "Serum sodium (Na⁺)"),
      required: true,
      type: "numeric",
      unit: electrolyteMeqL,
      // Input-validity bounds, not a cited clinical threshold (anion-gap.md
      // marks these hard bounds [NEEDS SOURCE]).
      min: 100,
      max: 180,
      helpText: defineText(
        "ag.na.help",
        "From the electrolyte panel. Accepts mEq/L or mmol/L (identical).",
      ),
    },
    {
      id: "cl",
      label: defineText("ag.cl", "Serum chloride (Cl⁻)"),
      required: true,
      type: "numeric",
      unit: electrolyteMeqL,
      // input-validity bound, not a cited threshold
      min: 70,
      max: 130,
      helpText: defineText(
        "ag.cl.help",
        "From the electrolyte panel. Accepts mEq/L or mmol/L (identical).",
      ),
    },
    {
      id: "hco3",
      label: defineText("ag.hco3", "Serum bicarbonate (HCO₃⁻ or total CO₂)"),
      required: true,
      type: "numeric",
      unit: electrolyteMeqL,
      // input-validity bound, not a cited threshold
      min: 3,
      max: 45,
      helpText: defineText(
        "ag.hco3.help",
        "Bicarbonate or the total CO₂ reported on a basic metabolic panel (used interchangeably here). Accepts mEq/L or mmol/L (identical).",
      ),
    },
    {
      id: "k",
      label: defineText("ag.k", "Serum potassium (K⁺, optional)"),
      required: false,
      type: "numeric",
      unit: electrolyteMeqL,
      // input-validity bound, not a cited threshold
      min: 1.5,
      max: 9,
      helpText: defineText(
        "ag.k.help",
        "Optional. Supply only to also compute the potassium-inclusive AG, which uses a higher reference interval.",
      ),
    },
    {
      id: "albumin",
      label: defineText("ag.albumin", "Serum albumin (optional)"),
      required: false,
      type: "numeric",
      unit: albuminGdl,
      // input-validity bound, not a cited threshold; Figge 1998 spanned severe
      // hypoalbuminemia so the correction is defined across this range.
      min: 1.0,
      max: 6.0,
      helpText: defineText(
        "ag.albumin.help",
        "Optional. Supply to also compute the albumin-corrected AG (baseline 4.0 g/dL). Accepts g/dL or g/L.",
      ),
    },
  ] as const,
  // Diagnostic index with strongly method-dependent, lab-specific reference
  // intervals and no management-directive thresholds → no interpretation bands
  // (anion-gap.md §Interpretation bands). Classify against the lab's own range.
  interpretation: [],
  references: [
    {
      citation:
        "Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807–1810.",
      pmid: "9824071",
      doi: "10.1097/00003246-199811000-00019",
    },
    {
      citation:
        "Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine. Clin J Am Soc Nephrol. 2007;2(1):162–174.",
      pmid: "17699401",
      doi: "10.2215/CJN.03020906",
    },
    {
      citation:
        "Chionh CY, Poh CB, Roy DM, et al. Serum anion gap revisited: a verified reference interval for contemporary use. Intern Med J. 2022;52(9):1531–1537.",
      pmid: "34028972",
      doi: "10.1111/imj.15396",
    },
    {
      citation:
        "Anion Gap and Non–Anion Gap Metabolic Acidosis. StatPearls (NCBI Bookshelf), NBK448090.",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK448090/",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-09-03",
      summary: "Initial published text.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The anion gap is an arithmetic identity (Na − [Cl + HCO₃], optionally + K) and the Figge albumin correction is a regression coefficient (2.5 per g/dL) applied to a linear formula; formulas, coefficients, and reference intervals are facts, not copyrightable expression. No verbatim scale wording is embedded (anion-gap.md IP status).",
  },
  formula: defineText(
    "ag.formula",
    "Base anion gap = sodium − (chloride + bicarbonate). The potassium-inclusive anion gap = (sodium + potassium) − (chloride + bicarbonate), which runs about 3.5 to 5 units higher and uses a higher reference interval, so the two forms are shown separately. The albumin-corrected anion gap = anion gap + 2.5 × (4.0 − albumin in g/dL) (Figge 1998), so each 1 g/dL below 4.0 adds 2.5 mEq/L, unmasking a high-anion-gap acidosis that hypoalbuminemia would hide. mEq/L and mmol/L are numerically equal for these ions, and total CO₂ is used interchangeably with HCO₃.",
  ),
  notes: defineText(
    "ag.notes",
    "No interpretation bands are emitted. Reference intervals are strongly method-dependent: flame photometry gave about 12 ± 4 mEq/L, ion-selective electrodes shifted it to about 6 ± 3, and verified intervals span, for example, 10 to 18. Classify against the reporting lab’s own interval, never a fixed cutoff, and never compare a potassium-inclusive value with a potassium-exclusive range. The anion gap is a diagnostic index, not a severity score. The albumin correction increases sensitivity, not specificity, and is an adjunct to direct measurement of lactate and ketones. The 2.5 coefficient and the reference intervals are adult-derived, applied to children by convention. Spurious electrolytes (pseudohyponatremia, bromide interference) distort the gap directly.",
  ),
  calculate: (values) => {
    // Return RAW computed values; `precision` rounds for display only. There
    // are no interpretation bands, so no rounding here can move a value across
    // a classification boundary.
    //
    // ALL FOUR ROWS USE 1 dp, and that uniformity is the point. They were 0 dp
    // for the uncorrected pair and 1 dp for the corrected pair until v1.0.1,
    // which made the panel stop reconciling with itself: a K-inclusive AG of
    // 16.5 rendered as "17" beside "albumin-corrected 21.5", so the correction
    // read as 4.5 when it is exactly 2.5 x (4.0 - albumin) = 5.0. A clinician
    // checking the arithmetic on screen found it did not close. Potassium is
    // commonly reported to 1 dp and the Figge correction is a multiple of 2.5,
    // so a half-unit is the normal case here, not an edge case.
    const na = values.na.value;
    const cl = values.cl.value;
    const hco3 = values.hco3.value;

    const results: ScoreValue[] = [];

    // Base (potassium-exclusive) anion gap — the common form; always emitted.
    const ag = na - (cl + hco3);
    results.push({
      id: "ag",
      label: defineText("ag.out.ag", "Anion gap (K-exclusive)"),
      value: ag,
      unit: "mEq/L",
      precision: 1,
    });

    // Potassium-inclusive form — only when potassium is supplied. Its reference
    // interval differs (higher); both forms are surfaced, never picked silently.
    const k = values.k?.value;
    let agK: number | undefined;
    if (k !== undefined) {
      agK = na + k - (cl + hco3);
      results.push({
        id: "ag_k",
        label: defineText("ag.out.agk", "Anion gap (K-inclusive)"),
        value: agK,
        unit: "mEq/L",
        precision: 1,
      });
    }

    // Albumin correction (Figge 1998) — only when albumin is supplied. Applied
    // identically to each AG form present (albumin acts on the gap, not on K).
    const albumin = values.albumin?.value;
    if (albumin !== undefined) {
      const correction = 2.5 * (4.0 - albumin);
      results.push({
        id: "ag_corrected",
        label: defineText("ag.out.corr", "Albumin-corrected AG (K-exclusive)"),
        value: ag + correction,
        unit: "mEq/L",
        precision: 1,
      });
      if (agK !== undefined) {
        results.push({
          id: "ag_k_corrected",
          label: defineText("ag.out.kcorr", "Albumin-corrected AG (K-inclusive)"),
          value: agK + correction,
          unit: "mEq/L",
          precision: 1,
        });
      }
    }

    return results;
  },
});
