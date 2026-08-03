import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { pim3 } from "./pim3";
import type { InputValues } from "../types";

/**
 * Every expected value below is fixture A–G of docs/research/scores/pim3.md
 * "Worked examples", each computed term-by-term from the coefficients in
 * Straney 2013 Table 3, p677 (PMID 23863821). Fixture A is the paper's OWN
 * worked example (p681) and reproduces its published logit and percentage to
 * five decimal places; the rest are derived arithmetic from the same table and
 * say so in their locators rather than claiming to be published examples.
 */
const straney = {
  citation:
    "Straney L, et al. Paediatric index of mortality 3. Pediatr Crit Care Med. 2013;14(7):673–681.",
  pmid: "23863821",
  doi: "10.1097/PCC.0b013e31829760cf",
};

/** The five required answers for a child with no flags and no risk diagnosis. */
const noFlags = {
  pupils: { value: false },
  mechanical_ventilation: { value: false },
  elective_admission: { value: false },
  recovery_category: { value: "none" },
  very_high_risk_diagnosis: { value: "none" },
  high_risk_diagnosis: { value: "none" },
  low_risk_diagnosis: { value: "none" },
} as const;

/** A valid, fully-specified vector used for boundary tests (all values in bounds). */
const base = {
  ...noFlags,
  sbp: { value: 90, unit: "mmHg" },
  base_excess: { value: 0, unit: "mmol/L" },
  fio2: { value: 0.4, unit: "fraction" },
  pao2: { value: 100, unit: "mmHg" },
} as const;

type Pim3Inputs = Parameters<typeof pim3.compute>[0];

/** Computes and unwraps, failing loudly rather than silently skipping. */
function logitOf(inputs: Pim3Inputs): number {
  const outcome = pim3.compute(inputs);
  if (!outcome.ok)
    throw new Error(`expected a computable vector: ${JSON.stringify(outcome.errors)}`);
  const value = outcome.result.values.find((v) => v.id === "pim3_score");
  if (!value) throw new Error("pim3_score was not emitted");
  return value.value;
}

