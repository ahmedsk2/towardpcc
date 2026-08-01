# Percent Cumulative Fluid Balance (a.k.a. "percent fluid overload", %FO)

> Source of record for the metric's origin: **Goldstein SL, Currier H, Graf CD, Cosio CC, Brewer ED,
> Sachdeva R.** _Outcome in children receiving continuous venovenous hemofiltration._ **Pediatrics.**
> 2001;107(6):1309–1312. **PMID: 11389248** · **DOI: 10.1542/peds.107.6.1309**
>
> Source of record for the formula as stated verbatim and for the 10%/20% outcome strata:
> **Sutherland SM, Zappitelli M, Alexander SR, et al.** _Fluid overload and mortality in children
> receiving continuous renal replacement therapy: the Prospective Pediatric Continuous Renal
> Replacement Therapy Registry._ **Am J Kidney Dis.** 2010;55(2):316–325. **PMID: 20042260** ·
> **DOI: 10.1053/j.ajkd.2009.10.048**
>
> Source of record for the weight-based form's validation: **Selewski DT, Cornell TT, Lombel RM, et
> al.** _Weight-based determination of fluid overload status and mortality in pediatric intensive
> care unit patients requiring continuous renal replacement therapy._ **Intensive Care Med.**
> 2011;37(7):1166–1173. **PMID: 21533569** · **DOI: 10.1007/s00134-011-2231-3**
>
> Source of record for current consensus, and for the fact that **both** forms are printed side by
> side without one being chosen: **Selewski DT, Barhight MF, Bjornstad EC, et al.; Pediatric Acute
> Disease Quality Initiative (ADQI) Consensus Committee.** _Fluid assessment, fluid balance, and
> fluid overload in sick children: a report from the Pediatric Acute Disease Quality Initiative
> (ADQI) conference._ **Pediatr Nephrol.** 2024;39(3):955–979. **PMID: 37934274** ·
> **DOI: 10.1007/s00467-023-06156-w** · **PMC10817849**
>
> **Scope.** This file documents a **descriptive arithmetic quantity** — the net fluid a patient has
> accumulated or lost since an anchor point, expressed as a percentage of an anchor body weight. It
> is **not** a severity score, not a diagnostic classifier, and it has **no interpretation bands**
> (see §Interpretation bands, which is the most consequential section on this page).

## Naming — why this page is not called "fluid overload"

The Pediatric ADQI consensus defines the term **"fluid overload"** as, verbatim, _"a pathologic
state of positive fluid balance associated with a clinically observable event(s), which may vary by
age, case-mix, acuity, and phase of illness"_ — and gives **"percent cumulative fluid balance"** as
the **neutral quantitative descriptor** for the number produced by the formulae below.

[The earlier draft of this page glossed ADQI's definition as "a clinical condition with signs, organ
consequences, and a therapeutic implication". ADQI's actual wording is narrower — "associated with a
clinically observable event(s)" — and the gloss has been replaced with the quotation above. See
§Verification.]

That distinction is the whole reason this page exists in the shape it does. A percentage computed
from a flowsheet is a measurement of accumulated volume. Whether the child _has fluid overload_ is
a clinical judgement that takes in oedema, oxygenation, organ function, trajectory, and the reason
the fluid was given in the first place. The calculator computes the percentage. It does not, and
must not appear to, diagnose the state.

The historical literature name for this quantity is **"%FO"** (percent fluid overload), and it is
retained in this file and in the calculator's display name **only as a findability alias**, because
that is the term under which every cited paper indexes it. It is not used as a claim about the
patient.

## Formula / algorithm (exact — every term, both published forms)

**Two published forms exist. The Pediatric ADQI consensus prints both, in the same table, without
choosing between them.** This implementation does the same. They are not interchangeable; §"When
the two forms disagree" below is the reason.

### Form 1 — fluid-based (intake/output). The de facto standard.

```
%CFB_fluid = (Σ fluid intake [L] − Σ fluid output [L]) × 100 / anchor weight [kg]
```

Equivalently, with volumes charted in millilitres, divide the net millilitre balance by 10 and then
by the anchor weight in kg. Σ intake and Σ output are **cumulative from the anchor point** (see
§"Anchor weight" below), not per-day figures.

This is the form Goldstein 2001 introduced and the form Sutherland 2010 states verbatim. It matters
that it is the de facto standard for one specific reason: **every outcome threshold in this
literature was derived with it.** Any figure quoted from those cohorts (the 10% and 20% strata, the
per-1% odds ratios) is a property of _this_ numerator, not of the weight-based one.

**Sign convention.** Positive = net accumulation. Negative = net deficit (a negative cumulative
balance, i.e. the child is net down on fluid since the anchor). Nothing in the formula prevents a
negative result and nothing should: a diuresing or dialysed child legitimately runs negative.

**Implicit density assumption.** The numerator is in litres and the denominator in kilograms, so the
formula silently assumes **1 L of retained fluid ≈ 1 kg of body weight** (water at body temperature
is ~0.993 kg/L). This is universal in the field and is not treated as an error here, but it is the
hinge on which the two forms are even comparable. [The 0.993 kg/L density figure is standard
physical-chemistry, not a value taken from any of the cited clinical papers — **NEEDS SOURCE** if it
is ever to be quoted as a correction factor. It is not applied in this implementation.]

