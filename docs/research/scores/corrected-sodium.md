# Corrected sodium for hyperglycemia (Katz 1973 & Hillier 1999)

> Scope: This file documents the two standard correction factors for
> hyperglycemia-induced (translocational / "dilutional") hyponatremia: the
> classic **Katz (1973)** factor of **1.6 mEq/L Na per 100 mg/dL glucose above
> 100** and the empirically re-evaluated **Hillier (1999)** factor of
> **2.4 mEq/L per 100 mg/dL**. Both are simple linear correction formulas — not
> diagnostic scores and not treatment thresholds. The corrected value estimates
> the serum sodium that would be present if the glucose were normal, unmasking
> the patient's underlying sodium status.
>
> **Citation correction:** the launch note for this task listed Katz as
> "Am J Med" — this is incorrect. Katz 1973 was published in the **New England
> Journal of Medicine** (confirmed by independent PubMed fetch, PMID 4763428).
> Only **Hillier** is Am J Med (1999). Both corrected citations are in
> References.

## Formula / algorithm (exact — every coefficient and branch)

Both formulas share the identical structure and differ only in the single
correction coefficient. Glucose is in **mg/dL**; the reference ("normal")
glucose is **100 mg/dL**; sodium is in **mEq/L** (numerically = mmol/L).

**Katz (1973) — factor 1.6:**

```
corrected_Na = measured_Na + 1.6 * ((glucose_mg_dL - 100) / 100)
             = measured_Na + 0.016 * (glucose_mg_dL - 100)
```

**Hillier (1999) — factor 2.4:**

```
corrected_Na = measured_Na + 2.4 * ((glucose_mg_dL - 100) / 100)
             = measured_Na + 0.024 * (glucose_mg_dL - 100)
```

**General form:**

```
corrected_Na = measured_Na + (factor / 100) * (glucose_mg_dL - 100)
   where factor = 1.6 (Katz)  or  2.4 (Hillier)
```

**Branch / applicability:**

- The correction is intended for **hyperglycemia**, i.e. `glucose_mg_dL > 100`.
  For `glucose_mg_dL <= 100` the correction term is zero or negative; by
  convention no correction is applied (corrected_Na = measured_Na). If the
  platform allows glucose < 100 to pass through, the arithmetic still holds
  (it would subtract), but this is outside the derivation intent and should be
  suppressed or clamped to 0 correction.
- **No other branches, floors, ceilings, age terms, or interaction terms.** It
  is a single linear adjustment.

