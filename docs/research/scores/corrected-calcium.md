# Corrected calcium for albumin (albumin-adjusted calcium)

> Scope: This file documents the **albumin-adjusted (a.k.a. "corrected") total calcium**
> calculation attributed to **Payne et al. 1973 (BMJ)**. It is a _unit transformation_ of a
> laboratory value, not a diagnostic score, and it has **no intrinsic interpretation bands** — the
> adjusted number is read against the same total-calcium reference range as unadjusted calcium.
> A critical caveat runs through the whole document: **the formula is unreliable in critical
> illness**, and direct **ionized calcium** is the reference method when calcium status is in
> question. There is also a well-documented **coefficient discrepancy**: Payne's literal
> published formula uses an effective slope of **1.0 mg/dL per g/dL** (0.025 mmol/L per g/L),
> whereas the coefficient in near-universal clinical use is **0.8 mg/dL per g/dL** (0.02 mmol/L per
> g/L). Both are documented below.

## Formula / algorithm (exact — every coefficient and branch)

There are two closely related expressions in circulation. The one to **implement** is the
modern de-facto standard (0.8 / 0.02). The literal 1973 original (slope 1.0) is documented for
provenance because sources disagree on the coefficient.

### A. De-facto clinical standard (implement this) — conventional units

```
correctedCa (mg/dL) = measuredCa (mg/dL) + 0.8 x (4.0 - albumin (g/dL))
```

### B. De-facto clinical standard — SI units

```
correctedCa (mmol/L) = measuredCa (mmol/L) + 0.02 x (40 - albumin (g/L))
```

- **Coefficient:** 0.8 mg/dL of calcium added per 1 g/dL that albumin falls below reference
  (equivalently 0.02 mmol/L per 1 g/L). The two coefficients are unit-consistent:
  `0.8 mg/dL x 0.2495 (mg/dL->mmol/L) = 0.1996 mmol/L per g/dL = 0.02 mmol/L per g/L`.
- **Reference albumin:** 4.0 g/dL (= 40 g/L). This is the "normal" albumin at which no
  correction is applied. Some laboratories substitute their **own local mean normal albumin**
  rather than a fixed 4.0 (Roberts/Jassam narrative reviews) — expose this as a configurable
  constant if local calibration is desired.
- **Direction / branches:** No conditional branches. It is a single linear adjustment.
  - albumin **< 4.0 g/dL (hypoalbuminemia)** -> the term `(4.0 - albumin)` is positive ->
    correctedCa **> measuredCa** (the usual case: raises an artefactually low total calcium).
  - albumin **= 4.0 g/dL** -> correction term = 0 -> correctedCa = measuredCa.
  - albumin **> 4.0 g/dL** -> term negative -> correctedCa **< measuredCa**.
  - No flooring/capping is defined by the source. The formula is monotonic and unbounded.
- **Purpose:** total serum calcium is ~40-45% protein-bound (mostly to albumin). When albumin
  is low, _total_ calcium falls even if the physiologically active _ionized_ calcium is normal
  (pseudohypocalcemia). The adjustment estimates what the total calcium "would be" at a normal
  albumin so it can be read against the ordinary total-calcium reference range.

### C. Payne's literal 1973 original (documented for provenance — NOT the coefficient in common use)

The primary paper (Payne et al. 1973, BMJ; full text PMC1587636) prints the simple formula as:

```
Adjusted calcium = calcium - albumin + 4.0     (calcium in mg/100 mL, albumin in g/100 mL)
```

This is algebraically `measuredCa + 1.0 x (4.0 - albumin)` — i.e. an **effective slope of
1.0 mg/dL per g/dL**, not 0.8. Payne derived it from the regression of calcium on albumin in
200 specimens (r = 0.867 for calcium vs albumin; r = 0.682 vs total protein) and rounded the
regression slope to 1.0 for a "simple formula." In SI this literal original is
`correctedCa (mmol/L) = measuredCa + 0.025 x (40 - albumin (g/L))`. Per the UK standardisation
narrative review (Roberts, JLPM), the promoted SI equation used **0.025**, which "was
subsequently rounded down to 0.02" — and it is that rounded 0.02 (= 0.8 mg/dL) version that
became the extensively used clinical default (expressions A/B above).

> Bottom line: **implement A/B (0.8 / 0.02)** because that is what clinical calculators, the
> task specification, and modern references use; but be aware Payne's _printed_ 1973 formula has
> slope 1.0 (0.025), and the "0.8" is a later rounded convention. For the same inputs the two
> differ by up to ~0.4 mg/dL at albumin 2.0 g/dL (see Worked example 4).