describeScore(pim3, (ctx) => {
  /*
   * FIXTURE A — the paper's own worked example, p681, and the one that pins the
   * precedence rule. A six-year-old on chemotherapy for relapsed leukaemia
   * (very high risk) admitted with febrile neutropenia and a known
   * chemotherapy-induced cardiomyopathy (high risk). BOTH tiers are present;
   * only the very high-risk term applies. SBP 70 is the value at first
   * ICU-doctor contact, ventilated in the first hour, base excess −12,
   * PaO₂ 65 on FiO₂ 0.70 → oxygenation term 70/65 = 1.07692.
   *
   *   +0.97630 vent  +0.80520 |BE|  −3.01700 SBP  +0.84084 SBP²/1000
   *   +0.45382 oxygenation  +1.62250 very high risk  (high risk SUPPRESSED)
   *   −1.79280 intercept                       = −0.11114 → 47.22%
   */
  ctx.workedExample(
    { ...straney, locator: "Worked example, p681 (published logit −0.11114 → 47.22%)" },
    {
      ...noFlags,
      mechanical_ventilation: { value: true },
      very_high_risk_diagnosis: { value: "leukaemia_lymphoma" },
      high_risk_diagnosis: { value: "cardiomyopathy_myocarditis" },
      base_excess: { value: -12, unit: "mmol/L" },
      sbp: { value: 70, unit: "mmHg" },
      fio2: { value: 0.7, unit: "fraction" },
      pao2: { value: 65, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: -0.11114, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.4722424, tolerance: 1e-6 },
    ],
  );

  // FIXTURE B — elective post-operative admission recovering from a cardiac
  // procedure with bypass. Ventilated, SBP 95, pupils reactive, no blood gas,
  // so the oxygenation term imputes 0.23 and |BE| imputes 0.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "fixture B, derived from the coefficients in Table 3, p677 — bypass-cardiac recovery",
    },
    {
      ...noFlags,
      mechanical_ventilation: { value: true },
      elective_admission: { value: true },
      recovery_category: { value: "bypass_cardiac" },
      sbp: { value: 95, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: -5.02779, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0065106, tolerance: 1e-6 },
    ],
  );

  // FIXTURE C — eight-month-old on nasal CPAP (which counts as mechanical
  // ventilation), bronchiolitis as the main reason for admission (low risk),
  // SBP 85, no blood gas.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture C, derived from the coefficients in Table 3, p677 — low-risk bronchiolitis",
    },
    {
      ...noFlags,
      mechanical_ventilation: { value: true },
      low_risk_diagnosis: { value: "bronchiolitis" },
      sbp: { value: 85, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: -5.31987, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0048696, tolerance: 1e-6 },
    ],
  );

  // FIXTURE D — out-of-hospital cardiac arrest. The SBP 0 SENTINEL, fixed
  // dilated pupils, BE −20, PaO₂ 60 on FiO₂ 1.0, ventilated. SBP 0 zeroes both
  // blood-pressure terms, which is worth +2.70096 logit against the unknown
  // default of 120 — see the sentinel block below.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture D, derived from the coefficients in Table 3, p677 — SBP 0 arrest sentinel",
    },
    {
      ...noFlags,
      pupils: { value: true },
      mechanical_ventilation: { value: true },
      very_high_risk_diagnosis: { value: "cardiac_arrest" },
      base_excess: { value: -20, unit: "mmol/L" },
      sbp: { value: 0, unit: "mmHg" },
      fio2: { value: 1, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: 6.67363, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.9987378, tolerance: 1e-6 },
    ],
  );

  // FIXTURE E — every optional input absent, so all three imputations fire at
  // once: SBP 120, |BE| 0, oxygenation term 0.23. This is the COMMON path, not
  // an edge case (PaO₂ was missing for 55.8% of the derivation cohort), and it
  // is the fixture that fails if PIM2's oxygenation default of 0 is inherited:
  // that mistake gives −4.49376 → 1.11% instead of −4.39684 → 1.22%.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture E, derived from the coefficients in Table 3, p677 — full imputation floor",
    },
    noFlags,
    [
      { id: "pim3_score", value: -4.39684, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0121664, tolerance: 1e-6 },
    ],
  );

  // FIXTURE F — the paper's other precedence illustration (Methods, p674):
  // hypoplastic left heart syndrome (high risk) admitted with acute
  // bronchiolitis (low risk) is coded high risk ONLY. Otherwise as fixture E.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "fixture F — precedence illustration, Methods p674; arithmetic from Table 3, p677 (high risk wins over low risk)",
    },
    {
      ...noFlags,
      high_risk_diagnosis: { value: "hypoplastic_left_heart" },
      low_risk_diagnosis: { value: "bronchiolitis" },
    },
    [
      { id: "pim3_score", value: -3.32434, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0347456, tolerance: 1e-6 },
    ],
  );

  // FIXTURE G — shocked with a blood pressure that could not be measured: the
  // SBP 30 SENTINEL. Ventilated, BE −8, no blood gas.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture G, derived from the coefficients in Table 3, p677 — SBP 30 shock sentinel",
    },
    {
      ...noFlags,
      mechanical_ventilation: { value: true },
      base_excess: { value: -8, unit: "mmol/L" },
      sbp: { value: 30, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: -1.32134, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.2105958, tolerance: 1e-6 },
    ],
  );

  // The two recovery categories fixtures A–G leave unexercised, each one
  // coefficient away from the fixture E baseline of −4.396838.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture E + non-bypass-cardiac recovery (−0.8762), from Table 3, p677",
    },
    { ...noFlags, recovery_category: { value: "non_bypass_cardiac" } },
    [
      { id: "pim3_score", value: -5.27304, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0051019, tolerance: 1e-6 },
    ],
  );
  ctx.workedExample(
    { ...straney, locator: "fixture E + non-cardiac recovery (−1.5164), from Table 3, p677" },
    { ...noFlags, recovery_category: { value: "non_cardiac" } },
    [
      { id: "pim3_score", value: -5.91324, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0026961, tolerance: 1e-6 },
    ],
  );

  // Appendix 1, p680: an obstructive-sleep-apnoea admission after
  // adenotonsillectomy carries BOTH the low-risk term and a procedure-recovery
  // term. The tier precedence rule applies WITHIN the diagnosis variable only;
  // it must not suppress an unrelated recovery term.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "fixture E + low-risk OSA (−2.1766) + non-cardiac recovery (−1.5164), from Table 3, p677 and the OSA coding rule, Appendix 1 p680",
    },
    {
      ...noFlags,
      recovery_category: { value: "non_cardiac" },
      low_risk_diagnosis: { value: "obstructive_sleep_apnoea" },
    },
    [
      { id: "pim3_score", value: -8.08984, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0003065, tolerance: 1e-6 },
    ],
  );

  // A FiO₂ with no PaO₂ beside it cannot form a ratio, so the whole oxygenation
  // term imputes 0.23 — identical to fixture E, where neither was supplied.
  ctx.workedExample(
    {
      ...straney,
      locator: "fixture E with FiO₂ supplied but PaO₂ absent — oxygenation term still 0.23",
    },
    { ...noFlags, fio2: { value: 0.5, unit: "fraction" } },
    [
      { id: "pim3_score", value: -4.39684, tolerance: 1e-5 },
      { id: "mortality_probability", value: 0.0121664, tolerance: 1e-6 },
    ],
  );

  // Unit-conversion path: PaO₂ entered in kPa and FiO₂ in percent must
  // normalise before computing. Fixture A restated — 65 mmHg ≈ 8.6660 kPa,
  // 70% → 0.70.
  ctx.workedExample(
    { ...straney, locator: "Worked example, p681, entered via kPa and percent" },
    {
      ...noFlags,
      mechanical_ventilation: { value: true },
      very_high_risk_diagnosis: { value: "leukaemia_lymphoma" },
      high_risk_diagnosis: { value: "cardiomyopathy_myocarditis" },
      base_excess: { value: -12, unit: "mmol/L" },
      sbp: { value: 70, unit: "mmHg" },
      fio2: { value: 70, unit: "%" },
      pao2: { value: 8.66595, unit: "kPa" },
    },
    [
      { id: "pim3_score", value: -0.11114, tolerance: 1e-4 },
      { id: "mortality_probability", value: 0.4722424, tolerance: 1e-4 },
    ],
  );

  // Input-validity bounds. SBP min is 0 BY DESIGN — see the sentinel block.
  ctx.boundaryTest("sbp", "min", base);
  ctx.boundaryTest("sbp", "max", base);
  ctx.boundaryTest("base_excess", "min", base);
  ctx.boundaryTest("base_excess", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  ctx.boundaryTest("pao2", "min", base);
  ctx.boundaryTest("pao2", "max", base);

  // Required categoricals reject unrecognised values (the §6.3.3 floor for every
  // required non-boolean input). The cast bypasses the literal-union type only
  // to feed the deliberately-invalid value the validator must catch at runtime.
  ctx.rejectsImplausible(
    "an unrecognised recovery category",
    { ...base, recovery_category: { value: "space_surgery" as unknown as "none" } },
    { inputId: "recovery_category", code: "invalid-category" },
  );
  ctx.rejectsImplausible(
    "an unrecognised very high-risk diagnosis",
    { ...base, very_high_risk_diagnosis: { value: "dragon_pox" as unknown as "none" } },
    { inputId: "very_high_risk_diagnosis", code: "invalid-category" },
  );
  ctx.rejectsImplausible(
    "an unrecognised high-risk diagnosis",
    { ...base, high_risk_diagnosis: { value: "septic_shock" as unknown as "none" } },
    { inputId: "high_risk_diagnosis", code: "invalid-category" },
  );
  ctx.rejectsImplausible(
    "an unrecognised low-risk diagnosis",
    { ...base, low_risk_diagnosis: { value: "hiccups" as unknown as "none" } },
    { inputId: "low_risk_diagnosis", code: "invalid-category" },
  );

  // An out-of-range optional numeric is rejected, never silently computed.
  ctx.rejectsImplausible(
    "a FiO₂ below room air",
    { ...base, fio2: { value: 0.1, unit: "fraction" } },
    { inputId: "fio2", code: "out-of-range" },
  );
});

