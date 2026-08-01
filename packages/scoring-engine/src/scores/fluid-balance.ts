import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import type { ScoreValue } from "../types";
import { kgWithLbAndG } from "../units/mass";
import { litresWithMl } from "../units/volume";

/**
 * Percent cumulative fluid balance — the net fluid a child has accumulated or
 * lost since an anchor point, as a percentage of an anchor body weight.
 *
 * TWO PUBLISHED FORMS, BOTH EMITTED, NEITHER CHOSEN. The Pediatric ADQI
 * consensus prints both in the same table without selecting between them, so
 * this score does the same — the treatment `ideal-body-weight` already
 * establishes here for "no consensus method exists":
 *
 *   fluid-based   %CFB = (Σ intake_L − Σ output_L) × 100 / anchor weight_kg
 *   weight-based  %CFB = (current weight_kg − anchor weight_kg) × 100 / anchor weight_kg
 *
 * ONE DEFINITION, NOT TWO. ADR-0002 decision 9 draws this line already: OI and
 * OSI are one definition with multiple ScoreValues, while P/F and S/F are
 * separate definitions because their required inputs are DISJOINT. The two forms
 * here share the anchor weight — it is the denominator of both — so they are not
 * disjoint, and splitting them would put the same anchor weight in two catalogue
 * entries and hide the one thing a clinician most needs to see: whether the two
 * forms agree on this patient.
 *
 * They are NOT interchangeable. The fluid-based form is the de facto standard
 * because every outcome threshold in this literature was derived with it; the
 * weight-based form is theoretically superior (it captures insensible losses and
 * avoids flowsheet transcription error), is better in neonates, and was
 * validated by Selewski 2011 as a practical substitute. On the same patient they
 * legitimately disagree, and that disagreement is clinical information rather
 * than an error in either — so both are shown side by side.
 *
 * NO INTERPRETATION BANDS, deliberately. See the `interpretation` comment below;
 * this is the most consequential decision in the file.
 *
 * NAMING. ADQI asks that "fluid overload" be reserved for a PATHOLOGIC STATE and
 * that "percent cumulative fluid balance" be the neutral descriptor for the
 * number. This calculator computes the percentage; it does not identify the
 * state. "fluid overload %" survives in the display name purely so the catalogue
 * search (which matches on `name`) finds it under the term every cited paper
 * indexes it by — not as a claim about the patient.
 *
 * Research + full sourcing: docs/research/scores/fluid-balance.md.
 */
