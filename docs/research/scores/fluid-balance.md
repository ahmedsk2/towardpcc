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
> side without one being chosen: **Pediatric ADQI Collaborative.** _Fluid assessment, fluid balance,
> and fluid overload in sick children: a report from the Pediatric Acute Disease Quality Initiative._
> **Pediatr Nephrol.** 2024. **PMC10817849**
>
> **Scope.** This file documents a **descriptive arithmetic quantity** — the net fluid a patient has
> accumulated or lost since an anchor point, expressed as a percentage of an anchor body weight. It
> is **not** a severity score, not a diagnostic classifier, and it has **no interpretation bands**
> (see §Interpretation bands, which is the most consequential section on this page).

## Naming — why this page is not called "fluid overload"

The Pediatric ADQI consensus asks that the term **"fluid overload" be reserved for a _pathologic
state_** — a clinical condition with signs, organ consequences, and a therapeutic implication —
and that **"percent cumulative fluid balance"** be used as the **neutral quantitative descriptor**
for the number produced by the formulae below.

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

Selewski 2011 validated this form against the fluid-based one in PICU patients requiring CRRT and
found it a practical substitute, reporting a **per-1% mortality odds ratio of 1.044 for the
weight-based form versus 1.056 for the fluid-based form**. The two forms therefore carry a very
similar per-unit association with mortality in that cohort — similar, not identical, and the
difference is in the expected direction (the fluid-based form, being the one the thresholds were
derived on, tracks its own derivation cohort slightly more tightly).

Its theoretical advantages are that it (a) **captures insensible losses**, which no flowsheet
records, and (b) **avoids intake/output transcription error**, which accumulates over every shift of
a long stay. It is generally regarded as the better form **in neonates**, where insensible losses are
proportionally large and where a small absolute charting error is a large relative one.

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
weight**. It is **most commonly the ICU admission weight**, and that is the convention the cited
outcome literature used.

The Pediatric ADQI consensus **explicitly names the selection of the anchor weight as a knowledge
gap**. This is not a footnote: the anchor is the denominator, so the choice of anchor scales every
percentage the calculator can produce. A child admitted already fluid-overloaded from the ward or
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

The Pediatric ADQI consensus states outright that **no specific threshold of positive fluid balance
alone can define fluid overload across all sick children**. Rendering the 10/20 % figures as bands
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

Also reported by Sutherland 2010: an **adjusted odds ratio of 1.03 per 1 %** of fluid overload, and
an **odds ratio of 8.5 at ≥ 20 %**. Selewski 2011 reports **per-1 % odds ratios of 1.044
(weight-based) and 1.056 (fluid-based)** in its PICU CRRT cohort.

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
   substitute for the fluid-based form; source of the per-1 % mortality odds ratios (1.044
   weight-based vs 1.056 fluid-based)._
4. **Foland JA, Fortenberry JD, Warshaw BL, Pettignano R, Merritt RK, Heard ML, Rogers K, Reid C,
   Tanner AJ, Easley KA.** Fluid overload before continuous hemofiltration and survival in
   critically ill children: a retrospective analysis. _Crit Care Med._ 2004;32(8):1771–1776.
   **PMID: 15286557.** — _Supporting evidence in the paediatric CRRT fluid-overload literature.
   Cited here as corroborating lineage only; **no numeric value on this page is taken from it**, and
   its specific findings are **[NEEDS SOURCE]** for this file._
5. **Pediatric ADQI Collaborative.** Fluid assessment, fluid balance, and fluid overload in sick
   children: a report from the Pediatric Acute Disease Quality Initiative. _Pediatr Nephrol._ 2024.
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC10817849/ — _Current consensus. Prints **both**
   formulae in Table 1 without selecting between them; asks that "fluid overload" be reserved for a
   pathologic state with "percent cumulative fluid balance" as the neutral descriptor; states that
   no specific threshold of positive fluid balance alone can define fluid overload across all sick
   children; and names anchor-weight selection as a knowledge gap._ [Some sources refer to this work
   as the **2023** consensus, after the meeting date, and to the _Pediatr Nephrol_ record as the 2024
   publication. They are treated here as one work. The meeting-year vs publication-year distinction
   was **not independently verified for this file** — **NEEDS SOURCE** if the year is ever cited
   precisely. No exact volume/issue/page or DOI was available to this file either.]

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
- **Neonates.** The weight-based form is generally preferred here (proportionally large insensible
  losses; small denominator amplifying charting error). No neonate-specific threshold exists, and
  none should be inferred from the CRRT-cohort figures.
- **Input bounds are engineering limits, [NEEDS SOURCE] as clinical values.** The 0.5–150 kg weight
  range and the 0–200 L volume range are validation sanity limits carried from this platform's other
  weight-driven calculators; no cited paper specifies a valid range for any input.
- **1 L ≈ 1 kg is assumed** and no density correction is applied, consistent with every cited source.
- **No published paediatric worked example exists**; every example on this page is constructed from
  the formulae and labelled as such (see §Worked examples for why this is a materially smaller risk
  here than for a threshold-table score).

## Verification

**Arithmetic.** All eight worked examples were re-derived by hand from the two formulae in
§Formula/algorithm during this pass; each is a single subtraction and a single division and each
reproduces exactly (Examples 5 and 8 to within floating-point residue, which the corresponding tests
carry as an explicit tolerance). Example 4 was additionally checked against the two most plausible
wrong denominators (17.4 % and 13.0 %), confirming it discriminates them.

**Sources.** The citations, PMIDs, DOIs, the Sutherland strata and odds ratios, the Selewski odds
ratios, and the four ADQI positions (both formulae printed side by side; "fluid overload" reserved
for the pathologic state; no single threshold defines fluid overload across all sick children;
anchor-weight selection is a knowledge gap) were **supplied by a completed research pass** and are
reproduced here as given.

**They were NOT independently re-fetched during this implementation pass**, and this file therefore
does **not** carry the second-reviewer re-verification that `psofa.md` does. Nothing on this page is
inferred or invented beyond what that research pass supplied — the mechanistic list in §"When the
two forms disagree", the density figure, the input bounds, the ADQI meeting-year/publication-year
question, and the Foland 2004 findings are each explicitly marked above as reasoning or as
**[NEEDS SOURCE]**. An independent re-verification pass against the primary sources remains
**outstanding** and should be run before clinical sign-off.

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
