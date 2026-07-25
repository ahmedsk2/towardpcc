# Anion gap (with albumin correction)

The serum anion gap (AG) is a calculated index of unmeasured anions derived from
the routine electrolyte panel. It is used mainly to detect and classify metabolic
acidosis (high-AG vs normal-AG) and, at the low end, to flag hypoalbuminemia,
paraproteinemia, or certain intoxications. Because albumin is the dominant
unmeasured **anion**, hypoalbuminemia lowers the AG and can mask a high-AG
metabolic acidosis — the albumin-corrected AG (Figge 1998) restores sensitivity.
This is a **diagnostic index, not a directive severity score**.

Pediatric note: the arithmetic is age-independent, but the correction coefficient
and reference intervals below were derived predominantly in **adults** (Figge's
cohort was adults; see Limitations). Applying them to children is standard
practice but rests on adult-derived data.

---

## Formula / algorithm (exact — every coefficient and branch)

### Base anion gap

```
AG = Na − (Cl + HCO3)                         [potassium NOT included, common form]
```

Optional potassium-inclusive form (some labs/texts):

```
AG_K = (Na + K) − (Cl + HCO3)                 [potassium included]
```

- All of Na, K, Cl, HCO3 are entered in **mmol/L**. For these monovalent ions
  mmol/L is numerically identical to mEq/L, so AG is reported in mEq/L (= mmol/L).
- The two forms differ by the value of K, so the potassium-inclusive AG runs
  ~3.5–5 units higher, and its reference interval is correspondingly higher (see
  Interpretation bands). Pick ONE convention and keep it consistent; do not mix a
  K-inclusive value against a K-exclusive reference range.
- Source (formula, both forms): Kraut & Madias 2007; StatPearls (Anion Gap and
  Non–Anion Gap Metabolic Acidosis, NBK448090).

### Albumin correction (Figge 1998)

Standard clinical form, albumin in **g/dL**, normal baseline 4.0 g/dL:

```
AG_corrected = AG_observed + 2.5 × (4.0 − albumin[g/dL])
```