**Non-linearity caveat (Hillier's actual empirical finding).** Hillier et al.
reported that the true correction is **not linear**: the classic 1.6 factor fit
their data adequately up to a glucose of ~400 mg/dL, but above 400 mg/dL the
observed factor was substantially larger — approximately **4.0 mEq/L per
100 mg/dL** (Hillier 1999, PMID 10225241). The **2.4** value is Hillier's
recommended _single overall_ linear estimate across the whole range, not a
piecewise coefficient. Some clinicians therefore apply 1.6 for moderate
hyperglycemia (~200–400 mg/dL) and the higher factor for severe hyperglycemia
(>400 mg/dL). This platform should treat Katz (1.6) and Hillier (2.4) as two
selectable linear options and surface the >400 mg/dL curvilinearity as a note,
not silently pick one.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id            | label                 | type   | units            | conversions                                                                              | plausible min | plausible max  |
| ------------- | --------------------- | ------ | ---------------- | ---------------------------------------------------------------------------------------- | ------------- | -------------- |
| `measured_na` | Measured serum sodium | number | mEq/L (= mmol/L) | mEq/L and mmol/L are 1:1 for monovalent Na+ (no conversion)                              | ~90 [sanity]  | ~180 [sanity]  |
| `glucose`     | Serum glucose         | number | mg/dL            | mmol/L → mg/dL: multiply by 18.0182 (glucose MW 180.156 g/mol). 100 mg/dL = 5.55 mmol/L. | 0             | ~2000 [sanity] |

- **Reference glucose (constant, not an input):** 100 mg/dL (5.55 mmol/L).
  This is the baseline both formulas subtract from; it is fixed by the
  definition, not user-entered (Katz 1973; Hillier 1999; reproduced by MDCalc).
- **Sodium unit note:** 1 mEq/L Na+ = 1 mmol/L Na+ because sodium is
  monovalent; no numeric conversion is ever needed. Output units match input.
- **Glucose unit conversion:** the only conversion of clinical concern is
  mmol/L ↔ mg/dL. Factor 18.0182 is the standard molar-mass conversion for
  glucose (MW 180.156 g/mol); commonly rounded to 18. If glucose is entered in
  mmol/L, convert to mg/dL first, or rewrite the correction with a 5.55 mmol/L
  reference.
- **Plausible bounds** above are **clinical sanity limits for input
  validation, not values from a fetched reference.** Measured sodium below ~90
  or above ~180 mEq/L, or glucose above ~2000 mg/dL, are physiologically
  extreme; treat as data-entry validation guards. **[NEEDS SOURCE]** for
  authoritative min/max — a pediatric reference-interval / critical-value source
  should be attached before these are treated as anything more than guards.

## Worked examples (>=2)

The Katz and Hillier papers state the correction factors but do not print
step-by-step numeric worked examples with a specific patient's sodium. The
examples below are **derived directly from the published formulas in Katz 1973
(PMID 4763428) and Hillier 1999 (PMID 10225241)** and are intended as unit-test
vectors.

**Example 1 — severe hyperglycemia (derived from formula in Katz 1973 & Hillier 1999):**
Measured Na = 130 mEq/L, glucose = 600 mg/dL.

```
Katz:    corrected_Na = 130 + 0.016 * (600 - 100) = 130 + 0.016 * 500 = 130 + 8  = 138 mEq/L
Hillier: corrected_Na = 130 + 0.024 * (600 - 100) = 130 + 0.024 * 500 = 130 + 12 = 142 mEq/L
```

Interpretation: an apparently low sodium of 130 is, once corrected, normal (Katz 138) to high-normal/slightly high (Hillier 142) — i.e. the "hyponatremia" is
translocational, not a true sodium deficit.

**Example 2 — moderate hyperglycemia (derived from formula in Katz 1973 & Hillier 1999):**
Measured Na = 134 mEq/L, glucose = 300 mg/dL.

```
Katz:    corrected_Na = 134 + 0.016 * (300 - 100) = 134 + 0.016 * 200 = 134 + 3.2 = 137.2 mEq/L
Hillier: corrected_Na = 134 + 0.024 * (300 - 100) = 134 + 0.024 * 200 = 134 + 4.8 = 138.8 mEq/L
```

At this glucose (<400 mg/dL), Hillier's own data say the 1.6 factor fits well,
so the Katz result (137.2) is the better estimate here despite Hillier's 2.4
being the better _overall_ single factor.

**Example 3 — pediatric DKA, severe hyperglycemia (derived from formula in Katz 1973 & Hillier 1999):**
Child in diabetic ketoacidosis: measured Na = 128 mEq/L, glucose = 800 mg/dL.

```
Katz:    corrected_Na = 128 + 0.016 * (800 - 100) = 128 + 0.016 * 700 = 128 + 11.2 = 139.2 mEq/L
Hillier: corrected_Na = 128 + 0.024 * (800 - 100) = 128 + 0.024 * 700 = 128 + 16.8 = 144.8 mEq/L
```

Because glucose > 400 mg/dL, Hillier's empirical data suggest the true factor is
even higher (~4.0), so the real corrected sodium may exceed even the Hillier
estimate. A "normal" measured Na of 128 that corrects to ≥139–145 indicates the
child's underlying (water-deficit) sodium is normal-to-high — clinically
important for planning fluid tonicity, and a rising corrected/effective sodium
during treatment is one signal watched in pediatric DKA.

## Interpretation bands (non-directive, with source)

**There are no interpretation "bands" for this quantity — it is a corrected
laboratory value, not an ordinal score.** Katz 1973 and Hillier 1999 define a
correction, not a graded risk scale, so there is nothing to band.

The corrected value is read against the ordinary serum-sodium reference frame:

- The corrected sodium **estimates what the measured sodium would be if glucose
  were 100 mg/dL**, thereby distinguishing **true** hypo-/hypernatremia from the
  purely **translocational (dilutional) hyponatremia** that hyperglycemia
  causes as osmotically active glucose draws water into the extracellular space
  (Katz 1973; Hillier 1999).
- A measured sodium that looks low but **corrects into the normal range** points
  to hyperglycemia-driven pseudo-hyponatremia rather than a sodium deficit; a
  measured sodium that **remains low after correction** suggests true
  hyponatremia; one that **corrects high** suggests underlying hypernatremia /
  free-water deficit (common in DKA/HHS).
- The conventional normal serum sodium reference band (commonly ~135–145 mEq/L)
  is a **general laboratory reference interval, not part of Katz/Hillier**, and
  is institution/assay-specific — **[NEEDS SOURCE]** for a citable pediatric
  reference interval if the platform displays one.

Recommended display: show the corrected value (Katz and/or Hillier), the factor
used, and a neutral note that it estimates sodium at normal glucose. Do **not**
attach an automated diagnostic label or treatment recommendation.

## References (full, PMID/DOI/URL)

1. **Katz MA.** Hyperglycemia-induced hyponatremia — calculation of expected
   serum sodium depression. _N Engl J Med._ 1973;289(16):843–844.
   **PMID: 4763428. DOI: 10.1056/NEJM197310182891607.**
   URL: https://pubmed.ncbi.nlm.nih.gov/4763428/ — _Original theoretical
   derivation of the 1.6 mEq/L per 100 mg/dL factor (osmotic-equilibrium
   reasoning; no printed patient worked example). Published in NEJM — not
   Am J Med._ (Confirmed by independent PubMed fetch.)

2. **Hillier TA, Abbott RD, Barrett EJ.** Hyponatremia: evaluating the
   correction factor for hyperglycemia. _Am J Med._ 1999 Apr;106(4):399–403.
   **PMID: 10225241. DOI: 10.1016/S0002-9343(99)00055-8.**
   URL: https://pubmed.ncbi.nlm.nih.gov/10225241/ — _Empirical re-evaluation in
   6 healthy adults (somatostatin to suppress insulin + hypertonic dextrose
   infusion): mean decrease 2.4 mEq/L Na per 100 mg/dL glucose; relationship
   non-linear, factor ~1.6 up to 400 mg/dL and ~4.0 above 400 mg/dL; recommends
   2.4 as the better single overall factor._ (Confirmed by independent PubMed
   fetch.)

3. **MDCalc / Scholastica — "Sodium Correction for Hyperglycemia."**
   URL: https://mdcalc.scholasticahq.com/article/143117-sodium-correction-for-hyperglycemia
   — _Independent reproduction of both formulas
   (Katz `+0.016*(glucose-100)`, Hillier `+0.024*(glucose-100)`) with the
   100 mg/dL reference; used to cross-check the coefficient and baseline._

4. **Nate's Corner — "Where Does the Hyperglycemia Correction Factor for Sodium
   Come From?"** Renal Fellow Network, 2022-10-10.
   URL: https://www.renalfellow.org/2022/10/10/nates-corner-where-does-the-hyperglycemia-correction-factor-for-sodium-come-from/
   — _Secondary explainer describing Hillier's methodology (6 subjects,
   somatostatin/dextrose/insulin protocol) and the >400 mg/dL non-linearity;
   used to corroborate the ~4.0 above-400 finding._

