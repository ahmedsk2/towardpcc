# Holliday-Segar Maintenance Fluid Requirement (Pediatric)

> Scope: This file documents the **Holliday & Segar 1957** method for estimating the
> **maintenance** water requirement of a hospitalized child, plus the derivative bedside
> **"4-2-1" hourly rule**. This is a **dosing/target calculation**, not a severity or diagnostic
> score: it outputs a fluid volume (mL/day and mL/hr) as a function of body weight only. It does
> **not** compute deficit (dehydration) replacement or ongoing/third-space losses — those are
> added separately in clinical practice and are out of scope here.

## Formula / algorithm (exact — every coefficient and branch)

Holliday & Segar's central observation was a **direct linear relationship between physiologic
water need (insensible + renal loss, minus water of oxidation) and energy metabolism**, so water
need can be expressed **per unit of caloric expenditure**, and caloric expenditure can in turn be
approximated from body weight (Holliday & Segar 1957, PMID 13431307).

**Step 1 — water need per 100 kcal metabolized (the physiologic basis):**

```
insensible water loss      = 50.0   mL / 100 kcal / day
renal (urinary) water loss = 66.7   mL / 100 kcal / day
                             --------------------------
gross loss                 = 116.7  mL / 100 kcal / day
minus water of oxidation   = 16.7   mL / 100 kcal / day
                             --------------------------
net maintenance water need = 100    mL / 100 kcal / day   (≈ 1 mL water per 1 kcal)
```

(Holliday & Segar 1957 — the 50 / 66.7 / 16.7 → 100 mL per 100 kcal breakdown is the paper's
own derivation.)

**Step 2 — caloric expenditure estimated from body weight (piecewise-linear brackets):**

| Body-weight bracket | Caloric expenditure                                |
| ------------------- | -------------------------------------------------- |
| 0–10 kg             | 100 kcal/kg/day                                    |
| 10–20 kg            | 1000 kcal + 50 kcal/kg/day for each kg above 10 kg |
| > 20 kg             | 1500 kcal + 20 kcal/kg/day for each kg above 20 kg |

**Step 3 — maintenance water = caloric expenditure × (100 mL / 100 kcal) = ≈ 1 mL/kcal.**
Applying the 1 mL ≈ 1 kcal conversion to Step 2 gives the canonical **daily "100-50-20" rule**:

```
Daily maintenance volume (mL/day), by weight bracket (additive across brackets):

  first 10 kg              : 100 mL/kg/day   × (weight, capped at 10 kg)
  next 10 kg  (10 < kg ≤ 20): 50 mL/kg/day   × (weight above 10 kg, capped at 10 kg)
  each kg > 20 kg          :  20 mL/kg/day   × (weight above 20 kg)
```

Closed form by weight `W` (kg):

```
W ≤ 10:            V_day = 100 * W
10 < W ≤ 20:       V_day = 1000 + 50 * (W - 10)
W  > 20:           V_day = 1500 + 20 * (W - 20)
```

**Derivative bedside rule — the "4-2-1" hourly rule** (each daily rate ÷ 24 h, rounded to a
whole number; Holliday & Segar 1957 as popularized for anesthesia/PICU bedside use):

```
Hourly maintenance rate (mL/hr), by weight bracket (additive):

  first 10 kg     : 4 mL/kg/hr
  next 10 kg      : 2 mL/kg/hr
  each kg > 20 kg : 1 mL/kg/hr
```

Closed form by weight `W` (kg):

```
W ≤ 10:            V_hr = 4 * W
10 < W ≤ 20:       V_hr = 40 + 2 * (W - 10)
W  > 20:           V_hr = 60 + 1 * (W - 20)
```

**Branch note / two coefficients, one method.** There is one branch structure (the three
weight brackets) and two coefficient sets that are meant to represent the same quantity:

- daily rule coefficients **100 / 50 / 20 mL/kg/day**, and
- hourly rule coefficients **4 / 2 / 1 mL/kg/hr**.

