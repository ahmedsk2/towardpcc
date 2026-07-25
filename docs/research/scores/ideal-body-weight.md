# Ideal body weight (pediatric methods)

> Scope: "Ideal body weight" (IBW) in children is not a single formula but a
> family of methods. There is **no universally accepted pediatric IBW method**;
> the choice materially changes the result, especially in adolescents and at the
> extremes of the height/weight distribution (Kang 2019; Ward 2018; Moylan 2019).
> This file documents each method exactly, states which apply by age, and flags
> the adult-derived ones. IBW is used in children mainly for (a) weight-based drug
> dosing in obesity, (b) classifying nutritional status as % of IBW, and (c)
> setting lung-protective tidal volume in pediatric ARDS (Ward 2018 — directly
> relevant to PICU use).

## Formula / algorithm (exact — every coefficient and branch)

Two structural families exist: **height-only algebraic equations** (no growth
chart needed) and **growth-chart / percentile methods** (require CDC or WHO LMS
tables). All output IBW in **kilograms**.

### A. Height-only algebraic equations

**A1. Traub–Kichen equation (1983) — the primary pediatric height-based formula**

```
IBW(kg) = 2.396 × e^(0.01863 × Ht)          Ht in centimetres
```

- Coefficients: multiplier 2.396; exponent coefficient 0.01863 (natural exp `e`).
- Derived by nonlinear regression from >20,000 U.S. children (ages 1–17 y) in two
  NCHS surveys; IBM (ideal body mass) defined as the **50th-percentile weight for
  a given height**. Sex was found **not** to be important, so the equation is
  **sex-independent** (Traub & Kichen 1983, PMID 6823980).
- Applies: ages 1–17 y. The R `physiology` package encodes exactly this equation
  and warns outside 1–17 y (rdrr.io). In clinical tidal-volume work it is applied
  to children < 60 in (152.4 cm) tall (Ward 2018).

**A2. Simplified Traub (Lexicomp simplification of A1)**

```
IBW(kg) = (Ht² × 1.65) / 1000               Ht in centimetres
```

- A quadratic approximation of A1 used in Lexicomp; same domain (Kang 2019,
  PMC6782117). At Ht = 100 cm it gives 16.5 kg vs 15.44 kg for A1 (~7% higher).
- **Units caveat / discrepancy flag:** Moylan 2019 (PMC6547219) prints this as
  "(height in **inches**)² × 1.65 ÷ 1000". That is almost certainly a
  transcription error — with inches it returns non-physiologic values (e.g.
  ~3.7 kg for a 120-cm child), whereas centimetres reproduces the Traub curve.
  **Use centimetres.**

**A3. Devine equation (1974) — adult formula, older children only**

```
Male:   IBW(kg) = 50.0 + 2.3 × (Ht − 60)     Ht in INCHES
Female: IBW(kg) = 45.5 + 2.3 × (Ht − 60)     Ht in INCHES
```

- Constants: male base 50.0 kg, female base 45.5 kg; 2.3 kg per inch over 60 in
  (5 ft) for both sexes (Devine 1974, per Kang 2019).
- **Only defined for Ht > 60 in (152.4 cm)** → in pediatrics it applies only to
  taller adolescents. Requires **sex**. It is an adult gentamicin-dosing formula,
  **not derived in children**, and over-estimates IBW versus pediatric methods
  (see Worked example 3). Flag: adult-derived.

### B. Growth-chart / percentile methods (need CDC/WHO LMS tables)

For all of these, "50th-percentile weight" etc. are read from the sex-specific
2000 CDC growth charts (weight-for-age and length-for-age, birth–36 mo;
stature-for-age, weight-for-age, and BMI-for-age, 2–20 y). CDC charts are U.S.
government works (public domain).

**B1. McLaren method (1972) — a.k.a. the "height-age / weight-for-height" method**

1. On the height/stature-for-age chart, find the age at which the child's actual
   height sits on the **50th percentile** (this age is the "height-age").
2. Read the **50th-percentile weight** at that height-age on the weight-for-age
   chart → that weight is the IBW.
   Equivalently: IBW = 50th-percentile weight for the child's height. Often used
   as the reference standard in comparison studies (Kang 2019). Original:
   McLaren & Read, Lancet 1972.