### Form 2 — weight-based. Theoretically superior; validated as a practical substitute.

```
%CFB_weight = (current weight [kg] − anchor weight [kg]) × 100 / anchor weight [kg]
```

Selewski 2011 validated this form against the fluid-based one in PICU patients requiring CRRT
(n = 113) and found it a practical substitute, reporting **univariate** odds ratios for PICU
mortality per 1% increase in fluid overload of **1.056 (95% CI 1.025–1.087) by the fluid-balance
method**, **1.044 (95% CI 1.019–1.069) by the weight-based method using PICU admission weight**, and
**1.045 (95% CI 1.022–1.070) by the weight-based method using hospital admission weight**. The forms
therefore carry a very similar per-unit association with mortality in that cohort.

**Two precision points that the earlier draft of this page omitted and that matter:** those odds
ratios are **univariate**, not adjusted (contrast Sutherland's OR of 1.03, which _is_ adjusted); and
on multivariate analysis Selewski reports that all three methods only **"approached significance"**
in predicting PICU survival. The weight-based form's mortality association is therefore **not
established as independent** in this study. The paper's own conclusion is the weaker, correctly
scoped one: it "provides evidence for a more practical weight-based definition of FO that can be
used at the bedside."

Its advantages are stated by ADQI directly: the weight-based approach _"removes the inherent
inaccuracies of accounting for daily input and output and should theoretically capture insensible
and other losses"_, and enables _"compensation for missed or inaccurate daily measures of fluid
input and output"_. Conversely the intake/output method _"does not account for insensible losses or
potential insensible gains"_, and _"inaccuracies or missing input/output measurements are carried
forward in all subsequent fluid balance calculations, propagating any potential inaccuracy"_.

**In neonates ADQI is stronger than "generally regarded":** _"Weight-based methods have been clearly
shown to be a superior measure of fluid balance in neonates."_

Its cost is that a scale measures _all_ mass change, not just fluid — see §Limitations.

### When the two forms disagree

Algebraically the two forms return the same number **exactly when**

```
(current weight − anchor weight) [kg]  ==  (Σ intake − Σ output) [L]
```

— that is, when every millilitre the child retained was charted, and when all mass change is fluid.
In practice they diverge, and the divergence is informative rather than an error in either one:

- **Insensible losses** (respiratory, transcutaneous, and in burns/open abdomens, large) are real
  output that the scale registers and the flowsheet does not. This pushes **weight-based below
  fluid-based** and is the most common direction of disagreement.
- **Uncharted or under-charted output** (nappy/diaper weights, drain and ostomy losses, blood loss,
  emesis) does the same.
- **Uncharted intake** (line flushes, drug diluents, blood products, feeds given off-schedule)
  pushes the other way.
- **True tissue mass change** — catabolic loss of lean mass over a long stay, or growth in an
  infant — is mass the scale attributes to fluid and the flowsheet correctly does not.
- **Scale technique**: different bed/scale, different linen, attached equipment, a different
  operator. In a small child this is not a rounding difference.

[The five mechanisms above are standard physiology and bedside practice, stated here as the
reasoning behind the divergence. They are **not** enumerated as a list in any of the cited papers —
treat this subsection as explanatory, and **NEEDS SOURCE** if any single mechanism is ever to be
quantified.]

### Anchor weight — a named knowledge gap, not a settled parameter

The denominator of both forms, and the reference point for the numerator of both, is the **anchor
weight** — and "anchor weight" is **ADQI's own term**, used throughout its Table 1 and text, not a
coinage of this page. ADQI states that _"the ICU admission weight is the weight most commonly
utilized as the anchor weight for fluid balance calculations"_, and that is the convention the cited
outcome literature used.

**Neonates use a different anchor.** ADQI states that in neonates _"the most common anchor weight is
the birthweight in the first two postnatal weeks."_ A neonatal result anchored to an admission
weight is therefore not comparable to the neonatal literature. [This point was absent from the
earlier draft of this page and from the first implementation; it was added on verification, and it
matters because Worked Example 5 below is a neonatal case.]

The Pediatric ADQI consensus **explicitly names the selection of the anchor weight as a knowledge
gap**, stating that _"no clear gold standard exists against which to systematically compare
different approaches, highlighting a knowledge gap requiring targeted study."_ This is not a
footnote: the anchor is the denominator, so the choice of anchor scales every percentage the
calculator can produce. A child admitted already fluid-overloaded from the ward or
the referring hospital has an admission weight that already contains the accumulation, and the
percentage computed from it understates the total accumulation from the child's true dry weight.

Consequences that follow directly from the arithmetic:

- A percentage is **only comparable to the published cohorts if it was computed against the ICU
  admission weight**, because that is what those cohorts used.
- Two clinicians using different anchors (admission weight vs. estimated dry weight vs. most recent
  outpatient weight) produce different numbers for the same child, and neither is wrong — they are
  answering different questions.
- The anchor must therefore be **recorded alongside the result**, never assumed.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                  | label                                        | type   | units | conversions                        | plausible min / max                          |
| ------------------- | -------------------------------------------- | ------ | ----- | ---------------------------------- | -------------------------------------------- |
| `anchor_weight`     | Anchor weight (usually ICU admission weight) | number | kg    | lb → kg: ÷ 2.20462; g → kg: ÷ 1000 | 0.5 – 150 kg (engineering validation bounds) |
| `cumulative_intake` | Cumulative fluid intake since the anchor     | number | L     | mL → L: ÷ 1000                     | 0 – 200 L (engineering validation bounds)    |
| `cumulative_output` | Cumulative fluid output since the anchor     | number | L     | mL → L: ÷ 1000                     | 0 – 200 L (engineering validation bounds)    |
| `current_weight`    | Current weight                               | number | kg    | lb → kg: ÷ 2.20462; g → kg: ÷ 1000 | 0.5 – 150 kg (engineering validation bounds) |

**Required vs optional.** Only `anchor_weight` is required — it is the denominator of _both_ forms,
so nothing at all is computable without it. The other three are optional, because the two forms are
independently computable:

- `cumulative_intake` **and** `cumulative_output` present → the fluid-based form is emitted.
- `current_weight` present → the weight-based form is emitted.
- All four present → both forms are emitted, and the reader can see whether they agree.

**Bounds are engineering input-validity limits, not clinical thresholds — [NEEDS SOURCE] for every
number in the min/max column.** None of the cited papers states a valid range for any of these
inputs; the formula itself is unbounded above and the weight bounds simply mirror the convention
already used by this platform's other weight-driven calculators (Holliday-Segar, burn resuscitation).
Intake and output are cumulative volumes and therefore cannot be negative; that floor of 0 _is_
inherent to the quantity rather than arbitrary. The 200 L ceiling is a sanity limit for a long stay,
not a claim about any patient.

## Worked examples

**No published paediatric worked example exists.** None of Goldstein 2001, Sutherland 2010, Selewski
2011, Foland 2004, or the Pediatric ADQI consensus works a paediatric case end to end. The only
step-by-step case findable anywhere in the search was a **100 kg adult** in a device manufacturer's
protocol document, which is neither paediatric nor independently citable as a validation vector.

The examples below are therefore **CONSTRUCTED from the formulae above** and are labelled as such
wherever they appear, including in the `locator` field of every corresponding test case, following
the precedent this repository set for PRISM.

**This situation is materially safer than PRISM's, and that should be stated plainly rather than
glossed.** PRISM's constructed cases stand in for a 26-row threshold table where a single
mis-transcribed cut point produces a plausible-looking wrong score that no reader could catch by
inspection. This score is **one subtraction and one division**. There is no table, no branch, no
threshold, and nothing to mis-transcribe; every example below can be verified by hand in a few
seconds, and a reader who disagrees with any of them can say so with certainty. The absence of a
published worked example is a gap in the literature, not a gap in the verification of this
implementation.

Throughout: `A` = anchor weight, `I` = cumulative intake, `O` = cumulative output, `W` = current
weight.

### Example 1 — positive balance, fluid-based only (constructed)

```
A = 10 kg, I = 12 L, O = 10 L
net balance   = 12 − 10                  = +2 L  (= +2000 mL)
%CFB_fluid    = (12 − 10) × 100 / 10     = +20.0 %
```

Expected: **+20.0 %** fluid-based, **+2000 mL** net balance. No weight-based value (no `W` supplied).

### Example 2 — negative balance (constructed)

```
A = 20 kg, I = 8 L, O = 11 L
net balance   = 8 − 11                   = −3 L  (= −3000 mL)
%CFB_fluid    = (8 − 11) × 100 / 20      = −15.0 %
```

Expected: **−15.0 %**, **−3000 mL**. A negative result is a valid, common state (active diuresis or
ultrafiltration) and is reported as a negative number, not clamped.

This example also doubles as the **swapped-intake/output trap**: reversing `I` and `O` yields +15.0 %,
a sign error that no plausibility bound could catch.

### Example 3 — the two forms AGREE (constructed)

```
A = 10 kg, I = 12 L, O = 10 L, W = 12 kg
%CFB_fluid    = (12 − 10) × 100 / 10     = +20.0 %
weight change = 12 − 10                  = +2.00 kg
%CFB_weight   = (12 − 10) × 100 / 10     = +20.0 %
```

Expected: **both forms +20.0 %**. This is the idealised case in which every retained millilitre was
charted and all mass change is fluid — see §"When the two forms disagree".

### Example 4 — the two forms DISAGREE on the same patient (constructed)

```
A = 10 kg, I = 12 L, O = 10 L, W = 11.5 kg
%CFB_fluid    = (12 − 10) × 100 / 10     = +20.0 %
weight change = 11.5 − 10                = +1.50 kg
%CFB_weight   = (11.5 − 10) × 100 / 10   = +15.0 %
```

Expected: **fluid-based +20.0 %, weight-based +15.0 %.** The 5-point gap corresponds to ~0.5 L that
left the child without being charted as output — insensible loss being the usual explanation, and
the usual direction (weight-based below fluid-based).

This example is also the **wrong-denominator trap**: both forms divide by the **anchor** weight, not
the current weight. An implementation that divided the fluid-based form by `W` would return
2 × 100 / 11.5 = 17.4 %, and an implementation that divided the weight-based form by `W` would return
1.5 × 100 / 11.5 = 13.0 %. Both are plausible-looking wrong numbers, and both are excluded by this
one case.

### Example 5 — weight-based only, neonate (constructed)

```
A = 3.5 kg, W = 3.85 kg          (no intake/output supplied)
weight change = 3.85 − 3.5       = +0.35 kg
%CFB_weight   = 0.35 × 100 / 3.5 = +10.0 %
```

Expected: **+10.0 %** weight-based, **+0.35 kg**. No fluid-based value. This is the population in
which the weight-based form is generally preferred: insensible losses are proportionally large and
charting error is relatively large against a small denominator.

### Example 6 — zero balance (constructed)

```
A = 10 kg, I = 10 L, O = 10 L
net balance = 0 L,  %CFB_fluid = 0.0 %
```

Expected: **0.0 %**, **0 mL**. Even balance is a real and unremarkable result.

### Example 7 — unit conversion, millilitres (constructed)

```
A = 10 kg, I = 12000 mL, O = 10000 mL
→ 12 L and 10 L after conversion; identical to Example 1
%CFB_fluid = +20.0 %,  net balance = +2000 mL
```

### Example 8 — unit conversion, pounds (constructed)

```
A = 22.0462 lb → 10 kg,  W = 24.25082 lb → 11 kg
weight change = +1 kg,  %CFB_weight = 1 × 100 / 10 = +10.0 %
```

The pound factor (kg = lb ÷ 2.20462) is the platform's existing mass conversion. Small
floating-point residue is expected here and the corresponding test carries a tolerance; the
kilogram and millilitre cases above are exact.

## Interpretation bands (non-directive, with source)

**THIS SCORE HAS NO INTERPRETATION BANDS. `interpretation: []`, and `interpretationStatus:
"not-applicable"` — not `"pending"`.** This is a deliberate, load-bearing decision and not a
content gap awaiting a later pass. It is the single most important statement on this page.

The famous 10 % and 20 % figures are **cohort-specific outcome associations measured at the moment
of CRRT initiation** in critically ill children who were already receiving renal replacement
therapy. They are not thresholds that classify an arbitrary patient, and they were never proposed
as such.

The Pediatric ADQI consensus states outright — quoted verbatim from the consensus statements, and
independently re-fetched on verification — that **"no specific threshold of positive fluid balance
alone can define fluid overload across all sick children."** Rendering the 10/20 % figures as bands
would convert an association observed in one selected population into an apparent classification of
any child a user types numbers about — which is exactly the over-claim this platform refuses to
make, and would additionally contradict the naming decision at the top of this page by implying the
calculator can identify the pathologic state.

**The Sutherland 2010 figures, recorded here as observed associations with their cohort named — NOT
as bands:**

In the Prospective Pediatric CRRT Registry cohort (children receiving CRRT, %FO measured at CRRT
initiation, fluid-based form):

| %FO at CRRT initiation | Observed mortality in that cohort |
| ---------------------- | --------------------------------- |
| < 10 %                 | 29.4 %                            |
| 10 – 20 %              | 43.1 %                            |
| ≥ 20 %                 | 65.6 %                            |

Also reported by Sutherland 2010: an **adjusted mortality odds ratio of 1.03 per 1 %** of fluid
overload (**95 % CI 1.01–1.05**), i.e. a 3 % increase in mortality per 1 % increase in fluid
overload; and, dichotomised, an **adjusted mortality odds ratio of 8.5 at ≥ 20 %** (**95 % CI
2.8–25.7**). The stratum denominators are n = 153 (<10 %), n = 51 (10–20 %), n = 93 (≥20 %) of 297
patients — note how small the middle stratum is.

Selewski 2011 reports **univariate** per-1 % PICU-mortality odds ratios of **1.044 (weight-based,
PICU admission weight; 95 % CI 1.019–1.069)** and **1.056 (fluid-balance method; 95 % CI
1.025–1.087)** in its PICU CRRT cohort. **These are univariate, not adjusted**, and on multivariate
analysis all three of Selewski's methods only "approached significance" — see §Form 2.

Note what those mortality figures actually say: **29.4 % of the children with less than 10 % fluid
overload died.** The lowest stratum of this table is a population with near-30 % mortality. That is
a statement about who receives CRRT, not about what 9 % cumulative fluid balance means in a child
on the ward — and it is the clearest possible demonstration of why these numbers cannot be bands.

**Wording for any surface that displays these figures** must name the cohort and the measurement
moment in the same sentence as the number, and must not attach the figures to the user's own
computed result.

## References (full citations, PMID/DOI/URL)

1. **Goldstein SL, Currier H, Graf CD, Cosio CC, Brewer ED, Sachdeva R.** Outcome in children
   receiving continuous venovenous hemofiltration. _Pediatrics._ 2001;107(6):1309–1312.
   **PMID: 11389248.** **DOI: 10.1542/peds.107.6.1309.** — _Origin of the metric: the percentage of
   fluid accumulation relative to body weight as a reported quantity in critically ill children._
2. **Sutherland SM, Zappitelli M, Alexander SR, Chua AN, Brophy PD, Bunchman TE, Hackbarth R,
   Somers MJG, Baum M, Symons JM, Flores FX, Benfield M, Askenazi D, Chand D, Fortenberry JD,
   Mahan JD, McBryde K, Blowey D, Goldstein SL.** Fluid overload and mortality in children receiving
   continuous renal replacement therapy: the Prospective Pediatric Continuous Renal Replacement
   Therapy Registry. _Am J Kidney Dis._ 2010;55(2):316–325. **PMID: 20042260.**
   **DOI: 10.1053/j.ajkd.2009.10.048.** — _Formula stated verbatim; source of the <10 % / 10–20 % /
   ≥20 % strata and their observed mortality (29.4 % / 43.1 % / 65.6 %), the adjusted OR of 1.03 per
   1 %, and the OR of 8.5 at ≥20 %._
3. **Selewski DT, Cornell TT, Lombel RM, Blatt NB, Han YY, Mottes T, Kommareddi M, Kershaw DB,
   Shanley TP, Heung M.** Weight-based determination of fluid overload status and mortality in
   pediatric intensive care unit patients requiring continuous renal replacement therapy.
   _Intensive Care Med._ 2011;37(7):1166–1173. **PMID: 21533569.**
   **DOI: 10.1007/s00134-011-2231-3.** — _Validation of the weight-based form as a practical
   substitute for the fluid-based form; source of the **univariate** per-1 % PICU-mortality odds
   ratios (1.044 weight-based using PICU admission weight, 95 % CI 1.019–1.069; 1.056 fluid-balance
   method, 95 % CI 1.025–1.087; 1.045 weight-based using hospital admission weight, 95 % CI
   1.022–1.070). On multivariate analysis all three methods only "approached significance."_
4. **Foland JA, Fortenberry JD, Warshaw BL, Pettignano R, Merritt RK, Heard ML, Rogers K, Reid C,
   Tanner AJ, Easley KA.** Fluid overload before continuous hemofiltration and survival in
   critically ill children: a retrospective analysis. _Crit Care Med._ 2004;32(8):1771–1776.
   **PMID: 15286557.** **DOI: 10.1097/01.ccm.0000132897.52737.49.** — _Supporting evidence in the
   paediatric CRRT fluid-overload literature. Cited here as corroborating lineage only; **no numeric
   value on this page or in the implementation is taken from it.** Its findings were nonetheless
   verified on this pass (n = 113 children receiving CVVH, 69 survivors / 61 %, median age 9.6 y;
   median %FO 7.8 % in survivors vs 15.1 % in non-survivors, p = 0.02; the association with survival
   held independently in patients with ≥3-organ MODS), so the earlier **[NEEDS SOURCE]** on this
   entry is **resolved**. The DOI was absent from the earlier draft and has been added._
5. **Selewski DT, Barhight MF, Bjornstad EC, Ricci Z, de Sousa Tavares M, Akcan-Arikan A,
   Goldstein SL, Basu R, Bagshaw SM; Pediatric Acute Disease Quality Initiative (ADQI) Consensus
   Committee.** Fluid assessment, fluid balance, and fluid overload in sick children: a report from
   the Pediatric Acute Disease Quality Initiative (ADQI) conference. _Pediatr Nephrol._
   2024;39(3):955–979. **PMID: 37934274.** **DOI: 10.1007/s00467-023-06156-w.** Epub 2023 Nov 7.
   Open-access full text: https://pmc.ncbi.nlm.nih.gov/articles/PMC10817849/ — _Current consensus.
   Prints **both** formulae in Table 1 without selecting between them; defines "fluid overload" as a
   pathologic state of positive fluid balance associated with clinically observable event(s), with
   "percent cumulative fluid balance" as the neutral descriptor; states that no specific threshold of
   positive fluid balance alone can define fluid overload across all sick children; names
   anchor-weight selection a knowledge gap with no clear gold standard; is the source of the term
   "anchor weight" itself; and is the source for the neonatal birthweight anchor and for the
   weight-based form's stated advantages._

   **Citation corrections made on verification (this entry was the most defective on the page).** The
   earlier draft credited the work to a nonexistent corporate author, **"Pediatric ADQI
   Collaborative"**, and carried **no PMID, no DOI, and no volume/issue/pages**. The real first
   author is **David T Selewski** — the same first author as reference 3 above, which the earlier
   draft did not notice. The title was also truncated: it ends **"...(ADQI) conference"**.

   **The 2023-vs-2024 ambiguity is resolved, and the earlier draft's explanation of it was wrong.**
   It is **not** a meeting-year vs publication-year distinction. It is **online-first vs print
   issue**: the paper was **Epub 2023 Nov 7** and assigned to the **2024** print issue, _Pediatr
   Nephrol_ **39(3):955–979**. Both dates are publication dates of the same record. **2024 is the
   correct citation year**; sources saying "2023" are citing the online-first date. (Separately, the
   underlying meeting was the 26th ADQI consensus conference, but that is not what drives the year
   discrepancy.) The former **[NEEDS SOURCE]** on this point is **resolved**.

## Limitations & notes

- **Not a diagnosis, and not a severity score.** The output is a percentage describing accumulated
  volume. "Fluid overload" is a pathologic state and remains a clinical judgement (ADQI). The
  calculator must never be read, or displayed, as identifying that state.
- **The two forms are not interchangeable.** They answer the same question with different
  instruments and legitimately disagree on the same patient. Neither is a correction of the other,
  and this implementation therefore emits both rather than picking one — the same treatment this
  platform gives to paediatric ideal body weight, and for the same reason.
- **Published thresholds belong to the fluid-based form.** Every outcome figure quoted anywhere in
  this file was derived on the intake/output form in CRRT cohorts. Applying them to a weight-based
  percentage is an extrapolation, and applying them to a child not receiving CRRT is a larger one.
- **Anchor weight is an unresolved knowledge gap** (ADQI, explicitly). It is the denominator, so it
  scales the entire result. Record which anchor was used; results computed against different anchors
  are not comparable to each other or to the literature.
- **The weight-based form measures mass, not fluid.** Over a long stay, catabolic loss of lean body
  mass makes the weight-based percentage understate accumulated fluid, and growth in an infant makes
  it overstate. Scale technique (different bed, linen, attached equipment, operator) is a further
  error source that is proportionally largest in the smallest patients.
- **The fluid-based form is only as good as the flowsheet.** It cannot see insensible losses at all,
  and it accumulates every transcription error across every shift of the stay. This is the specific
  failure Selewski's weight-based validation was motivated by.
- **A partial intake/output record produces a wrong number, not a missing one.** If some output was
  never charted, the fluid-based form returns a confidently over-positive percentage with no
  indication that anything is missing. There is no way for the calculator to detect this.
- **Neonates.** ADQI states that weight-based methods "have been clearly shown to be a superior
  measure of fluid balance in neonates" (proportionally large insensible losses; small denominator
  amplifying charting error). **The neonatal anchor is also different** — ADQI reports the most
  common neonatal anchor weight as the **birthweight in the first two postnatal weeks**, not an
  admission weight. No neonate-specific threshold exists, and none should be inferred from the
  CRRT-cohort figures.
