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
  version: "1.0.0",
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
      // formulas are meant for roughly 1–10 y; 0 (newborn, where the formula
      // collapses) and 12 (adult ID reached) frame the usable domain.
      min: 0,
      max: 12,
      helpText: defineText(
        "ett.age.help",
        "Age in years (a 6-month-old is 0.5). Also accepts months or days. These formulas apply roughly 1–10 years; below ~1 year use weight/gestational-age neonatal sizing instead, and above ~12 years use adult sizing.",
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
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      'age/4 + 4, age/4 + 3.5, and age/2 + 12 are mathematical facts / clinical methods (ideas and procedures), not copyrightable expression; coefficients are facts (research §"IP status"). Program names (APLS/PALS) are referenced factually, not reproduced.',
  },
  formula: defineText(
    "ett.formula",
    "Uncuffed internal diameter (mm) = age in years ÷ 4 + 4 (Cole). Cuffed internal diameter (mm) = age in years ÷ 4 + 3.5 (APLS/Motoyama/Duracher). Oral insertion depth at the lips (cm) = age in years ÷ 2 + 12. These are estimates: round the tube diameter to the nearest available 0.5 mm size, keep tubes 0.5 mm larger and smaller on hand, and confirm placement by air-leak test, auscultation, capnography, chest rise, and imaging. A depth cross-check is tube ID (mm) × 3, which should agree with age ÷ 2 + 12 within about 1 cm.",
  ),
  notes: defineText(
    "ett.notes",
    "Estimation formulas, not a severity score — no interpretation bands apply (interpretation is intentionally empty). Cuffed constant is pinned to +3.5 (APLS/Motoyama/Duracher 2008, PMID 18184241); the classic Khine +3.0 (PMID 9066329) yields a tube 0.5 mm smaller and is still widely taught — recorded here per the pin-the-constant requirement. Round each raw internal diameter to the nearest manufactured 0.5 mm step and keep tubes 0.5 mm larger and smaller available; the age formulas mis-size a meaningful minority of children (Cole tends to over-size the youngest in range), so always confirm fit clinically (uncuffed air-leak conventionally audible at ~20–30 cmH₂O). Domain is roughly 1–10 (up to ~12) years: below ~1 year, sizing/depth are weight- and gestational-age-based (Merck/NRP table; Kempley 2008, PMID 18372092) and are NOT computed here; above ~12 years use adult sizing. Only the ORAL depth formula is emitted. NEEDS SOURCE (carried from research): the nasal-route depth offset (~+2–3 cm) is not verified from a primary source, and the fixed infant depth steps (~10/11/12 cm) lack primary APLS pagination — neither is implemented here.",
  ),
  calculate: (values) => {
    // Canonical age is in years (age unit spec). Return RAW formula values; the
    // per-value `precision` rounds for display only, and the practical
    // round-to-nearest-0.5-mm-tube step is a clinical action described in notes,
    // not applied to the returned number.
    const age = values.age.value;
    const cuffedId = age / 4 + 3.5; // APLS / Motoyama / Duracher 2008
    const uncuffedId = age / 4 + 4; // Cole 1957
    const depthAtLips = age / 2 + 12; // APLS / PALS (Weber 2023)
    return [
      {
        id: "cuffed_id",
        label: defineText("ett.out.cuffed", "Cuffed tube internal diameter (age/4 + 3.5)"),
        value: cuffedId,
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
        id: "depth_at_lips",
        label: defineText("ett.out.depth", "Oral insertion depth at lips (age/2 + 12)"),
        value: depthAtLips,
        unit: "cm",
        precision: 1,
      },
    ];
  },
});
