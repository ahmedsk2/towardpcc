import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { CM_PER_INCH, cmWithInAndM } from "../units/length";

/**
 * Ideal body weight (pediatric) — height-based estimates. IBW in children is
 * NOT a single formula; the published methods disagree (differences ≥10 kg in
 * adolescents; Ward 2018, PMID 30277896), so this calculator emits every method
 * that is cleanly computable from height side by side and never silently picks
 * one (research: "let the clinician pick/label the method").
 *
 * Emitted (all output IBW in kg, raw — `precision` rounds for DISPLAY only):
 *   - Traub–Kichen (A1, exponential):  IBW = 2.396 × e^(0.01863 × height_cm)
 *       primary pediatric height-based equation, sex-independent, ages 1–17 y
 *       (Traub & Kichen 1983, PMID 6823980; cross-checked vs the R `physiology`
 *        package → 15.44 kg at 100 cm).
 *   - Simplified Traub (A2, Lexicomp): IBW = (height_cm² × 1.65) ÷ 1000
 *       quadratic approximation of A1, ~7% higher (Kang 2019, PMID 31598106).
 *   - Devine (A3, adult-derived):      IBW = base + 2.3 × (height_in − 60)
 *       base 50.0 (male) / 45.5 (female); ONLY defined for height > 60 in
 *       (152.4 cm) so it is emitted only at/above that height (Devine 1974,
 *       reproduced in Kang 2019).
 *
 * Growth-chart / percentile methods (McLaren, Moore, ADA, BMI50) require CDC/WHO
 * LMS table lookups and are NOT computable from height alone — documented in
 * notes, not implemented here. IBW has NO interpretation bands (research:
 * "IBW itself has no interpretive bands"); interpretation is intentionally [].
 * Research + full sourcing: docs/research/scores/ideal-body-weight.md.
 */

// Devine is only defined for height > 60 in (152.4 cm) — research §A3. This is a
// cited domain floor of the Devine formula, not an engineering input bound.
const DEVINE_MIN_HEIGHT_CM = 152.4;

