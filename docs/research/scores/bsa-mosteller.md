# Body Surface Area — Mosteller Formula

> Scope: This file documents the **Mosteller (1987)** simplified formula for estimating
> **body surface area (BSA)** in m² from height and weight. BSA is a **body-size scalar**, not a
> severity, diagnostic, or risk score: it outputs a single continuous quantity (m²) used downstream
> as a **denominator/normalizer** — e.g., chemotherapy and other weight-independent drug dosing
> (mg/m²), cardiac index (L/min/m²), and indexed hemodynamic/renal parameters. It has **no
> interpretation bands** (see that section). This file covers only the Mosteller estimator; other
> BSA equations (Du Bois, Haycock, Gehan-George, Fujimoto) are noted for context and comparison.

## Formula / algorithm (exact — every coefficient and branch)

The Mosteller formula is a **single closed-form square-root expression** — there are **no branches,
no piecewise brackets, and no age/sex terms**. Every quantity below is a verified constant.

**Primary (metric) form** — height in centimeters, weight in kilograms, BSA in square meters:

```
BSA (m²) = sqrt( height_cm × weight_kg / 3600 )
```

Equivalently, since sqrt(3600) = 60:

```
BSA (m²) = sqrt( height_cm × weight_kg ) / 60
```

**Imperial form (same estimator, US units)** — height in **inches**, weight in **pounds**, BSA still
in square meters. Mosteller's original 1987 letter gave this variant as well; the only change is the
constant **3131** (which folds in the in→cm and lb→kg conversions):

```
BSA (m²) = sqrt( height_in × weight_lb / 3131 )
```

Both constants describe the **same function**; pick one path based on the input units. Consistency
check that 3131 is the correct imperial analogue of 3600 is shown in Worked Example D.

- **Only two coefficients exist:** the divisor **3600** (metric) or **3131** (imperial). There are
  **no exponents other than the ½ implied by the square root**, and no additive/intercept term.
- **Sign/domain:** height and weight are strictly positive, so the radicand is always ≥ 0 and BSA is
  real and non-negative. No clamping or special-casing is required for valid inputs.
- **Monotonic:** BSA is strictly increasing in both height and weight.

(Formula and both constants: Mosteller RD, N Engl J Med 1987;317:1098, PMID 3657876 — metric form
confirmed by Evidencio model 518 and Omnicalculator; imperial constant 3131 confirmed by multiple
independent calculator/textbook reproductions. See References.)

## Inputs (id, label, type, units + conversions, plausible min/max with source)

The estimator takes **exactly two required inputs**: height and weight.

| id          | label  | type   | units | conversions                                                     | plausible min | plausible max |
| ----------- | ------ | ------ | ----- | --------------------------------------------------------------- | ------------- | ------------- |
| `height_cm` | Height | number | cm    | inches → cm: multiply by **2.54** (exact). meters → cm: × 100.  | ~30 cm        | ~220 cm       |
| `weight_kg` | Weight | number | kg    | pounds → kg: divide by **2.20462** (exact). grams → kg: ÷ 1000. | ~0.3 kg       | ~250 kg       |

Notes on bounds — these are **input-sanity (validation) bounds, not clinical limits, and are NOT
from Mosteller 1987**; the formula itself is mathematically unbounded and unit-clamped only by
physiologic plausibility. Flagged **[validation bound — not from primary source]**:

- **Pediatric-critical-care context.** For a PICU tool the plausible physiologic span runs from a
  **micro-premature neonate** (weight down to ~0.3–0.5 kg, crown-heel length ~25–35 cm) to a **large
  adolescent** (height up to ~200–220 cm, weight up to ~150–250 kg for extreme obesity). The bounds
  above are deliberately wide to accept the full PICU range while still rejecting nonsense
  (zero/negative, transposed unit entry).
- **Strictly positive.** `height_cm > 0` and `weight_kg > 0` are inherent to the formula; a zero or
  negative value is invalid input, not a computable BSA.
- **Unit-transposition guard (implementation note).** The most common real-world error is entering
  weight in **pounds into a kg field** or **height in inches into a cm field**. Because BSA scales as
  sqrt(h·w), such an error produces a plausible-looking but wrong number (e.g., a 15 kg toddler
  entered as "15 lb" gives BSA off by sqrt(1/2.2) ≈ 0.67×). Range checks and an explicit unit label
  are the practical defense; the formula cannot self-detect this.

## Worked examples (≥2)

All examples are **derived step-by-step from the formula in Mosteller 1987 (PMID 3657876)**.
Example A is additionally **cross-checked against an independent calculator** (result 1.8181 m² for
170 cm / 70 kg, matching the derivation). Example D reproduces the **Omnicalculator worked example**
(170 cm / 60 kg) as an external check on the implementation. These serve as unit-test vectors.

