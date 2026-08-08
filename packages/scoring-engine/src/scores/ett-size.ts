import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { ageInYears } from "../units/age";

/**
 * Pediatric endotracheal tube (ETT) size and oral insertion depth — age-based
 * ESTIMATION formulas, not a severity score. It emits three starting-point
 * estimates that must always be confirmed clinically (air-leak test,
 * auscultation, capnography, symmetric chest rise, imaging), with tubes 0.5 mm
 * larger and smaller kept on hand:
 *
 *   - cuffed internal diameter   = age/4 + 3.5  (APLS / Motoyama / Duracher 2008)
 *   - uncuffed internal diameter = age/4 + 4    (Cole 1957)
 *   - oral depth at the lips     = age/2 + 12   (APLS / PALS, per Weber 2023)
 *
 * No interpretation bands — an equipment-selection estimate has no
 * normal/abnormal stratum (research §"Interpretation bands").
 * Research + full sourcing: docs/research/scores/ett-size.md.
 */
export const ettSize = defineScore({
  id: "ett-size",
  slug: "ett-size",
  name: "ETT size and depth (pediatric)",
  version: "1.2.0",
  status: "published",
  category: "airway-equipment",
  inputs: [
    {
      id: "age",
      label: defineText("ett.age", "Age"),
      required: true,
      type: "numeric",
      unit: ageInYears,
      // Input-validity bounds, not a cited threshold: the /4 and /2 age
      // formulas are meant for roughly 1–10 y, and 12 is where adult ID is
      // reached.
      //
      // THE LOWER BOUND IS 1, NOT 0, AND THAT IS A CORRECTION. It was 0 until
      // v1.1.0, which meant a newborn computed silently: age 0 returns uncuffed
      // 4.0 mm, and a term newborn takes 3.0–3.5. The notes below have always
      // said sub-1-year sizing is weight- and gestational-age-based and "NOT
      // computed here" — the score simply computed it anyway. Refusing is what
      // makes the behaviour match the documentation, and the error the old
      // bound produced ran in the dangerous direction: these formulas OVER-size
      // the youngest children, and an over-sized tube is the mechanism of
      // subglottic injury. A rejection that names the right method beats a
      // number the score itself calls inapplicable.
      min: 1,
      max: 12,
      helpText: defineText(
        "ett.age.help",
        "Age in years (an 18-month-old is 1.5). Also accepts months or days. These formulas apply roughly 1–10 years and are accepted up to 12. Below 1 year they are NOT valid and are refused: use weight- and gestational-age-based neonatal sizing instead. Above ~12 years use adult sizing.",
      ),
    },
  ] as const,
  // Equipment-selection estimate — no severity/risk bands exist (research
  // §"Interpretation bands": "This score has no severity / risk interpretation
  // bands."). Left intentionally empty; see notes.
  interpretation: [],
  references: [
    {
      citation:
        "Cole F. Pediatric formulas for the anesthesiologist. AMA J Dis Child. 1957;94(6):672–673.",
      pmid: "13478300",
      doi: "10.1001/archpedi.1957.04030070084009",
      note: "Origin of the uncuffed formula ID = age/4 + 4.",
    },
    {
      citation:
        "Khine HH, et al. Comparison of cuffed and uncuffed endotracheal tubes in young children during general anesthesia. Anesthesiology. 1997;86(3):627–631.",
      pmid: "9066329",
      doi: "10.1097/00000542-199703000-00015",
      note: "Classic cuffed formula ID = age/4 + 3.0 (0.5 mm smaller than the pinned +3.5).",
    },
    {
      citation:
        "Duracher C, et al. Evaluation of cuffed tracheal tube size predicted using the Khine formula in children. Paediatr Anaesth. 2008;18(2):113–118.",
      pmid: "18184241",
      doi: "10.1111/j.1460-9592.2007.02382.x",
      note: "Khine +3.0 under-sizes by ~0.5 mm in children > 1 y; supports the pinned cuffed ID = age/4 + 3.5 (also the APLS/Motoyama constant).",
    },
    {
      citation:
        "Weber MD, et al. Recommendations for endotracheal tube insertion depths in children. Respir Care. 2023.",
      pmid: "37336629",
      note: "Attributes oral depth = age/2 + 12 to PALS 2000 and lists ID (mm) × 3 as the oral-intubation depth cross-check.",
    },
    {
      citation: "Endotracheal Tube. StatPearls [Internet]. NCBI Bookshelf NBK539747.",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK539747/",
      note: "Uncuffed age/4 + 4; cuffed one-half size smaller; oral depth ≈ 3 × tube ID (e.g. a 4.0 mm tube at ~12 cm); round to nearest available 0.5 mm.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: pediatric ETT cuffed/uncuffed internal diameter and oral depth from age formulas.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-08",
      summary:
        "Emit the nearest manufactured 0.5 mm tube size for both cuffed and uncuffed, and the 3 × ID depth cross-check, instead of describing both only in prose; raise the minimum age from 0 to 1 year so sub-1-year entries are refused rather than silently over-sized. From the external calculator audit of 2026-08-08 (findings F1, F2, F9). F1: raw formula values are not device sizes — 7.5 y displayed 'cuffed 5.4 mm', and every odd whole year lands exactly between two sizes, so ties decide half of all whole-year entries (resolved DOWN, which is what reproduces the taught 1 y / 3 y / 5 y sizes). F2: age 0 returned uncuffed 4.0 mm for a newborn who takes 3.0–3.5, contradicting this score's own notes, which already said sub-1-year sizing is NOT computed here. F9: the 3 × ID cross-check was cited in the formula text but never emitted. All three were already sourced in this file's references (StatPearls NBK539747; Weber 2023, PMID 37336629) — none introduces new clinical content.",
      reason: "formula-correction",
    },
    {
      version: "1.2.0",
      date: "2026-08-08",
      summary:
        "WITHDRAWS THE TWO 3 × ID DEPTH CROSS-CHECK ROWS ADDED HOURS EARLIER IN v1.1.0, and retracts the sentence that justified them. Tube sizes, the sub-1-year refusal and every other output are unchanged. THE CLAIM THAT WAS WRONG: v1.1.0’s formula text said the cross-check “should agree with age ÷ 2 + 12 within about 1 cm; if the two disagree by more, re-check the age and the tube.” It does not. The two rules diverge by construction — 3 × ID grows 0.75 cm per year of age while age ÷ 2 + 12 grows 0.5 — so the gap widens with age and never closes. Swept across the accepted 1–12 y domain the uncuffed cross-check exceeded 1 cm at two thirds of sampled ages, worst 3.38 cm at 11.25 y; at 12 y it printed 21.0 cm beside a stated depth of 18.0 cm, and 21 cm at the lips in a 12-year-old is toward endobronchial. At 1 y the cuffed check printed 10.5 cm against a depth of 12.5 cm. So a correctly entered child was told, by the calculator’s own instruction, to distrust the age and the tube. WORSE, THE REPO ALREADY KNEW: docs/research/scores/ett-size.md states “Depth methods can disagree. age/2 + 12 and ID × 3 can differ by > 1 cm, especially at the young end”, and its Example 3 records a 2.5 cm gap. The v1.1.0 text contradicted the score’s own research note. AND THE GUARD COULD NOT CATCH IT: the only test of those rows pinned age 4, one of the few ages where the two happen to land 1.0 cm apart, so it would have passed at every future age too. That is the failure mode this project documents as ‘a guard that has never failed deserves suspicion’, committed while quoting the rule. WHY WITHDRAWAL RATHER THAN A CORRECTED TOLERANCE: two oral depths for one child, up to 3 cm apart, is the same ambiguity removed from the burn page on the same day, and no wording makes a second depth number safe to have on screen beside the first. The 3 × ID rule of thumb is real and stays described in the formula text, with its divergence stated. This reverses audit finding F9, whose recommendation to emit it ‘with an agreement note (within ~1 cm)’ rested on a premise this repo’s own research contradicts.",
      reason: "output-withdrawn",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      'age/4 + 4, age/4 + 3.5, and age/2 + 12 are mathematical facts / clinical methods (ideas and procedures), not copyrightable expression; coefficients are facts (research §"IP status"). Program names (APLS/PALS) are referenced factually, not reproduced.',
  },
  formula: defineText(
    "ett.formula",
    "Uncuffed internal diameter (mm) = age in years ÷ 4 + 4 (Cole). Cuffed internal diameter (mm) = age in years ÷ 4 + 3.5 (APLS/Motoyama/Duracher). Oral insertion depth at the lips (cm) = age in years ÷ 2 + 12. Because tubes are manufactured only in 0.5 mm steps, each raw diameter is also shown snapped to the nearest real size, with exact half-steps taken DOWN to the smaller tube — which is what reproduces the conventional sizes these formulas are taught alongside (1 y cuffed 3.5, 3 y cuffed 4.0, 5 y cuffed 4.5). A second depth rule of thumb, tube ID (mm) × 3, is widely taught and is NOT emitted here: it and age ÷ 2 + 12 diverge with age rather than corroborating one another — about 2 cm apart at 1 year and 3 cm at 12 — so printing both would put two oral depths for the same child on one screen. Use age ÷ 2 + 12, and confirm the tip by auscultation, capnography and imaging rather than by a second formula. These remain estimates: keep tubes 0.5 mm larger and smaller on hand, and confirm placement by air-leak test, auscultation, capnography, chest rise, and imaging.",
  ),
  notes: defineText(
    "ett.notes",
    "Estimation formulas, not a severity score — no interpretation bands apply (interpretation is intentionally empty). Cuffed constant is pinned to +3.5 (APLS/Motoyama/Duracher 2008, PMID 18184241); the classic Khine +3.0 (PMID 9066329) yields a tube 0.5 mm smaller and is still widely taught — recorded here per the pin-the-constant requirement. The nearest manufactured 0.5 mm step is now emitted for each tube rather than left as an instruction, with exact half-steps resolved DOWN to the smaller size — both because that reproduces the conventional taught values and because the two errors are not symmetric: a tube 0.5 mm small is exchanged or tolerated with a larger leak, while one 0.5 mm large is the mechanism of subglottic injury. Keep tubes 0.5 mm larger and smaller available regardless; the age formulas mis-size a meaningful minority of children (Cole tends to over-size the youngest in range), so always confirm fit clinically (uncuffed air-leak conventionally audible at ~20–30 cmH₂O). Domain is 1–12 years and the lower bound is ENFORCED as of v1.1.0: below 1 year, sizing/depth are weight- and gestational-age-based (Merck/NRP table; Kempley 2008, PMID 18372092), are NOT computed here, and are refused rather than approximated — until v1.1.0 a newborn silently returned uncuffed 4.0 mm against a true 3.0–3.5. Above 12 years use adult sizing. Only the ORAL depth formula is emitted. NEEDS SOURCE (carried from research): the nasal-route depth offset (~+2–3 cm) is not verified from a primary source, and the fixed infant depth steps (~10/11/12 cm) lack primary APLS pagination — neither is implemented here.",
  ),
  calculate: (values) => {
    // Canonical age is in years (age unit spec). The RAW formula values are
    // returned alongside the device sizes rather than replaced by them: the
    // formulas are what this score cites, and hiding their output would make
    // the cited arithmetic uncheckable at the bedside.
    const age = values.age.value;
    const cuffedId = age / 4 + 3.5; // APLS / Motoyama / Duracher 2008
    const uncuffedId = age / 4 + 4; // Cole 1957
    const depthAtLips = age / 2 + 12; // APLS / PALS (Weber 2023)
    const cuffedDevice = toDeviceSize(cuffedId);
    const uncuffedDevice = toDeviceSize(uncuffedId);
    return [
      {
        id: "cuffed_id",
        label: defineText("ett.out.cuffed", "Cuffed tube internal diameter (age/4 + 3.5)"),
        value: cuffedId,
        unit: "mm",
        precision: 1,
      },
      {
        id: "cuffed_device_id",
        label: defineText("ett.out.cuffedDevice", "Cuffed tube — nearest manufactured size"),
        value: cuffedDevice,
        unit: "mm",
        precision: 1,
      },
      {
        id: "uncuffed_id",
        label: defineText("ett.out.uncuffed", "Uncuffed tube internal diameter (age/4 + 4)"),
        value: uncuffedId,
        unit: "mm",
        precision: 1,
      },
      {
        id: "uncuffed_device_id",
        label: defineText("ett.out.uncuffedDevice", "Uncuffed tube — nearest manufactured size"),
        value: uncuffedDevice,
        unit: "mm",
        precision: 1,
      },
      {
        id: "depth_at_lips",
        label: defineText("ett.out.depth", "Oral insertion depth at lips (age/2 + 12)"),
        value: depthAtLips,
        unit: "cm",
        precision: 1,
      },
    ];
  },
});

/**
 * Snap a formula-derived internal diameter to a tube that exists.
 *
 * Tubes are manufactured in 0.5 mm steps, so a raw formula value names a real
 * device only by accident. age/4 + 3.5 lands exactly BETWEEN two sizes for
 * every odd whole year (1 y → 3.75, 3 y → 4.25, 5 y → 4.75) — half of all
 * whole-year entries — and a fractional age misses far more often than it hits
 * (7.5 y → 5.375, displayed as "5.4 mm", which no manufacturer makes).
 *
 * TIES GO TO THE SMALLER TUBE, and that is the load-bearing decision here.
 * Rounding half down is what reproduces the conventional sizes these formulas
 * are taught alongside — 1 y cuffed 3.5, 3 y cuffed 4.0, 5 y cuffed 4.5, 1 y
 * uncuffed 4.0, 3 y uncuffed 4.5. Rounding half up contradicts every one of
 * them. It is also the safer direction on its own terms: a tube 0.5 mm small is
 * exchanged or accepted with a larger leak, while one 0.5 mm large is how
 * subglottic injury happens.
 *
 * `Math.ceil(x - 0.5)` is round-half-down; `Math.round` is round-half-up and
 * would be wrong here. Working in half-millimetre units keeps the ties exactly
 * representable, so no epsilon is needed.
 */
function toDeviceSize(rawId: number): number {
  return Math.ceil(rawId * 2 - 0.5) / 2;
}