Equivalent SI form, albumin in **g/L**, normal baseline 40 g/L (this is the form
in which Figge's regression was originally reported):

```
AG_corrected = AG_observed + 0.25 × (40 − albumin[g/L])
```

- **Coefficient (exact):** each **1 g/dL** fall in albumin lowers the observed AG
  by **≈ 2.5 mEq/L** (equivalently 0.25 mEq/L per 1 g/L). This is the empirical
  slope from Figge 1998 (r² = 0.94, 9 normal subjects + 152 critically ill
  patients, 265 measurements). Source: Figge et al. 1998 (PMID 9824071).
- The correction is applied identically to the K-inclusive AG (albumin's effect
  is on the gap, not on K); use the same 2.5 × (4.0 − albumin) term.
- Direction of the correction: when albumin is **below** 4.0 g/dL the term is
  positive → corrected AG is **higher** than observed (unmasking a hidden gap).
  When albumin is **above** 4.0 g/dL the term is negative → corrected AG is lower.
- Baseline-albumin variant: some references normalize to **4.5 g/dL** rather than
  4.0 g/dL (e.g. Kraut/StatPearls phrasing "for each 1 g/dL below 4.5 g/dL");
  the _slope_ (2.5) is unchanged, only the reference point shifts. The 4.0 g/dL
  baseline is the more widely implemented clinical default and is the one used by
  this note and by the START-FROM specification. Flag the baseline explicitly in
  any UI so 4.0 vs 4.5 is unambiguous.
- Coefficient variant: a small number of sources use **2.3** rather than 2.5
  (per g/dL); results are clinically near-identical. Figge's own data support
  **2.5**, which is the value adopted here. Source note: EMCrit/PulmCrit and
  review literature note the 2.3-vs-2.5 spread.

### Order of operations (algorithm)

```
1. AG      = Na − (Cl + HCO3)                          # or (Na+K) − (Cl+HCO3)
2. AGcorr  = AG + 2.5 × (4.0 − albumin_g_dL)           # only if albumin available
3. Classify AGcorr (or AG if no albumin) against the reference interval in use.
```

There is no branching beyond the optional K term and the optional albumin term;
the score is pure arithmetic.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id        | label                            | type   | units / conversion                                              | plausible min/max                                                                                                                                 |
| --------- | -------------------------------- | ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `na`      | Serum sodium                     | number | mmol/L (= mEq/L)                                                | ~100–180 mmol/L survivable-range input bound (engineering) [NEEDS SOURCE for hard bounds]                                                         |
| `cl`      | Serum chloride                   | number | mmol/L (= mEq/L)                                                | ~70–130 mmol/L (engineering input bound) [NEEDS SOURCE for hard bounds]                                                                           |
| `hco3`    | Serum bicarbonate (or total CO2) | number | mmol/L (= mEq/L)                                                | ~3–45 mmol/L (engineering input bound) [NEEDS SOURCE for hard bounds]                                                                             |
| `k`       | Serum potassium (optional)       | number | mmol/L (= mEq/L). Include only if using the K-inclusive AG form | ~1.5–9 mmol/L (engineering input bound) [NEEDS SOURCE for hard bounds]                                                                            |
| `albumin` | Serum albumin                    | number | **g/dL**. From SI g/L: ÷10 (e.g. 40 g/L = 4.0 g/dL)             | ~1.0–6.0 g/dL clinically encountered; correction defined across this range (Figge 1998 spanned severe hypoalbuminemia, 49% of patients <2.0 g/dL) |
| `ag`      | Anion gap (derived)              | number | mEq/L (= mmol/L)                                                | ~ −5 to 45 arithmetic consequence of inputs [NEEDS SOURCE for hard bounds]                                                                        |
| `ag_corr` | Albumin-corrected AG (derived)   | number | mEq/L                                                           | ~ −5 to 50 (adds up to ~7.5 for albumin 1.0 g/dL) [NEEDS SOURCE for hard bounds]                                                                  |

Bound notes: electrolyte and albumin values are laboratory measurements; the
min/max above are **input-sanity limits for a calculator**, not clinically
validated cutoffs, except where tied to Figge's studied albumin range. The units
conversions (g/L ↔ g/dL; mmol/L = mEq/L for monovalent ions) are definitional.
Bicarbonate is frequently reported as "total CO2" on a basic metabolic panel;
they are used interchangeably here (total CO2 ≈ HCO3 + ~1.2 mmol/L dissolved CO2,
a difference usually ignored in the AG calculation).

---

## Worked examples (each cited; ≥2)

**Example 1 — Base AG, no potassium** _(derived from formula AG = Na − (Cl + HCO3); reference interval from Kraut & Madias 2007 / StatPearls)_

- Inputs: Na = 140, Cl = 104, HCO3 = 24 mmol/L
- AG = 140 − (104 + 24) = 140 − 128 = **12 mEq/L**
- Classification: at the upper edge of the classic 8–12 reference interval →
  borderline/normal (interval is method-dependent; see bands).

**Example 2 — Potassium-inclusive AG** _(derived from formula AG_K = (Na + K) − (Cl + HCO3); reference from StatPearls NBK448090)_

- Inputs: Na = 137, K = 4.0, Cl = 100, HCO3 = 25 mmol/L
- AG_K = (137 + 4.0) − (100 + 25) = 141 − 125 = **16 mEq/L**
- Classification: within the K-inclusive reference (12–16) → normal.

**Example 3 — Hypoalbuminemia masks a high-AG acidosis (the clinical point)** _(derived from the Figge 1998 correction: AG_corr = AG + 2.5 × (4.0 − albumin))_

- Inputs: Na = 140, Cl = 112, HCO3 = 16 mmol/L, albumin = 2.0 g/dL
- Observed AG = 140 − (112 + 16) = 140 − 128 = **12** (looks "normal")
- Correction = 2.5 × (4.0 − 2.0) = 2.5 × 2.0 = **+5**
- AG_corrected = 12 + 5 = **17 mEq/L** → now clearly above the reference interval,
  revealing a high-AG metabolic acidosis that the uncorrected AG concealed. This
  is exactly the failure mode Figge 1998 quantified.

**Example 4 — Coefficient check reproduces Figge's slope** _(computed directly from the Figge 1998 regression, 0.25 mEq/L per g/L = 2.5 per g/dL)_

- Albumin falls from 4.0 → 2.5 g/dL (a 1.5 g/dL drop)
- Expected AG suppression = 2.5 × 1.5 = **3.75 mEq/L**
- In SI: 0.25 × (40 − 25 g/L) = 0.25 × 15 = 3.75 mEq/L. ✓ (the g/dL and g/L forms
  agree exactly, confirming the 2.5 / 0.25 coefficient equivalence.)

**Example 5 — High-AG metabolic acidosis, normal albumin (e.g. DKA/lactic)** _(derived from formula; albumin term is zero at 4.0 g/dL)_

- Inputs: Na = 130, Cl = 95, HCO3 = 10 mmol/L, albumin = 4.0 g/dL
- AG = 130 − (95 + 10) = 130 − 105 = **25 mEq/L**
- Correction = 2.5 × (4.0 − 4.0) = 0 → AG_corrected = **25 mEq/L**
- Classification: markedly elevated → high-anion-gap metabolic acidosis.

---

## Interpretation bands (non-directive, with source)

The anion gap is a **classification/diagnostic index**, not a graded severity
score, and it has **no management-directive thresholds**. Reference intervals are
strongly **method-dependent** (flame photometry vs modern ion-selective
electrodes shifted the range downward), so a lab's own interval should govern.
Representative published intervals:

**Anion gap without potassium**

- Classic textbook interval: **8–12 mEq/L** (Kraut & Madias 2007; StatPearls).
- Modern ion-selective-electrode (ISE) analyzers give **lower** values: mean
  7.2 ± 2, range **3–11 mEq/L** in patients with normal kidney function and
  albumin (Sadjadi 2013), reflecting higher measured chloride on ISE. Kraut &
  Madias note the shift from ~12 ± 4 to ~6 ± 3 mEq/L with ISE.
- A recent verified reference interval in 284 healthy adults: **10–18 mmol/L**
  (2.5th–97.5th percentile; median 13) (Chionh 2022) — illustrating how much the
  interval varies between laboratories/populations.

**Anion gap with potassium**

- Classic: **12–16 mEq/L** (StatPearls); some texts up to ~12–20.
- Verified interval (Chionh 2022): **14.6–22.5 mmol/L** (median 17.7).

**Pediatric**

- Ayala-Lopez & Harb 2020 found a pediatric (≤18 y) interval of **8–19 mmol/L**
  (median 13, K-exclusive), statistically indistinguishable from their adult
  interval (7–18) — supporting use of the adult interval in children, with the
  caveat of a small pediatric sample. Textbook pediatric figures commonly cite
  8–12 (or <12 in neonates); these are lab/method-dependent.

**Directional meaning (descriptive, non-prescriptive)**

- **High AG** (above the lab's upper limit): unmeasured anions increased —
  classically a high-anion-gap metabolic acidosis (mnemonics GOLD-MARK /
  MUDPILES cover the differential). Correcting for albumin _raises_ sensitivity.
- **Normal AG** with acidosis: suggests a normal-anion-gap (hyperchloremic)
  metabolic acidosis.
- **Low AG** (below the lab's lower limit): most often hypoalbuminemia or lab
  error; also paraproteinemia (e.g. myeloma), or intoxication with lithium,
  bromide, or iodide; hypercalcemia/hypermagnesemia (Kraut & Madias 2007).

These are diagnostic associations for interpretation only; they do not prescribe
treatment.

---

## References (full, PMID/DOI/URL)

1. **Albumin correction — PRIMARY:** Figge J, Jabor A, Kazda A, Fencl V. Anion
   gap and hypoalbuminemia. _Crit Care Med._ 1998;26(11):1807–1810.
   PMID: **9824071**. DOI: **10.1097/00003246-199811000-00019**.
   (Derived the 0.25 mEq/L per g/L [= 2.5 per g/dL] correction; r² = 0.94;
   9 normal subjects + 152 ICU patients, 265 measurements.)

2. **Physicochemical basis of albumin as a weak acid (origin of the model):**
   Figge J, Rossing TH, Fencl V. The role of serum proteins in acid-base
   equilibria. _J Lab Clin Med._ 1991;117(6):453–467. PMID: **2045713**.

3. **Formula, uses, limitations, normal-range shift with ISE:** Kraut JA,
   Madias NE. Serum anion gap: its uses and limitations in clinical medicine.
   _Clin J Am Soc Nephrol._ 2007;2(1):162–174. PMID: **17699401**.
   DOI: **10.2215/CJN.03020906**.

4. **Verified contemporary reference interval:** Chionh CY, Poh CB, Roy DM, et al.
   Serum anion gap revisited: a verified reference interval for contemporary use.
   _Intern Med J._ 2022;52(9):1531–1537. PMID: **34028972**.
   DOI: **10.1111/imj.15396**.

5. **Pediatric + adult reference interval:** Ayala-Lopez N, Harb R. Interpreting
   anion gap values in adult and pediatric patients: examining the reference
   interval. _J Appl Lab Med._ 2020;5(1):126–135.
   DOI: **10.1373/jalm.2019.029496**. URL:
   https://academic.oup.com/jalm/article/5/1/126/5690023

6. **ISE lowered the normal range:** Sadjadi SA, Manalo R, Jaipaul N, McMillan J.
   Ion-selective electrode and anion gap range: what should the anion gap be?
   _Int J Nephrol Renovasc Dis._ 2013;6:101–105. PMID: **23776389**.
   DOI: **10.2147/IJNRD.S44689**. URL:
   https://pmc.ncbi.nlm.nih.gov/articles/PMC3681403/

7. **Open-access formula/normal-range reference:** Anion Gap and Non–Anion Gap
   Metabolic Acidosis. StatPearls (NCBI Bookshelf), NBK448090. URL:
   https://www.ncbi.nlm.nih.gov/books/NBK448090/

---

## Limitations & notes

- **Method dependence is large.** The "normal" AG depends on the analyzer (flame
  photometry vs ISE) and the local chloride calibration; ISE shifted the interval
  down by ~5 mEq/L. Always classify against the **reporting lab's own reference
  interval**, not a fixed hard-coded 8–12. Store which convention (K-inclusive?
  which interval?) accompanies a computed value.
- **Adult-derived correction applied to children.** Figge's 1998 cohort was
  adults (ICU + healthy). The 2.5-per-g/dL slope and the reference intervals are
  used in pediatrics by convention but were not derived in children; treat as an
  adult-derived value when applied to a PICU population (pediatric-first flag).
  Ayala-Lopez 2020 offers some pediatric reference-interval support but with a
  small (n=145) sample the authors themselves caution about.
- **The correction increases sensitivity, not specificity.** Correcting for
  albumin unmasks hidden gaps (its purpose), but some literature (e.g. Chawla,
  and the "mythbusting" review) argues it does **not** reliably improve detection
  of hyperlactatemia or change management, and can over-call. It is an adjunct to,
  not a replacement for, direct measurement of lactate, ketones, etc.
- **Baseline-albumin ambiguity (4.0 vs 4.5 g/dL).** The slope is agreed (2.5) but
  the normal reference albumin differs between sources; this shifts the corrected
  value by ~1.25 mEq/L. This note uses **4.0 g/dL** (the START-FROM default and
  most common clinical form); expose the baseline in any implementation.
- **Coefficient variant 2.3 vs 2.5.** Minor; 2.5 (Figge) adopted here.
- **Total CO2 vs HCO3.** Panels report total CO2; using it in place of HCO3 adds
  a small (~1–2 mmol/L) systematic offset, generally ignored.
- **Not a severity/triage score.** There is no validated outcome band; do not
  present AG as a mortality or acuity score. Low AG has its own differential
  (lab error, hypoalbuminemia, paraprotein, Li/Br/I intoxication).
- **Garbage-in:** spurious electrolyte values (e.g. pseudohyponatremia,
  bromide interfering with chloride assays) distort the AG directly.

---

## IP status

- **Not copyrightable.** The anion gap is an arithmetic identity
  (Na − [Cl + HCO3], optionally + K) and the Figge albumin correction is a
  regression coefficient (2.5 per g/dL / 0.25 per g/L) applied to a linear
  formula. Formulas, coefficients, thresholds, and reference intervals are facts,
  not protected expression.
- **No verbatim copyrighted scale wording** is embedded — unlike ordinal clinical
  scales (e.g. GCS) there are no proprietary item/response descriptors here, only
  numeric quantities and equations.
- The **prose and tables** of the cited papers/guidelines are copyrighted as
  expression; only numeric criteria and paraphrased descriptions are reproduced
  here. Differential-diagnosis mnemonics (MUDPILES, GOLD-MARK) are generic
  medical common knowledge, not proprietary.
- No verbatim scale wording flagged for legal review.