export const fluidBalance = defineScore({
  id: "fluid-balance",
  slug: "fluid-balance",
  name: "Percent cumulative fluid balance (fluid overload %)",
  version: "1.0.0",
  status: "published",
  category: "fluids-resuscitation",
  /**
   * REQUIRED vs OPTIONAL, and why.
   *
   * Only the anchor weight is required: it is the denominator of BOTH forms, so
   * nothing at all is computable without it. Everything else is optional so that
   * each form can be produced independently — I/O alone gives the fluid-based
   * figure, a current weight alone gives the weight-based figure, all four give
   * both.
   *
   * THE LIMIT OF THAT MODEL, stated plainly. `required` is a per-input flag, so
   * it cannot express the real precondition here, which is a cross-field one:
   * "at least one of {the intake/output PAIR, current weight}". Validation runs
   * per input and `calculate` cannot reject, so an entry carrying only an anchor
   * weight validates and computes — to an empty list of values. That state is
   * reachable, is pinned by a test rather than left accidental, and is disclosed
   * on every optional input's helpText so a user meets it as an instruction
   * rather than as a blank panel. Making intake/output required instead would
   * force a clinician who has only weights to fabricate a zero, which produces a
   * confident and wrong 0 % — strictly worse than emitting nothing.
   */
  inputs: [
    {
      id: "anchor_weight",
      label: defineText("fb.anchor", "Anchor weight (usually ICU admission weight)"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      // Input-validity bounds carried from this platform's other weight-driven
      // calculators, NOT cited clinical limits (fluid-balance.md Inputs marks
      // every bound [NEEDS SOURCE]).
      min: 0.5,
      max: 150,
      helpText: defineText(
        "fb.anchor.help",
        "The reference weight both forms are measured against — most commonly the ICU admission weight, which is what the published outcome literature used. Accepts kilograms, pounds, or grams. ADQI names the choice of anchor weight an unresolved knowledge gap: it is the denominator, so it scales the whole result. Record which anchor you used.",
      ),
    },
    {
      id: "cumulative_intake",
      label: defineText("fb.intake", "Cumulative fluid intake since the anchor"),
      required: false,
      type: "numeric",
      unit: litresWithMl,
      // A cumulative volume cannot be negative — that floor is inherent to the
      // quantity. The ceiling is a long-stay sanity limit, not a clinical claim.
      min: 0,
      max: 200,
      helpText: defineText(
        "fb.intake.help",
        "Total fluid in since the anchor point (not a per-day figure). Accepts litres or millilitres. Supply this together with cumulative output to get the fluid-based form; supplying only one of the pair produces no fluid-based value.",
      ),
    },
    {
      id: "cumulative_output",
      label: defineText("fb.output", "Cumulative fluid output since the anchor"),
      required: false,
      type: "numeric",
      unit: litresWithMl,
      // As above: cumulative volumes are non-negative; 200 L is a sanity ceiling.
      min: 0,
      max: 200,
      helpText: defineText(
        "fb.output.help",
        "Total fluid out since the anchor point (not a per-day figure). Accepts litres or millilitres. This is charted output only — it cannot include insensible losses, which is the specific gap the weight-based form closes.",
      ),
    },
    {
      id: "current_weight",
      label: defineText("fb.current", "Current weight"),
      required: false,
      type: "numeric",
      unit: kgWithLbAndG,
      // Same input-validity bounds as the anchor weight; not cited limits.
      min: 0.5,
      max: 150,
      helpText: defineText(
        "fb.current.help",
        "Today's measured weight. Supply this to get the weight-based form, which captures insensible losses the flowsheet cannot see and is generally preferred in neonates. Accepts kilograms, pounds, or grams.",
      ),
    },
  ] as const,
  /**
   * NO INTERPRETATION BANDS — deliberate, and not a content gap.
   *
   * The famous 10 % and 20 % figures are cohort-specific outcome associations
   * measured AT CRRT INITIATION in children already receiving renal replacement
   * therapy. They were never proposed as thresholds that classify an arbitrary
   * patient, and ADQI states outright that no specific threshold of positive
   * fluid balance alone can define fluid overload across all sick children.
   *
   * Rendering them as bands would turn an association observed in one selected
   * population into an apparent classification of anyone who types numbers in —
   * and would contradict the naming decision above by implying the calculator
   * can identify the pathologic state. The Sutherland figures live in `notes`,
   * as observed associations with their cohort named.
   *
   * `interpretationStatus` is therefore "not-applicable" and NOT "pending":
   * nothing is awaiting a later pass here. It is set explicitly even though it
   * is the default, because on this score the silence is a decision rather than
   * an omission and should read as one.
   */
  interpretation: [],
  interpretationStatus: "not-applicable",
  references: [
    {
      citation:
        "Goldstein SL, Currier H, Graf CD, Cosio CC, Brewer ED, Sachdeva R. Outcome in children receiving continuous venovenous hemofiltration. Pediatrics. 2001;107(6):1309-1312.",
      pmid: "11389248",
      doi: "10.1542/peds.107.6.1309",
      note: "Origin of the metric: fluid accumulation as a percentage of body weight in critically ill children.",
    },
    {
      citation:
        "Sutherland SM, Zappitelli M, Alexander SR, et al. Fluid overload and mortality in children receiving continuous renal replacement therapy: the Prospective Pediatric Continuous Renal Replacement Therapy Registry. Am J Kidney Dis. 2010;55(2):316-325.",
      pmid: "20042260",
      doi: "10.1053/j.ajkd.2009.10.048",
      note: "Formula stated verbatim; source of the <10% / 10-20% / >=20% strata and their observed mortality (29.4% / 43.1% / 65.6%), the adjusted OR of 1.03 per 1%, and the OR of 8.5 at >=20% — associations in a CRRT cohort, NOT interpretation bands.",
    },
    {
      citation:
        "Selewski DT, Cornell TT, Lombel RM, et al. Weight-based determination of fluid overload status and mortality in pediatric intensive care unit patients requiring continuous renal replacement therapy. Intensive Care Med. 2011;37(7):1166-1173.",
      pmid: "21533569",
      doi: "10.1007/s00134-011-2231-3",
      note: "Validates the weight-based form as a practical substitute for the fluid-based form; per-1% mortality OR 1.044 weight-based vs 1.056 fluid-based.",
    },
    {
      citation:
        "Foland JA, Fortenberry JD, Warshaw BL, et al. Fluid overload before continuous hemofiltration and survival in critically ill children: a retrospective analysis. Crit Care Med. 2004;32(8):1771-1776.",
      pmid: "15286557",
      note: "Supporting paediatric CRRT fluid-overload literature. Cited as lineage only — no numeric value in this implementation is taken from it.",
    },
    {
      citation:
        "Pediatric ADQI Collaborative. Fluid assessment, fluid balance, and fluid overload in sick children: a report from the Pediatric Acute Disease Quality Initiative. Pediatr Nephrol. 2024.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10817849/",
      note: "Current consensus. Prints BOTH formulae in Table 1 without choosing; reserves 'fluid overload' for the pathologic state with 'percent cumulative fluid balance' as the neutral descriptor; states no single threshold defines fluid overload across all sick children; names anchor-weight selection a knowledge gap.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-08-01",
      summary:
        "Initial release: fluid-based and weight-based percent cumulative fluid balance, both emitted, no interpretation bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Both forms are elementary arithmetic over measured volumes and weights — one subtraction, one multiplication by 100, one division. Mathematical formulae and the measurements they operate on are facts, not copyrightable expression. There is no item wording, no response descriptor and no table to license, and no rights claim appears in Goldstein 2001, Sutherland 2010, Selewski 2011 or the Pediatric ADQI consensus (fluid-balance.md IP status).",
  },
  formula: defineText(
    "fb.formula",
    "Two published forms are shown side by side, because the Pediatric ADQI consensus prints both without choosing between them. " +
      "Fluid-based (intake/output) form: percent cumulative fluid balance = (cumulative intake in litres − cumulative output in litres) × 100 ÷ anchor weight in kilograms. " +
      "Weight-based form: percent cumulative fluid balance = (current weight in kg − anchor weight in kg) × 100 ÷ anchor weight in kg. " +
      "Both divide by the ANCHOR weight, never the current weight. A positive result means net accumulation, a negative result means a net deficit — negative values are real (active diuresis or ultrafiltration) and are reported as such, not clamped at zero. " +
      "The two forms return the same number only when the weight change in kg equals the net balance in litres, i.e. when every retained millilitre was charted and all mass change is fluid; in practice insensible losses usually put the weight-based figure BELOW the fluid-based one. " +
      "The raw cumulative balance in mL and the raw weight change in kg are emitted alongside the percentages, since those are the numbers actually charted. Values are raw; the display rounds them.",
  ),
  /**
   * Rendered BESIDE the number, not in the prose below it. Both of these can
   * make the displayed percentage mean something other than what a reader will
   * assume it means, which is the bar this field sets.
   */
  cautions: [
    defineText(
      "fb.caution.notdiagnosis",
      "This is a percentage describing accumulated volume, not a diagnosis of fluid overload — ADQI reserves that term for a pathologic state, which remains a clinical judgement. The two forms are not interchangeable and legitimately disagree on the same patient; neither is a correction of the other.",
    ),
    defineText(
      "fb.caution.anchor",
      "The anchor weight is the denominator, so it scales the entire result, and ADQI names its selection an unresolved knowledge gap. A result is only comparable to the published cohorts if it was computed against the ICU admission weight. Record which anchor was used.",
    ),
  ],
  notes: defineText(
    "fb.notes",
    "NAMING: ADQI asks that 'fluid overload' be reserved for a PATHOLOGIC STATE — a clinical condition with signs, organ consequences and a therapeutic implication — and that 'percent cumulative fluid balance' be the neutral descriptor for the number. This calculator computes the percentage; it does not identify the state. 'Fluid overload %' appears in the display name only so the catalogue finds it under the term the literature indexes it by. " +
      "NO INTERPRETATION BANDS, deliberately, and this is not a gap awaiting a later pass. The well-known 10% and 20% figures are cohort-specific outcome associations measured AT CRRT INITIATION in children already on renal replacement therapy, not thresholds that classify a patient; ADQI states outright that no specific threshold of positive fluid balance alone can define fluid overload across all sick children. " +
      "CONTEXT, NOT BANDS — Sutherland 2010, Prospective Pediatric CRRT Registry, %FO measured at CRRT initiation using the fluid-based form: observed mortality was 29.4% below 10%, 43.1% between 10% and 20%, and 65.6% at or above 20%; adjusted OR 1.03 per 1%, OR 8.5 at >=20%. Note that the LOWEST of those strata is a population with near-30% mortality — that is a statement about who receives CRRT, not about what 9% cumulative fluid balance means in a child on the ward, and it is why these figures cannot be rendered as bands. Selewski 2011 reports per-1% mortality ORs of 1.044 (weight-based) and 1.056 (fluid-based) in its PICU CRRT cohort. Do not attach any of these figures to a computed result. " +
      "THE TWO FORMS: the fluid-based form is the de facto standard because every outcome threshold above was derived with it — applying those figures to a weight-based percentage is an extrapolation, and applying them to a child not receiving CRRT is a larger one. The weight-based form captures insensible losses and avoids flowsheet transcription error, and is generally preferred in NEONATES, where insensible losses are proportionally large and a small charting error is large against a small denominator. They diverge because of insensible and uncharted output (which pushes weight-based below fluid-based, the usual direction), uncharted intake such as line flushes, drug diluents and blood products (which pushes the other way), true tissue mass change from catabolism or growth, and scale technique. " +
      "ANCHOR WEIGHT is an unresolved knowledge gap named explicitly by ADQI. It is most commonly the ICU admission weight, which is what the cited cohorts used; a child admitted already overloaded has an admission weight that already contains the accumulation, so the percentage understates it. Results computed against different anchors are not comparable to each other or to the literature. " +
      "FAILURE MODES: a partial intake/output record produces a wrong number, not a missing one — uncharted output returns a confidently over-positive percentage with no indication anything is missing, and the calculator cannot detect this. The weight-based form measures MASS, not fluid: catabolic loss of lean body mass makes it understate accumulated fluid over a long stay, growth in an infant makes it overstate, and scale technique (different bed, linen, attached equipment, operator) is proportionally worst in the smallest patients. Both forms assume 1 L of retained fluid weighs 1 kg; no density correction is applied, consistent with every cited source. " +
      "Supplying only an anchor weight computes nothing, by design — see each optional input's help text. " +
      "[NEEDS SOURCE]: the weight bounds (0.5-150 kg) and volume bounds (0-200 L) are engineering input-validity limits, not values from any cited publication — no cited paper specifies a valid range for any input. No published PAEDIATRIC worked example of either formula exists (the only step-by-step case found anywhere was a 100 kg adult in a device protocol), so every test vector for this score is constructed from the formula and labelled as such. The Foland 2004 reference is carried as supporting lineage only; no number here is taken from it.",
  ),
  calculate: (values) => {
    // Canonical units: weights in kg, volumes in L. Return RAW values;
    // `precision` rounds for DISPLAY only. There are no bands, so precision is
    // purely cosmetic and never decides a classification.
    const anchor = values.anchor_weight.value;

    const results: ScoreValue[] = [];

    // FLUID-BASED FORM — emitted only when BOTH halves of the intake/output pair
    // are present. A missing half is not treatable as zero: an unsupplied output
    // would silently become "nothing came out", which is a confident wrong
    // answer rather than an absent one.
    const intake = values.cumulative_intake?.value;
    const output = values.cumulative_output?.value;
    if (intake !== undefined && output !== undefined) {
      const netBalanceL = intake - output;
      results.push({
        id: "pct_cfb_fluid_based",
        label: defineText(
          "fb.out.fluid",
          "% cumulative fluid balance — fluid-based (intake/output)",
        ),
        // Denominator is the ANCHOR weight, never the current weight.
        value: (netBalanceL * 100) / anchor,
        unit: "%",
        precision: 1,
      });
      results.push({
        id: "net_fluid_balance_ml",
        label: defineText("fb.out.net", "Cumulative net fluid balance"),
        // The number a clinician actually charts, in the unit they chart it in.
        value: netBalanceL * 1000,
        unit: "mL",
        precision: 0,
      });
    }

    // WEIGHT-BASED FORM — emitted whenever a current weight is present, whether
    // or not the intake/output pair was. When both forms compute, they are shown
    // together precisely so a disagreement is visible.
    const currentWeight = values.current_weight?.value;
    if (currentWeight !== undefined) {
      const weightChangeKg = currentWeight - anchor;
      results.push({
        id: "pct_cfb_weight_based",
        label: defineText("fb.out.weight", "% cumulative fluid balance — weight-based"),
        // Denominator is the ANCHOR weight, matching the published form.
        value: (weightChangeKg * 100) / anchor,
        unit: "%",
        precision: 1,
      });
      results.push({
        id: "weight_change_kg",
        label: defineText("fb.out.delta", "Weight change from anchor weight"),
        value: weightChangeKg,
        unit: "kg",
        precision: 2,
      });
    }

    return results;
  },
});