- **Input bounds are engineering limits, [NEEDS SOURCE] as clinical values.** The 0.5–150 kg weight
  range and the 0–200 L volume range are validation sanity limits carried from this platform's other
  weight-driven calculators; no cited paper specifies a valid range for any input.
- **1 L ≈ 1 kg is assumed** and no density correction is applied, consistent with every cited source.
- **No published paediatric worked example exists**; every example on this page is constructed from
  the formulae and labelled as such (see §Worked examples for why this is a materially smaller risk
  here than for a threshold-table score).

## Verification

**Arithmetic (implementation pass, 2026-08-01).** All eight worked examples were re-derived by hand
from the two formulae in §Formula/algorithm; each is a single subtraction and a single division and each
reproduces exactly (Examples 5 and 8 to within floating-point residue, which the corresponding tests
carry as an explicit tolerance). Example 4 was additionally checked against the two most plausible
wrong denominators (17.4 % and 13.0 %), confirming it discriminates them.

**Sources — independent re-verification performed 2026-08-01 by a second reviewer.** This closes the
gap left by the implementation pass, which had explicitly reported that "sources were not
independently re-fetched." Every citation, PMID, DOI, and quoted figure below was fetched from the
primary record (PubMed and PMC) during this pass, not carried over from the research hand-off.

