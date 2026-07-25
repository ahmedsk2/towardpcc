# APLS/PALS age-based weight estimation (pediatric)

Age-based estimation of a child's body weight (kg) when a measured weight is
unavailable, used to seed weight-based drug and fluid dosing in resuscitation.
"APLS" = Advanced Paediatric Life Support. The current APLS manual replaced the
single legacy formula with **three age-banded formulas**. This document covers
the updated APLS formulas (primary), the legacy/original APLS formula (for
context), and the Broselow length tape as a non-age-based alternative.

> Not a clinical device. An estimated weight is a fallback; a directly measured
> weight is always preferred when obtainable.

## Formula / algorithm (exact — every coefficient and branch)

The output is a single point estimate of weight in kilograms. The algorithm
branches on age. Select the formula for the child's age band:

**Updated APLS formulas** (Advanced Paediatric Life Support, 5th ed., 2011):

| Age band                                     | Formula (weight in kg)               |
| -------------------------------------------- | ------------------------------------ |
| Infant, under 1 year (0–11 completed months) | `weight = (0.5 × age_in_months) + 4` |
| Child, 1–5 years                             | `weight = (2 × age_in_years) + 8`    |
| Child, 6–12 years                            | `weight = (3 × age_in_years) + 7`    |

Branch logic (exact):

```
if age < 12 months:      weight_kg = 0.5 * age_months + 4
elif 1 <= age_years <= 5: weight_kg = 2 * age_years + 8
elif 6 <= age_years <= 12: weight_kg = 3 * age_years + 7
else: out of validated range (no APLS age-based formula defined)
```

Notes on the branch boundaries:

- The infant band is expressed in **months**; the two child bands in **whole
  years**. Age in years is conventionally taken as the child's age at last
  birthday (floor of exact age) for these formulas.
- The 6–12y formula `(3 × age) + 7` is the **Luscombe & Owens (2007)** formula,
  originally derived and validated for ages 1–10 years and adopted by APLS for
  the 6–12y band. (Luscombe & Owens 2007, _Arch Dis Child_; PMID 17213259.)

**Original / legacy APLS formula** (for reference — superseded):

```
weight_kg = (age_in_years + 4) × 2       # equivalently 2 × age + 8
```

Stated age range 1–10 years. Luscombe & Owens (2007) found this legacy formula
**underestimated** measured weights by a mean of **18.8%** (95% CI 18.42–19.18%)
in 17,244 UK children, which is why it was replaced. (PMID 17213259.)

Note that the updated **1–5y** formula `(2 × age) + 8` is algebraically
identical to the legacy formula `(age + 4) × 2`; the update kept the legacy
form for young children (where it performs acceptably) and only steepened the
slope for older children via the 6–12y band.

**Broselow tape (alternative — length-based, not age-based):** a color-coded
tape read against the child's supine length that maps length directly to an
estimated weight zone (and pre-computed drug doses/equipment sizes). It is not
a formula; it uses length as the predictor and is validated for roughly 46–145
cm / ~3–34 kg. (Lubitz et al. 1988, _Ann Emerg Med_; PMID 3377285.)

## Inputs (id, label, type, units + conversions, plausible min/max with source)

The calculator needs the child's age and, for infants, age expressed in months.
A single age input with a unit toggle, or two conditional inputs, both work.

| id           | label        | type             | units  | conversions        | plausible min/max                                                                          |
| ------------ | ------------ | ---------------- | ------ | ------------------ | ------------------------------------------------------------------------------------------ |
| `age_months` | Age (months) | number (integer) | months | 1 year = 12 months | 0–11 months (infant band). Term neonate ≈ 0 mo; formula floor 4 kg.                        |
| `age_years`  | Age (years)  | number (integer) | years  | 12 months = 1 year | 1–12 years (child bands). APLS age-based formulas are undefined/unvalidated outside 0–12y. |

Plausible weight-output range (for sanity bounds, derived from the formulas at
their band edges):

