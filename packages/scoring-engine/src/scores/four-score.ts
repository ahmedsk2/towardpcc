import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";

/**
 * FOUR score (Full Outline of UnResponsiveness) — a coma scale built to do the
 * two things the Glasgow Coma Scale cannot. It drops the verbal component
 * outright, which is why it remains scoreable in an intubated patient where
 * GCS's V is a hole, and spends the freed capacity on brainstem reflexes and
 * breathing pattern. Four components, each 0–4, summed: E + M + B + R, range
 * 0–16 (Wijdicks 2005).
 *
 * ZERO IS REAL HERE. Every component floors at 0, so the total floors at 0 —
 * not at 3 the way GCS does. That is the structural difference from
 * `pediatric-gcs.ts` and it is why this score's composition components carry no
 * explicit `min`: 0 is the genuine floor, so the default is correct and a bar
 * drawn from zero draws the truth.
 *
 * BUILT TO A BINDING IP CONSTRAINT — see docs/decisions/ADR-tier-b-ip.md, third
 * addendum (2026-08-02). The founder decision is that the FOUR score carries no
 * IP obstacle for this project, on the condition that it is built the way
 * pediatric-gcs.ts is built: the four component scores are consumed as
 * INTEGERS, and NO VERBATIM DESCRIPTOR PROSE from the source instrument is
 * reproduced. Every option label below is this project's own paraphrase of what
 * the level represents — clinically accurate, deliberately not a transcription
 * — with Wijdicks 2005 cited in `references`, `formula` and `notes`. The scale
 * was developed at the Mayo Clinic and the derivation and validation papers are
 * publisher-copyrighted; the arithmetic and the numeric levels are facts either
 * way, so the paraphrase costs the calculator nothing clinically.
 *
 * ADULT-DERIVED, PARTLY VALIDATED IN CHILDREN, AND SAID SO IN `notes`. This is
 * a paediatric platform and the instrument is not a paediatric instrument. The
 * paediatric evidence establishes equivalence to GCS and good-to-excellent
 * interrater reliability — NOT superiority — in cohorts that are overwhelmingly
 * school-age. Two of the sixteen points require command-following, so an intact
 * infant cannot reach 16 on this instrument at all. A separately published
 * Pediatric FOUR Score Scale exists for that reason and THIS IS NOT IT.
 *
 * NO INTERPRETATION BANDS, deliberately. See the `interpretation` comment.
 *
 * Research + full sourcing: docs/research/scores/four-score.md.
 */