**B2. Moore method (1985) — percentile-matching**

1. Determine the child's **height-for-age percentile** at chronological age.
2. IBW = the **weight-for-age at that same percentile** for the chronological age
   (Kang 2019; Moylan 2019). Note this differs from B1: Moore matches the child's
   own percentile rather than forcing the 50th.

**B3. ADA method (2003) — 50th-percentile weight-for-age**

```
IBW = 50th-percentile weight for the child's CHRONOLOGICAL age (sex-specific)
```

Simplest chart lookup; ignores the child's height (American Dietetic Association,
Pediatric Manual of Clinical Dietetics, 2003, per Kang 2019).

**B4. BMI method / "BMI50" (2006)**

```
IBW(kg) = BMI₅₀ × (Ht_m)²
   BMI₅₀ = 50th-percentile BMI-for-age at the child's chronological age (sex-specific)
   Ht_m  = height in metres
```

Requires BMI-for-age charts, which the CDC publishes only from **age 2 y**;
therefore **not valid < 2 y** (Kang 2019; Ward 2018 — succeeded in only 61% of a
PICU cohort because of the < 2 y gap and adolescent chart limits).

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id       | label                     | type   | units / conversion                                                                        | plausible min–max (source)                                                                                                     |
| -------- | ------------------------- | ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `height` | Height / recumbent length | number | cm; **inches → cm ×2.54**. Traub/simplified-Traub/BMI take cm (or m); Devine takes inches | ~45 cm (term newborn length) to ~200 cm (tall adolescent). CDC 2000 charts: length-for-age birth–36 mo, stature-for-age 2–20 y |
| `age`    | Age                       | number | years (or months)                                                                         | 0–20 y (CDC chart range). Method-specific validity: Traub 1–17 y; BMI ≥2 y; Devine only if height >152.4 cm                    |
| `sex`    | Sex                       | enum   | male / female                                                                             | required for Devine and for all sex-specific growth charts; **not** used by Traub (sex-independent)                            |
| `weight` | Actual body weight        | number | kg; **lb → kg ÷2.2046**                                                                   | ~2–150 kg pediatric range (CDC weight-for-age). Not needed to compute IBW; needed for % IBW / obesity classification           |

Unit constants used throughout: 1 in = 2.54 cm; 1 kg = 2.2046 lb.

## Worked examples

**Example 1 — Traub–Kichen exponential (A1), child 100 cm tall.** _(derived from
the formula in Traub & Kichen 1983, PMID 6823980; cross-checked against the R
`physiology` package.)_

```
IBW = 2.396 × e^(0.01863 × 100)
    = 2.396 × e^1.863
    = 2.396 × 6.4424
    = 15.44 kg
```

Cross-check: `physiology::ideal_weight_Traub(height_m = 1.0)` returns **15.44 kg**
(rdrr.io documentation), confirming the coefficients.

**Example 2 — Simplified Traub (A2), same child 100 cm.** _(derived from the
formula in Kang 2019, PMC6782117.)_

```
IBW = (100² × 1.65) / 1000
    = (10000 × 1.65) / 1000
    = 16.50 kg
```

~7% higher than Example 1 for the identical height — illustrates that the
"simplified" version is not numerically identical to the parent equation.

**Example 3 — Devine (A3), 15-year-old boy, 170 cm tall.** _(derived from the
formula in Devine 1974, as reproduced in Kang 2019.)_

```
170 cm ÷ 2.54 = 66.93 in;  inches over 60 = 6.93
IBW = 50.0 + 2.3 × 6.93
    = 50.0 + 15.94
    = 65.9 kg
```

For contrast, Traub A1 at 170 cm gives 2.396 × e^(0.01863×170) = **56.9 kg** — the
adult-derived Devine value is ~9 kg higher, demonstrating why Devine is flagged as
non-pediatric (note Traub itself is also extrapolating past its 1–17 y / <152 cm
comfort zone here).

**Example 4 — McLaren height-age method (B1), procedural.** Growth-chart methods
cannot be worked without the CDC LMS lookup, so the numeric read-off must come
from the public CDC table rather than be asserted here:

1. Boy, chronological age 8 y, height 116 cm.
2. On the boys' stature-for-age chart, find the age whose 50th-percentile stature
   = 116 cm → that "height-age" ≈ [read from CDC LMS table].
