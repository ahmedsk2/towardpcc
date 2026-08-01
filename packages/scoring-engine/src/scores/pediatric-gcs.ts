import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";

/**
 * Pediatric Glasgow Coma Scale (pGCS) — age-adapted GCS for infants and young
 * children who cannot give the adult verbal/motor responses. The total is the
 * ordinal sum of three independently-rated components, identical to the adult
 * scale (E + V + M, range 3–15, no 0; best-response rule; Teasdale & Jennett
 * 1974). The ONLY pediatric adaptation is the descriptor wording attached to
 * each numeric level of V and M (and which developmental band it applies to);
 * the point values and the summation are unchanged.
 *
 * Two lineages exist with different age cut-offs — James/PECARN (preverbal <2 y
 * vs verbal ≥2 y) and BPNA "Child's GCS" (<5 y vs >5 y). This score records only
 * the numeric component levels; the option labels below are NEUTRAL PARAPHRASES
 * that span both the verbal-child and infant/preverbal descriptor columns, so
 * they are scheme-agnostic. Pin and record the scheme + age band per case
 * (see notes). Stewardship of the GCS wording (Royal College of Physicians and
 * Surgeons of Glasgow / Teasdale, glasgowcomascale.org) is attributed in notes
 * and ipStatus.
 *
 * Research + full sourcing: docs/research/scores/pgcs.md.
 */