**Example A — adult/large adolescent, 170 cm, 70 kg (derived; independently cross-checked):**

```
radicand = 170 × 70 / 3600 = 11900 / 3600 = 3.305556
BSA      = sqrt(3.305556)  = 1.8181 m²  ≈ 1.82 m²
```

Expected: **1.82 m²**. (Independent calculator returns 1.8181 m² for the same inputs — agrees.)

**Example B — child, 100 cm, 16 kg (derived; exact rational, clean test vector):**

```
radicand = 100 × 16 / 3600 = 1600 / 3600 = 0.444444  ( = 4/9 exactly )
BSA      = sqrt(4/9)       = 2/3 = 0.6667 m²  ≈ 0.67 m²
```

Expected: **0.67 m²**. (Chosen because 1600/3600 = 4/9 gives an exact closed-form root — a good
floating-point regression anchor.)

**Example C — infant, 60 cm, 5 kg (derived):**

```
radicand = 60 × 5 / 3600 = 300 / 3600 = 0.083333
BSA      = sqrt(0.083333) = 0.28868 m²  ≈ 0.29 m²
```

Expected: **0.29 m²**.

**Example D — cross-check vs published example + imperial-constant validation (170 cm, 60 kg):**

Metric path (reproduces the Omnicalculator worked example):

```
radicand = 170 × 60 / 3600 = 10200 / 3600 = 2.833333
BSA      = sqrt(2.833333)  = 1.6833 m²  ≈ 1.68 m²
```

(Omnicalculator prints 1.67 m² from a truncated intermediate; the precise value is **1.68 m²** — a
rounding-only difference, noted so an implementer does not treat it as a discrepancy.)

Imperial path on the **same person** (170 cm = 66.929 in, 60 kg = 132.277 lb), validating that the
3131 constant is the correct analogue of 3600:

```
radicand = 66.929 × 132.277 / 3131 = 8853.2 / 3131 = 2.8276
BSA      = sqrt(2.8276) = 1.6816 m²  ≈ 1.68 m²
```

Both paths give **≈1.68 m²** — the two constants are internally consistent (small residual is the
in/lb rounding).

## Interpretation bands (non-directive, with source)

**This measure has NO interpretation, severity, or risk bands.** BSA (Mosteller) outputs a single
continuous body-size quantity in m²; there is no published cut-point that stratifies patients into
categories, and none is intended. It is used **as an input to other calculations** (e.g., dosing per
m², cardiac index per m²), not as a standalone classifier. There is therefore nothing to display as a
colored band or risk tier.

For reference only (context, **not** a band): typical BSA values scale with age/size — roughly ~0.2–0.3
m² in a small infant, ~0.7–0.8 m² in a young child, and ~1.5–2.0 m² in an adult-sized adolescent
(illustrative magnitudes consistent with Worked Examples A–C; not a normative reference range and
not from Mosteller 1987). Present the computed BSA as a **derived body-size estimate**, and defer any
dosing/indexing interpretation to the specific downstream calculation that consumes it.

## References (full, PMID/DOI/URL)

1. **Mosteller RD.** Simplified calculation of body-surface area. _N Engl J Med._ 1987 Oct
   22;317(17):1098. **PMID: 3657876. DOI: 10.1056/NEJM198710223171717.** URL:
   https://pubmed.ncbi.nlm.nih.gov/3657876/ — _Primary source: the original one-page letter
   proposing BSA = sqrt(height·weight/3600) (metric) and the sqrt(height·weight/3131) imperial
   variant. Citation fields (author, journal, 1987, vol 317, issue 17, page 1098, PMID, DOI)
   confirmed by direct PubMed fetch. The NEJM full text is paywalled (HTTP 403); the formula
   itself is corroborated by the secondary sources below._
2. **Du Bois D, Du Bois EF.** A formula to estimate the approximate surface area if height and weight
   be known. _Arch Intern Med._ 1916;17(6):863–871. (Reprinted: _Nutrition._ 1989;5(5):303–311,
   **PMID: 2520314.**) URL: https://pubmed.ncbi.nlm.nih.gov/2520314/ — _The comparator/gold-standard
   formula Mosteller was designed to approximate: BSA(m²) = 0.007184 × weight_kg^0.425 ×
   height_cm^0.725. Cited here for the Limitations/validation discussion, not as the implemented
   equation._