### Unit conversions used above

- Calcium: `mg/dL x 0.2495 = mmol/L`; `mmol/L x 4.008 = mg/dL` (Ca molar mass 40.08 g/mol).
- Albumin: `g/dL x 10 = g/L`.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                 | label                      | type              | units | conversions                                    | plausible min | plausible max | source for range                                                                                                                                    |
| ------------------ | -------------------------- | ----------------- | ----- | ---------------------------------------------- | ------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `measuredCalcium`  | Measured total calcium     | number            | mg/dL | SI: `mmol/L = mg/dL x 0.2495` (÷4.008 inverse) | ~4.0 mg/dL    | ~20.0 mg/dL   | validation sanity bounds spanning severe hypo-/hypercalcemia; pediatric _normal_ interval 8.5–11.4 mg/dL age-dependent (Roizen 2013, PMID 24217904) |
| `albumin`          | Serum albumin              | number            | g/dL  | SI: `g/L = g/dL x 10`                          | ~1.0 g/dL     | ~6.0 g/dL     | validation sanity bounds; normal ~3.5–5.0 g/dL after infancy [NEEDS SOURCE for a fetched pediatric albumin reference interval]                      |
| `referenceAlbumin` | Reference (normal) albumin | number (constant) | g/dL  | SI: 40 g/L                                     | 3.5 g/dL      | 4.5 g/dL      | default **4.0 g/dL** (Payne 1973, PMC1587636); may be set to local lab mean normal albumin (Roberts/Jassam JLPM reviews)                            |

Notes:

- `measuredCalcium` MUST be **total** serum calcium, not ionized. Feeding ionized calcium into
  this formula is meaningless.
- If the platform stores calcium in mmol/L and albumin in g/L, use expression **B** directly (do
  not double-convert).
- Plausible min/max above are **input-validation sanity limits**, not physiologic normals. The
  age-specific _normal_ pediatric total-calcium reference intervals are in Interpretation bands.

## Worked examples (>=2, each cited)

All examples are **derived from the formula in Payne et al. 1973 (BMJ; PMC1587636)** using the
de-facto standard coefficient (0.8 / 0.02), except Example 4 which contrasts the two coefficients.

**Example 1 — hypoalbuminemic pseudohypocalcemia, conventional units (derived from formula in Payne 1973):**
Measured total Ca = 7.6 mg/dL, albumin = 2.0 g/dL.

```
correctedCa = 7.6 + 0.8 x (4.0 - 2.0)
            = 7.6 + 0.8 x 2.0
            = 7.6 + 1.6
            = 9.2 mg/dL
```

A "low" total calcium of 7.6 mg/dL corrects to 9.2 mg/dL — within the normal total-calcium range,
illustrating that the low total was largely a low-albumin artefact.

**Example 2 — SI units (derived from formula in Payne 1973):**
Measured total Ca = 1.90 mmol/L, albumin = 25 g/L.

```
correctedCa = 1.90 + 0.02 x (40 - 25)
            = 1.90 + 0.02 x 15
            = 1.90 + 0.30
            = 2.20 mmol/L
```

Corrected calcium 2.20 mmol/L sits at the lower bound of a typical adult reference range
(~2.20–2.60 mmol/L; Roberts JLPM harmonised range).

**Example 3 — normal albumin, no correction (derived from formula in Payne 1973):**
Measured total Ca = 9.6 mg/dL, albumin = 4.0 g/dL.

```
correctedCa = 9.6 + 0.8 x (4.0 - 4.0)
            = 9.6 + 0
            = 9.6 mg/dL
```

At the reference albumin the adjustment is exactly zero — a useful unit-test invariant.

**Example 4 — coefficient discrepancy, same inputs as Example 1 (derived from formulas in Payne 1973 / Roberts JLPM review):**
Measured total Ca = 7.6 mg/dL, albumin = 2.0 g/dL.

```
Modern de-facto (0.8):   7.6 + 0.8 x (4.0 - 2.0) = 9.2 mg/dL
Payne literal 1973 (1.0): 7.6 - 2.0 + 4.0        = 9.6 mg/dL
```

The two published forms differ by 0.4 mg/dL for this patient. This is the practical footprint of
the 0.025->0.02 (1.0->0.8) rounding and is the single most likely source of "why doesn't this
match the other calculator?" confusion.

## Interpretation bands (non-directive, with source)