export const idealBodyWeight = defineScore({
  id: "ideal-body-weight",
  slug: "ideal-body-weight",
  name: "Ideal body weight (pediatric)",
  version: "1.0.0",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "height",
      label: defineText("ibw.height", "Height / recumbent length"),
      required: true,
      type: "numeric",
      unit: cmWithInAndM,
      // Input-validity bounds, not a cited clinical threshold: ~45 cm (term
      // newborn length) to ~200 cm (tall adolescent), per the research inputs
      // table framing the CDC 2000 chart range.
      min: 45,
      max: 200,
      helpText: defineText(
        "ibw.height.help",
        "Standing height (or recumbent length in infants). Accepts cm, inches, or metres. The Traub methods are validated 1–17 years; the Devine method appears only at or above 152.4 cm (60 inches).",
      ),
    },
    {
      id: "sex",
      label: defineText("ibw.sex", "Sex"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "ibw.sex.help",
        "Used only by the Devine method (male base 50.0 kg, female 45.5 kg). The Traub–Kichen and simplified Traub equations are sex-independent by design, so sex does not change those values.",
      ),
      options: [
        { value: "male", label: defineText("ibw.sex.male", "Male") },
        { value: "female", label: defineText("ibw.sex.female", "Female") },
      ],
    },
  ] as const,
  // IBW is an input (to drug dosing, %-IBW nutritional classification, and
  // lung-protective tidal-volume setting), not a severity measure — research
  // §"Interpretation bands": "IBW itself has no interpretive bands." Left empty
  // intentionally; see notes.
  interpretation: [],
  references: [
    {
      citation:
        "Traub SL, Kichen L. Estimating ideal body mass in children. Am J Hosp Pharm. 1983;40(1):107–110.",
      pmid: "6823980",
      note: "Primary height-based pediatric IBW equation (A1); IBM = 50th-percentile weight for height; ages 1–17 y; sex-independent.",
    },
    {
      citation:
        "Kang K, Absher R, Farrington E, Ackley R, So T-Y. Evaluation of Different Methods Used to Calculate Ideal Body Weight in the Pediatric Population. J Pediatr Pharmacol Ther. 2019;24(5):421–430.",
      pmid: "31598106",
      doi: "10.5863/1551-6776-24.5.421",
      note: "Source for the simplified Traub (A2) and Devine (A3) formulas and for the seven-method comparison.",
    },
    {
      citation:
        "Ward SL, Quinn CM, Steurer MA, Liu KD, Flori HR, Matthay MA. Variability in Pediatric Ideal Body Weight Calculation: Implications for Lung-Protective Mechanical Ventilation Strategies in Pediatric ARDS. Pediatr Crit Care Med. 2018;19(12):e643–e652.",
      pmid: "30277896",
      doi: "10.1097/PCC.0000000000001740",
      note: "PICU relevance: method choice shifts IBW by ≥10 kg in some children and changes prescribed tidal volume; the BMI method was usable in only 61% of a cohort.",
    },
    {
      citation:
        "Moylan A, et al. Assessing the Agreement of 5 Ideal Body Weight Calculations for Selecting Medication Dosages for Children With Obesity. 2019.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6547219/",
      note: "Cross-check of five methods; source of the simplified-Traub inches-vs-centimetres transcription-error flag (use centimetres).",
    },
    {
      citation: "physiology R package — ideal_weight_Traub.",
      url: "https://rdrr.io/cran/physiology/man/ideal_weight_Traub.html",
      note: "Independent encoding of the Traub 1983 equation; cross-checks Worked example 1 (returns 15.44 kg at 100 cm); validated ages 1–17 y.",
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
      'Formulas, coefficients, and numeric thresholds are facts / mathematical relationships, not copyrightable expression — Traub, simplified Traub, and Devine may be implemented freely (research §"IP status"). No verbatim proprietary scale text is reproduced.',
  },
  formula: defineText(
    "ibw.formula",
    "Ideal body weight (kg) is estimated from height. The formulas are shown side by side because no consensus method exists. Traub–Kichen: IBW = 2.396 × e^(0.01863 × height in cm). It is sex-independent, validated 1–17 years, and is the primary paediatric height-based equation. Simplified Traub (Lexicomp): IBW = height² × 1.65 ÷ 1000, with height in centimetres. Moylan prints “inches”, an apparent transcription error yielding non-physiologic values. This method runs about 7% higher than Traub–Kichen. Devine (adult-derived, sex-based) is shown only at height ≥ 152.4 cm (60 in): 50.0 (male) or 45.5 (female) + 2.3 × (inches − 60). It over-estimates versus paediatric methods.",
  ),
  notes: defineText(
    "ibw.notes",
    "The methods disagree by ≥ 10 kg in some children and change prescribed tidal volumes in pediatric ARDS (Ward 2018), which is why each one is shown and none is silently chosen. IBW carries no bands: it feeds weight-based dosing, %-IBW nutritional classification, and lung-protective tidal-volume setting. The McLaren & Read categories attach to the %IBW ratio, not to IBW. Growth-chart reference methods (McLaren, Moore, ADA, BMI50) need percentile-table lookups and are documented, not implemented. Height-only equations are weakest below about 1–2 years.",
  ),
  calculate: (values) => {
    // Canonical height is in centimetres (cmWithInAndM). Return RAW formula
    // values; per-value `precision` rounds for display only.
    const heightCm = values.height.value;

    const traubKichen = 2.396 * Math.exp(0.01863 * heightCm); // A1, Traub & Kichen 1983
    const simplifiedTraub = (heightCm * heightCm * 1.65) / 1000; // A2, Lexicomp (Kang 2019)

    const results = [
      {
        id: "traub_kichen",
        label: defineText("ibw.out.traub", "IBW — Traub–Kichen (exponential, height-based)"),
        value: traubKichen,
        unit: "kg",
        precision: 1,
      },
      {
        id: "simplified_traub",
        label: defineText("ibw.out.simplified", "IBW — simplified Traub (Lexicomp)"),
        value: simplifiedTraub,
        unit: "kg",
        precision: 1,
      },
    ];

    // Devine is only defined for height > 60 in (152.4 cm); below that it is not
    // emitted (research §A3) rather than reporting an out-of-domain extrapolation.
    if (heightCm >= DEVINE_MIN_HEIGHT_CM) {
      const heightIn = heightCm / CM_PER_INCH;
      const base = values.sex.value === "male" ? 50.0 : 45.5; // Devine 1974
      const devine = base + 2.3 * (heightIn - 60);
      results.push({
        id: "devine",
        label: defineText("ibw.out.devine", "IBW — Devine (adult-derived, height ≥ 152.4 cm)"),
        value: devine,
        unit: "kg",
        precision: 1,
      });
    }

    return results;
  },
});
