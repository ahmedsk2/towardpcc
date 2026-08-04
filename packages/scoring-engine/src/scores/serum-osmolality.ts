import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import type { ScoreValue } from "../types";
import { bunMgdl, ethanolMgdl, glucoseMgdl, mOsmPerKg, sodiumMmol } from "../units/osmolytes";

/**
 * Serum osmolality (calculated) and osmolar gap.
 *
 * Two linked bedside quantities (docs/research/scores/serum-osmolality.md):
 *
 *   1. Calculated osmolality — Smithline–Gardner (JAMA 1976), the formula Choy
 *      2016 recommends for harmonised use and the form guidelines print:
 *          Osm_calc = 2·Na + glucose/18 + BUN/2.8      [mg/dL inputs, mOsm/kg]
 *          Osm_calc = 2·Na + glucose + urea            [all mmol/L]
 *      (÷18 and ÷2.8 are the exact mg/dL → mmol/L conversions for glucose and
 *      urea; 2·Na stands for sodium plus its paired anion.) Re-confirmed against
 *      the guideline-endorsed form on 2026-08-03 — no coefficient changed.
 *
 *   2. Osmolar gap = measured osmolality − calculated osmolality. Computed only
 *      when the user supplies an osmometer-measured value; a raised gap flags
 *      osmotically active solute NOT captured by Na/glucose/urea.
 *
 * Ethanol is a real fork, not a silent choice: when a measured ethanol is
 * entered, BOTH published ethanol terms are emitted — ÷3.7 (Purssell 2001
 * empiric) and ÷4.6 (ideal molar mass, MW ≈ 46) — plus the residual gap each
 * yields, so the user sees the effect of the divisor choice (research §Formula
 * variants + worked example 4). The base Smithline–Gardner value is always the
 * first output; alternate base formulas (Dorwart–Chalmers, Bhagat) are documented
 * in notes but not silently substituted.
 *
 * Interpretation bands apply to the base osmolar gap only (Choy 2016 reference
 * limit 10; classic < 10 cut-off). Corrected/derived osmolality VALUES carry no
 * bands (they have a physiologic reference range, not a threshold — see notes).
 *
 * ONE EXCEPTION, and it is the reason `osm_gap` is not always the id the raw gap
 * is emitted under. When a measured ethanol accounts for MORE than the entire
 * measured-minus-calculated difference — i.e. the residual gap is negative under
 * BOTH published divisors — the raw gap is emitted as `osm_gap_ethanol_explained`
 * instead, which carries its own single band. Before that, a page could show
 * "osmolar gap 30, ≥ 10, suggests an unmeasured osmole" directly above two
 * residual gaps of −24 and −13: the flag contradicted the rows under it. The
 * suppression requires BOTH divisors to agree, so the ÷3.7-vs-÷4.6 fork is never
 * silently decided by a rule that removes a flag; when the two disagree in sign
 * the flag stands and the disagreement is visible in the emitted values.
 */