**The correction itself has NO interpretation bands.** It produces a calcium value in the same
units as the input; that value is interpreted against the ordinary **total serum calcium
reference range**, which is **age-specific in pediatrics**. Display the corrected value with an
explicit reference interval and let the clinician interpret — do not attach an automated
normal/abnormal verdict, and do not treat "corrected" as equivalent to a measured value in the
critically ill (see Limitations).

Age-specific pediatric **total** calcium reference intervals (vitamin D-replete children,
colorimetric assay; Roizen et al. 2013, PMID 24217904) — provided as the _reference range against
which the corrected value is read_, non-directive:

| Age group    | mg/dL    | mmol/L  |
| ------------ | -------- | ------- |
| 0–90 days    | 7.8–11.3 | 1.9–2.8 |
| 91–180 days  | 8.8–11.2 | 2.2–2.8 |
| 181–365 days | 8.8–11.4 | 2.2–2.9 |
| 1–3 years    | 8.8–11.1 | 2.2–2.8 |
| 4–11 years   | 8.8–10.7 | 2.2–2.7 |
| 12–19 years  | 8.5–10.6 | 2.1–2.7 |

For reference, **ionized calcium** normal ranges (the physiologically active fraction and the
preferred measurement in critical illness) are approximately 1.10–1.36 mmol/L in neonates at
24 h and ~1.16–1.32 mmol/L after infancy (search-level pediatric references;
[NEEDS SOURCE for a single fetched primary pediatric iCa interval] — the neonatal 24 h figure
traces to Loughead/JAMA Pediatr work, PMID 3358391, not independently fetched here).

## References (full, PMID/DOI/URL)

1. **Payne RB, Little AJ, Williams RB, Milner JR.** Interpretation of serum calcium in patients
   with abnormal serum proteins. _Br Med J._ 1973 Dec 15;4(5893):643–646.
   **PMID: 4758544. DOI: 10.1136/bmj.4.5893.643. PMCID: PMC1587636.**
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC1587636 — _Primary derivation. Prints
   "Adjusted calcium = calcium − albumin + 4.0" (mg/100 mL, g/100 mL); r = 0.867 (Ca vs albumin),
   n = 200. Fetched full text._
2. **Roberts NB, Thomas A (attribution per journal listing).** Standardisation of adjusted
   calcium equation: the UK approach — a narrative review. _Journal of Laboratory and Precision
   Medicine_ (JLPM), ~2023. URL: https://jlpm.amegroups.org/article/view/7456/html — _States the
   promoted SI equation used slope 0.025 which "was subsequently rounded down to 0.02"; harmonised
   mean calcium 2.4 mmol/L, range 2.20–2.60; reference albumin 40 g/L; slope is population-/assay-
   specific. Fetched full text._ (Exact author list/year not independently confirmed — [NEEDS
   SOURCE] for complete bibliographic detail.)
3. **Jassam N, O'Kane M (attribution per journal listing).** Harmonisation of adjusted calcium
   equation, is it a realistic aim: a narrative review. _JLPM_, ~2023.
   URL: https://jlpm.amegroups.org/article/view/7516/html — _Companion narrative review; states
   different equations yield different adjusted values. Fetched full text (note: numeric slope in
   the fetched text extracted as "0.2", which is inconsistent with all other sources and treated
   here as an extraction artefact; not relied upon)._ [NEEDS SOURCE for complete bibliographic
   detail.]
4. **Steele T, Kolamunnage-Dona R, Downey C, Toh CH, Welters I.** Albumin-adjusted calcium
   concentration should not be used to identify hypocalcaemia in critical illness. _Critical Care._
   2013;17(Suppl 2):P446. **DOI: 10.1186/cc12384. PMCID: PMC3642897.**
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3642897 — _1,038 ICU patients (iCa in 976).
   adjCa <2.2 mmol/L: sensitivity 78%, specificity 63%, AUC 0.78 for iCa <1.1 mmol/L; concludes
   "adjCa should not be used to determine calcium status in critical illness." Fetched full text._
5. **This Changed My Practice (UBC CPD).** Correcting the Myth of Calcium Correction.
   URL: https://thischangedmypractice.com/myth-of-calcium-correction/ — _Secondary/educational.
   Formula derived in 200 patients (20% with hyperproteinemia), no ionized-calcium validation;
   binding constant changes in hypoalbuminemia so the formula overestimates iCa at low albumin;
   recommends measuring ionized calcium. Fetched full text._
