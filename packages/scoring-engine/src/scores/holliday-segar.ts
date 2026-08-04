import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { kgWithLbAndG } from "../units/mass";

/**
 * Holliday-Segar maintenance fluid requirement (pediatric). Estimates baseline
 * daily maintenance water (the "100-50-20" mL/kg/day rule) and the derivative
 * bedside hourly rate (the "4-2-1" mL/kg/hr rule) from body weight alone.
 *
 * This is a DOSING/TARGET estimate, not a severity or diagnostic score: it has
 * no interpretation bands. The two rules share the same physiology but the
 * hourly coefficients are rounded whole numbers, so hourly × 24 ≠ daily volume
 * in general — both are emitted as separate ScoreValues so the user sees each.
 *
 * THREE PROVENANCE FACTS THAT SHAPE THIS FILE (holliday-segar.md):
 *
 * 1. The 1957 original was NOT read in full. Everything attributed to it here
 *    arrives via the AAP 2018 guideline's direct citation of it. Nothing in this
 *    file may claim more than that.
 * 2. There is no daily cap in the method, and current guidance disagrees with
 *    itself across 2000-2500 mL/day — four figures, one of which (2400) is a
 *    traced citation error. So NO daily cap is applied, and the disagreement is
 *    stated rather than resolved. The one figure every source agrees on is the
 *    RATE, 100 mL/h, so that is the only thing capped, and it is attributed to
 *    NICE/Leung/RCH/Be-PIV and never to Holliday & Segar.
 * 3. The lower bound is a scope floor, not physiology, and the 4 kg figure is
 *    THIS PROJECT'S CHOICE — no source states a weight floor for this method.
 *    "Applicable above 2 weeks of age" — which v1.0.0 shipped — is not traceable
 *    to 1957; it comes from a 1998-vintage calculator web page. Five guidelines
 *    set the bottom of scope independently and every one of them does it by AGE
 *    (term / 28 days / >28 days / 1 month); a weight guard cannot implement an
 *    age rule, so the floor is a hard rejection at 4 kg plus a caution saying
 *    weight alone does not establish scope. The behaviour is deliberate; the
 *    number behind it is ours and is labelled as ours.
 *
 * Research + full sourcing: docs/research/scores/holliday-segar.md
 * (Holliday MA, Segar WE. Pediatrics. 1957;19(5):823–832. PMID 13431307).
 */

/**
 * The one figure every guideline read for the 2026-08-03 source review states
 * identically — NICE NG29, Leung 2021 statement 6.1, RCH 2026 and the Be-PIV
 * Belgian consensus (holliday-segar.md "The rate cap"). It is a guideline
 * overlay, NOT part of the 1957 method, whose function is monotonic with no
 * ceiling.
 *
 * Under the 4-2-1 rule this binds at exactly 60 kg (60 + (60 − 20) = 100),
 * which is independently where RCH's band structure stops and its own cap
 * begins. Because the two coincide, no separate 60 kg constant is needed — and
 * none is wanted, since a hard-coded weight anchor is exactly the kind of
 * number that acquires a false pedigree.
 */
const GUIDELINE_RATE_CAP_ML_PER_H = 100;