## Limitations & notes

- **Not a clinical device / not diagnostic.** This is a laboratory-value
  correction, not a validated decision rule. It aids interpretation of sodium in
  the presence of hyperglycemia; it does not by itself indicate a therapy.
- **Adult-derived — pediatric applicability not independently established.**
  Katz 1973 is a theoretical/osmotic derivation; Hillier 1999 was measured in
  **6 healthy adults**. Neither correction factor was derived or validated in
  children. Corrected/effective sodium is nonetheless widely used in
  **pediatric DKA** management, but the specific 1.6/2.4 coefficients applied to
  children are an off-derivation extrapolation. **[NEEDS SOURCE]** for a
  pediatric-specific validation or a pediatric DKA guideline (e.g., ISPAD)
  endorsing a particular factor — not fetched in this pass.
- **Two factors, different regimes.** Katz 1.6 and Hillier 2.4 diverge more as
  glucose rises. Hillier's data indicate 1.6 is adequate up to ~400 mg/dL and
  the true factor climbs toward ~4.0 above 400 mg/dL; 2.4 is Hillier's
  single-number compromise across the range. Present both; do not silently pick
  one, and surface the >400 mg/dL caveat.
- **"Corrected" vs "effective/tonicity-based" sodium.** These correction
  factors estimate a corrected sodium; a separate, more physiologic approach
  computes effective osmolality/tonicity directly. The two are related but not
  identical — this file documents only the Katz/Hillier linear corrections.
- **Applicability boundary.** Intended for glucose > 100 mg/dL. Applying the raw
  arithmetic to glucose < 100 mg/dL is outside the derivation intent (see
  Branch note); suppress or clamp.
- **Units are the main implementation hazard.** Glucose must be in **mg/dL** for
  the printed coefficients (0.016 / 0.024). If the platform ingests glucose in
  **mmol/L**, convert (×18.0182) before applying, or the correction will be off
  by ~18×. Sodium mEq/L = mmol/L (no conversion).

## IP status

- **Formula/threshold-based — not copyrightable.** Both corrections are simple
  arithmetic formulas (a fact-based linear adjustment with a published
  coefficient). Mathematical formulas and numeric coefficients are not protected
  by copyright, so 1.6, 2.4, the 100 mg/dL reference, and the equations may be
  implemented freely.
- **No verbatim scale wording.** Unlike ordinal clinical scales, there are **no
  free-text response descriptors** here — inputs are two numbers and the output
  is one number. No copyrightable verbatim scale text was carried into this
  document.
- **Attribution (academic norm, not a legal restriction):** cite Katz 1973 for
  the 1.6 factor and Hillier et al. 1999 for the 2.4 factor.
