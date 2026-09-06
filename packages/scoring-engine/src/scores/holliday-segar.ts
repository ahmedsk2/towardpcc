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
  tagline: defineText("hs.tagline", "Daily maintenance fluid volume and hourly rate from weight"),
  version: "1.0.1",
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
      note: "Origin of the method. SECOND-HAND — every figure attributed to it arrives through the AAP 2018 guideline's direct citation, the AAP structured summary, and Chesney's 1998 commentary. The journal is Pediatrics, not Journal of Pediatrics, and the page range is 823–832; both errors circulate widely.",
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
      note: "The direct source for this score's restriction-is-not-prophylaxis rule, which otherwise rests only on the AAP's rate-restricted subgroup observation and Leung's reading of Cochrane. Its 2 × 2 crossing is what makes it decisive: it varies fluid TYPE and fluid RATE independently, which a single restriction arm cannot. NO TITLE IS CARRIED — the record for this trial reaches us without one, and a plausible-looking title is not invented to fill the field. It is also one of the three RCTs ESPNIC's PICO 5 pools, so it was already in this score's evidence base indirectly. No 2016-2026 trial repeated the design.",
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
      date: "2026-09-03",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.0.1",
      date: "2026-09-06",
      summary:
        "Added a one-line description for the catalogue card. No rule, threshold or reference changed.",
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
    "Daily volume uses the 100-50-20 rule: 100 mL/kg for the first 10 kg, plus 50 mL/kg for " +
      "each kg from 10 to 20 kg, plus 20 mL/kg for each kg above 20. The hourly rate uses " +
      "the 4-2-1 rule, which applies 4, 2 and 1 mL/kg/h across those same three brackets. " +
      "Its coefficients are the daily coefficients divided by 24 and rounded, so the hourly " +
      "rate multiplied by 24 does not equal the daily volume, by design. A third output caps " +
      "the hourly rate at 100 mL/h, the one figure every current guideline states identically " +
      "(NICE, Leung 2021, RCH, Be-PIV). Under the 4-2-1 rule that cap binds at exactly 60 kg. " +
      "The cap is a guideline overlay. Holliday and Segar’s function has no ceiling.",
  ),
  cautions: [
    defineText(
      "hs.caution.less",
      "This is a ceiling, not a prescription. Current guidance recommends infusing less than the calculated volume in most hospitalised children: a two-thirds default (RCH), 65–80% for ADH risk or 50–60% for oedematous states (ESPNIC), and 50–80% (NICE). Count concurrent IV fluids, blood products, drug volumes and flushes, and enteral intake before prescribing.",
    ),
  ],
  notes: defineText(
    "hs.notes",
    "Weight is accepted from 4 to 150 kg, and below 4 kg the score refuses to compute. The " +
      "4 kg floor is this project’s own proxy and is stated as such: every guideline scope " +
      "that excludes neonates is written in age (term, 28 days, one month), which a weight " +
      "input cannot implement, and the populations overlap in weight. A 3.2 kg term neonate " +
      "on day 2 needs roughly 70–80 mL/kg/day while a well 3.2 kg two-month-old needs 100. " +
      "NICE’s separate neonatal day-of-life ladder, rising from 50–60 to 120–150 mL/kg/day " +
      "over the first 28 days, is not implemented here. " +
      "This is a ceiling, not a prescription. Current guidance recommends infusing less than " +
      "the calculated volume in most hospitalised children: a two-thirds default (RCH), " +
      "65–80% for ADH risk or 50–60% for oedematous states (ESPNIC), and 50–80% (NICE). " +
      "Count concurrent IV fluids, blood products, drug volumes and flushes, and enteral " +
      "intake before prescribing. " +
      "Restriction is not hyponatraemia prophylaxis; tonicity is what protects. Neville 2010 " +
      "randomised tonicity and rate independently (2 × 2, n = 124) and found that " +
      "hyponatraemia risk decreased by isotonic saline “but not fluid restriction”, and the " +
      "AAP found that hypotonic-fluid risk persisted even at restricted rates. Give isotonic " +
      "maintenance fluid with appropriate potassium chloride and dextrose (AAP 2018 statement " +
      "1A, evidence A; number needed to treat 7.5 to prevent one sodium below 135), " +
      "preferably balanced (ESPNIC), avoiding lactate-buffered solutions in severe liver " +
      "dysfunction. Check electrolytes and glucose at baseline and at least every 24 h. " +
      "No daily cap is applied, because guidelines disagree (2000, 2400 and 2500 mL figures " +
      "for the same question) and no evidence-based daily ceiling exists. The circulating " +
      "2400 traces to a citation error and is arithmetically 100 mL/h × 24. " +
      "The formula over-estimates in illness. Measured energy expenditure in acutely ill " +
      "children runs 50–60 kcal/kg/day against the formula’s assumed 100 for the first " +
      "10 kg, and accuracy falls further in fever, burns, tachypnoea, hypothermia, and " +
      "altered-ADH states. The output excludes deficit and ongoing losses, which are added " +
      "separately. " +
      "For infants aged 1–3 months, prefer a dextrose-containing balanced solution with " +
      "lower sodium chloride content and monitor electrolytes (Leung statement 5.4). " +
      "Above about 60 kg, and in obesity, acute kidney injury, chronic kidney disease or " +
      "cancer, switch to BSA-based or adult forms per NICE. Never prescribe above the " +
      "calculated maintenance rate (Leung 6.1). " +
      "The 1957 electrolyte figures (3 mEq sodium, 2 mEq potassium per 100 kcal) are per " +
      "100 kcal metabolised, not per kg. The volume rule stands; the 1957 composition is " +
      "superseded. " +
      "The burn-resuscitation calculator on this site deliberately reimplements this " +
      "arithmetic from 0.5 kg, because refusing a burned neonate would withhold the " +
      "resuscitation volume too. It discloses the scope limit instead of refusing.",
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