They are **not exactly equal**: 100 ÷ 24 = 4.167 (rounded to 4), 50 ÷ 24 = 2.083 (rounded to 2),
20 ÷ 24 = 0.833 (rounded to 1). So `V_hr × 24` is close to but not identical to `V_day`
(the 4-2-1 rule slightly _underestimates_ in the first two brackets and slightly _overestimates_
in the >20 kg bracket). An implementation must pick one canonical method per output and label it;
do not compute mL/hr from `V_day/24` and also expose the 4-2-1 rule and expect them to agree
to the mL. See Limitations.

**Electrolyte companion values (from the same paper, ancillary — not the water requirement):**
Holliday & Segar also recommended maintenance electrolytes of **sodium 3.0, chloride 2.0, and
potassium 2.0 mEq per 100 kcal/day** (i.e., per 100 mL of maintenance water at the 100 mL/100 kcal
basis). These define the classic hypotonic maintenance solution of the era; see Limitations for
the modern isotonic-fluid caveat.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

The method takes a **single required input**: body weight.

| id       | label       | type   | units | conversions                                                                                  | plausible min              | plausible max                |
| -------- | ----------- | ------ | ----- | -------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------- |
| `weight` | Body weight | number | kg    | If entered in pounds, kg = lb ÷ 2.20462 (exact unit conversion). If in grams, kg = g ÷ 1000. | ~0.5 kg (validation floor) | ~150 kg (validation ceiling) |

Notes on bounds (these are **input-sanity bounds for validation, not clinical dosing limits**):