export const serumOsmolality = defineScore({
  id: "serum-osmolality",
  slug: "serum-osmolality",
  name: "Serum osmolality (calculated) and osmolar gap",
  version: "1.3.0",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "na",
      label: defineText("osm.na", "Sodium"),
      required: true,
      type: "numeric",
      unit: sodiumMmol,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): survivable hypo-/hypernatraemia.
      min: 100,
      max: 200,
      step: 1,
      helpText: defineText(
        "osm.na.help",
        "Serum sodium in mmol/L (equivalently mEq/L — monovalent, 1:1).",
      ),
    },
    {
      id: "glucose",
      label: defineText("osm.glucose", "Glucose"),
      required: true,
      type: "numeric",
      unit: glucoseMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): severe hypoglycaemia to extreme
      // hyperglycaemic crisis.
      min: 10,
      max: 2000,
      step: 1,
      helpText: defineText(
        "osm.glucose.help",
        "Serum glucose. Accepts mg/dL (US) or mmol/L (SI, ×18).",
      ),
    },
    {
      id: "bun",
      label: defineText("osm.bun", "Blood urea nitrogen (BUN)"),
      required: true,
      type: "numeric",
      unit: bunMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]).
      min: 1,
      max: 300,
      step: 1,
      helpText: defineText(
        "osm.bun.help",
        "Blood urea NITROGEN. Accepts mg/dL (US) or, if the lab reports whole-molecule urea (SI), mmol/L (×2.8). BUN ≠ urea — they differ by the ×2.8 factor.",
      ),
    },
    {
      id: "osm_measured",
      label: defineText("osm.measured", "Measured osmolality (optional)"),
      required: false,
      type: "numeric",
      unit: mOsmPerKg,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): generous engineering range that
      // still admits marked toxic-alcohol elevations.
      min: 100,
      max: 600,
      step: 1,
      helpText: defineText(
        "osm.measured.help",
        "Osmometer value in mOsm/kg. Enter it to compute the osmolar gap (measured − calculated).",
      ),
    },
    {
      id: "ethanol",
      label: defineText("osm.ethanol", "Ethanol (optional)"),
      required: false,
      type: "numeric",
      unit: ethanolMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]).
      min: 0,
      max: 1000,
      step: 1,
      helpText: defineText(
        "osm.ethanol.help",
        "Measured ethanol. Accepts mg/dL or mmol/L (×4.6). When entered, the calculated osmolality and residual gap are shown with both the ÷3.7 (empiric) and ÷4.6 (ideal) ethanol terms.",
      ),
    },
  ] as const,
  // Bands apply to the base osmolar gap only. Ascending: a larger gap is the
  // "more abnormal" direction, so the cut-off is "≥" → default [min, max).
  // gap < 10 → normal; gap ≥ 10 → elevated (Choy 2016 reference limit). The
  // third band is not a range on the same value — it is the id the raw gap is
  // emitted under when the ethanol term already absorbs it (see calculate).
  interpretation: [
    {
      id: "gap-normal",
      appliesTo: "osm_gap",
      min: null,
      max: 10,
      label: defineText("osm.gap.normal", "< 10 mOsm/kg"),
      description: defineText(
        "osm.gap.normal.desc",
        "Below the reference limit of 10 mOsm/kg for the osmolar gap computed with the Smithline–Gardner formula (Choy 2016). The limit is partly conventional rather than a derived cut-point, and the spread behind it is wider than one number suggests: measured in 321 subjects the gap centres near −2 with an SD of about 6 mOsm, and across different equations the measured gaps ranged from about −5 to +15 (Hoffman 1993); secondary sources render the same distribution as a 95% population range of roughly −14 to +10, whose upper bound is where the cut-off of 10 sits (−2 + 2 SD). A gap below 10 does NOT exclude toxic alcohol ingestion, and the arithmetic above is the reason: an individual's own true baseline may be NEGATIVE, so a patient starting near −14 can acquire more than 20 mOsm/kg of unmeasured osmole and still measure only +10 — at the cut-off rather than far above it. An early presentation before metabolism does the same, and the test is not used in isolation (Lynd 2008). PAEDIATRIC DATA DOES EXIST — an earlier version of this page said none existed and called that absence settled; the claim is WITHDRAWN — and what it shows is a wide normal: across 192 children (median age 6.6 years, 7 days to 17.9 years) the range of normal osmolar gaps is about 22 mOsm whichever equation is used (McQuillen 1999), more than twice the width of the 10 mOsm/kg limit itself. A gap below 10 in a child is therefore unremarkable rather than reassuring. A negative gap is ordinary biological variation, measurement imprecision, or an artefact of an additive formula (which yields osmolarity) being compared with an osmometer (which yields osmolality); it is not a finding in itself.",
      ),
    },
    {
      id: "gap-elevated",
      appliesTo: "osm_gap",
      min: 10,
      max: null,
      label: defineText("osm.gap.elevated", "≥ 10 mOsm/kg"),
      description: defineText(
        "osm.gap.elevated.desc",
        "At or above the reference limit of 10 mOsm/kg proposed for the Smithline–Gardner osmolar gap (Choy 2016) — the most common clinically applied cut-off (Lynd 2008). The threshold's performance depends on the question asked, and on which ethanol coefficient is used — the same fork this score already emits (1.0 ≡ ÷4.6 ideal; 1.25 ≡ ÷3.7 empiric). In Lynd 2008 a cut-off of 10 identified patients for whom HAEMODIALYSIS was recommended with sensitivity 1.0 (95% CI 0.80–1.00) and negative predictive value 1.0 under BOTH coefficients, at specificity 0.23 (coefficient 1.0) or 0.51 (coefficient 1.25), AUC 0.827 and 0.870. For identifying patients needing ANTIDOTAL THERAPY the same cut-off gave sensitivity 0.90 (95% CI 0.68–0.99) at specificity 0.22 with coefficient 1.0, and sensitivity 0.85 at specificity 0.50 with coefficient 1.25, AUC 0.736 and 0.785. (An earlier version of this page reported 0.90 and 0.85 as a sensitivity/NPV pair for the antidote question; they are two sensitivities, one per ethanol coefficient. Corrected here from the full text.) Suggests osmotically active solute not captured by sodium, glucose, and urea (e.g. a toxic alcohol, ethanol, mannitol, glycerol, propylene glycol, isopropanol, or a pseudo-gap from severe hyperlipidaemia/hyperproteinaemia). Some older sources use a wider normal up to ~14–15, and the measured normal range varies with the formula used: −2 ± 6 in 321 subjects, about −5 to +15 across equations (Hoffman 1993), and roughly −14 to +10 as a 95% population range in secondary renderings of the same data. A value just above 10 therefore sits at the edge of the healthy distribution rather than outside it. PAEDIATRIC DATA DOES EXIST, and this page's earlier claim that it did not — recorded as settled absent — is WITHDRAWN. It widens the same point: in 192 children (median age 6.6 years) the range of normal osmolar gaps is about 22 mOsm (McQuillen 1999), and in 101 children with chronic renal failure the gaps ran 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis (Dursun 2007). The boundary stays at 10 because that is what the reference-limit literature supports, not because paediatric normals are narrow — a gap a little above 10 in a child is weaker evidence of an unmeasured osmole than the sharpness of the cut-off suggests. The gap does not identify the substance; interpret with the full clinical picture.",
      ),
    },
    {
      id: "gap-ethanol-explained",
      appliesTo: "osm_gap_ethanol_explained",
      min: null,
      max: null,
      label: defineText("osm.gap.explained", "Accounted for by the measured ethanol"),
      description: defineText(
        "osm.gap.explained.desc",
        "The entered ethanol accounts for more than the whole measured-minus-calculated difference: with the ethanol term added, the residual gap is negative under BOTH published divisors (÷3.7 empiric and ÷4.6 ideal). The raw gap is shown for reference and is not read against the 10 mOsm/kg limit, which applies to a gap the ethanol term has not already absorbed. A negative residual is ordinary biological variation, measurement imprecision, or a formula artefact — the measured normal gap centres near −2, not 0 (Hoffman 1993). This does not exclude a co-ingested toxic alcohol; it says only that no unmeasured osmole is needed to explain this pair of numbers (Lynd 2008).",
      ),
    },
  ],
  references: [
    {
      citation:
        "Smithline N, Gardner KD Jr. Gaps—anionic and osmolal. JAMA. 1976;236(14):1594–1597.",
      pmid: "989132",
      doi: "10.1001/jama.236.14.1594",
      note: "Original Smithline–Gardner formula (default calculated osmolality).",
    },
    {
      citation:
        "Choy KW, Wijeratne N, Lu ZX, Doery JCG. Harmonisation of Osmolal Gap — Can We Use a Common Formula? Clin Biochem Rev. 2016;37(3):113–119.",
      pmid: "27872505",
      note: "Recommends Smithline–Gardner; proposes the gap reference limit of 10 mOsm/kg; healthy SD ≈ 4, uncertainty ≈ ±7.",
    },
    {
      citation:
        "Purssell RA, Pudek M, Brubacher J, Abu-Laban RB. Derivation and validation of a formula to calculate the contribution of ethanol to the osmolal gap. Ann Emerg Med. 2001;38(6):653–659.",
      pmid: "11719745",
      doi: "10.1067/mem.2001.119455",
      note: "Empiric ethanol divisor 3.7 (factor 1.25 in SI).",
    },
    {
      citation:
        "Lynd LD, Richardson KJ, Purssell RA, et al. An evaluation of the osmole gap as a screening test for toxic alcohol poisoning. BMC Emerg Med. 2008;8:5.",
      pmid: "18442409",
      doi: "10.1186/1471-227X-8-5",
      note: "10 = most common cut-off; high sensitivity, low specificity; not to be used in isolation.",
    },
    {
      citation:
        "Dorwart WV, Chalmers L. Comparison of methods for calculating serum osmolality from chemical concentrations. Clin Chem. 1975;21(2):190–194.",
      pmid: "1112025",
      note: "Alternate formula (1.86·Na + glucose/18 + BUN/2.8 + 9); not implemented — documented for cross-reference.",
    },
    {
      citation:
        "Bhagat CI, Garcia-Webb P, Fletcher E, Beilby JP. Calculated vs measured plasma osmolalities revisited. Clin Chem. 1984;30(10):1703–1705.",
      pmid: "6537784",
      note: "Alternate formula (Bhagat); not implemented — documented for cross-reference.",
    },
    {
      citation:
        "Ranadive SA, Rosenthal SM. Pediatric Disorders of Water Balance. Pediatr Clin North Am. 2011;58(5):1271–1280.",
      pmid: "21981960",
      doi: "10.1016/j.pcl.2011.07.013",
      note: "Pediatric normal plasma-osmolality range 280–295 mOsm/kg (the value's reference range, not the gap threshold).",
    },
    {
      citation:
        "Hoffman RS, Smilkstein MJ, Howland MA, Goldfrank LR. Osmol gaps revisited: normal values and limitations. J Toxicol Clin Toxicol. 1993;31(1):81–93.",
      pmid: "8433417",
      note: "N = 321. Measured normal gap centres at −2 with SD ≈ 6 mOsm and ranges about −5 to +15 depending on the equation — the basis for calling the 10 cut-off partly conventional (≈ mean + 2 SD), and for treating a negative gap as normal variation. Abstract read on 2026-08-04; the 95% population range of about −14 to +10 quoted alongside it is a secondary rendering of this distribution (and is arithmetically −2 ± 2 SD), not a figure this abstract prints.",
    },
    {
      citation:
        "StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing. Serum-osmolality chapter, NCBI Bookshelf ID NBK567764.",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK567764/",
      note: "Reference range 275–295 mOsm/kg for the osmolality VALUE. Tertiary/grey source cited with a retrieval date (retrieved 2026-08-03); the paediatric-specific 280–295 (Ranadive 2011) sits inside it.",
    },
    {
      citation:
        "Berska J, Bugajska J, Sztefko K. The accuracy of serum osmolarity calculation in small children. J Med Biochem. 2023;42(1):67–77.",
      pmid: "36819138",
      doi: "10.5937/jomb0-37490",
      note: "280 samples, first day of life to 2 years (mean age 8.2 ± 7.6 months); measured osmolality 285.8 ± 5.1 mOsm/kgH₂O. Below 3 months every calculated formula showed BOTH systematic and proportional error on Passing–Bablok regression, so osmolality should be measured rather than calculated in that group; from 3 months to 2 years 1.86·(Na+K) + 1.15·glucose + urea + 14 agreed best with the osmometer. RESOLVES a [NEEDS SOURCE]: this is the paper the round-2 pass carried by PMCID alone (PMC9920940) and described as an uncited 'Kraków cohort' — same 280 samples, same day-1-to-2-years range, same 285.8 ± 5.1, same equation. Full bibliographic record confirmed 2026-08-04.",
    },
    {
      citation:
        "McQuillen KK, Anderson AC. Osmol gaps in the pediatric population. Acad Emerg Med. 1999;6(1):27–30.",
      pmid: "9928973",
      doi: "10.1111/j.1553-2712.1999.tb00090.x",
      note: "PAEDIATRIC OSMOLAR-GAP DATA — the study whose existence this score previously denied. 192 children (median age 6.6 years, 7 days to 17.9 years) in a paediatric ED; mean measured osmolality 284.2 ± 6.9, range 265–311. Concludes that whichever equation is used, the range of normal paediatric osmol gaps is approximately 22 mOsm — more than twice the width of the 10 mOsm/kg limit. (The abstract prints the osmolality unit as mOsm/dL, which is not a unit of osmolality; the magnitude is unambiguously mOsm/kg and sits inside the 275–295 reference range.)",
    },
    {
      citation:
        "Dursun H, Noyan A, Cengiz N, et al. Changes in osmolal gap and osmolality in children with chronic and end-stage renal failure. Nephron Physiol. 2007;105(2):p19–21.",
      pmid: "17139190",
      doi: "10.1159/000097604",
      note: "101 children with chronic renal failure; osmolar gap 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis. Corroborates a wide paediatric spread, in a special population rather than a normal reference sample. Bibliographic record confirmed on PubMed 2026-08-04; PubMed carries no abstract for this article, so the numeric values come from the round-4 finding and were not independently re-read here.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: Smithline–Gardner calculated osmolality, osmolar gap, and both ethanol-divisor variants (÷3.7 / ÷4.6).",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "An ethanol-explained gap no longer reads as elevated: when the residual gap is negative under both divisors the raw gap is emitted as osm_gap_ethanol_explained with its own band, instead of being flagged ≥ 10 above two negative residual rows. Gap-band text now states the threshold with its use case (Lynd 2008: sensitivity/NPV 1 for identifying haemodialysis candidates, 0.90/0.85 for antidotal therapy) and that a normal gap does not exclude toxic alcohol ingestion; Hoffman 1993 added for the measured normal gap (−2 ± 6, range −5 to +15 by equation). Osmolality reference range now carries its sources (StatPearls NBK567764 275–295; measured infant data PMC9920940). New cautions: below 3 months osmolality should be measured rather than calculated, and between 3 months and 2 years a different equation validated better.",
      reason: "clarification",
    },
    {
      version: "1.2.0",
      date: "2026-08-04",
      summary:
        "Widens the stated reference picture and closes the paediatric question as an absence rather than an omission. NO BAND BOUNDARY MOVED — the cut-off is still 10 mOsm/kg and every computed number is unchanged. Hoffman 1993 is now carried with its sample size (n = 321) and its full spread: −2 ± 6, about −5 to +15 across equations, and a 95% population range of roughly −14 to +10 in secondary renderings of the same data, which is arithmetically −2 ± 2 SD and is why 10 is the top of the healthy distribution rather than a derived diagnostic boundary. The statement that a normal gap does not exclude toxic alcohol ingestion is now explicit and shows its working: because an individual's true baseline may be negative, a patient starting near −14 can acquire more than 20 mOsm/kg of unmeasured osmole and still measure only +10. New caution: no paediatric osmolar-gap data exists at all — the limit, the distribution and the Lynd 2008 performance figures are adult and are applied to children unvalidated — and that absence is recorded as settled, not as a search still running.",
      reason: "clarification",
    },
    {
      version: "1.3.0",
      date: "2026-08-04",
      summary:
        'WITHDRAWS A FALSE CLAIM SHIPPED IN 1.2.0. Version 1.2.0 stated that no paediatric osmolar-gap data exists and recorded that absence as settled. That is wrong, and "settled absent" is a strong enough assertion that getting it wrong is worse than never having made it. Three paediatric datasets are now carried: McQuillen 1999 (192 children, median age 6.6 years, measured osmolality 284.2 ± 6.9, range 265–311) concludes the normal paediatric osmol-gap RANGE is about 22 mOsm whichever equation is used; Dursun 2007 (101 children with chronic renal failure) reports gaps of 13.7 ± 14.5 on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis; Berska 2023 (280 samples, day 1 to 2 years) gives measured osmolality 285.8 ± 5.1. NO BAND BOUNDARY MOVED and no computed number changed — 10 mOsm/kg is still what the reference-limit literature supports — but the paediatric reader is now told that the normal spread in children is more than twice the width of the threshold, so a gap a little above 10 is weaker evidence than the cut-off\'s precision suggests. Berska 2023 also closes a [NEEDS SOURCE]: it is the infant validation previously carried by PMCID alone and described as an uncited "Kraków cohort", and it supplies the reason behind the under-3-months caution — every calculated formula showed both systematic and proportional error in that age group, so osmolality should be measured, not calculated. Lynd 2008 full text read: the performance figures are now tied to their decision and their ethanol coefficient — haemodialysis at a gap of 10 gives sensitivity 1.0 (95% CI 0.80–1.00) and NPV 1.0 under both coefficients (specificity 0.23 / 0.51, AUC 0.827 / 0.870), antidotal therapy gives sensitivity 0.90 (95% CI 0.68–0.99) at specificity 0.22 with coefficient 1.0 and sensitivity 0.85 at specificity 0.50 with coefficient 1.25 (AUC 0.736 / 0.785). This also corrects a mislabel: 1.1.0 and 1.2.0 reported 0.90 and 0.85 as a sensitivity/NPV pair for the antidote question, when they are two sensitivities, one per ethanol coefficient — the same ÷4.6-vs-÷3.7 fork this score already emits.',
      // `reason` has no "corrected-claim" member and this change withdraws no
      // OUTPUT — every number this score emits is unchanged — so the honest
      // label is the one describing what drove it: three new primary references
      // that overturned a claim the previous version made in prose.
      reason: "new-reference",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The osmolality formulas (coefficients 2, ÷18, ÷2.8), the ethanol divisors (3.7, 4.6), the gap definition (measured − calculated), and the < 10 mOsm/kg reference limit are mathematical facts and numeric thresholds — outside copyright. No verbatim scale-item wording is embedded (serum-osmolality.md IP status).",
  },
  // Rendered BESIDE the number, not in the prose below it. Both of these can
  // make the displayed result the wrong thing to act on, which is the bar for
  // this field (see ScoreDefinition.cautions).
  cautions: [
    defineText(
      "osm.caution.infant",
      "Age matters for the calculated value, and this calculator does not ask for age — so it will compute a confident-looking osmolality for a neonate, and below 3 months that number should not stand in for an osmometer. In 280 samples spanning the first day of life to 2 years, every calculated formula tested showed BOTH systematic and proportional error under 3 months of age, and the authors conclude that osmolality in that group should be MEASURED rather than calculated (Berska 2023). Between 3 months and 2 years the same study found a different equation agreed best with the osmometer: 1.86 × (Na + K) + 1.15 × glucose + urea + 14. That equation is not computed here (it needs a potassium this score does not collect), and Smithline–Gardner may not be the closest estimate in infants.",
    ),
    defineText(
      "osm.caution.normalgap",
      "A NORMAL OSMOLAR GAP DOES NOT EXCLUDE TOXIC ALCOHOL INGESTION. The gap centres near −2 with an SD of about 6 (n = 321), spans about −5 to +15 across equations (Hoffman 1993), and is rendered by secondary sources as a 95% population range of roughly −14 to +10. Because an individual's own true baseline may be NEGATIVE, a gap of +10 — at the cut-off, not above it — can already represent a rise of more than 20 mOsm/kg in that patient. Early presentation before metabolism leaves the gap low for a different reason. A cut-off of 10 is not a rule-out and is not used in isolation (Lynd 2008).",
    ),
    defineText(
      "osm.caution.paeds",
      "THE NORMAL OSMOLAR GAP IN CHILDREN IS WIDE — WIDER THAN THE THRESHOLD IT IS READ AGAINST. Across 192 children (median age 6.6 years) the range of normal osmol gaps is about 22 mOsm whichever equation is used (McQuillen 1999); in 101 children with chronic renal failure the gaps ran 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis (Dursun 2007). The 10 mOsm/kg limit here is unchanged — it is what the reference-limit literature supports — but a gap a little above 10 in a child is weaker evidence of an unmeasured osmole than the sharpness of the cut-off suggests. WITHDRAWN: an earlier version of this page stated that no paediatric osmolar-gap data exists and recorded that absence as settled. It does exist; that claim was wrong and is retracted.",
    ),
  ],
  formula: defineText(
    "osm.formula",
    "Calculated osmolality (Smithline–Gardner) = 2 × sodium (mmol/L) + glucose (mg/dL) ÷ 18 + blood urea nitrogen (mg/dL) ÷ 2.8, in mOsm/kg — equivalently 2 × sodium + glucose + urea with every analyte in mmol/L. When a measured ethanol is entered, an ethanol term is added and shown two ways: ethanol (mg/dL) ÷ 3.7 (Purssell empiric) and ÷ 4.6 (ideal molar mass). Osmolar gap = measured osmolality − calculated osmolality; with an ethanol on board, the residual gap (ethanol accounted for) is also shown for each divisor. Normal gap is conventionally < 10 mOsm/kg. If the residual gap is negative under BOTH divisors, the ethanol more than accounts for the whole difference, and the raw gap is reported as accounted for by ethanol rather than read against the 10 mOsm/kg limit.",
  ),
  notes: defineText(
    "osm.notes",
    "Formula choice changes the number: this score uses Smithline–Gardner (2·Na + glucose/18 + BUN/2.8 with mg/dL inputs; 2·Na + glucose + urea with everything in mmol/L), which is both the formula Choy 2016 recommends for harmonised use and the guideline-endorsed form — re-confirmed 2026-08-03 with no coefficient changed. Dorwart–Chalmers and Bhagat give slightly different values and are provided as references only, not computed. A gap threshold of 10 is valid only paired with the formula it was derived for. Ethanol divisor 3.7 vs 4.6 is a real fork (empiric Purssell vs ideal MW); both are emitted so the choice is explicit — using 4.6 when ethanol is present slightly over-states the residual gap. Because both are emitted, the abnormal-gap flag is suppressed only when BOTH residuals are negative; when the two divisors disagree in sign the flag stands, so a rule that removes a warning never silently picks a side of the fork. US vs SI unit traps: glucose and BUN must be mg/dL for the ÷18 and ÷2.8 divisors; the SI mmol/L alternates apply the factor once (entering already-SI values keeps the same result). BUN (nitrogen) ≠ urea (whole molecule) — they differ by ×2.8. The additive formula yields osmolarity (per L) while the osmometer yields osmolality (per kg water); this small structural mismatch is one reason a normal gap is non-zero, and severe hyperlipidaemia/hyperproteinaemia produce a pseudo-gap without true extra osmoles. The 10 mOsm/kg limit is partly conventional, and the reference range behind it is wider than a single number implies: in 321 subjects the measured normal gap centres at −2 with SD ≈ 6 and spans about −5 to +15 depending on the equation (Hoffman 1993), while secondary sources render the same distribution as a 95% population range of roughly −14 to +10 — arithmetically −2 ± 2 SD, which is why 10 is the upper bound and not a derived diagnostic boundary. A NEGATIVE gap is normal biological variation, measurement imprecision, or a formula artefact rather than pathology. State the threshold with its use case AND its ethanol coefficient — Lynd 2008 (full text) reports both, and they are the same ÷4.6-vs-÷3.7 fork this score emits (SI coefficient 1.0 ≡ ÷4.6 ideal, 1.25 ≡ ÷3.7 empiric). For identifying patients for whom HAEMODIALYSIS was recommended, a gap of 10 gave sensitivity 1.0 (95% CI 0.80–1.00) and negative predictive value 1.0 under BOTH coefficients, at specificity 0.23 (coefficient 1.0) or 0.51 (coefficient 1.25), AUC 0.827 and 0.870. For identifying patients needing ANTIDOTAL THERAPY the same gap gave sensitivity 0.90 (95% CI 0.68–0.99) at specificity 0.22 with coefficient 1.0, and sensitivity 0.85 at specificity 0.50 with coefficient 1.25, AUC 0.736 and 0.785. CORRECTION: versions 1.1.0–1.2.0 of this page reported 0.90 and 0.85 as a sensitivity/NPV pair for the antidote question; they are two sensitivities, one per ethanol coefficient. The gap is a screening tool, not a rule-out: a gap < 10 does not exclude toxic alcohol ingestion — because an individual's true baseline may be negative, a patient starting near −14 can gain more than 20 mOsm/kg of unmeasured osmole and still measure +10, at the cut-off rather than beyond it — and a raised gap does not identify the agent (Lynd 2008); early methanol/ethylene-glycol poisoning can show a normal gap. The gap requires a measured osmolality the app cannot compute. Reference range for the osmolality VALUE (not the gap): 275–295 mOsm/kg is the commonly cited range (StatPearls NBK567764) and the paediatric-specific 280–295 (Ranadive & Rosenthal 2011) sits inside it; measured infant data agree — 280 samples from day 1 to 2 years, mean 285.8 ± 5.1 mOsm/kgH₂O (Berska 2023). WITHDRAWN CLAIM: version 1.2.0 of this page asserted that NO paediatric osmolar-gap data exists and recorded that absence as settled. That was wrong, and because a settled-absent claim tells a reader to stop looking, it is retracted here rather than quietly edited. Paediatric osmolar-gap data exists, and it sharpens rather than softens the caution attached to the threshold: across 192 children (median age 6.6 years, 7 days to 17.9 years; measured osmolality 284.2 ± 6.9, range 265–311) the range of normal osmol gaps is about 22 mOsm whichever equation is used (McQuillen 1999), and in 101 children with chronic renal failure the gaps ran 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis (Dursun 2007). A normal spread more than twice the width of the 10 mOsm/kg limit means a gap just over 10 in a child is weaker evidence than the threshold's precision implies. The boundary is unchanged at 10: none of these papers proposes a paediatric cut-point, and 10 remains what the reference-limit literature supports. Still true, and unaffected by the withdrawal: the ARITHMETIC is population-independent while the CUT-POINT's derivation (Choy 2016) and the Lynd 2008 performance figures are adult. Separately, the calculated value is not validated at every age — below 3 months every calculated formula showed both systematic and proportional error, so osmolality should be measured rather than calculated there, and from 3 months to 2 years 1.86 × (Na + K) + 1.15 × glucose + urea + 14 agreed best with the osmometer (Berska 2023). That equation is not computed here, which would also require a potassium this score does not collect. RESOLVED [NEEDS SOURCE]: Berska 2023 is the infant validation the round-2 pass could cite only by PMCID (PMC9920940) and described as an uncited Kraków cohort; the full record is now on file and the flag is cleared. [NEEDS SOURCE]: the numeric input-validation bounds for sodium (100–200 mmol/L), glucose (10–2000 mg/dL), BUN (1–300 mg/dL), and measured osmolality (100–600 mOsm/kg) are engineering limits, not values from a specific publication. This is a training/reference calculator, not a clinical decision device.",
  ),
  calculate: (values): ScoreValue[] => {
    // Return RAW computed values; `precision` rounds for DISPLAY only, and the
    // interpretation bands are matched against the raw gap.
    const base = 2 * values.na.value + values.glucose.value / 18 + values.bun.value / 2.8;

    const results: ScoreValue[] = [
      {
        id: "osm_calc",
        label: defineText("osm.out.calc", "Calculated osmolality (Smithline–Gardner)"),
        value: base,
        unit: "mOsm/kg",
        precision: 0,
      },
    ];

    // Ethanol is optional; when present, expose BOTH divisor variants so the
    // fork (empiric ÷3.7 vs ideal ÷4.6) is never chosen silently.
    const ethanol = values.ethanol?.value;
    let calcEmpiric = base;
    let calcIdeal = base;
    if (ethanol !== undefined) {
      calcEmpiric = base + ethanol / 3.7; // Purssell 2001 empiric divisor
      calcIdeal = base + ethanol / 4.6; // ideal molar-mass divisor (MW ≈ 46)
      results.push(
        {
          id: "osm_calc_ethanol_empiric",
          label: defineText(
            "osm.out.calc.eth37",
            "Calculated osmolality incl. ethanol (÷3.7, Purssell empiric)",
          ),
          value: calcEmpiric,
          unit: "mOsm/kg",
          precision: 0,
        },
        {
          id: "osm_calc_ethanol_ideal",
          label: defineText(
            "osm.out.calc.eth46",
            "Calculated osmolality incl. ethanol (÷4.6, ideal MW)",
          ),
          value: calcIdeal,
          unit: "mOsm/kg",
          precision: 0,
        },
      );
    }

    // The gap needs an osmometer-measured value; without it, only the
    // calculated osmolality is deterministic.
    const measured = values.osm_measured?.value;
    if (measured !== undefined) {
      const residualEmpiric = measured - calcEmpiric;
      const residualIdeal = measured - calcIdeal;

      // A gap the ethanol term already more than absorbs must not also be
      // flagged elevated — that put "≥ 10, suggests an unmeasured osmole"
      // directly above two negative residual rows.
      //
      // BOTH residuals are required to be negative, and the order matters for
      // reading it: ethanol/3.7 > ethanol/4.6, so residualEmpiric is always the
      // smaller of the two and can be negative while residualIdeal is not.
      // Demanding both means suppression only happens where the divisor fork
      // cannot change the answer; where the two disagree in sign the flag
      // stands and both residuals are on screen for the reader to weigh.
      //
      // The raw gap must also be non-negative. `ethanol` has min 0, so 0 is a
      // legitimate entry meaning "measured, none detected" — and with ethanol 0
      // both residuals collapse to the raw gap, so without this term ANY
      // negative gap was relabelled "accounted for by the measured ethanol".
      // That is false (nothing was accounted for) and it displaced the normal
      // band on exactly the case Hoffman 1993 puts at the centre of the normal
      // distribution: a gap of -2. Ethanol can only explain a gap that was
      // there to begin with.
      const explainedByEthanol =
        ethanol !== undefined && measured - base >= 0 && residualEmpiric < 0 && residualIdeal < 0;

      results.push(
        explainedByEthanol
          ? {
              // Same raw number, different id: the id is what carries a band,
              // and this one's band says "accounted for" rather than "≥ 10".
              id: "osm_gap_ethanol_explained",
              label: defineText("osm.out.gap.explained", "Osmolar gap (before the ethanol term)"),
              value: measured - base,
              unit: "mOsm/kg",
              precision: 1,
            }
          : {
              id: "osm_gap",
              label: defineText("osm.out.gap", "Osmolar gap"),
              value: measured - base,
              unit: "mOsm/kg",
              precision: 1,
            },
      );
      if (ethanol !== undefined) {
        results.push(
          {
            id: "osm_gap_ethanol_empiric",
            label: defineText("osm.out.gap.eth37", "Residual osmolar gap (ethanol ÷3.7 accounted)"),
            value: residualEmpiric,
            unit: "mOsm/kg",
            precision: 1,
          },
          {
            id: "osm_gap_ethanol_ideal",
            label: defineText("osm.out.gap.eth46", "Residual osmolar gap (ethanol ÷4.6 accounted)"),
            value: residualIdeal,
            unit: "mOsm/kg",
            precision: 1,
          },
        );
      }
    }

    return results;
  },
});
