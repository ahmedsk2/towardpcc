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
  version: "1.1.0",
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
      date: "2026-08-10",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-09-03",
      reason: "formula-correction",
      summary:
        "Reads a birthday entered in DAYS as that birthday. Age is stored in years and days convert at 365.25, so a sixth birthday of 2191 days became 5.9986 years and a tenth of 3652 days became 9.9986. Anything that floors or bands on whole years then read the child as a year younger. The conversion now snaps to a whole year when the day count is within one day of one, which is the largest the drift can be: 365.25 averages the leap cycle exactly, so a true birthday is always within 0.75 days of the integer. Ages entered in years or months were already exact and are unchanged, and an age more than a day from a birthday is untouched. Found 2026-09-03 by an independent recompute of every calculator from its published source. On this score a first birthday entered as 366 days lifted the raw cuffed size from exactly 3.75 to 3.7505, rounding it up to 4.0 instead of down to 3.5.",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      'age/4 + 4, age/4 + 3.5, and age/2 + 12 are mathematical facts / clinical methods (ideas and procedures), not copyrightable expression; coefficients are facts (research §"IP status"). Program names (APLS/PALS) are referenced factually, not reproduced.',
  },
  formula: defineText(
    "ett.formula",
    "Uncuffed internal diameter (mm) = age in years ÷ 4 + 4 (Cole). Cuffed internal diameter (mm) = age in years ÷ 4 + 3.5, pinned to the APLS/Motoyama/Duracher constant; the classic Khine +3.0 gives a tube 0.5 mm smaller and is still widely taught. Oral depth at the lips (cm) = age in years ÷ 2 + 12. Each raw diameter is also snapped to the nearest manufactured 0.5 mm size, with exact half-steps resolved DOWN, both because that reproduces the conventional taught sizes (1 y cuffed 3.5, 3 y 4.0, 5 y 4.5) and because the errors are asymmetric: a tube 0.5 mm small is exchanged or tolerated, one 0.5 mm large is the mechanism of subglottic injury.",
  ),
  notes: defineText(
    "ett.notes",
    "Scope is age 1 to 12 years, with the lower bound enforced: below 1 year these formulas are invalid and are refused, so use weight- and gestational-age-based neonatal sizing instead. Above about 12 years, use adult sizing. The ID × 3 depth rule is deliberately not emitted: it diverges from age ÷ 2 + 12 by about 2 cm at 1 year and about 3 cm at 12, so printing both would put two oral depths for one child on one screen. Keep tubes 0.5 mm larger and smaller at hand. The formulas mis-size a meaningful minority of children (Cole over-sizes the youngest in range), so confirm by air-leak test (about 20 to 30 cmH₂O uncuffed), auscultation, capnography, chest rise, and imaging. [NEEDS SOURCE]: the nasal-route depth offset (about +2 to 3 cm) and the fixed infant depth steps are unverified and not implemented.",
  ),
  calculate: (values) => {
    // RAW DIAMETERS PRINT AT 2 dp, not 1, and that is not cosmetic. These
    // values are exact quarters — age/4 + 3.5 gives x.25 or x.75 at every odd
    // whole year — so one decimal place rounds them AWAY from the device size
    // sitting beside them: "4.8" next to "nearest manufactured 4.5", "3.8" next
    // to "3.5", at every odd year in the domain. The pair reads like an
    // arithmetic error to anyone who has not read the tie rule. At 2 dp the raw
    // value prints as 4.75 and the relationship is self-evident. Found by the
    // round-2 re-test, 2026-08-09.
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
        precision: 2,
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
        precision: 2,
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
