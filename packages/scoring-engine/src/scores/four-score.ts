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
  version: "1.0.0",
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
            "Eyes open, and obey an instruction — follow a moving target, or blink on request (4)",
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
            "Bends the arm inward to pain — abnormal flexion, the decorticate pattern (2)",
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
        "The top three levels describe an unsupported breathing pattern; the bottom two describe how a ventilated patient interacts with the set rate. A ventilated patient therefore cannot score above 1 here, capping their total at 13.",
      ),
      options: [
        {
          value: "4",
          label: defineText(
            "four.respiration.4",
            "Breathing without mechanical support, regular rhythm (4)",
          ),
        },
        {
          value: "3",
          label: defineText(
            "four.respiration.3",
            "Breathing without mechanical support, in a waxing-and-waning periodic cycle (Cheyne–Stokes) (3)",
          ),
        },
        {
          value: "2",
          label: defineText(
            "four.respiration.2",
            "Breathing without mechanical support, irregular rhythm (2)",
          ),
        },
        {
          value: "1",
          label: defineText(
            "four.respiration.1",
            "Mechanically ventilated, and triggering breaths above the set rate (1)",
          ),
        },
        {
          value: "0",
          label: defineText(
            "four.respiration.0",
            "Mechanically ventilated with no breaths beyond the set rate, or apnoeic (0)",
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
      date: "2026-08-02",
      summary:
        "Initial release: FOUR score (E+M+B+R, 0-16) with paraphrased level labels, no interpretation bands, and the paediatric-validation limits stated in notes.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The scoring math is an ordinal sum of four integers (E+M+B+R, 0-16) — under 17 USC 102(b) a procedure or method of operation, not copyrightable expression — and the numeric levels and total range are facts. The DESCRIPTOR PROSE is a different matter: the scale was developed at the Mayo Clinic (Wijdicks) and the derivation and validation papers are publisher-copyrighted, and the developer is reported to have fielded several hundred requests for permission to use the scale. No explicit reproduction restriction on the scale text was located, and no explicit grant was either. This implementation therefore reproduces NONE of it: every option label is this project's own paraphrase of what the level represents, per the binding constraint in ADR-tier-b-ip.md third addendum (2026-08-02), with Wijdicks 2005 attributed here, in references, in formula and in notes (four-score.md IP status).",
  },
  formula: defineText(
    "four.formula",
    "Total FOUR score = E + M + B + R, the ordinal sum of the eye response (E, 0-4), motor response (M, 0-4), brainstem reflexes (B, 0-4) and respiration (R, 0-4), each taken as the best observed response (Wijdicks 2005). " +
      "The total ranges 0-16. Unlike the Glasgow Coma Scale there is NO verbal component — which is exactly why the score remains complete in an intubated patient — and every component has a genuine 0, so the total floors at 0 rather than at 3. " +
      "There are no physical units and components are never interpolated. Low is worse, the opposite direction to most point scores in this catalogue. " +
      "The respiration component encodes airway status structurally: levels 4, 3 and 2 describe an unsupported breathing pattern and levels 1 and 0 describe interaction with a ventilator, so a ventilated patient cannot score above 1 on R and cannot exceed a total of 13 however intact the rest of the examination is. " +
      "No interpretation banding is applied, because none is published.",
  ),
  /**
   * Rendered BESIDE the number, not in the prose below it. Both of these can
   * make the displayed total mean something other than what a reader will
   * assume it means, which is the bar this field sets.
   */
  cautions: [
    defineText(
      "four.caution.paediatric",
      "Adult-derived. The paediatric evidence — 6 studies, 571 children (Almojuela 2019) — establishes that the FOUR score is EQUIVALENT to the GCS in outcome prediction and reliably rated by nurses and physicians, not that it is better, and those cohorts were overwhelmingly school-age. Two of the sixteen points (eye 4, motor 4) require the patient to obey an instruction, so a neurologically intact preverbal infant cannot exceed 14 on this instrument. A separately published Pediatric FOUR Score Scale exists for that reason; this calculator implements the adult instrument, not that one.",
    ),
    defineText(
      "four.caution.ventilated",
      "A ventilated patient cannot score above 1 on respiration, so their maximum attainable total is 13, not 16. Totals are not comparable across airway status — comparing a ventilated 13 with an unventilated 15 compares two different rulers. Sedation and neuromuscular blockade additionally make the eye and motor components uninformative.",
    ),
  ],
  notes: defineText(
    "four.notes",
    "WHAT IT IS FOR: the FOUR score exists because the GCS has two holes — it cannot score a verbal response in an intubated patient, and it never measured brainstem function. Wijdicks 2005 reports that the FOUR score gives greater neurological detail than the GCS, recognises a locked-in syndrome, and distinguishes stages of herniation. It is not a paediatric adaptation of the GCS and is not interchangeable with one: the scales have different components, different ranges (0-16 vs 3-15) and different floors, so a FOUR total and a GCS total are not convertible. " +
      "PAEDIATRIC STATUS, stated plainly. Derived and validated in 120 ADULT ICU patients. The paediatric literature is real but limited: Almojuela 2019 screened 1,709 citations and retained 6 studies totalling 571 children, in all of which the FOUR score was EQUIVALENT to the GCS in outcome prediction, with good-to-excellent interobserver reliability — and concluded that superiority over the GCS has not been established in children. The cohorts that report an age range enrolled 2-12 y (Khajeh 2014, n=200) and 5-12 y (Jamal 2017, n=63); neonates and infants are effectively absent from the evidence for the unmodified instrument. Cohen 2009 excluded sedated and paralysed children outright, and Czaikowski 2014 published a MODIFIED Pediatric FOUR Score Scale specifically to cover all paediatric ages including intubated and sedated children — the existence of that adaptation is the clearest evidence that the adult instrument needed adapting. This calculator implements the ADULT instrument and must not be recorded as the PFSS. " +
      "THE COMMAND-FOLLOWING CEILING: eye level 4 requires tracking or blinking to instruction and motor level 4 requires a requested hand gesture, so in a preverbal or developmentally young child the instrument itself floors those two components at 3 regardless of neurological state, capping an intact infant at 14. This is reasoning from the published item definitions, not a quoted finding — [NEEDS SOURCE] for any publication stating a youngest applicable age for the unmodified adult scale. " +
      "THE VENTILATED CEILING: respiration levels 1 and 0 are the only ones available to a ventilated patient, capping their total at 13. The instrument's headline advantage is that it HAS a score for the ventilated patient where the GCS has a gap; the cost is that the score is drawn from a shorter ruler and is not comparable to an unventilated one. " +
      "THE ERROR-PRONE READING: brainstem level 2 is the loss of EXACTLY ONE of the pupillary/corneal pair; level 1 is the loss of BOTH with the cough response retained; level 0 adds loss of cough. The or/and distinction is one point wide and is the easiest thing in the scale to get wrong. " +
      "NO INTERPRETATION BANDS, deliberately, and this is not a gap awaiting a later pass. Wijdicks 2005 proposes no severity categories and no source since establishes a canonical banding. CONTEXT, NOT BANDS — published optimal cut-points are cohort- and outcome-specific and disagree with each other: values of 14, 10, 8, 7 and 4 all appear in the literature for different populations and different endpoints, and the RehabMeasures summary of the instrument describes the usable range of cut-offs as roughly under 4 to under 12 depending on condition. In the paediatric PICU cohort of Khajeh 2014 the cut-point was 8, with mean totals of 12.5 +/- 2.1 in survivors and 5.1 +/- 2.8 in non-survivors. Foo 2019 reviewed 37 studies, found good-to-excellent prognostication of in-hospital mortality (AUC >0.80), reported that the motor and eye components carry more prognostic weight than the brainstem component, and closed by calling for further standardised research across populations. Do not attach any of these figures to a computed result. " +
      "IP: the descriptor prose of the source instrument is NOT reproduced here. Every option label is this project's own paraphrase of what the level represents, per the binding constraint recorded in ADR-tier-b-ip.md third addendum; the arithmetic and the numeric levels are facts either way. Attribution to Wijdicks 2005 is the obligation that carries, and it is not optional. " +
      "[NEEDS SOURCE]: the level definitions were established from three concordant secondary reproductions rather than from the Ann Neurol full text, which was not retrievable; the item-level content of the PFSS modification (paywalled); the sample size and age range of Cohen 2009 (not stated in the abstract, full text not retrievable). The AUC pair of 0.95 and 0.92 that circulates attached to this score is NOT in the Wijdicks 2005 abstract and is deliberately asserted nowhere here. No published worked example of the FOUR score exists, so every test vector for this score is constructed from the scoring table and labelled as such.",
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