3. **Yu C-Y et al. (review).** Estimating body surface area from mass and height: theory and the
   formula of Du Bois and Du Bois. _Ann Hum Biol._ 2008;35(2). **PMID: 18428011.** URL:
   https://pubmed.ncbi.nlm.nih.gov/18428011/ — _Secondary review of BSA estimators and the Du Bois
   basis. [Author attribution not independently re-verified beyond the search-returned record —
   title/journal/PMID confirmed.]_
4. **Evidencio — Body surface area (Mosteller formula), model 518.** URL:
   https://www.evidencio.com/models/show/518 — _Secondary confirmation of the metric formula
   BSA(m²) = sqrt(height_cm × weight_kg / 3600) and of the Mosteller 1987 citation. Carries an
   explicit "educational/training, not for medical decision-making" disclaimer._
5. **Omnicalculator — BSA Calculator (Body Surface Area).** URL:
   https://www.omnicalculator.com/health/bsa — _Secondary confirmation of the metric formula and the
   worked example (170 cm, 60 kg → ≈1.67–1.68 m²) reproduced in Worked Example D; also lists the
   Du Bois, Haycock, Gehan-George, and Fujimoto alternatives with their coefficients._
6. **Imperial-constant (3131) corroboration — multiple independent reproductions** (Pearson/Vaia
   algebra-textbook problem sets, Topendsports BSA calculator) via web search, e.g.:
   https://www.topendsports.com/testing/tests/bsa.htm — _Consistent reproduction of the US-unit
   Mosteller form B = sqrt(h_in × w_lb / 3131) → m². Secondary; primary attribution remains
   Ref 1._

_Further reading (title/URL only — article body NOT fetched, so no specific claim is drawn from it,
flagged accordingly):_ "It Is Time to Abandon the Use of Body Surface Area Derived From a
100-Year-Old Formula," _Am J Med_ 2022, https://www.amjmed.com/article/S0002-9343(22)00336-9/fulltext
— **[title only, not fetched]** a critique of BSA-based dosing/indexing generally.

## Limitations & notes

- **Not a clinical device; estimate only.** BSA (Mosteller) is a **statistical approximation** of
  true skin surface area derived to reproduce the Du Bois estimate with a simpler expression. It was
  validated by Mosteller only against the **Du Bois** formula (itself fit to 9 subjects in 1916), not
  against direct surface-area measurement. Treat the output as an estimate feeding a downstream
  calculation, not as ground truth.
- **Population/derivation caveat.** The Du Bois basis it approximates was derived from a **very small
  adult cohort (n = 9)**. Agreement with other estimators (Haycock, Gehan-George — both fit with
  pediatric data) is generally close but **not identical**, and differences widen at the extremes
  (neonates, severe obesity). For neonatal/infant work some centers prefer Haycock or Gehan-George,
  which included children; a platform indexing critical values by BSA should record **which formula**
  it uses so results are comparable across calculations. **[NEEDS SOURCE]** for a specific
  head-to-head pediatric accuracy figure if the platform intends to assert one numerically.
- **Rounding/precision.** Published calculators may round the intermediate radicand or the final
  value differently (Worked Example D: 1.67 vs 1.68 m²). Compute in full floating point and round
  **once** at display; do not chain rounded intermediates. For dosing use cases some protocols cap
  BSA (commonly at 2.0–2.2 m²) — that cap is a **protocol overlay, not part of Mosteller**, and is
  **[NEEDS SOURCE]** for any specific numeric cap.
- **Unit discipline is the main failure mode.** Because BSA scales as sqrt(h·w), a transposed unit
  (lb↔kg, in↔cm) yields a wrong-but-plausible number the formula cannot self-detect. Enforce unit
  labels and range checks (see Inputs).
- **Two constants, one estimator.** 3600 (cm·kg) and 3131 (in·lb) are the same function in different
  units — do not mix a metric input with the imperial constant or vice versa.

## IP status

- **Formula/threshold-based — not copyrightable.** The Mosteller estimator is a single mathematical
  expression (a square root of a product over a constant). Mathematical formulas, the constants
  (3600, 3131), and the ½-power are **facts/algorithms**, not protected by copyright, and may be
  implemented freely. There are no ordinal response items, categories, or scale text to license.
- **No verbatim proprietary scale wording.** Unlike ordinal clinical scales, BSA has **no free-text
  descriptors** — inputs are two numbers, output is one number. No copyrightable verbatim wording was
  carried into this document; all prose here is original paraphrase.
- **Attribution (academic norm, not a legal restriction):** cite Mosteller 1987 (NEJM 317:1098) as
  the origin of the simplified formula, and Du Bois & Du Bois 1916 as the estimator it approximates.
  "Mosteller formula" is an eponym, not a trademark.