export const pediatricGcs = defineScore({
  id: "pediatric-gcs",
  slug: "pediatric-gcs",
  name: "Pediatric Glasgow Coma Scale (pGCS)",
  version: "1.0.0",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "gcs_eye",
      label: defineText("pgcs.eye", "Eye-opening response"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pgcs.eye.help",
        "Score the best observed eye-opening response. Wording is the same for all ages.",
      ),
      options: [
        {
          value: "4",
          label: defineText("pgcs.eye.4", "Opens eyes on their own, without prompting (4)"),
        },
        { value: "3", label: defineText("pgcs.eye.3", "Opens eyes when spoken to (3)") },
        {
          value: "2",
          label: defineText("pgcs.eye.2", "Opens eyes only to a painful stimulus (2)"),
        },
        { value: "1", label: defineText("pgcs.eye.1", "Does not open eyes (1)") },
      ],
    },
    {
      id: "gcs_verbal",
      label: defineText("pgcs.verbal", "Verbal / vocal response"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pgcs.verbal.help",
        "Score the best age-appropriate response. Each level pairs the verbal-child descriptor with its infant/preverbal equivalent — apply the one matching the child's developmental band.",
      ),
      options: [
        {
          value: "5",
          label: defineText(
            "pgcs.verbal.5",
            "Age-appropriate best response: oriented speech, or coos/babbles as usual (5)",
          ),
        },
        {
          value: "4",
          label: defineText(
            "pgcs.verbal.4",
            "Confused speech, or irritable / less-than-usual crying (4)",
          ),
        },
        {
          value: "3",
          label: defineText("pgcs.verbal.3", "Inappropriate words, or cries to pain (3)"),
        },
        {
          value: "2",
          label: defineText("pgcs.verbal.2", "Incomprehensible sounds, or moans to pain (2)"),
        },
        { value: "1", label: defineText("pgcs.verbal.1", "No verbal or vocal response (1)") },
      ],
    },
    {
      id: "gcs_motor",
      label: defineText("pgcs.motor", "Motor response"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pgcs.motor.help",
        "Score the best age-appropriate motor response. Each level pairs the verbal-child descriptor with its infant/preverbal equivalent.",
      ),
      options: [
        {
          value: "6",
          label: defineText(
            "pgcs.motor.6",
            "Obeys commands, or moves spontaneously and purposefully (6)",
          ),
        },
        {
          value: "5",
          label: defineText(
            "pgcs.motor.5",
            "Localizes a painful stimulus, or withdraws to touch (5)",
          ),
        },
        {
          value: "4",
          label: defineText("pgcs.motor.4", "Withdraws from a painful stimulus (4)"),
        },
        {
          value: "3",
          label: defineText("pgcs.motor.3", "Abnormal flexion to pain (decorticate posturing) (3)"),
        },
        {
          value: "2",
          label: defineText(
            "pgcs.motor.2",
            "Abnormal extension to pain (decerebrate posturing) (2)",
          ),
        },
        { value: "1", label: defineText("pgcs.motor.1", "No motor response (1)") },
      ],
    },
  ] as const,
  interpretation: [
    {
      id: "severe",
      appliesTo: "pgcs_total",
      min: null,
      max: 9,
      label: defineText("pgcs.band.severe", "3 to 8"),
      description: defineText(
        "pgcs.band.severe.desc",
        "Conventionally categorized as the 'severe' range in GCS-based TBI severity stratification. This tri-band originated in adult work; pediatric literature notes a threshold of 5 or less may identify severe injury more accurately in young children.",
      ),
    },
    {
      id: "moderate",
      appliesTo: "pgcs_total",
      min: 9,
      max: 13,
      label: defineText("pgcs.band.moderate", "9 to 12"),
      description: defineText(
        "pgcs.band.moderate.desc",
        "Conventionally categorized as the 'moderate' range in GCS-based TBI severity stratification. Descriptive only; interpret in the full clinical context.",
      ),
    },
    {
      id: "mild",
      appliesTo: "pgcs_total",
      min: 13,
      max: null,
      label: defineText("pgcs.band.mild", "13 to 15"),
      description: defineText(
        "pgcs.band.mild.desc",
        "Conventionally categorized as the 'mild' range in GCS-based TBI severity stratification. A reassuring total does not rule out intracranial injury, which is a documented limitation in infants.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Teasdale G, Jennett B. Assessment of coma and impaired consciousness. A practical scale. Lancet. 1974;2(7872):81–84.",
      pmid: "4136544",
      doi: "10.1016/s0140-6736(74)91639-0",
      note: "Original adult GCS: source of the ordinal levels, the E+V+M sum (3–15), and the best-response rule.",
    },
    {
      citation:
        "Reilly PL, Simpson DA, Sprod R, Thomas L. Assessing the conscious level in infants and young children: a paediatric version of the Glasgow Coma Scale. Childs Nerv Syst. 1988;4(1):30–33.",
      pmid: "3135935",
      doi: "10.1007/BF00274080",
      note: "Adelaide paediatric adaptation with age-related expected responses.",
    },
    {
      citation:
        "James HE. Neurologic evaluation and support in the child with an acute brain insult. Pediatr Ann. 1986;15(1):16–22.",
      pmid: "3951884",
      doi: "10.3928/0090-4481-19860101-05",
      note: "James adaptation (the 'J' in JGCS); James/PECARN lineage.",
    },
    {
      citation:
        "Tatman A, Warren A, Williams A, Powell JE, Whitehouse W. Development of a modified paediatric coma scale in intensive care clinical practice. Arch Dis Child. 1997;77(6):519–521.",
      pmid: "9496188",
      doi: "10.1136/adc.77.6.519",
      note: "Grimace score for intubated children (no verbal score); feeds the BPNA revision.",
    },
    {
      citation:
        "British Paediatric Neurology Association. Child's Glasgow Coma Scale (Revised BPNA 2001). Audit chart.",
      url: "https://bpna.org.uk/audit/GCS.PDF",
      note: "UK standard scale; <5 y vs >5 y bands, plus the 'C' (eyes closed) and 'T' (intubated) non-numeric codes.",
    },
    {
      citation:
        "Holmes JF, Palchak MJ, MacFarlane T, Kuppermann N. Performance of the pediatric Glasgow Coma Scale in children with blunt head trauma. Acad Emerg Med. 2005;12(9):814–819.",
      pmid: "16141014",
      doi: "10.1197/j.aem.2005.04.019",
      note: "First validation; <2 y age cut-off for the pediatric column.",
    },
    {
      citation:
        "Borgialli DA, Mahajan P, Hoyle JD Jr, et al; PECARN. Performance of the Pediatric Glasgow Coma Scale Score in the Evaluation of Children With Blunt Head Trauma. Acad Emerg Med. 2016;23(8):878–884.",
      pmid: "27197686",
      doi: "10.1111/acem.13014",
      note: "Large PECARN validation (n=42,041); <2 y vs ≥2 y split.",
    },
    {
      citation:
        "Jain S, Iverson LM. Glasgow Coma Scale. StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing.",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK513298/",
      note: "Secondary reference: James/PECARN descriptor layout, <2 y vs >2 y age cut-off, and the 13–15/9–12/3–8 severity tri-band.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: Pediatric GCS (E+V+M, 3–15) with paraphrased age-adapted option labels and conventional severity bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The scoring math is an ordinal sum (E+V+M, 3–15) — a method/idea, not copyrightable expression. The numeric levels and severity thresholds are facts. GCS descriptor wording is stewarded by the Royal College of Physicians and Surgeons of Glasgow (associated with Sir Graham Teasdale) via glasgowcomascale.org; pediatric descriptors are reproduced freely across open sources (StatPearls NBK513298, CHOP pathway, BPNA audit chart). This implementation uses NEUTRAL PARAPHRASES rather than verbatim stewarded wording and attributes stewardship here and in notes (pgcs.md IP status).",
  },
  formula: defineText(
    "pgcs.formula",
    "Total pGCS = E + V + M, the ordinal sum of the eye-opening (E, 1–4), verbal/vocal (V, 1–5), and motor (M, 1–6) components, each taken as the best observed age-appropriate response; the total therefore ranges 3–15 with no 0 (Teasdale & Jennett 1974). There are no physical units and components are never interpolated. The single total is stratified into the conventional TBI-severity tri-band: 3–8 ('severe'), 9–12 ('moderate'), and 13–15 ('mild').",
  ),
  notes: defineText(
    "pgcs.notes",
    "Two lineages with different age cut-offs exist: James/PECARN (preverbal <2 y vs verbal ≥2 y, per Holmes 2005 / Borgialli 2016) and BPNA 'Child's GCS' (<5 y vs >5 y). A total is not comparable across schemes unless the scheme and age band are recorded — pin and store both per case. The E/V/M option labels here are neutral paraphrases spanning both the verbal-child and infant/preverbal descriptor columns; exact GCS wording is stewarded by the Royal College of Physicians and Surgeons of Glasgow / Teasdale (glasgowcomascale.org). Intubation breaks the plain sum: BPNA records the verbal component as a non-numeric 'T' (which is why the grimace score was introduced, Tatman 1997), while some US practice records V=1 with a 'T' suffix; this score computes a plain E+V+M and does not model 'T'. [NEEDS SOURCE] a single canonical rule for numerically substituting V=1 for intubated verbal in the James/PECARN branch (primary sources describe the code, not an arithmetic substitution). The 13–15/9–12/3–8 tri-band originated in adult TBI work; pediatric literature refines the 'severe' cut downward (≤5) for young children (StatPearls NBK513298). Sedation/paralysis makes V and M uninformative — flag such scores. Further [NEEDS SOURCE]: the original Reilly 1988 Adelaide per-level age-expected table and the James & Trauner 1985 chapter pagination were not independently verified from primary full text.",
  ),
  composition: {
    // min is 1, not 0: a GCS component has no zero. A bar drawn from zero would
    // show a motor score of 1 as a sixth of its range when it is the floor.
    total: "pgcs_total",
    components: [
      { id: "eye", max: 4, min: 1 },
      { id: "verbal", max: 5, min: 1 },
      { id: "motor", max: 6, min: 1 },
    ],
  },
  calculate: (values) => {
    const eye = Number(values.gcs_eye.value);
    const verbal = Number(values.gcs_verbal.value);
    const motor = Number(values.gcs_motor.value);

    const point = (id: string, label: string, value: number) => ({
      id,
      label: defineText(`pgcs.out.${id}`, label),
      value,
      unit: "",
      precision: 0,
    });

    return [
      {
        id: "pgcs_total",
        label: defineText("pgcs.output", "Total pGCS"),
        value: eye + verbal + motor,
        unit: "",
        precision: 0,
      },
      point("eye", "Eye-opening (E)", eye),
      point("verbal", "Verbal / vocal (V)", verbal),
      point("motor", "Motor (M)", motor),
    ];
  },
});
