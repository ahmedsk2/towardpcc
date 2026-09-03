import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { ageInYears } from "../units/age";

/**
 * APLS age-based weight ESTIMATION (pediatric) — a fallback point estimate of
 * body weight (kg) used to seed weight-based drug/fluid dosing when a measured
 * weight is unavailable. It is not a severity score. The updated Advanced
 * Paediatric Life Support manual (5th ed., 2011) replaced the single legacy
 * formula with three age-BANDED formulas (branch on age):
 *
 *   - infant, under 1 year   : weight = 0.5 × age_in_months + 4
 *   - child, 1–5 years       : weight = 2 × age_in_years   + 8
 *   - child, 6–12 years      : weight = 3 × age_in_years   + 7   (Luscombe & Owens 2007, PMID 17213259)
 *
 * A directly measured weight is always preferred; a Broselow length tape is a
 * length-based (not age-based) alternative. No interpretation bands — an
 * estimated weight is not a severity/risk stratum (research §"Interpretation
 * bands"). Research + full sourcing: docs/research/scores/apls-weight.md.
 */
export const aplsWeight = defineScore({
  id: "apls-weight",
  slug: "apls-weight",
  name: "APLS age-based weight estimate (pediatric)",
  version: "1.1.0",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "age",
      label: defineText("apls.age", "Age"),
      required: true,
      type: "numeric",
      unit: ageInYears,
      // Input-validity bounds, not a cited threshold: the APLS age-based
      // formulas are defined only for 0–12 years (0 y → the 4 kg infant floor;
      // above 12 y no APLS age-based formula is defined → use adult estimation).
      min: 0,
      max: 12,
      helpText: defineText(
        "apls.age.help",
        "Age in years (a 6-month-old is 0.5). Also accepts months or days. The formula band is chosen from age: under 1 year, 1–5 years, or 6–12 years. Outside 0–12 years there is no APLS age-based formula.",
      ),
    },
  ] as const,
  // Estimation, not a severity score — no normal/abnormal or risk strata exist
  // (research §"Interpretation bands": "There are no clinical interpretation/risk
  // bands for this tool."). The only "bands" are the age bands that SELECT the
  // formula, handled in calculate. Left intentionally empty; see notes.
  interpretation: [],
  references: [
    {
      citation:
        "Luscombe M, Owens B. Weight estimation in resuscitation: is the current formula still valid? Arch Dis Child. 2007;92(5):412–415.",
      pmid: "17213259",
      doi: "10.1136/adc.2006.107284",
      note: "Origin of the 6–12y formula weight = (3 × age) + 7 (derived/validated 1–10y); legacy (age+4)×2 underestimated measured weight by a mean of 18.8% (n=17,244), the reason it was replaced.",
    },
    {
      citation:
        "Advanced Life Support Group. Advanced Paediatric Life Support: The Practical Approach. 5th ed. Wiley-Blackwell; 2011. ISBN 978-1-4443-3059-5.",
      // No PMID/DOI for the manual; ISBN + edition given in the citation string.
      url: "https://www.alsg.org/en/?q=APLS",
      note: "Manual that introduced the three age-banded formulas: infant (0.5×months)+4, 1–5y (2×age)+8, 6–12y (3×age)+7.",
    },
    {
      citation:
        "Kelly A-M, Nguyen K, Krieser D. Validation of the Luscombe weight formula for estimating children's weight. Emerg Med Australas. 2011;23(1):59–62.",
      pmid: "21134132",
      doi: "10.1111/j.1742-6723.2010.01351.x",
      note: "Independent validation of (3×age)+7 for ages 1–10y.",
    },
    {
      citation:
        "Lubitz DS, Seidel JS, Chameides L, et al. A rapid method for estimating weight and resuscitation drug dosages from length in the pediatric age group. Ann Emerg Med. 1988;17(6):576–581.",
      pmid: "3377285",
      note: "Original Broselow length-based tape — a length-based (not age-based) alternative.",
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
      reason: "formula-correction",
      summary:
        "Reads a birthday entered in DAYS as that birthday. Age is stored in years and days convert at 365.25, so a sixth birthday of 2191 days became 5.9986 years and a tenth of 3652 days became 9.9986. Anything that floors or bands on whole years then read the child as a year younger. The conversion now snaps to a whole year when the day count is within one day of one, which is the largest the drift can be: 365.25 averages the leap cycle exactly, so a true birthday is always within 0.75 days of the integer. Ages entered in years or months were already exact and are unchanged, and an age more than a day from a birthday is untouched. Found 2026-09-03 by an independent recompute of every calculator from its published source. On this score that returned 18 kg for a six-year-old whose own row gives 25, a 7 kg error on a figure that seeds weight-based drug and fluid doses.",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      'The equations (0.5×months)+4, (2×age)+8, (3×age)+7 and the age-band selection are mathematical facts / uncopyrightable methods; coefficients are facts (research §"IP status"). Program name (APLS) referenced factually, not reproduced; no Broselow proprietary zone tables are used.',
  },
  formula: defineText(
    "apls.formula",
    "Estimated body weight in kilograms, chosen by age band. Under 1 year: 0.5 × age in months + 4. 1–5 years: 2 × age + 8. 6–12 years: 3 × age + 7 (Luscombe & Owens, replacing the legacy (age + 4) × 2, which underestimated measured weight by a mean of 18.8%). Age is taken in whole years at the last birthday for the child bands. A single age input converts internally, because the infant formula runs in months, a classic unit trap.",
  ),
  notes: defineText(
    "apls.notes",
    "A population point estimate for use only when weighing is impossible. A measured weight is always preferred, and the Broselow tape is the length-based alternative, which needs the tape and the child supine and loses accuracy above ~25 kg. Systematically underestimates in overweight and obese children. Not defined outside 0–12 years, and NOT to be extrapolated to a preterm or low-birth-weight neonate: the infant band is anchored to an average term newborn and returns 4 kg at age 0, which over-estimates a small preterm baby several-fold.",
  ),
  calculate: (values) => {
    // Canonical age is in YEARS (age unit spec). Return the RAW formula value;
    // `precision` rounds for display only. Band selection branches on age:
    //   - under 1 year: 0.5 × months + 4 == 6 × years + 4 (continuous in months;
    //     the 6×years form avoids reconstructing/flooring months, so 11 mo → 9.5
    //     without float drift). Algebraically identical to the research formula.
    //   - 1–5y / 6–12y: use whole years (age at last birthday = floor of exact age).
    const years = values.age.value;
    let weight: number;
    if (years < 1) {
      weight = 6 * years + 4; // infant band, ≡ 0.5 × age_in_months + 4
    } else {
      const wholeYears = Math.floor(years);
      weight = wholeYears <= 5 ? 2 * wholeYears + 8 : 3 * wholeYears + 7;
    }
    return [
      {
        id: "estimated_weight",
        label: defineText("apls.out.weight", "Estimated weight"),
        value: weight,
        unit: "kg",
        precision: 1,
      },
    ];
  },
});