- Infant band: 0 mo → 4.0 kg; 11 mo → 9.5 kg.
- 1–5y band: 1 y → 10 kg; 5 y → 18 kg.
- 6–12y band: 6 y → 25 kg; 12 y → 43 kg.

Anchor for the neonatal end: an average term newborn weighs ~3.3–3.5 kg
(the infant formula returns 4 kg at 0 months, approximating the population mean
for early infancy). Source for the formulas and ranges: APLS 5th ed. (2011) and
Luscombe & Owens 2007 (PMID 17213259); DFTB weight-estimation reference.

Input validation guidance: reject negative ages; if `age_years > 12` or an
infant `age_months >= 12` is entered without a year value, flag as outside the
APLS-validated range rather than extrapolating.

## Worked examples (>=2, each cited)

All examples are **derived from the formulas** published in APLS 5th ed. (2011)
and Luscombe & Owens 2007 (PMID 17213259); the primary sources present the
formulas, not per-age worked answers.

**Example 1 — infant, 6 months** (derived from formula in APLS 5th ed. 2011):

```
weight = (0.5 × 6) + 4 = 3 + 4 = 7.0 kg
```

**Example 2 — child, 3 years** (derived from formula in APLS 5th ed. 2011):

```
weight = (2 × 3) + 8 = 6 + 8 = 14.0 kg
```

**Example 3 — child, 8 years** (6–12y band = Luscombe & Owens formula; derived
from formula in Luscombe & Owens 2007, PMID 17213259):

```
weight = (3 × 8) + 7 = 24 + 7 = 31.0 kg
```

**Example 4 — legacy vs updated at 10 years** (illustrates the 2007 correction;
derived from formulas in Luscombe & Owens 2007, PMID 17213259):

```
legacy APLS:   (10 + 4) × 2 = 28.0 kg
updated 6–12y: (3 × 10) + 7 = 37.0 kg   (+9 kg; legacy underestimates by ~24%)
```

This ~24% gap at age 10 is consistent with the paper's headline finding that the
legacy formula underestimated weight by a mean of 18.8% across ages 1–10.

## Interpretation bands (non-directive, with source)

**There are no clinical interpretation/risk bands for this tool.** The output is
a single estimated body weight in kilograms, used as an input to weight-based
dosing — it is not a severity score and carries no directive thresholds.

The only "bands" are the **age bands that select which formula to apply**
(infant <1y; 1–5y; 6–12y), documented under Formula above (APLS 5th ed. 2011).
Any downstream dose is governed by the specific drug/fluid protocol, not by this
estimate.

## References (full, PMID/DOI/URL)

1. **Luscombe M, Owens B.** Weight estimation in resuscitation: is the current
   formula still valid? _Archives of Disease in Childhood._ 2007;92(5):412–415.
   PMID: 17213259. DOI: 10.1136/adc.2006.107284.
   URL: https://pubmed.ncbi.nlm.nih.gov/17213259/
   — Origin of `weight = (3 × age) + 7` (ages 1–10y); shows legacy `(age+4)×2`
   underestimated by 18.8% (n=17,244).

2. **Advanced Life Support Group.** Advanced Paediatric Life Support: The
   Practical Approach. 5th edition. Wiley-Blackwell; 2011. (Manual that
   introduced the three age-banded formulas: infant `(0.5×months)+4`, 1–5y
   `(2×age)+8`, 6–12y `(3×age)+7`.) ISBN 978-1-4443-3059-5.

3. **Kelly A-M, Nguyen K, Krieser D.** Validation of the Luscombe weight formula
   for estimating children's weight. _Emergency Medicine Australasia._
   2011;23(1):59–62. PMID: 21134132. DOI: 10.1111/j.1742-6723.2010.01351.x.
   URL: https://pubmed.ncbi.nlm.nih.gov/21134132/
   — Independent validation of `(3×age)+7` for ages 1–10y.