/**
 * THE PORTING DEFECT THIS SCORE EXISTS TO AVOID.
 *
 * PIM2 let a high-risk and a low-risk diagnosis both count. PIM3 replaced that
 * with ONE categorical resolved by precedence — very high > high > low
 * (Straney 2013, Methods p674). Carrying the PIM2 behaviour forward is the
 * single most likely defect when porting, and it is not a rounding error: on
 * the paper's own worked example it returns 72.34% where the published answer
 * is 47.22%.
 *
 * Coverage cannot catch this and neither can the worked examples on their own —
 * fixture A passing proves the total is right, but not that it is right for the
 * right reason. These assert the suppression directly, in both directions:
 * adding a lower-tier condition must change NOTHING, and the additive answer
 * must not be reachable.
 */
describe("pim3 diagnosis tiers resolve by precedence and are never additive", () => {
  const VERY_HIGH = 1.6225;
  const HIGH = 1.0725;
  const LOW = -2.1766;

  const withTiers = (veryHigh: string, high: string, low: string): Pim3Inputs =>
    ({
      ...base,
      very_high_risk_diagnosis: { value: veryHigh },
      high_risk_diagnosis: { value: high },
      low_risk_diagnosis: { value: low },
    }) as unknown as Pim3Inputs;

  const noneAtAll = logitOf(withTiers("none", "none", "none"));

  it("applies exactly one coefficient when only one tier is present", () => {
    expect(logitOf(withTiers("liver_failure", "none", "none")) - noneAtAll).toBeCloseTo(
      VERY_HIGH,
      10,
    );
    expect(logitOf(withTiers("none", "neurodegenerative", "none")) - noneAtAll).toBeCloseTo(
      HIGH,
      10,
    );
    expect(logitOf(withTiers("none", "none", "asthma")) - noneAtAll).toBeCloseTo(LOW, 10);
  });

  it("suppresses the high-risk term when a very high-risk diagnosis is also present", () => {
    const veryHighOnly = logitOf(withTiers("bone_marrow_transplant", "none", "none"));
    const both = logitOf(withTiers("bone_marrow_transplant", "cerebral_haemorrhage", "none"));
    expect(both).toBe(veryHighOnly);
    expect(both).not.toBeCloseTo(veryHighOnly + HIGH, 6);
  });

  it("suppresses the low-risk term beneath either higher tier", () => {
    const veryHighOnly = logitOf(withTiers("scid", "none", "none"));
    expect(logitOf(withTiers("scid", "none", "croup"))).toBe(veryHighOnly);

    const highOnly = logitOf(withTiers("none", "necrotising_enterocolitis", "none"));
    expect(logitOf(withTiers("none", "necrotising_enterocolitis", "croup"))).toBe(highOnly);
  });

  it("applies only the very high-risk term when all three tiers are present", () => {
    const allThree = logitOf(withTiers("liver_failure", "cardiomyopathy_myocarditis", "asthma"));
    expect(allThree).toBe(logitOf(withTiers("liver_failure", "none", "none")));
    expect(allThree - noneAtAll).toBeCloseTo(VERY_HIGH, 10);
  });

  /**
   * The paper's own numbers, stated as the failure they guard: fixture A with
   * the high-risk term left in produces logit +0.96136 → 72.34%.
   */
  it("returns the published 47.22% for the paper's example, not the additive 72.34%", () => {
    const outcome = pim3.compute({
      ...noFlags,
      mechanical_ventilation: { value: true },
      very_high_risk_diagnosis: { value: "leukaemia_lymphoma" },
      high_risk_diagnosis: { value: "cardiomyopathy_myocarditis" },
      base_excess: { value: -12, unit: "mmol/L" },
      sbp: { value: 70, unit: "mmHg" },
      fio2: { value: 0.7, unit: "fraction" },
      pao2: { value: 65, unit: "mmHg" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const probability = outcome.result.values.find((v) => v.id === "mortality_probability")?.value;
    expect(probability).toBeCloseTo(0.4722, 4);
    expect(probability).not.toBeCloseTo(0.7234, 4);
  });

  /** Precedence is scoped to the diagnosis variable; a recovery term is separate. */
  it("does not let a diagnosis tier suppress an unrelated recovery term", () => {
    const lowRiskOnly = logitOf(withTiers("none", "none", "obstructive_sleep_apnoea"));
    const withRecovery = pim3.compute({
      ...(withTiers("none", "none", "obstructive_sleep_apnoea") as unknown as Record<
        string,
        unknown
      >),
      recovery_category: { value: "non_cardiac" },
    } as unknown as Pim3Inputs);
    expect(withRecovery.ok).toBe(true);
    if (!withRecovery.ok) return;
    const logit =
      withRecovery.result.values.find((v) => v.id === "pim3_score")?.value ?? Number.NaN;
    expect(logit - lowRiskOnly).toBeCloseTo(-1.5164, 10);
  });
});

/**
 * SBP 0 AND SBP 30 ARE PUBLISHED SENTINELS, NOT MEASUREMENTS.
 *
 * Appendix 1, p680 codes cardiac arrest as SBP 0 and shock with an unmeasurable
 * blood pressure as SBP 30. A range guard with a physiologic floor — anything
 * above 0 — silently breaks the score for its two sickest input vectors, and it
 * breaks them by REJECTING, so the failure is loud in the UI and invisible in a
 * suite that never tries it. The `min: 0` on the input is therefore load-bearing
 * and these assert it from both ends.
 */
describe("pim3 admits the SBP sentinels and gives them their published weight", () => {
  const atSbp = (mmhg: number): number => logitOf({ ...base, sbp: { value: mmhg, unit: "mmHg" } });

  it("computes at the cardiac-arrest sentinel of 0", () => {
    expect(pim3.compute({ ...base, sbp: { value: 0, unit: "mmHg" } }).ok).toBe(true);
  });

  it("computes at the shocked/unmeasurable sentinel of 30", () => {
    expect(pim3.compute({ ...base, sbp: { value: 30, unit: "mmHg" } }).ok).toBe(true);
  });

  it("gives SBP 0 the published +2.70096 logit over the unknown default of 120", () => {
    expect(atSbp(0) - atSbp(120)).toBeCloseTo(2.70096, 5);
  });

  it("imputes exactly 120 for an absent SBP", () => {
    expect(logitOf(noFlags)).toBe(logitOf({ ...noFlags, sbp: { value: 120, unit: "mmHg" } }));
  });

  /**
   * The two SBP terms are U-shaped with a minimum near 125.6 mmHg, which is why
   * neonates — who sit well below it — are systematically over-predicted. A
   * dropped quadratic term would make the curve monotonic and this fails.
   */
  it("is U-shaped: both hypotension and hypertension raise the score", () => {
    const nadir = atSbp(125.6);
    expect(atSbp(70)).toBeGreaterThan(nadir);
    expect(atSbp(200)).toBeGreaterThan(nadir);
    expect(atSbp(120)).toBeGreaterThan(nadir);
    expect(atSbp(160)).toBeGreaterThan(atSbp(120));
  });
});

/**
 * The ANZICS booklet was the only locator on this page not backed by a
 * resolver, and it was already known dead — its published URL returns HTTP 404
 * (re-verified 2026-08-02, as does every other anzics.org document path tried).
 * A dead link sitting beside working DOIs and a PMID made the citation list
 * less trustworthy rather than more complete, and it falsified /trust's claim
 * about following a score back to its source.
 *
 * Both halves are pinned, because fixing either one alone is the wrong fix:
 * deleting the link must not also delete the citation, and keeping the citation
 * must not mean keeping the link.
 */
describe("pim3 citations carry no dead locator", () => {
  const DEAD_BOOKLET_URL = "ANZPICR-PIM2-PIM3-Information-Booklet.pdf";

  it("does not ship the 404ing ANZICS booklet URL as a locator", () => {
    for (const ref of pim3.references) {
      const url = "url" in ref ? ref.url : "";
      expect(
        url,
        "the ANZICS booklet URL returns HTTP 404 and must not ship as a locator",
      ).not.toContain(DEAD_BOOKLET_URL);
    }
  });

  it("still names the booklet in the references", () => {
    // Removing the dead link must not lose the attribution. Since v1.1.0 the
    // coding rules are sourced to Appendix 1 of the paper itself and the
    // booklet is only the source of the registry code numbers, which this
    // implementation deliberately does not consume — but it is still named.
    const named = pim3.references.some((r) => (r.note ?? "").includes("Information Booklet"));
    expect(named, "the ANZICS booklet must still be credited in the references").toBe(true);
  });

  /**
   * The tracheostomy clause was the last [NEEDS SOURCE] on this score. Round-2
   * sourcing (2026-08-03) retrieved the ANZPIC Registry booklet and closed it —
   * but closing it correctly means DOWNGRADING the claim, not upgrading it: the
   * rule is a registry data-dictionary convention, not a peer-reviewed finding,
   * and the paper is silent on it. Asserting the disclosure structurally is what
   * stops a later edit from quietly promoting a booklet convention to something
   * the derivation study says.
   */
  it("records the tracheostomy rule as a registry convention, not a paper finding", () => {
    const notes = pim3.notes.en;
    expect(notes).toContain("tracheostomy");
    expect(notes).toContain("ANZPIC");
    // Provenance, its date, and its weakness must all survive together.
    expect(notes).toContain("2026-08-03");
    expect(notes, "grey literature must be labelled as such").toMatch(/grey literature/i);
    expect(notes, "the paper's silence is the point").toMatch(
      /NO PEER-REVIEWED SOURCE ADDRESSES THE EDGE CASE/,
    );
  });

  it("no longer carries an open [NEEDS SOURCE] marker", () => {
    // Every rule this score states now traces somewhere. If a future edit
    // reopens one, it belongs in `notes` with its own explanation — this
    // assertion failing is the prompt to write that explanation, not to delete
    // the marker.
    expect(pim3.notes.en).not.toContain("[NEEDS SOURCE]");
  });

  it("still does not ship the booklet as a locator, retrieved or not", () => {
    // Retrieving the text did not resurrect the URL. A reference must resolve;
    // this one cannot, so it stays credited in prose rather than linked.
    const bookletRef = pim3.references.some((r) =>
      r.citation.includes("ANZPIC Registry — Information Booklet"),
    );
    expect(bookletRef, "the booklet has no resolvable locator and must not be a reference").toBe(
      false,
    );
  });

  it("leaves every remaining reference traceable", () => {
    for (const ref of pim3.references) {
      const traceable = "pmid" in ref || "doi" in ref || "url" in ref;
      expect(traceable, `"${ref.citation.slice(0, 40)}…" must keep a locator`).toBe(true);
    }
  });
});

/**
 * The diagnosis lists are stated COMPLETE as published (Straney 2013,
 * Appendix 1, p680): five very high-risk conditions, five high-risk, six
 * low-risk. Silently gaining or losing one is a clinical change that no
 * arithmetic test would notice, so the counts are pinned to the publication.
 */
describe("pim3 ships the published diagnosis lists complete", () => {
  const optionCount = (id: string): number => {
    const input = pim3.inputs.find((i) => i.id === id);
    if (!input || input.type !== "categorical") throw new Error(`${id} is not categorical`);
    // Every list carries a leading "none", which is not a published condition.
    expect(input.options[0]?.value).toBe("none");
    return input.options.length - 1;
  };

  it("carries 5 very high-risk, 5 high-risk and 6 low-risk conditions", () => {
    expect(optionCount("very_high_risk_diagnosis")).toBe(5);
    expect(optionCount("high_risk_diagnosis")).toBe(5);
    expect(optionCount("low_risk_diagnosis")).toBe(6);
  });

  /**
   * Septic shock is collected by the ANZPIC registry under high-risk code 5 —
   * the slot the PAPER gives to necrotising enterocolitis — and is explicitly
   * NOT used by PIM3. Anyone reading registry data into this calculator would
   * introduce it; it must never appear as a selectable condition here.
   */
  it("does not offer septic shock, which the registry collects but PIM3 does not use", () => {
    const highRisk = pim3.inputs.find((i) => i.id === "high_risk_diagnosis");
    const values =
      highRisk?.type === "categorical" ? highRisk.options.map((o) => o.value) : ([] as string[]);
    expect(values).toContain("necrotising_enterocolitis");
    expect(values).not.toContain("septic_shock");
  });
});

/**
 * PIM3 is validated for groups, not individuals (Straney 2013). That belongs
 * beside the number, not in a limitations tab the reader has to open — which is
 * what `cautions` is for. Asserted structurally because it is the one statement
 * whose absence would change how a clinician reads the result.
 */
describe("pim3 surfaces its group-level-only warning beside the result", () => {
  it("declares a caution naming the individual-patient limit", () => {
    const cautions = (pim3.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toContain("GROUPS");
    expect(cautions).toContain("individual");
  });

  it("states the age range as under 16 and flags the paper's own contradiction", () => {
    expect(pim3.notes.en).toContain("younger than 16");
    expect(pim3.notes.en).toContain("younger than 18");
    expect(pim3.notes.en).toContain("CONTRADICTS");
  });

  /**
   * Round-3 (2026-08-04). An SMR of 0.53 reads as "the model is conservative
   * here" and is the single most misleading number in the regional evidence:
   * the same cohort under-predicts by 2.1 in sepsis. Both halves have to
   * survive together or the page is worse than silent, so both are pinned —
   * the reassuring figure and the subgroup that contradicts it.
   */
  it("carries both halves of the Dubai finding, not just the reassuring one", () => {
    const surfaced = pim3.notes.en + " " + (pim3.cautions ?? []).map((c) => c.en).join(" ");
    expect(surfaced).toContain("0.53");
    expect(surfaced).toContain("0.78");
    expect(surfaced).toContain("2.1");
    expect(surfaced, "sepsis is the under-predicted subgroup").toMatch(/SEPSIS|sepsis/);
  });

  /**
   * Round-3 verification (2026-08-04). v1.2.0 carried SMR 2.67 in the 1–5%
   * predicted-probability band and concluded from it that the reassuring end of
   * the scale is where this model is most wrong. Malhotra 2019 also reports
   * SMR 0.33 below a 14.3% predicted probability against 0.72 above it —
   * over-prediction across that same low range. One cohort of 583, two ways of
   * cutting it, opposite directions. Both are pinned here because carrying
   * either alone manufactures a finding out of an unstable subgroup, and the
   * conclusion must not name a direction for the low end.
   */
  it("carries both of the Dubai study's contradictory probability strata", () => {
    const surfaced = pim3.notes.en + " " + (pim3.cautions ?? []).map((c) => c.en).join(" ");
    expect(surfaced, "the fine-grained cut").toContain("2.67");
    expect(surfaced, "the fine-grained cut").toContain("1–5%");
    expect(surfaced, "the coarse cut that reverses it").toContain("14.3%");
    expect(surfaced, "the coarse cut that reverses it").toContain("0.33");
    expect(surfaced, "the coarse cut that reverses it").toContain("0.72");
    // The reference note must carry both too, since it is where the figures resolve.
    const dubai = pim3.references.find((r) => r.citation.includes("Dubai Med J"));
    expect(dubai?.note).toContain("2.67");
    expect(dubai?.note).toContain("0.33");
    expect(dubai?.note).toContain("0.72");
  });

  it("names infants under 12 months as the worst-calibrated group in the region", () => {
    const surfaced = pim3.notes.en + " " + (pim3.cautions ?? []).map((c) => c.en).join(" ");
    expect(surfaced).toContain("3396");
    expect(surfaced).toMatch(/infants under 12 months/);
  });

  /**
   * The figures alone let a reader conclude "over-predicts, so it is safe".
   * The conclusion is the deliverable: discrimination travels, calibration does
   * not, and the error sits where a low number gets trusted.
   */
  it("draws the calibration conclusion rather than only listing statistics", () => {
    expect(pim3.notes.en).toMatch(/discrimination travels between populations/);
    expect(pim3.notes.en).toMatch(/calibration frequently does not/);
    const cautions = (pim3.cautions ?? []).map((c) => c.en).join(" ");
    expect(cautions).toMatch(/least trustworthy/);
  });

  /**
   * The Riyadh study's per-model statistic that reached us is PRISM III's. A
   * later edit must not quietly re-attribute it to PIM3 — that is the exact
   * shape of error this project treats as a clinical defect, not a typo.
   */
  it("does not claim a PIM3-specific statistic from the Riyadh study", () => {
    const riyadh = pim3.references.find((r) => r.citation.includes("Front Pediatr. 2022"));
    expect(riyadh, "the Riyadh evaluation must be cited").toBeDefined();
    expect(riyadh?.note).toMatch(/no PIM3-specific statistic from this study is asserted/);
    // 0.87 is PRISM III's AUC in that paper; it must never be read as PIM3's.
    expect(riyadh?.note).toMatch(/PRISM III/);
  });
});

/** The registry gate reads `version` against the changelog; this reads it against reality. */
describe("pim3 version tracks its user-visible text", () => {
  it("declares the version its newest changelog entry describes", () => {
    const newest = pim3.changelog[pim3.changelog.length - 1];
    expect(pim3.version).toBe(newest?.version);
    expect(pim3.version).toBe("1.2.1");
  });

  it("keeps InputValues in step with the declared inputs", () => {
    // A compile-time assertion with a runtime body: if an input id is renamed
    // in pim3.ts without updating this file, `base` stops satisfying
    // InputValues and `pnpm typecheck` fails — which is the failure this line
    // exists to force, since vitest does not typecheck.
    const typed: InputValues<typeof pim3.inputs> = base;
    expect(Object.keys(typed)).toHaveLength(pim3.inputs.length);
  });
});