export const fourScore = defineScore({
  id: "four-score",
  slug: "four-score",
  name: "FOUR score (Full Outline of UnResponsiveness)",
  tagline: defineText(
    "four.tagline",
    "Coma assessment that stays complete in an intubated patient",
  ),
  version: "1.1.1",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "four_eye",
      label: defineText("four.eye", "Eye response"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "four.eye.help",
        "Score the best observed eye response. The top level requires the patient to obey an instruction with their eyes, so it is unattainable in a child too young to comply — see the limitations note.",
      ),
      options: [
        {
          value: "4",
          label: defineText(
            "four.eye.4",
            "Eyes open, or opened by the examiner, and then obey an instruction — follow a moving target, or blink on request (4)",
          ),
        },
        {
          value: "3",
          label: defineText(
            "four.eye.3",
            "Eyes open, but the gaze follows nothing and no instruction is obeyed (3)",
          ),
        },
        {
          value: "2",
          label: defineText("four.eye.2", "Eyes stay shut until a loud voice opens them (2)"),
        },
        {
          value: "1",
          label: defineText("four.eye.1", "Eyes stay shut until a painful stimulus opens them (1)"),
        },
        {
          value: "0",
          label: defineText("four.eye.0", "Eyes stay shut even to a painful stimulus (0)"),
        },
      ],
    },
    {
      id: "four_motor",
      label: defineText("four.motor", "Motor response"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "four.motor.help",
        "Score the best response in the upper limbs. As with the eye component, the top level requires the patient to carry out a request, which a preverbal child cannot do.",
      ),
      options: [
        {
          value: "4",
          label: defineText(
            "four.motor.4",
            "Carries out a requested hand gesture — a fist, a thumbs-up, or a V-sign (4)",
          ),
        },
        {
          value: "3",
          label: defineText(
            "four.motor.3",
            "No gesture on request, but reaches toward the site of a painful stimulus (3)",
          ),
        },
        {
          value: "2",
          label: defineText(
            "four.motor.2",
            "Any flexion of the arm to pain — pulling away from it, or bending it inward in the decorticate pattern; this scale does not separate the two (2)",
          ),
        },
        {
          value: "1",
          label: defineText(
            "four.motor.1",
            "Straightens the arm away from pain — abnormal extension, the decerebrate pattern (1)",
          ),
        },
        {
          value: "0",
          label: defineText(
            "four.motor.0",
            "Nothing at all to pain, or generalised myoclonus status rather than a purposeful response (0)",
          ),
        },
      ],
    },
    {
      id: "four_brainstem",
      label: defineText("four.brainstem", "Brainstem reflexes"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "four.brainstem.help",
        "Which reflexes remain, not how brisk they are. Read the middle two levels carefully: losing ONE of the pupillary/corneal pair is a different level from losing BOTH, and it is worth one point.",
      ),
      options: [
        {
          value: "4",
          label: defineText("four.brainstem.4", "Pupillary and corneal responses both intact (4)"),
        },
        {
          value: "3",
          label: defineText(
            "four.brainstem.3",
            "One pupil dilated and unreactive; the other pupillary response and the corneal response remain (3)",
          ),
        },
        {
          value: "2",
          label: defineText(
            "four.brainstem.2",
            "Exactly one of the pair is lost — pupillary or corneal, not both (2)",
          ),
        },
        {
          value: "1",
          label: defineText(
            "four.brainstem.1",
            "Both pupillary and corneal responses lost; the cough response is still there (1)",
          ),
        },
        {
          value: "0",
          label: defineText(
            "four.brainstem.0",
            "Pupillary, corneal and cough responses all lost (0)",
          ),
        },
      ],
    },
    {
      id: "four_respiration",
      label: defineText("four.respiration", "Respiration"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "four.respiration.help",
        "The split is intubation, not ventilator support. The top three levels describe an unintubated patient's breathing pattern — including on mask CPAP, BiPAP or high-flow, which still score on rhythm alone. The bottom two describe how an intubated patient interacts with the set rate, so an intubated patient cannot score above 1, capping the total at 13.",
      ),
      options: [
        {
          value: "4",
          label: defineText(
            "four.respiration.4",
            "Not intubated, and breathing in a regular rhythm (4)",
          ),
        },
        {
          value: "3",
          label: defineText(
            "four.respiration.3",
            "Not intubated, breathing in a waxing-and-waning periodic cycle (Cheyne–Stokes) (3)",
          ),
        },
        {
          value: "2",
          label: defineText(
            "four.respiration.2",
            "Not intubated, and breathing in an irregular rhythm (2)",
          ),
        },
        {
          value: "1",
          label: defineText(
            "four.respiration.1",
            "Intubated, and triggering breaths above the ventilator's set rate (1)",
          ),
        },
        {
          value: "0",
          label: defineText(
            "four.respiration.0",
            "Intubated with no breaths beyond the set rate, or apnoeic (0)",
          ),
        },
      ],
    },
  ] as const,
  /**
   * NO INTERPRETATION BANDS — deliberate, and not a content gap.
   *
   * Wijdicks 2005 introduces and validates a 0–16 ordinal total. It proposes no
   * severity categories, and nothing since establishes a canonical banding of
   * the kind the GCS has. What the literature holds instead is a scatter of
   * cohort- and outcome-specific ROC-derived optimal cut-points — 14, 10, 8, 7,
   * 4 — each fitted to one population and one endpoint. Foo 2019 reviewed 37
   * studies and closed by asking for further standardised research across
   * populations; the review that would have to supply a banding says one does
   * not yet exist.
   *
   * Rendering any of those cut-points as a band would take a number fitted to
   * one cohort and present it as a classification of whoever types values in.
   * They live in `notes` with their cohorts named, as context, never attached
   * to a computed result.
   *
   * `interpretationStatus` is "not-applicable" and NOT "pending": nothing is
   * awaiting a later pass here. Set explicitly even though it is the default,
   * because on this score the silence is a decision and should read as one.
   * Same call, for the same reason, as `fluid-balance`.
   */
  interpretation: [],
  interpretationStatus: "not-applicable",
  references: [
    {
      citation:
        "Wijdicks EFM, Bamlet WR, Maramattom BV, Manno EM, McClelland RL. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005;58(4):585-593.",
      pmid: "16178024",
      doi: "10.1002/ana.20611",
      note: "Derivation and validation in 120 adult ICU patients (Mayo Clinic); interrater kappa 0.82. Source of the four components, the sixteen levels this implementation paraphrases, and the 0-16 total.",
    },
    {
      citation:
        "Almojuela A, Hasen M, Zeiler FA. The Full Outline of UnResponsiveness (FOUR) Score and Its Use in Outcome Prediction: A Scoping Review of the Pediatric Literature. J Child Neurol. 2019;34(4):189-198.",
      pmid: "30630377",
      doi: "10.1177/0883073818822359",
      note: "The paediatric evidence base assembled: 6 studies, 571 children. FOUR equivalent to GCS in outcome prediction in all six; interobserver reliability good to excellent; superiority over GCS NOT established.",
    },
    {
      citation:
        "Cohen J. Interrater reliability and predictive validity of the FOUR score coma scale in a pediatric population. J Neurosci Nurs. 2009;41(5):261-267.",
      pmid: "19835239",
      doi: "10.1097/JNN.0b013e3181b2c766",
      note: "First paediatric application, PICU. Weighted kappa 0.951 (FOUR) vs 0.738 (GCS). Excluded sedated and neuromuscularly blocked patients.",
    },
    {
      citation:
        "Czaikowski BL, Liang H, Stewart CT. A pediatric FOUR score coma scale: interrater reliability and predictive validity. J Neurosci Nurs. 2014;46(2):79-87.",
      pmid: "24556655",
      doi: "10.1097/JNN.0000000000000041",
      note: "The Pediatric FOUR Score Scale (PFSS) — a MODIFIED instrument for all paediatric ages including intubated/sedated children. Cited because its existence is the evidence that the adult scale needed adapting. This implementation is NOT the PFSS.",
    },
    {
      citation:
        "Jamal A, Sankhyan N, Jayashree M, Singhi S, Singhi P. Full Outline of Unresponsiveness score and the Glasgow Coma Scale in prediction of pediatric coma. World J Emerg Med. 2017;8(1):55-60.",
      pmid: "28123622",
      doi: "10.5847/wjem.j.1920-8642.2017.01.010",
      note: "63 children aged 5-12 y, paediatric ED. In-hospital mortality AUC 0.80 (FOUR) vs 0.83 (GCS), p=0.27 — no difference. Adult instrument applied unmodified.",
    },
    {
      citation:
        "Khajeh A, Fayyazi A, Miri-Aliabad G, Askari H, Noori N, Khajeh B. Comparison between the Ability of Glasgow Coma Scale and Full Outline of Unresponsiveness Score to Predict the Mortality and Discharge Rate of Pediatric Intensive Care Unit Patients. Iran J Pediatr. 2014;24(5):603-608.",
      pmid: "25793069",
      note: "200 children aged 2-12 y, PICU. Per-component kappa 0.72-0.82; cut-point 8; mean total 12.5 +/- 2.1 in survivors vs 5.1 +/- 2.8 in non-survivors. No DOI is registered for this article.",
    },
    {
      citation:
        "Pandwar U, Navindana, Ramteke S, Motwani B, Agrawal A. Comparison of Full Outline of Unresponsiveness Score and Glasgow Coma Scale for Assessment of Consciousness in Children With Acute Encephalitis Syndrome. Indian Pediatr. 2022;59(12):933-935.",
      pmid: "36511207",
      note: "150 children with acute encephalitis syndrome; FOUR and GCS strongly correlated (r=0.82) and comparable.",
    },
    {
      citation:
        "Foo CC, Loan JJM, Brennan PM. The Relationship of the FOUR Score to Patient Outcome: A Systematic Review. J Neurotrauma. 2019;36(17):2469-2483.",
      pmid: "31044668",
      doi: "10.1089/neu.2018.6243",
      note: "37 studies. Good-to-excellent prognostication of in-hospital mortality (AUC >0.80); motor and eye components more prognostic than the brainstem component; closes by calling for further standardised research across populations — the basis for shipping no interpretation bands.",
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
        "Corrects three option labels that had drifted from the published instrument, each worth points on a scale where low is worse. RESPIRATION now splits on INTUBATION rather than on ventilator support, which is what the source splits on: a child on mask CPAP, BiPAP or high-flow is not intubated and is scored on breathing rhythm alone, where the old wording sent them to level 1 and cost up to three points. The mirror ran the other way, letting an intubated patient on a T-piece reach 16 where the instrument allows 13. MOTOR level 2 now covers any flexion response to pain, pulling away from it as well as the decorticate pattern; this scale collapses what the Glasgow Coma Scale separates, and naming only decorticate flexion left a child who withdraws without localising matching no level, so raters reached for level 3 and scored a point high. EYE level 4 now counts eyes OPENED by the examiner, not only eyes already open, so lids held shut by periorbital swelling no longer put the top level out of reach. Every label remains this project own paraphrase rather than the source descriptors. Found 2026-09-03 by an independent recompute of every calculator against its published source.",
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
      "The scoring math is an ordinal sum of four integers (E+M+B+R, 0-16) — under 17 USC 102(b) a procedure or method of operation, not copyrightable expression — and the numeric levels and total range are facts. The DESCRIPTOR PROSE is a different matter: the scale was developed at the Mayo Clinic (Wijdicks) and the derivation and validation papers are publisher-copyrighted, and the developer is reported to have fielded several hundred requests for permission to use the scale. No explicit reproduction restriction on the scale text was located, and no explicit grant was either. This implementation therefore reproduces NONE of it: every option label is this project's own paraphrase of what the level represents, per the binding constraint in ADR-tier-b-ip.md third addendum (2026-08-02), with Wijdicks 2005 attributed here, in references, in formula and in notes (four-score.md IP status).",
  },
  formula: defineText(
    "four.formula",
    "Total = Eye + Motor + Brainstem + Respiration, each scored 0-4, giving a range of 0-16. Low is worse. " +
      "There is no verbal component, which is why the score stays complete in an intubated patient, and every component has a true 0. " +
      "This implements the adult instrument (Wijdicks 2005), not the modified Pediatric FOUR Score Scale (Czaikowski 2014).",
  ),
  /**
   * Rendered BESIDE the number, not in the prose below it. Both of these can
   * make the displayed total mean something other than what a reader will
   * assume it means, which is the bar this field sets.
   */
  cautions: [
    defineText(
      "four.caution.paediatric",
      "Adult-derived. Six studies, 571 children (Almojuela 2019): equivalent to the GCS in outcome prediction, reliably rated, superiority not established, in cohorts that were mostly school-age (2-12 y) with neonates and infants effectively absent. Eye 4 and motor 4 require obeying an instruction, so a neurologically intact preverbal child caps at 14. This implements the adult instrument, not the modified Pediatric FOUR Score Scale (Czaikowski 2014).",
    ),
    defineText(
      "four.caution.ventilated",
      "An INTUBATED patient can score at most 1 on respiration, capping the total at 13. Intubation, not ventilator support, is what the scale splits on: a child on mask CPAP, BiPAP or high-flow still scores the top three levels on rhythm alone. Intubated and non-intubated totals are different rulers and are not comparable. Sedation and neuromuscular blockade make the eye and motor components uninformative.",
    ),
  ],
  notes: defineText(
    "four.notes",
    "STRUCTURAL CEILINGS, BUILT INTO THE INSTRUMENT. An INTUBATED patient can score at most 1 on respiration, capping the total at 13 — intubation is the split, not ventilator support, so a child on mask CPAP or high-flow is scored on rhythm like any unsupported patient; intubated and non-intubated totals are different rulers and are not comparable. Eye 4 and motor 4 require obeying an instruction, so a neurologically intact preverbal child caps at 14. That ceiling is reasoned from the item definitions; [NEEDS SOURCE] for a published youngest applicable age. " +
      "BRAINSTEM READING TRAP: level 2 is exactly ONE of the pupillary/corneal pair lost; level 1 is BOTH lost with cough retained; level 0 is cough lost too. The or/and distinction is one point wide. " +
      "Sedation and neuromuscular blockade make the eye and motor components uninformative. " +
      "PAEDIATRIC STANDING: six studies, 571 children (Almojuela 2019): equivalent to the GCS in outcome prediction, reliably rated, superiority not established. The cohorts were mostly school-age (2-12 y), with neonates and infants effectively absent. Not interchangeable with the GCS, which has different components, ranges and floors. " +
      "NO INTERPRETATION BANDS, DELIBERATELY. Wijdicks 2005 proposes none, and published cut-points are cohort- and outcome-specific and disagree, with values from 4 to 14 appearing for different populations and endpoints. Do not attach any of them to a computed result.",
  ),
  /**
   * NO `min` ON ANY COMPONENT, and that is the interesting difference from
   * pediatric-gcs. A GCS component has no zero, so its bar must be drawn from 1
   * or a motor score of 1 renders as a sixth of its range when it is the floor.
   * A FOUR component genuinely reaches 0 — every one of the four has a real
   * "nothing at all" level — so the default min of 0 is the truth and declaring
   * one would be noise.
   */
  composition: {
    total: "four_total",
    components: [
      { id: "eye", max: 4 },
      { id: "motor", max: 4 },
      { id: "brainstem", max: 4 },
      { id: "respiration", max: 4 },
    ],
  },
  calculate: (values) => {
    const eye = Number(values.four_eye.value);
    const motor = Number(values.four_motor.value);
    const brainstem = Number(values.four_brainstem.value);
    const respiration = Number(values.four_respiration.value);

    const point = (id: string, label: string, value: number) => ({
      id,
      label: defineText(`four.out.${id}`, label),
      value,
      unit: "",
      precision: 0,
    });

    return [
      {
        id: "four_total",
        label: defineText("four.output", "Total FOUR score"),
        value: eye + motor + brainstem + respiration,
        unit: "",
        precision: 0,
      },
      point("eye", "Eye response (E)", eye),
      point("motor", "Motor response (M)", motor),
      point("brainstem", "Brainstem reflexes (B)", brainstem),
      point("respiration", "Respiration (R)", respiration),
    ];
  },
});