3. IBW = 50th-percentile weight at that height-age → [read from CDC LMS table].
   The specific kg value is intentionally left as a table lookup ([derived —
   requires CDC 2000 LMS table]) to avoid fabricating a percentile weight.

## Interpretation bands (non-directive, with source)

**IBW itself has no interpretive bands** — it is an input (to drug dosing,
% IBW nutritional classification, or lung-protective tidal-volume calculations in
pediatric ARDS; Ward 2018). Do not attach severity colours to an IBW value.

The **derived ratio % IBW = (actual weight / IBW) × 100** does carry a classical,
source-backed nutritional classification. McLaren & Read (Lancet 1972) proposed,
using weight/length/age as % of standard:

| % of standard (≈ % IBW) | Category (McLaren & Read 1972)                                                     |
| ----------------------- | ---------------------------------------------------------------------------------- |
| > 110%                  | overweight / obesity                                                               |
| 90–110%                 | within normal range                                                                |
| 85–90%                  | mild protein-calorie malnutrition                                                  |
| 75–85%                  | moderate protein-calorie malnutrition                                              |
| < 75%                   | severe protein-calorie malnutrition (marasmus if no oedema; kwashiorkor if oedema) |

These bands are presented descriptively; thresholds vary between references
(Waterlow and others use slightly different cut points). Report the number and the
attributed band, not a clinical directive.

## References (full, PMID/DOI/URL)

1. **Traub SL, Kichen L.** Estimating ideal body mass in children. _Am J Hosp
   Pharm._ 1983;40(1):107-110. PMID: 6823980.
   https://pubmed.ncbi.nlm.nih.gov/6823980/ — _primary height-based pediatric IBW
   equation; IBM = 50th-percentile weight for height; ages 1–17 y; sex-independent._
2. **Traub SL, Johnson CE.** Comparison of methods of estimating creatinine
   clearance in children. _Am J Hosp Pharm._ 1980;37(2):195-201. — often cited
   alongside the Traub IBW work; note this 1980 paper is primarily on creatinine
   clearance (Moylan 2019 cites it for the Traub IBW formula, but the IBW equation
   itself is the 1983 Traub & Kichen paper). PMID [NEEDS SOURCE — not fetched].
3. **Devine BJ.** Gentamicin therapy. _Drug Intell Clin Pharm._ 1974;8:650-655.
   — adult IBW formula (50.0 / 45.5 + 2.3 kg per inch over 60 in), reproduced for
   older children in Kang 2019.
4. **McLaren DS, Read WWC.** Classification of nutritional status in early
   childhood. _Lancet._ 1972;2(7769):146-148.
   https://www.thelancet.com/journals/lancet/article/PIIS0140673672913244/fulltext
   PMID [NEEDS SOURCE — not confirmed]. (Related slide-rule/weight-for-length
   papers: McLaren & Read, _Lancet_ 1975, PMID 51974; and PMID 6792899.)
5. **Moore BJ, Durie PR, Forstner GG, et al.** The assessment of nutritional status
   in children. _Nutr Res._ 1985;5:97-99. — Moore percentile-matching method (Kang
   2019 lists the volume as "57", an apparent typo for vol 5; [NEEDS SOURCE] for
   exact volume/pages).
6. **American Dietetic Association.** Pediatric Manual of Clinical Dietetics. 2nd
   ed. Chicago, IL: ADA; 2003. — ADA "50th-percentile weight-for-age" method
   (cited in Kang 2019). Exact page [NEEDS SOURCE].
7. **BMI (BMI50) method**, attributed by Kang 2019 to a 2006 source — original
   primary citation [NEEDS SOURCE]; formula IBW = BMI₅₀ × Ht_m² is unambiguous and
   corroborated in Kang 2019 and Ward 2018.
8. **Kang K, Absher R, Farrington E, Ackley R, So T-Y.** Evaluation of Different
   Methods Used to Calculate Ideal Body Weight in the Pediatric Population.
   _J Pediatr Pharmacol Ther._ 2019;24(5):421-430. PMID: 31598106. DOI:
   10.5863/1551-6776-24.5.421. Full text: PMC6782117.
   https://pmc.ncbi.nlm.nih.gov/articles/PMC6782117/ — _source for all seven
   method formulas (McLaren, Moore, Devine, ADA, BMI, Traub, simplified Traub)._