6. **Roizen JD, Shah V, Levine MA, Carlow DC.** Determination of Reference Intervals for Serum
   Total Calcium in the Vitamin D-Replete Pediatric Population. _J Clin Endocrinol Metab._
   2013;98(12):E1946–E1950. **PMID: 24217904. DOI: 10.1210/jc.2013-3105. PMCID: PMC3849669.**
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3849669 — _Age-specific pediatric total-calcium
   reference intervals (n = 4,629; critical-care/renal/endocrine inpatients excluded). Fetched
   full text._
7. **Medscape / eMedicine.** Calcium Correction for Hypoalbuminemia (calculator, ref 267) and
   Pediatric Hypocalcemia. URL: https://reference.medscape.com/calculator/267/calcium-correction-for-hypoalbuminemia
   — _Secondary; confirms the 0.8 mg/dL-per-1 g/dL convention in a pediatric context. Calculator
   page returned HTTP 402 on fetch; content corroborated via search summary only —
   supporting/secondary, not primary._
8. **Unit conversion reference (UNITSLAB / standard laboratory tables).**
   URL: https://unitslab.com/node/43 — _Calcium mg/dL x 0.2495 = mmol/L (molar mass 40.08).
   Search-confirmed standard conversion._

## Limitations & notes

- **Unreliable in critical illness — the headline caveat.** In ICU patients the albumin-adjusted
  calcium does not track ionized calcium well: adjCa <2.2 mmol/L had only 78% sensitivity / 63%
  specificity (AUC 0.78) for detecting ionized hypocalcemia, and the authors concluded it "should
  not be used to determine calcium status in critical illness" (Steele 2013, PMC3642897).
  **Direct ionized calcium measurement is the reference standard** when calcium status matters in
  the critically ill, in acid-base disturbance, after citrate-containing blood products / massive
  transfusion, or with rapid albumin shifts. Some secondary sources report even worse performance
  in trauma (reported ~5% sensitivity / high false-negative rate) — [NEEDS SOURCE for a fetched
  primary] and not relied upon here beyond noting the direction.
- **Physiology the formula ignores.** The albumin–calcium binding constant is **not** fixed: in
  hypoalbuminemia more calcium binds per gram of albumin, so a fixed linear coefficient
  systematically **overestimates** ionized calcium at low albumin (false-negative hypocalcemia)
  and can overcorrect at high albumin (This Changed My Practice, UBC). pH (alkalosis increases
  binding), phosphate, and free fatty acids further perturb the relationship.
- **Assay- and population-specific slope.** The 0.8 (0.02) coefficient is not universal — it
  depends on the calcium and albumin assays (bromocresol green vs bromocresol purple albumin
  methods differ) and the population. Locally derived slopes of ~0.84 and others have been
  reported; UK standardisation work recommends locally validated equations or a harmonised
  approach (Roberts/Jassam JLPM reviews). Treat 0.8 as a convention, not a physical constant.
- **Coefficient provenance mismatch.** Payne's _printed_ 1973 formula is slope **1.0** mg/dL/g/dL
  (0.025 mmol/L/g/L); the near-universal clinical default is **0.8** (0.02), a rounded value. Do
  not describe the 0.8 formula as "exactly Payne 1973" without this caveat (see Formula §C and
  Worked example 4).
- **Derivation population was adults, not children.** Payne's cohort was 200 adult liver-function
  specimens (≈20% with hyperproteinemia/myeloma) with **no ionized-calcium validation**. There is
  **no pediatric-specific derivation** of the coefficient; applying it to neonates/children — who
  have age-varying calcium, albumin, and protein binding — is an extrapolation. This is a
  pediatric-first flag: prefer ionized calcium in neonates and unstable children.
- **Not a diagnostic score / no bands.** The output is a transformed lab value, interpreted
  against the total-calcium reference range; it carries no built-in risk stratification.
- **Reference-albumin choice matters.** Using 4.0 g/dL vs a local mean normal albumin shifts every
  result; keep it configurable and label which constant was used.

## IP status

- **Formula and thresholds are not copyrightable.** The correction is a linear arithmetic
  transformation of two lab values with a numeric coefficient (0.8 / 0.02) and a reference
  constant (4.0 g/dL / 40 g/L) — facts and mathematics, freely implementable.
- **No verbatim scale wording.** Unlike ordinal clinical scales, this calculation has **no
  proprietary item descriptors or response text** to license; there is nothing copyrightable to
  reproduce. The single quoted primary formula ("Adjusted calcium = calcium − albumin + 4.0") is a
  short mathematical statement of fact, not protectable expression.
- **Attribution (academic norm, not a legal restriction):** cite Payne et al. 1973 (BMJ) as the
  source of the adjusted-calcium equation.
- **IP status: clean.** No verbatim copyrighted scale text carried into this document.