**What was fetched:** PubMed records for PMID 11389248 (Goldstein 2001), 20042260 (Sutherland 2010),
21533569 (Selewski 2011), 15286557 (Foland 2004) and 37934274 (ADQI 2024); the PMC open-access full
text of the ADQI consensus (PMC10817849); and the indexed verbatim abstract of Sutherland 2010 for
its formula sentence.

**Reconciled — matched the primary source exactly, no change needed:**

- **Goldstein 2001** — PMID **11389248 resolves to the named paper**. Citation, author list (all six,
  in order), journal, year, volume, issue, pages (1309–1312) and DOI (10.1542/peds.107.6.1309) all
  **match**. Its role as the **origin of the metric is confirmed independently**: the ADQI consensus
  cites Goldstein 2001 as the foundational description of fluid overload percentage at CKRT
  initiation in critically ill children. The file correctly takes **no numeric value** from it — and
  note that Goldstein's own figures (21 patients, 42.8 % survival, FO 16.4 ± 13.8 % in survivors vs
  34.0 ± 21.0 % in non-survivors) appear **nowhere** in this file or the implementation, so there is
  no mis-attribution in either direction.
- **Sutherland 2010** — PMID **20042260 resolves to the named paper**; citation, 19-author list,
  journal, year, volume, issue, pages (316–325) and DOI (10.1053/j.ajkd.2009.10.048) all **match**.
  - **The formula is stated verbatim, as claimed.** Re-extracted: _"defined as a percentage equal to
    (fluid in [L] − fluid out [L])/(ICU admit weight [kg]) × 100%."_ This is **exactly** the
    implementation's fluid-based form, **including the ICU-admit-weight denominator**. The
    load-bearing "denominator is the anchor weight, never the current weight" claim is **confirmed
    at the primary source**.
  - **Mortality strata confirmed exactly**: **29.4 %** (<10 %, 45/153), **43.1 %** (10–20 %, 22/51),
    **65.6 %** (≥20 %, 61/93), of 297 patients.
  - **Adjusted OR 1.03 confirmed**, 95 % CI 1.01–1.05 ("a 3 % increase in mortality for each 1 %
    increase in severity of fluid overload").
  - **OR 8.5 at ≥20 % confirmed**, 95 % CI 2.8–25.7, adjusted, dichotomised.
  - All four figures are **correctly attributed to Sutherland** — none belongs to Goldstein.
- **Selewski 2011** — PMID **21533569 resolves to the named paper**; citation, 10-author list,
  journal, year, volume, issue, pages (1166–1173) and DOI (10.1007/s00134-011-2231-3) all **match**.
  The odds ratios **1.044** and **1.056** are **confirmed present and correctly paired** with the
  weight-based and fluid-balance methods respectively. (Corrections to their _framing_ below.)
- **Foland 2004** — PMID **15286557 resolves to the named paper**; citation, 10-author list, journal,
  year, volume, issue and pages (1771–1776) all **match**. Confirmed that no figure in this file or
  the implementation derives from it.
- **ADQI consensus** — **all five substantive claims confirmed verbatim in the PMC full text:**
  1. **Both formulae are printed side by side in Table 1, without one being chosen** — confirmed.
     Table 1 prints `∑[Fluid intake(L) − fluid output(L)] × 100% / anchor weight (kg)` and
     `[(Current weight kg − anchor weight kg) × 100%] / anchor weight (kg)`. **Both match the
     implementation character-for-character in structure and denominator.** This also supplies the
     **primary source for the weight-based formula** that the verification brief asked for — it is
     printed, not inferred.
  2. **"No specific threshold of positive fluid balance alone can define fluid overload across all
     sick children"** — **confirmed verbatim.** The no-bands decision stands (see below).
  3. **Terminology** — confirmed: _"Fluid overload denotes a pathologic state of positive fluid
     balance associated with a clinically observable event(s), which may vary by age, case-mix,
     acuity, and phase of illness"_, with percent cumulative fluid balance as the neutral descriptor.
  4. **"Anchor weight" is ADQI's own term** — confirmed; it is used throughout Table 1 and the text.
     The file was **not** coining or borrowing it from elsewhere.
  5. **Anchor-weight knowledge gap** — confirmed verbatim: _"no clear gold standard exists against
     which to systematically compare different approaches, highlighting a knowledge gap requiring
     targeted study."_

**Arithmetic and worked examples.** Re-derived independently again on this pass against the
now-primary-source-confirmed formulae; all eight reproduce exactly (5 and 8 to floating-point
residue, which the tests carry as explicit tolerances). Example 4's discrimination of the two wrong
denominators (17.4 % and 13.0 %) re-checked and holds.

### Did not reconcile — corrections made on this pass

1. **The ADQI citation was materially wrong and has been corrected in this file, in
   `fluid-balance.ts`, and in `fluid-balance.test.ts`.**
   - _Before:_ "**Pediatric ADQI Collaborative.** Fluid assessment, fluid balance, and fluid overload
     in sick children: a report from the Pediatric Acute Disease Quality Initiative. _Pediatr
     Nephrol._ 2024." — no PMID, no DOI, no volume/issue/pages, truncated title.
   - _After:_ "**Selewski DT, Barhight MF, Bjornstad EC, et al.; Pediatric Acute Disease Quality
     Initiative (ADQI) Consensus Committee.** …a report from the Pediatric Acute Disease Quality
     Initiative (ADQI) **conference**. _Pediatr Nephrol._ **2024;39(3):955–979**. **PMID 37934274**.
     **DOI 10.1007/s00467-023-06156-w**."
   - "Pediatric ADQI Collaborative" **is not the author of record**; it does not appear on the paper.
     The first author is **David T Selewski — the same first author as reference 3**, which the
     earlier draft did not notice.
2. **The 2023-vs-2024 ambiguity is resolved, and the earlier explanation of it was wrong.** It is
   **online-first vs print issue** (Epub 2023 Nov 7; print 2024;39(3):955–979), **not** meeting year
   vs publication year. **2024 is correct.** Former **[NEEDS SOURCE]** — **resolved**.
3. **Selewski's odds ratios were under-qualified in a way that overstated them.**
   - _Before:_ "per-1 % mortality ORs of 1.044 (weight-based) and 1.056 (fluid-based)."
   - _After:_ **univariate** per-1 % PICU-mortality ORs — 1.044 (weight-based, **specifically using
     PICU admission weight**; 95 % CI 1.019–1.069) and 1.056 (fluid-balance method; 95 % CI
     1.025–1.087) — **and on multivariate analysis all three of Selewski's methods only "approached
     significance."** The numbers were right; their status was not. Sutherland's 1.03 _is_ adjusted,
     so the earlier text sat two unlike quantities next to each other without distinguishing them.
     A third value, **1.045** (weight-based using _hospital_ admission weight), existed in the source
     and was missing here; it is now recorded.
4. **ADQI's definition of "fluid overload" was over-glossed.** The earlier text expanded it to "a
   clinical condition with signs, organ consequences, and a therapeutic implication." ADQI's actual
   wording is narrower — "associated with a clinically observable event(s)". Replaced with the
   quotation. No conclusion changes, but the file was putting words in ADQI's mouth.
5. **A neonatal safety gap was found and closed.** ADQI states the most common neonatal anchor is the
   **birthweight in the first two postnatal weeks**, not an admission weight. Neither this file nor
   the implementation mentioned it, while both told users the anchor is "most commonly the ICU
   admission weight" — advice that is **wrong for neonates**, and Worked Example 5 is a neonatal
   case. Added to this file, to the `anchor_weight` help text, to the anchor caution, and to `notes`.
6. **Foland 2004 was missing its DOI** (10.1097/01.ccm.0000132897.52737.49); added. Its findings,
   previously **[NEEDS SOURCE]**, were verified on this pass and are **resolved** — though still no
   number from it is used anywhere.
7. **The weight-based form's advantages and its neonatal superiority were stated as this file's own
   reasoning when they are in fact ADQI's, quotably.** Re-attributed to ADQI, and the neonatal claim
   **strengthened** from "generally regarded as the better form" to ADQI's actual "clearly shown to
   be a superior measure of fluid balance in neonates."

### The no-bands decision — verdict

**It survives, on the strongest possible footing.** The sentence the whole decision rests on was
found **verbatim** in the ADQI consensus full text: _"No specific threshold of positive fluid balance
alone can define fluid overload across all sick children."_ It is not a paraphrase, not an inference
from the research hand-off, and not a reconstruction. `interpretation: []` and
`interpretationStatus: "not-applicable"` are correct as shipped, and the test that pins them is
guarding a real consensus position.

Two findings from this pass **strengthen** the decision rather than merely permitting it: Sutherland's
strata are now confirmed to sit on denominators of 153 / 51 / 93 in a **CRRT** population, and
Selewski's weight-based association is confirmed **not** to be independent on multivariate analysis.
Rendering either set as bands would be less defensible after verification than before it.

### Still unverified after this pass

- **Goldstein 2001 full text** — the _Pediatrics_ 2001 article is paywalled and could not be fetched;
  only the PubMed abstract was retrievable. The **origin attribution is confirmed** (via ADQI's own
  citation of it, and via consistent secondary literature), but **whether Goldstein 2001 prints the
  formula in the exact form quoted** is **not** confirmed at the primary source. This is not load
  bearing: the file takes the formula from **Sutherland 2010**, where it _was_ confirmed verbatim,
  and takes no number from Goldstein.
- **Input bounds** (0.5–150 kg, 0–200 L) — remain **[NEEDS SOURCE]**. Re-confirmed on this pass that
  none of the five sources specifies a valid input range; these are genuinely absent from the
  literature, not merely unchecked. Left marked.
- **The five divergence mechanisms** in §"When the two forms disagree" — ADQI supports the two
  principal ones (insensible losses; carried-forward charting error) and those are now quoted. The
  remaining three (uncharted intake, true tissue-mass change, scale technique) are **not enumerated
  in any cited source** and remain explanatory reasoning, **[NEEDS SOURCE]** if ever quantified.
- **The 0.993 kg/L density figure** — standard physical chemistry, not from any cited clinical paper,
  and not applied in the implementation. Left marked **[NEEDS SOURCE]**.
- **No published paediatric worked example** — re-confirmed absent across all five sources. Every test
  vector remains constructed and labelled as such.

**Result:** no computational defect found. **The formulae, the denominator, and every quoted figure
are correct as shipped** — the arithmetic the calculator performs needed no change. The defects were
in **citation integrity** (a fabricated corporate author, a missing PMID/DOI/pages), in **statistical
framing** (univariate ORs presented alongside an adjusted one without distinction), and in one
**clinical omission** (the neonatal anchor weight). All are corrected above.

## IP status

- **`{ kind: "freely-reproducible" }`.** Both forms are elementary arithmetic over measured volumes
  and weights: one subtraction, one multiplication by 100, one division. Mathematical formulae and
  the facts they operate on are not copyrightable expression, and the same category applies here as
  applies to Holliday-Segar in this platform.
- **No item wording exists to license.** Unlike an ordinal clinical scale, this metric has **no
  response descriptors, no item text, and no table** — every element is a number in and a number out.
  No verbatim text from any cited source is reproduced in the implementation.
- **No rights claim appears anywhere in the sources.** None of Goldstein 2001, Sutherland 2010,
  Selewski 2011, or the Pediatric ADQI consensus asserts ownership, licensing terms, or usage
  restrictions over the formula.
- **Attribution is an academic-integrity expectation, not a copyright requirement.** Cite Goldstein
  2001 as the origin, Sutherland 2010 for the formula as stated and the outcome strata, Selewski
  2011 for the weight-based form, and the Pediatric ADQI consensus for current framing.