9. **Moylan A, et al.** Assessing the Agreement of 5 Ideal Body Weight Calculations
   for Selecting Medication Dosages for Children With Obesity. 2019. Full text:
   https://pmc.ncbi.nlm.nih.gov/articles/PMC6547219/ — _cross-check of McLaren,
   Moore, BMI50, ADA, Traub; source of the inches-vs-cm discrepancy flag for A2._
   (Journal/DOI as printed by PMC; [NEEDS SOURCE] to confirm exact venue.)
10. **Ward SL, Quinn CM, Steurer MA, Liu KD, Flori HR, Matthay MA.** Variability in
    Pediatric Ideal Body Weight Calculation: Implications for Lung-Protective
    Mechanical Ventilation Strategies in Pediatric Acute Respiratory Distress
    Syndrome. _Pediatr Crit Care Med._ 2018;19(12):e643-e652. PMID: 30277896. DOI:
    10.1097/PCC.0000000000001740. — _PICU relevance: method choice shifts IBW by
    ≥10 kg in some children and changes prescribed tidal volume; BMI method usable
    in only 61%._
11. **CDC / National Center for Health Statistics.** 2000 CDC Growth Charts for the
    United States (LMS data files). https://www.cdc.gov/growthcharts/cdc-data-files.htm
    and https://www.cdc.gov/growth-chart-training/hcp/overview/features-and-data.html
    — _length/weight-for-age birth–36 mo; stature/weight/BMI-for-age 2–20 y; public
    domain; underlies all growth-chart methods._
12. **`physiology` R package — `ideal_weight_Traub`.**
    https://rdrr.io/cran/physiology/man/ideal_weight_Traub.html — _independent
    encoding of the Traub 1983 equation; used to cross-check Worked example 1
    (returns 15.44 kg at 100 cm); validated ages 1–17 y._

## Limitations & notes

- **No consensus method.** Studies agree the methods disagree, most in adolescents
  and at extreme percentiles; differences of ≥10 kg (Ward 2018) and 13.7–16.6%
  median disagreement (Moylan 2019) are reported. Any implementation must let the
  clinician pick/label the method rather than silently choosing one.
- **Applicability by age (as the task requested):**
  - **< 1–2 y (infants/toddlers):** height-only equations are weakest here (Traub
    validated from 1 y; BMI-for-age undefined < 2 y; Devine invalid). Prefer
    growth-chart weight-for-length methods (McLaren/Moore/ADA on birth–36 mo
    charts).
  - **~2–12 y (pre-adolescent, height < ~152 cm):** the **height-age / BMI-
    percentile family (McLaren, Moore, BMI50, ADA) is preferred**; Traub and
    simplified Traub are convenient chart-free approximations in this band.
  - **Older children / adolescents (height > 60 in / 152.4 cm):** Devine becomes
    computable but is adult-derived and over-estimates (Example 3); Traub
    extrapolates beyond its 1–17 y / <152 cm derivation; growth-chart methods run
    up to the 20-y chart limit. Treat all with caution and prefer the child's own
    chart-based value.
- **Sex:** Traub is sex-independent by design; Devine and every growth-chart method
  are sex-specific.
- **Simplified vs full Traub are not equal** (~7% apart) — do not treat them as the
  same formula.
- **Percentile-lookup values were not fabricated.** Growth-chart worked read-offs
  are marked as CDC LMS table lookups rather than asserted, per the no-invention
  rule.

## IP status

Formulas, coefficients, and numeric thresholds are **not copyrightable** (facts /
mathematical relationships) — Traub, simplified Traub, Devine, and the BMI50
equation may be implemented freely. Growth-chart methods rely on the **2000 CDC
growth charts / LMS tables, which are U.S. Government works in the public domain**
and may be reproduced. The McLaren & Read nutritional-status category labels
(protein-calorie malnutrition / marasmus / kwashiorkor and the % cut points) are
descriptive clinical terminology and thresholds, not proprietary scale wording. No
verbatim copyrighted scale text is reproduced here. Note: "Simplified Traub" is
associated with the commercial Lexicomp reference, but the equation itself is not
protectable. No IP encumbrance identified for building any of these calculators.