- The method was **derived for children** and, per standard teaching, is **not intended for
  neonates < ~2 weeks of age**, whose water and caloric physiology differ (Wikipedia summary of
  the method; corroborated by OpenAnesthesia's "basal metabolic state … not acutely ill" caveat).
  A weight floor of ~0.5 kg only prevents nonsensical/zero input; it does not endorse use in
  extremely-low-birth-weight neonates.
- The upper bound is a practical validation ceiling. The formula itself is unbounded and is often
  applied to adolescents/adults, but many institutions **cap total maintenance volume** (commonly
  around **2000–2400 mL/day**, i.e., the value near ~60–70 kg) rather than letting it grow
  linearly. Any such cap is an institutional policy overlay, **[NEEDS SOURCE]** for a specific
  numeric cap — the original 1957 paper does not specify one.

Weight is a positive real number; `min > 0` is inherent (a zero or negative weight is invalid).

## Worked examples (≥2)

All examples are **derived step-by-step from the formula in Holliday & Segar 1957
(PMID 13431307)** using the closed forms above. Example 2's daily figure (1740 mL for 32 kg) is
additionally the exact worked example printed in the Wikipedia entry for the method; Example 4's
hourly figure (75 mL/hr for 35 kg) is the worked example printed in the University of Iowa Head
and Neck Protocols. These serve as unit-test vectors.

**Example 1 — infant, 8 kg (first bracket only; derived from formula in Holliday & Segar 1957):**

```
Daily : V_day = 100 * 8                = 800 mL/day
Hourly: V_hr  = 4 * 8                  = 32 mL/hr
```

Expected: **800 mL/day**, **32 mL/hr**. (Cross-check: 800/24 = 33.3 mL/hr; the 4-2-1 rule gives
32 mL/hr — the expected small rounding gap.)

**Example 2 — child, 32 kg (all three brackets; daily figure matches Wikipedia worked example):**

```
Daily : V_day = 1500 + 20 * (32 - 20) = 1500 + 240 = 1740 mL/day
Hourly: V_hr  = 60   + 1  * (32 - 20) = 60   + 12  = 72   mL/hr
```

Equivalent additive form (daily): (10×100) + (10×50) + (12×20) = 1000 + 500 + 240 = **1740 mL/day**.
Expected: **1740 mL/day**, **72 mL/hr**.

**Example 3 — child, 15 kg (first two brackets; derived from formula in Holliday & Segar 1957):**

```
Daily : V_day = 1000 + 50 * (15 - 10) = 1000 + 250 = 1250 mL/day
Hourly: V_hr  = 40   + 2  * (15 - 10) = 40   + 10  = 50   mL/hr
```

Additive form (hourly): (10×4) + (5×2) = 40 + 10 = **50 mL/hr**. Expected: **1250 mL/day**,
**50 mL/hr**.

**Example 4 — child, 35 kg (all three brackets; hourly figure matches Iowa protocol worked
example):**

```
Daily : V_day = 1500 + 20 * (35 - 20) = 1500 + 300 = 1800 mL/day
Hourly: V_hr  = 60   + 1  * (35 - 20) = 60   + 15  = 75   mL/hr
```

Additive form (hourly): (10×4) + (10×2) + (15×1) = 40 + 20 + 15 = **75 mL/hr**. Expected:
**1800 mL/day**, **75 mL/hr**.

**Boundary check — exactly 10 kg and exactly 20 kg (derived):** at W = 10, V_day = 100×10 = 1000
(= 1000 + 50×0); at W = 20, V_day = 1000 + 50×10 = 1500 (= 1500 + 20×0). The piecewise brackets
join continuously — no discontinuity at the knots.

## Interpretation bands (non-directive, with source)

**This score has no interpretation/risk bands.** Holliday-Segar is a **maintenance-fluid dosing
estimate**, not a severity index or diagnostic classifier: its output is a target volume
(mL/day and mL/hr), not a category, and there is no published cut-point that stratifies patients
into risk groups. There is therefore nothing to display as a colored band or risk tier.

Non-directive framing for display: present the computed maintenance volume as an **estimate of
baseline water need under basal conditions**, explicitly noting it (a) excludes any pre-existing
fluid deficit and ongoing abnormal losses, and (b) is an estimate that requires clinical
adjustment for the individual patient. Do not present the number as a prescription or an
automated order.

## References (full, PMID/DOI/URL)

1. **Holliday MA, Segar WE.** The maintenance need for water in parenteral fluid therapy.
   _Pediatrics._ 1957 May;19(5):823–832. **PMID: 13431307. DOI: 10.1542/peds.19.5.823.**
   URL: https://publications.aap.org/pediatrics/article/19/5/823/29135 — _Original derivation
   (primary): the 100 mL/100 kcal water basis (insensible 50 + renal 66.7 − oxidation 16.7),
   the caloric-from-weight brackets, the 100-50-20 mL/kg/day maintenance rule, and the Na 3.0 /
   Cl 2.0 / K 2.0 mEq per 100 kcal/day electrolyte companion values. PMID and DOI confirmed via
   independent PubMed fetch of PMID 13431307 and web search returning DOI 10.1542/peds.19.5.823._
   (Primary full text is paywalled at AAP; the numeric content in this file was sourced from the
   original's figures as reported in the fetched secondary sources below plus the search-returned
   verbatim breakdown.)
2. **Chesney RW.** The maintenance need for water in parenteral fluid therapy, by Malcolm A.
   Holliday, MD, and William E. Segar, MD, Pediatrics, 1957;19:823–832. _Pediatrics._ 1998
   Jul;102(1 Pt 2):229–230. **PMID: 9651436.** URL:
   https://pubmed.ncbi.nlm.nih.gov/9651436/ — _Historical commentary confirming the original
   citation (distinct record from the 1957 original; do not conflate)._
3. **Wikipedia contributors.** Holliday–Segar formula. URL:
   https://en.wikipedia.org/wiki/Holliday-Segar_formula — _Secondary confirmation of the
   100-50-20 mL/kg/day rule, the 1 mL ≈ 1 kcal conversion, the caloric-cost-by-weight table, the
   32 kg → 1740 mL worked example, and the age/condition limitations (fever, hypothermia,
   hyperthyroidism, status epilepticus; use in patients > ~2 weeks)._
4. **University of Iowa Head and Neck Protocols — Pediatric Fluid Management.** URL:
   https://iowaprotocols.medicine.uiowa.edu/protocols/pediatric-fluid-management — _Secondary
   confirmation of the 100-50-20 daily rule, the 4-2-1 hourly rule, and the 35 kg → 75 mL/hr
   worked example._
5. **OpenAnesthesia — Perioperative Fluid Administration in Children.** URL:
   https://www.openanesthesia.org/keywords/perioperative-fluid-administration-in-children/ —
   _Secondary confirmation of the 4-2-1 rule and the "meant for basal metabolic state, not
   acutely ill children" and hypotonic-solution caveats._
6. **Pediatric Anesthesia Digital Handbook (maskinduction.com) — The "4-2-1" Rule for
   Maintenance Fluid Therapy in Infants and Children.** URL:
   https://www.maskinduction.com/the-4-2-1-rule-for-maintenance-fluid-therapy-in-infants-and-children.html
   — _Secondary confirmation of the 4-2-1 rule, its derivation by dividing the daily rates by 24,
   and the direct-linear water-vs-energy-metabolism relationship._

## Limitations & notes

- **Not a clinical device; estimate only.** The output is a starting estimate of basal
  maintenance water, not an order. It must be individualized and reassessed; it does **not**
  include deficit (dehydration) replacement or ongoing/abnormal losses (fever, vomiting,
  diarrhea, drains, third-spacing), which are computed and added separately.
- **Population/condition constraints (Ref 3, Ref 5).** Derived for hospitalized children in a
  **basal metabolic state**; accuracy is reduced in fever, hypothermia, hyperthyroidism, status
  epilepticus, and other high- or low-metabolic states, and it is **not intended for neonates
  younger than ~2 weeks**. Applying it unadjusted to acutely ill/critically ill children is an
  off-label extension of the original intent.
- **Hypotonic-fluid hazard (modern caveat; Ref 5).** The original method paired the water volume
  with **hypotonic, dextrose-containing** solutions (Na ~3 mEq/100 kcal). Contemporary evidence
  links routine hypotonic maintenance fluids to **iatrogenic hyponatremia**, and current pediatric
  guidance generally favors **isotonic** maintenance fluids. The _volume_ rule (100-50-20 /
  4-2-1) remains standard; the _composition_ recommendation from 1957 is superseded. The platform
  should compute volume but must not imply the 1957 electrolyte composition is current practice.
  (Guideline-level citation for the isotonic-fluid shift is **[NEEDS SOURCE]** — e.g., a national
  pediatric maintenance-fluid clinical practice guideline — if the platform intends to state the
  modern recommendation authoritatively rather than merely flagging the caveat.)
- **Daily vs hourly rounding (implementation-critical).** 100/50/20 ÷ 24 = 4.167/2.083/0.833; the
  4-2-1 rule uses rounded whole numbers, so `V_hr × 24 ≠ V_day` in general. Pick and label one
  canonical method per output; expect a small (few-percent) discrepancy if both are shown.
- **Volume capping (institutional).** Many centers cap total maintenance volume for large
  patients (commonly stated near ~2000–2400 mL/day) rather than extrapolating the >20 kg bracket
  indefinitely. Any cap is a policy overlay and is **[NEEDS SOURCE]** for a specific value — the
  1957 paper specifies no ceiling.
- **Weight basis.** Standard practice uses **actual body weight** for maintenance in most
  children; use in obesity (where actual weight may overestimate lean metabolic mass) is a known
  gray area not addressed by the original method.

## IP status

- **Formula/threshold-based method — not copyrightable.** The Holliday-Segar method is a
  piecewise-linear arithmetic function of body weight (facts + a mathematical formula). Formulas,
  coefficients (100/50/20, 4/2/1), and the weight-bracket thresholds (10 kg, 20 kg) are not
  protected by copyright, so the algorithm may be implemented freely.
- **No proprietary scale wording.** Unlike ordinal clinical scales, this method has **no
  free-text response items or verbatim descriptors** to license — every element is a number
  (a weight in, a volume out). No copyrightable verbatim scale text was carried into this
  document; section prose here is original paraphrase.
- **Attribution (academic norm, not a legal restriction):** cite Holliday & Segar 1957 as the
  origin of the method. The name "Holliday-Segar" is an eponym, not a trademark.