4. **[Trinidadian population validation]** Is the APLS formula used to calculate
   weight-for-age applicable to a Trinidadian population? _BMC Emergency
   Medicine._ 2012;12:9. DOI: 10.1186/1471-227X-12-9.
   URL: https://bmcemergmed.biomedcentral.com/articles/10.1186/1471-227X-12-9
   — Describes the original vs updated three-formula APLS set; independent check.

5. **Tinning K, Acworth J.** Make your Best Guess: an updated method for
   paediatric weight estimation in emergencies. _Emergency Medicine
   Australasia._ 2007;19(6):528–534. DOI: 10.1111/j.1742-6723.2007.01026.x.
   — "Best Guess" formulas (alternative age-based method): infant
   `(months+9)/2`; 1–5y `2×(age+5)`; 5–14y `4×age`. n=70,181.

6. **Lubitz DS, Seidel JS, Chameides L, et al.** A rapid method for estimating
   weight and resuscitation drug dosages from length in the pediatric age group.
   _Annals of Emergency Medicine._ 1988;17(6):576–581. PMID: 3377285.
   URL: https://pubmed.ncbi.nlm.nih.gov/3377285/
   — Original Broselow length-based tape (alternative to age-based formulas).

## Limitations & notes

- **Population-derived point estimate.** These formulas are regression fits to
  large populations; individual error is substantial. Age-based formulas
  systematically **underestimate in overweight/obese** children and can misestimate
  in undernourished or unusually large/small children. A measured weight is
  always preferred; use the estimate only when weighing is impossible.
- **Validated ranges.** Infant formula: <1 year. Child formulas: 1–12 years
  (the 6–12y formula derives from data spanning 1–10y). Do not extrapolate to
  neonates outside typical term ranges, adolescents >12y, or adults.
- **Age unit trap.** The infant formula uses **months**; the child formulas use
  **years**. Mixing units is a common, dangerous error (e.g. entering 24 months
  into a "years" formula). The calculator should enforce the correct unit per
  band.
- **1–5y band is unchanged from the legacy formula** (`(2×age)+8` ≡
  `(age+4)×2`); only the 6–12y band steepened. Some regional/ERC materials and
  earlier editions phrase the bands slightly differently — cite the edition in
  use.
- **Local validation varies.** Several validation studies (e.g. Trinidad,
  multiethnic UK/Australia) report the APLS formulas can under- or over-estimate
  by clinically meaningful margins in specific populations; some conclude the
  Broselow tape or Best Guess formulas perform better in certain age groups.
- **Broselow tape** requires the physical tape and the child lying supine to
  measure length; it is length-based (not age-based) and loses accuracy above
  ~25 kg / older children, so it is not a drop-in for the age formulas in a
  pure-calculator context.
- **Edition note.** The three-formula set is attributed here to APLS 5th ed.
  (2011); confirm against the specific manual edition your protocol follows, as
  APLS is periodically revised.

## IP status

- **Formulas and thresholds are not copyrightable.** The equations
  `(0.5 × months) + 4`, `(2 × age) + 8`, `(3 × age) + 7`, and the legacy
  `(age + 4) × 2` are mathematical facts/algorithms and free to implement.
- **Age-band selection** (infant / 1–5y / 6–12y) is likewise an uncopyrightable
  method.
- **No verbatim scale wording** is required to implement this tool — it produces
  a number, not a graded descriptive scale. Do **not** reproduce verbatim
  instructional prose, tables, or figures from the copyrighted APLS manual;
  re-express any explanatory text in original wording.
- The **Broselow tape** is a commercial product with trademark ("Broselow™") and
  its specific color-zone mappings/printed layout are proprietary; cite it as an
  alternative but do not reproduce its proprietary zone tables. The underlying
  length-to-weight relationship from Lubitz 1988 is not itself copyrightable, but
  the packaged tape design is a product, not a formula to reimplement here.
- No patent or licensing encumbrance applies to using the APLS age-based
  equations in a calculator.