export const hollidaySegar = defineScore({
  id: "holliday-segar",
  slug: "holliday-segar",
  name: "Holliday-Segar maintenance fluids",
  version: "2.1.0",
  status: "published",
  category: "fluids-resuscitation",
  inputs: [
    {
      id: "weight",
      label: defineText("hs.weight", "Body weight"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      /**
       * 4 kg is a SCOPE floor, not a physiologic threshold and not a validation
       * convenience — and, corrected 2026-08-04, it is THIS PROJECT'S NUMBER
       * rather than anybody's published threshold (holliday-segar.md "Lower
       * bound — 4 kg is OURS"). NO WEIGHT FLOOR FOR THIS METHOD IS CITABLE
       * ANYWHERE: every guideline scope read sets the bottom of applicability by
       * AGE (term / 28 days / >28 days / 1 month), and none states a weight
       * below which the method must not be used. The two figures that resemble
       * one — ESPNIC's and RCH's bottom bands starting at 3 kg — are where a
       * table starts, not a rule about what to refuse.
       *
       * The REASON for refusing stands on its own, which is why the behaviour is
       * unchanged: weight cannot separate the populations the guidelines
       * separate by age. A 3.2 kg term neonate on day 2 needs ~70-80 mL/kg/day
       * while a well 3.2 kg two-month-old needs 100 — the same number in, two
       * answers ~25% apart. This score does not collect postnatal age, so it
       * refuses in the overlap rather than computing. v1.0.0 accepted down to
       * 0.5 kg and silently computed. Until postnatal age is collected, 4 is a
       * chosen proxy: defensible, deliberate, and unsourced.
       */
      min: 4,
      /**
       * Input-sanity ceiling only — it asserts nothing clinical. Deliberately
       * NOT lowered to 60 kg: RCH does not reject above 60 kg, it caps there,
       * and the rate cap below already expresses that. The 70 kg anchor that
       * circulates for this method is [UNVERIFIED] (it rests on a secondary
       * description of a 1957 figure nobody inspected) and appears nowhere here.
       */
      max: 150,
      helpText: defineText(
        "hs.weight.help",
        "Actual body weight. Accepts kilograms, pounds, or grams. Below 4 kg is out of scope and is rejected rather than estimated.",
      ),
    },
  ] as const,
  // A maintenance-fluid dosing estimate has no published risk cut-points, so
  // there are no interpretation bands (holliday-segar.md "Interpretation bands").
  interpretation: [],
  interpretationStatus: "not-applicable",
  references: [
    {
      citation:
        "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832.",
      pmid: "13431307",
      doi: "10.1542/peds.19.5.823",
      note: "Origin of the method. NOT read in full for this implementation — every figure attributed to it arrives through the AAP 2018 guideline's direct citation, the AAP structured summary, and Chesney's 1998 commentary. The journal is Pediatrics, not Journal of Pediatrics, and the page range is 823–832; both errors circulate widely.",
    },
    {
      citation:
        "Feld LG, Neuspiel DR, Foster BA, et al. Clinical Practice Guideline: Maintenance Intravenous Fluids in Children. Pediatrics. 2018;142(6):e20183083.",
      doi: "10.1542/peds.2018-3083",
      note: "Isotonic key action statement 1A (28 days to 18 years, evidence A, strength strong; NNT 7.5 to prevent one Na<135, 27.8 for Na<130). Source of the measured 50–60 kcal/kg/day expenditure figure, of the 3 mEq Na / 2 mEq K per 100 kcal composition cited directly from the 1957 original, and of the finding that hypotonic-fluid hyponatraemia risk persisted even in rate-restricted patients. AAP explicitly declines to recommend a rate or a volume, so it must never be cited for one.",
    },
    {
      citation:
        "Brossier DW, Tume LN, Briant AR, et al. ESPNIC clinical practice guidelines: intravenous maintenance fluid therapy in acute and critically ill children. Intensive Care Med. 2022;48(12):1691–1708.",
      doi: "10.1007/s00134-022-06882-z",
      note: "Restriction percentages (65–80% for ADH risk, 50–60% for oedematous states), the fluid-creep inclusion list, balanced-solution and lactate recommendations, and the PICO 5 counter-evidence. States no daily cap. Grades its own volume recommendations C, D and GCP — the weakest in the document.",
    },
    {
      citation:
        "Brossier DW, Goyer I, Verbruggen SCAT, et al. Intravenous maintenance fluid therapy in acutely and critically ill children: state of the evidence. Lancet Child Adolesc Health. 2024;8(3):236–244.",
      doi: "10.1016/S2352-4642(23)00288-2",
      note: "Source of the 2000 mL/day figure in the ESPNIC group's own prescribing box — the fourth and most conservative of the four circulating daily maxima. Renders the bottom weight band as 3–10 kg.",
    },
    {
      citation:
        "Leung LCK, So LY, Ng YK, et al. Initial intravenous fluid prescription in general paediatric in-patients aged >28 days and <18 years: consensus statements. Hong Kong Med J. 2021;27(4):276–286.",
      doi: "10.12809/hkmj209010",
      note: "Statement 6.1 (2 L/day girls, 2.5 L/day boys or 100 mL/hour, citing NICE; do not prescribe above the calculated maintenance rate), 6.2 restriction bands, 5.4 the 1–3 month fluid-type band, and the statement 6 conclusion that fluid TYPE matters more than fluid RATE for preventing hyponatraemia.",
    },
    {
      citation:
        "NICE. Intravenous fluid therapy in children and young people in hospital. NG29. Published 9 December 2015, last updated 11 June 2020.",
      url: "https://www.nice.org.uk/guidance/ng29",
      note: "Rec 1.4.1 (males rarely need more than 2500 mL and females more than 2000 mL over 24 h — an awareness note, not a cap — and 100 mL/hour), 1.4.2 the term-neonate day-of-life ladder (50–150 mL/kg/day), 1.4.4 monitoring, 1.4.9 the 50–80% restriction band, 1.4.10 the BSA insensible-loss form, and the 91st-centile trigger for switching to BSA.",
    },
    {
      citation:
        "Royal Children's Hospital Melbourne. Clinical Practice Guideline: Intravenous fluids. Updated January 2026.",
      url: "https://www.rch.org.au/clinicalguide/guideline_index/Intravenous_fluids/",
      note: "Source of the 60 kg upper anchor (where the band structure stops and the cap begins), the 100 mL/hour rate, the 3 kg table floor, the 1 month scope statement, and the two-thirds operational default for unwell children. Its guideline states 2400 mL/day without citation while its own fluids calculator page states 2500 — the contradiction is left visible rather than reconciled.",
    },
    {
      citation:
        "Chang AJ, York DJ, Chen W, Heidenreich KN, Shah MD. Maintenance Fluids for Late Preterm and Term Infants: Is it Time to Reconsider? Pediatr Open Sci. 2025;1(2).",
      doi: "10.1542/pedsos.2024-000372",
      note: "174 infants ≥34 weeks GA; serum sodium fell 0.07 mEq/L per mL/kg of positive fluid balance, and term infants fared WORSE than late preterm (31% vs 17% reaching Na ≤132; OR 2.22). The counterintuitive direction is the evidence against extrapolating paediatric bands downward on the assumption that bigger is safer.",
    },
    {
      citation:
        "Amer BE, Abdelwahab OA, Abdelaziz A, et al. Efficacy and safety of isotonic versus hypotonic intravenous maintenance fluids in hospitalized children: an updated systematic review and meta-analysis of RCTs. Pediatr Nephrol. 2024;39(1):57–84.",
      doi: "10.1007/s00467-023-06032-7",
      note: "Isotonic fluid significantly increased hypernatraemia risk specifically in neonates (RR 3.74, 95% CI 1.42–9.85), a subgroup signal running opposite to the overall finding. Also the source of the ≤70% = restricted, 80–120% = maintenance definition.",
    },
    {
      citation:
        "Friedman AL, Ray PE. Maintenance fluid therapy: what it is and what it is not. Pediatr Nephrol. 2008;23(5):677–680.",
      doi: "10.1007/s00467-007-0610-3",
      note: "Independent corroboration that the electrolyte figures rest on a per-100-kcal (per-100-mL-infused) basis, and that this is the detail routinely dropped when the method is restated per kilogram.",
    },
    {
      citation:
        "Neville KA, et al. J Pediatr. 2010;156(2):313–319. (2 × 2 factorial randomised trial in 124 postoperative children: 0.9% versus 0.45% saline crossed with 100% versus 50% of the maintenance rate. Conclusion, verbatim in part: hyponatraemia risk was decreased by isotonic saline solution 'but not fluid restriction'.)",
      pmid: "19818450",
      note: "ABSTRACT READ; full text not accessed. The direct source for this score's restriction-is-not-prophylaxis rule, which until 2026-08-04 rested only on the AAP's rate-restricted subgroup observation and Leung's reading of Cochrane. Its 2 × 2 crossing is what makes it decisive: it varies fluid TYPE and fluid RATE independently, which a single restriction arm cannot. NO TITLE IS CARRIED — the reviewer supplied journal, volume, pages, PMID, design, population and conclusion but not the title, and a plausible-looking one is not invented to fill the field. It is also one of the three RCTs ESPNIC's PICO 5 pools, so it was already in this score's evidence base indirectly. No 2016-2026 trial repeated the design.",
    },
    {
      citation:
        "University of Iowa Head and Neck Protocols — Pediatric Fluid Management. Secondary confirmation of the 4-2-1 hourly rule and the 35 kg → 75 mL/hr worked example.",
      url: "https://iowaprotocols.medicine.uiowa.edu/protocols/pediatric-fluid-management",
      note: "Used for the 35 kg worked example only. This page miscites the 1957 paper's journal, so it is not relied on for provenance.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: 100-50-20 daily volume and 4-2-1 hourly rate from body weight; no bands.",
      reason: "initial-release",
    },
    {
      version: "2.0.0",
      date: "2026-08-03",
      summary:
        "Rebuilt on a full provenance review of eleven guideline and evidence full texts. BREAKING: the weight floor moves from 0.5 kg to 4 kg and now rejects — five guidelines exclude neonates by AGE, and weight cannot tell a 3.2 kg term neonate on day 2 (needing 70–80 mL/kg/day) from a well 3.2 kg two-month-old (needing 100), so the score refuses rather than silently computing. A third output is added: the hourly rate after the 100 mL/h guideline maximum, which binds at exactly 60 kg. NO daily cap is applied, and the ~2000–2400 mL/day figure v1.0.0 described as an institutional overlay is replaced by the real picture — four disagreeing figures spanning 2000–2500 mL/day, of which 2400 is a traced citation error (the Belgian Be-PIV consensus attributes it to NICE and Leung; both were read in full and neither states it; it is 100 mL/h × 24 and nothing more). The 'not intended below ~2 weeks of age' limitation is REMOVED as untraceable to 1957 — it originates in a 1998-vintage calculator web page. Notes now carry the measured 50–60 kcal/kg/day expenditure against the formula's 100 kcal/kg assumption, the per-100-kcal (not per-kg) electrolyte basis, the isotonic-fluid guidance that closes v1.0.0's [NEEDS SOURCE] marker, and the explicit statement that volume restriction is NOT established as a substitute for correct tonicity in preventing hyponatraemia. Four cautions added. No 70 kg anchor is shipped: it is unverified.",
      reason: "formula-correction",
    },
    {
      version: "2.1.0",
      date: "2026-08-04",
      summary:
        "Fixes a claim, adds the trial that was missing, and closes one question as settled-absent. No computed number, input bound or output changed — the 4 kg floor, the 100 mL/h rate cap and the uncapped daily volume all behave exactly as in 2.0.0. (1) THE 4 kg FLOOR IS RELABELLED AS OURS. v2.0.0 presented it as the source review's recommendation. NO WEIGHT FLOOR FOR THIS METHOD IS CITABLE ANYWHERE: every guideline scope read sets the bottom of applicability by AGE — term birth, 28 days, over 28 days, one month — and not one states a weight below which the method must not be used. The two figures that look like weight floors, ESPNIC's and RCH's bottom bands starting at 3 kg, are where a table begins rather than a rule about refusing. So 4 kg is now labelled for what it is: this project's implementation choice, made because a weight input cannot implement an age rule and the overlap is where being wrong is worst. The reason is unchanged and still stated; the false pedigree is gone. Collecting postnatal age is what would replace it. (2) THE RESTRICTION-IS-NOT-PROPHYLAXIS RULE GETS ITS SOURCE. That rule was already stated, on the strength of the AAP's observation that hypotonic-fluid risk persisted in rate-restricted patients and Leung's reading of Cochrane. It now cites the trial that tested the question directly: Neville 2010 (J Pediatr 156(2):313-319, PMID 19818450, abstract read), a 2 × 2 factorial randomised study in 124 postoperative children crossing 0.9% against 0.45% saline with 100% against 50% of the maintenance rate — the design that can separate tonicity from rate — which concluded that hyponatraemia risk was decreased by isotonic saline 'but not fluid restriction'. The claim is unchanged; it is no longer inferential. No 2016-2026 trial repeated that design, which is recorded as settled-absent. (3) NO EVIDENCE-BASED DAILY CEILING EXISTS, and that is now stated as settled-absent rather than as four sources disagreeing. The 2000/2400/2500/2500-male-2000-female spread is not a gap in this review to be closed by more searching: no daily maximum has ever been derived, every figure is convention, one of them is a traced citation error and one is arithmetically 100 mL/h × 24. The volume still ships uncapped and still shows the disagreement.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Piecewise-linear arithmetic function of body weight; the coefficients (100/50/20, 4/2/1), the weight-bracket thresholds (10 kg, 20 kg) and the 100 mL/h guideline rate cap are facts and a mathematical formula, not copyrightable expression. No proprietary scale wording exists to reproduce — every element is a number in and a volume out — and all prose here is this project's own (holliday-segar.md IP status).",
  },
  formula: defineText(
    "hs.formula",
    "Daily maintenance volume uses the 100-50-20 rule: 100 mL/kg for the first 10 kg, plus " +
      "50 mL/kg for each kg between 10 and 20 kg, plus 20 mL/kg for each kg above 20 kg. " +
      "The hourly rate uses the derivative 4-2-1 rule: 4 mL/kg/hr for the first 10 kg, " +
      "2 mL/kg/hr for each kg between 10 and 20 kg, and 1 mL/kg/hr for each kg above 20 kg. " +
      "Both rules describe the same water need, but the hourly coefficients are the daily " +
      "coefficients divided by 24 and rounded (100÷24≈4.17, 50÷24≈2.08, 20÷24≈0.83), so the " +
      "hourly rate multiplied by 24 does not exactly equal the daily volume. A third figure " +
      "applies the 100 mL/hour maximum that current guidance states — it takes the smaller of " +
      "the 4-2-1 rate and 100 mL/hour, and under the 4-2-1 rule it starts to bite at exactly " +
      "60 kg. That maximum comes from NICE, Leung 2021, the Royal Children's Hospital Melbourne " +
      "and the Belgian Be-PIV consensus, NOT from Holliday and Segar, whose function rises " +
      "without a ceiling. No cap is applied to the daily volume, because guidelines do not " +
      "agree on one.",
  ),
  cautions: [
    defineText(
      "hs.caution.scope",
      "Weight alone does not establish that this method applies. Guideline scopes start at term birth, 28 days, over 28 days, or one month depending on the source — every one of them by AGE — and a weight in the range this tool accepts can belong to a neonate or to a well older infant with very different needs. Anything under about one month of postnatal age is out of scope: NICE sets a separate day-of-life ladder rising from 50–60 to 120–150 mL/kg/day over the first 28 days, and this score does not implement it. Below 4 kg the score refuses to compute rather than estimating. THE 4 kg FIGURE IS THIS PROJECT'S OWN, and it is stated as such rather than dressed up: no guideline anywhere sets a weight below which this method must not be used, so there is nothing to cite for it. It is a proxy chosen because this score collects weight and the scopes are written in age, and it refuses in the band where the two populations overlap. Use your own unit's scope rule if it differs; it will not be contradicting a published threshold, because there isn't one.",
    ),
    defineText(
      "hs.caution.less",
      "This is an unrestricted ceiling, not a rate to prescribe. Current guidance recommends infusing LESS than the calculated volume in most hospitalised children — a two-thirds default for unwell children (RCH 2026), 65–80% or 50–60% by risk group (ESPNIC 2022), 50–80% (NICE), 60–80% or 50% for CNS conditions (Leung 2021). Four sources, four bands: no restriction is applied here, and any that is applied should name its source. Concurrent IV fluids, blood products, all IV drugs including line flushes, and enteral intake all count toward the total before prescribing.",
    ),
    defineText(
      "hs.caution.tonicity",
      "Restricting volume is recommended to avoid fluid overload. It is NOT established as a substitute for correct tonicity for preventing hyponatraemia, and one trial tested exactly that question: Neville 2010 randomised 124 postoperative children in a 2 × 2 design, 0.9% against 0.45% saline crossed with 100% against 50% of the maintenance rate — the crossing is what lets tonicity and rate be told apart — and concluded that the risk of hyponatraemia was decreased by isotonic saline 'but not fluid restriction'. The same direction comes from the AAP, which found the excess risk from hypotonic fluid persisted even in patients whose rate was restricted, and from Leung 2021, which concludes that fluid type matters more than fluid rate. Do not read a reduced volume as hyponatraemia prophylaxis.",
    ),
    defineText(
      "hs.caution.cap",
      "No daily maximum is applied to the volume shown, because current guidelines do not agree on one — they give 2000, 2400, 2500, and 2500 for males with 2000 for females, all for the same question. That disagreement is not a search still running: NO EVIDENCE-BASED DAILY CEILING EXISTS. None of those figures is the output of a study that tested a ceiling, one of them is a traced citation error and one is arithmetically 100 mL/hour × 24; every one is a guideline convention. None comes from Holliday and Segar, whose method has no ceiling at all. The only capped figure here is the hourly rate, at the 100 mL/hour every source states.",
    ),
  ],
  notes: defineText(
    "hs.notes",
    "Estimate of baseline (basal-state) maintenance water only — not a prescription or an order. " +
      "It EXCLUDES any pre-existing fluid deficit (dehydration) and ongoing/abnormal losses " +
      "(fever, vomiting, diarrhoea, drains, third-spacing), which are computed and added " +
      "separately. There are no interpretation bands: the output is a target volume, not a risk " +
      "tier. " +
      "PROVENANCE, STATED FIRST BECAUSE MOST OF THE FOLKLORE AROUND THIS METHOD IS MIS-SOURCED. " +
      "The 1957 paper was NOT read in full for this implementation. Everything attributed to it " +
      "here reaches us through the AAP 2018 guideline's direct citation of it, the AAP structured " +
      "summary, and Chesney's 1998 commentary — three routes that agree. Nothing on this page " +
      "claims more than that. The 1957 method is denominated in CALORIES, not millilitres; the " +
      "mL/kg/day form in universal use is a later substitution, and the '4-2-1' hourly rule does " +
      "not appear in the paper at all — it is a later anaesthetic simplification, and a separate, " +
      "slightly different one was published by Oh (Anesthesiology 1980;53(4):351). " +
      "LOWER BOUND, AND WHY IT REJECTS. This score refuses below 4 kg. The familiar 'not intended " +
      "for neonates younger than about 2 weeks' limitation — which this score itself carried in " +
      "v1.0.0 — is NOT traceable to 1957: it is traced to a medical-calculator web page carrying " +
      "a 1998 modification date, from which it propagates into Wikipedia and downstream " +
      "calculators. The guidelines set the bottom of scope independently and do not agree: ESPNIC " +
      "2022 covers term infants from 37 weeks gestation, AAP 2018 starts at 28 days, Leung 2021 " +
      "at over 28 days, RCH 2026 at one month, and NICE covers term neonates through a separate " +
      "day-of-life ladder instead. A weight guard cannot implement any of those, because weight " +
      "does not distinguish the populations: a 3.2 kg term neonate on day 2 needs roughly 70–80 " +
      "mL/kg/day while a well 3.2 kg two-month-old needs 100 mL/kg/day, a difference of about a " +
      "quarter at an identical entry. So the behaviour is to require postnatal age where it can be " +
      "had, reject below 4 kg, and never silently compute; this score does not collect postnatal " +
      "age, so it takes the strict option and rejects. WHERE THE 4 kg ITSELF COMES FROM, STATED " +
      "PLAINLY BECAUSE THIS PAGE USED TO OVERSTATE IT. It comes from this project. NO WEIGHT " +
      "FLOOR FOR THIS METHOD IS CITABLE ANYWHERE — every guideline scope above is written in AGE, " +
      "and not one of them names a weight below which the method must not be used. The two " +
      "figures that resemble a floor are not one: ESPNIC's 2024 prescribing figure and RCH's 2026 " +
      "table both start their bottom band at 3 kg, which is where a table begins, not a rule " +
      "about what to refuse, and neither states a rationale or says anything about 2.9 kg. Up to " +
      "v2.0.0 this page presented 4 kg as the source review's recommendation, which gave a number " +
      "a pedigree it does not have. It is an IMPLEMENTATION CHOICE: deliberate, defensible, and " +
      "unsourced. The reason behind it is the part that carries weight and it is unchanged — a " +
      "weight input cannot implement an age rule, so the score refuses across the band where the " +
      "two populations overlap and where being wrong is worst. A different team could pick 3.5 or " +
      "5 and contradict nothing published. What would replace the proxy is collecting postnatal " +
      "age. 4 kg is a scope floor, not a physiologic threshold and not a published one. " +
      "The exclusion is well evidenced: in 174 infants of at least " +
      "34 weeks gestation on dextrose-containing fluid at a mean 57.2 mL/kg/day, 39% reached " +
      "sodium at or below 134 and 24% at or below 132 mEq/L, serum sodium fell 0.07 mEq/L per " +
      "mL/kg of positive fluid balance, and TERM infants fared worse than late preterm ones " +
      "(31% vs 17% reaching 132 or below) — the opposite of what extrapolating downward from " +
      "paediatric bands would assume (Chang 2025). Isotonic fluid also raises hypernatraemia " +
      "risk specifically in neonates (RR 3.74; Amer 2024). Separately, infants aged 1 to 3 months " +
      "warrant a fluid-TYPE flag rather than a volume change: most tonicity trials recruited from " +
      "3 months, and immature kidneys make hypernatraemia and hyperchloraemic acidosis more " +
      "likely on 0.9% saline, so Leung 2021 statement 5.4 suggests a dextrose-containing balanced " +
      "solution with lower sodium chloride content and electrolyte monitoring for that band. " +
      "UPPER BOUND AND THE RATE CAP. 60 kg is the defensible paediatric anchor: it is where RCH's " +
      "band structure stops and its cap begins, and no source read supports a higher one. The " +
      "70 kg anchor that circulates for this method rests on a secondary description of a figure " +
      "in the 1957 paper that nobody inspected, so it is UNVERIFIED and is not shipped here in " +
      "any form. The 100 mL/hour rate maximum is the one figure every source states identically — " +
      "NICE, Leung 2021, RCH 2026 and the Belgian Be-PIV consensus — and under the 4-2-1 rule it " +
      "binds at exactly 60 kg, so the two anchors coincide arithmetically rather than one being " +
      "derived from the other. It is a guideline overlay and is never attributable to Holliday " +
      "and Segar, whose function is monotonic with no ceiling. The 150 kg entry limit is an " +
      "input-sanity ceiling that asserts nothing clinical. Above the paediatric range the method " +
      "is replaced rather than extended: body-surface-area forms (300–400 mL/m²/day of insensible " +
      "loss plus urine output, or 1500 mL/m²/day in total), ideal body weight for the maintenance " +
      "rate in obesity, or adult guidance at 25–30 mL/kg/day. NICE switches to the BSA form above " +
      "the 91st weight centile, or in acute kidney injury, known chronic kidney disease, or " +
      "cancer. Leung 6.1 also states plainly that maintenance fluid should not be prescribed at a " +
      "rate ABOVE the calculated maintenance rate. " +
      "THE DAILY CAP, AND WHY THERE ISN'T ONE HERE. There is no ceiling in the original method, " +
      "and current guidance disagrees with itself across a 500 mL range: 2000 mL/day (ESPNIC " +
      "group's own 2024 prescribing figure), 2400 mL/day (RCH's January 2026 guideline, stated " +
      "without citation, and the Belgian Be-PIV consensus), 2500 mL/day (RCH's own fluids " +
      "calculator page, contradicting its guideline), and 2500 mL for males with 2000 mL for " +
      "females (NICE, restated by Leung) — while ESPNIC 2022 and AAP 2018 state no cap at all, " +
      "the AAP explicitly declining to address rate or volume. The widely repeated 2400 mL/day " +
      "figure is a CITATION ERROR at its point of entry: Be-PIV attributes it to NICE and Leung, " +
      "both of which were read in full and neither of which states it. It is arithmetically " +
      "100 mL/h × 24 h and nothing more. Applied to 70 kg the 1957 arithmetic yields 2500, not " +
      "2400. So no daily cap is applied to the volume shown, no single figure is presented as " +
      "authoritative, and any cap a unit chooses to apply is a guideline convention rather than a " +
      "derived value. AND THAT ABSENCE IS SETTLED, NOT OUTSTANDING. NO EVIDENCE-BASED DAILY " +
      "CEILING EXISTS — it is not that a derived maximum sits somewhere unfound, it is that none " +
      "has ever been derived, which is exactly why four sources give four figures for one " +
      "question and none of them cites a study that tested a ceiling against anything. Confirmed " +
      "2026-08-04 and closed: the disagreement set out above IS the state of the field, and " +
      "searching it again will not resolve it. " +
      "WHY THE FORMULA OVERESTIMATES, QUANTIFIED. The 1957 derivation estimated a hospitalised " +
      "child's caloric expenditure as roughly midway between basal requirement and the " +
      "requirement of a normally active child. Measured by calorimetry, energy expenditure in " +
      "acutely ill or postoperative children sits close to basal metabolic rate and averages " +
      "50–60 kcal/kg/day (AAP 2018) — against the formula's assumed 100 kcal/kg for the first " +
      "10 kg, roughly double. The structural objection is simpler still: the approach was " +
      "developed from studies of healthy children, and hospitalised children are by definition " +
      "not healthy (Brossier 2024). This is the quantitative reason current guidance restricts. " +
      "Accuracy is further reduced in fever, burns, tachypnoea, hypothermia, hyperthyroidism, " +
      "status epilepticus, and any state with altered ADH physiology. " +
      "ONE CALCULATOR HERE DELIBERATELY DISAGREES WITH THIS ONE. The pediatric burn resuscitation " +
      "score reimplements this method and applies it from 0.5 kg, below the 4 kg floor this page " +
      "enforces. That is intentional, not an oversight: refusing to compute for a burned 3 kg " +
      "infant would withhold the RESUSCITATION volume too, which is the worse harm. It discloses " +
      "the same scope limit on its own maintenance output instead of refusing, and a test reads " +
      "this page's floor directly so the two cannot drift apart silently. " +
      "RESTRICTION IS NOT HYPONATRAEMIA PROPHYLAXIS. Restriction is defensible for avoiding fluid " +
      "overload and ESPNIC recommends it on that basis, grading its own volume recommendations C, " +
      "D and GCP — the weakest in that document — and stating that the amount and duration are " +
      "uncertain. It is NOT established as a substitute for correct tonicity, and that is no " +
      "longer an inference drawn from subgroups — one trial randomised the two variables against " +
      "each other. NEVILLE 2010 (J Pediatr 156(2):313–319, PMID 19818450; abstract read, full " +
      "text not accessed) allocated 124 postoperative children in a 2 × 2 factorial design: 0.9% " +
      "against 0.45% saline, CROSSED WITH 100% against 50% of the maintenance rate. The crossing " +
      "is the whole value of it, because it is what lets an effect be attributed to tonicity or " +
      "to rate rather than to both at once, which a single restricted arm cannot do. Its " +
      "conclusion, in its own words: the risk of hyponatremia was decreased by isotonic saline " +
      "solution 'but not fluid restriction'. NO TRIAL BETWEEN 2016 AND 2026 REPEATED THAT DESIGN " +
      "— nothing in the last decade re-randomised RATE independently of tonicity, so a 2010 study " +
      "remains the design of record, and that absence is settled rather than outstanding. Two " +
      "further sources point the same way: the AAP found the increased hyponatraemia risk from " +
      "hypotonic fluid PERSISTED in the subgroup given fluid at " +
      "a restricted rate, and Leung 2021 concludes from the Cochrane review's restricted-rate arms " +
      "that 0.45% saline under 70% maintenance did not protect against hyponatraemia and that " +
      "fluid type matters more than fluid rate. None of this contradicts ESPNIC's recommendation " +
      "to restrict, which rests on fluid overload rather than on sodium; what it forbids is " +
      "presenting a reduced volume as protection against hyponatraemia. There is currently no reliable way to predict the " +
      "daily maintenance requirement of a child in acute or critical care, and a causal link " +
      "between restriction strategies and reduced fluid overload remains to be shown " +
      "(Brossier 2024). " +
      "COMPOSITION. The 1957 electrolyte figures are 3 mEq sodium, 2 mEq potassium and 2 mEq " +
      "chloride PER 100 kcal METABOLISED — not per kilogram. Scaling them per kilogram is wrong, " +
      "and wrong in a direction that matters at the extremes of weight; this score computes no " +
      "electrolytes at all, so it cannot make that error, and the figures are recorded only so " +
      "that any future composition feature starts from the right denominator. Those " +
      "concentrations were estimated to reflect the composition of human and cow's milk, which is " +
      "why the original prescription was hypotonic and why no current guideline treats that basis " +
      "as defensible. The VOLUME rule stands; the 1957 COMPOSITION is superseded. Patients aged " +
      "28 days to 18 years receiving maintenance fluid should receive isotonic solutions with " +
      "appropriate potassium chloride and dextrose (AAP 2018 key action statement 1A, evidence " +
      "quality A, strength strong; number needed to treat 7.5 to prevent one sodium below 135, " +
      "27.8 for one below 130), ideally balanced rather than saline (ESPNIC 2022), though " +
      "lactate-buffered solutions should be avoided in severe liver dysfunction. Electrolytes and " +
      "glucose should be checked before starting and at least every 24 hours thereafter. " +
      "DAILY VERSUS HOURLY. The two outputs disagree slightly by design: the 4-2-1 rule uses " +
      "rounded coefficients, so hourly × 24 ≠ daily volume — it slightly underestimates in the " +
      "first two brackets and slightly overestimates above 20 kg.",
  ),
  calculate: (values) => {
    const w = values.weight.value;

    // Daily maintenance volume (mL/day) — additive 100-50-20 rule across brackets.
    // Continuous at the 10 kg and 20 kg knots; closed forms per holliday-segar.md.
    // Deliberately UNCAPPED: see the daily-cap note above and in `notes`.
    const dailyVolume = w <= 10 ? 100 * w : w <= 20 ? 1000 + 50 * (w - 10) : 1500 + 20 * (w - 20);

    // Hourly maintenance rate (mL/hr) — derivative 4-2-1 rule (rounded coefficients).
    const hourlyRate = w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + 1 * (w - 20);

    // The only cap this score applies. Math.min rather than a conditional so
    // there is one expression to read and one number to trace.
    const cappedHourlyRate = Math.min(hourlyRate, GUIDELINE_RATE_CAP_ML_PER_H);

    // Return RAW computed values; `precision` rounds for display only.
    return [
      {
        id: "daily_volume",
        label: defineText("hs.daily", "Daily maintenance volume (100-50-20 rule, no daily cap)"),
        value: dailyVolume,
        unit: "mL/day",
        precision: 0,
      },
      {
        id: "hourly_rate",
        label: defineText("hs.hourly", "Hourly maintenance rate (4-2-1 rule)"),
        value: hourlyRate,
        unit: "mL/h",
        precision: 0,
      },
      {
        id: "hourly_rate_capped",
        label: defineText(
          "hs.hourly.capped",
          "Hourly rate with the 100 mL/h guideline maximum applied (not from Holliday-Segar)",
        ),
        value: cappedHourlyRate,
        unit: "mL/h",
        precision: 0,
      },
    ];
  },
});
