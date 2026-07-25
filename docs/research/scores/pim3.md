# PIM3 (Paediatric Index of Mortality 3)

> Purpose: predicts probability of death for a child at the time of admission to a
> paediatric intensive care unit (PICU), from data collected at first ICU contact.
> It is a **unit-level case-mix / benchmarking** tool, not an individual prognostic
> device. Derivation/validation: Straney et al., _Pediatr Crit Care Med_ 2013
> (PMID 23863821; DOI 10.1097/PCC.0b013e31829760cf).

---

## Formula / algorithm (exact — every coefficient, every branch)

PIM3 is a single logistic-regression equation. Compute the linear predictor
(the "PIM3 score", a logit), then map it to a probability with the logistic
function.

**Linear predictor (logit):**

```
PIM3 score =
    (3.8233  × pupillary reaction)
  + (-0.5378 × elective admission)
  + (0.9763  × mechanical ventilation)
  + (0.0671  × absolute[base excess])
  + (-0.0431 × SBP)
  + (0.1716  × (SBP^2 / 1000))
  + (0.4214  × ((FiO2 × 100) / PaO2))
  - (1.2246  × bypass cardiac procedure)
  - (0.8762  × non-bypass cardiac procedure)
  - (1.5164  × non-cardiac procedure)
  + (1.6225  × very high-risk diagnosis)
  + (1.0725  × high-risk diagnosis)
  - (2.1766  × low-risk diagnosis)
  - 1.7928
```

**Probability of death:**

```
Probability of death = exp(PIM3 score) / (1 + exp(PIM3 score))
```

Equivalently `1 / (1 + exp(-PIM3 score))`.

Notes on the terms (all binary indicators are coded 1 = present, 0 = absent):

- `pupillary reaction` = 1 if pupils are **both fixed AND > 3 mm** to bright
  light; otherwise 0 (including unknown). Fixed dilated pupils due to drugs,
  toxins or local eye injury are **not** scored as 1. (Source: ANZICS booklet.)
- `elective admission` = 1 if the ICU admission was elective (e.g. elective
  surgery or elective monitoring/procedure); 0 otherwise. Unexpected admissions
  after elective surgery that could not have been foreseen are **not** elective.
- `mechanical ventilation` = 1 if ventilated at any time during the first hour
  in ICU; PIM's definition of mechanical ventilation **includes CPAP and BiPAP**
  (mask or endotracheal). Tracheostomy while breathing spontaneously is **not**
  ventilation.
- `absolute[base excess]` = the absolute value |BE| of arterial or capillary
  base excess in mmol/L. Unknown = 0.
- `SBP` = systolic blood pressure in mmHg (see special values below). The term
  is entered twice: linearly (`-0.0431 × SBP`) and quadratically
  (`+0.1716 × SBP^2/1000`).
- `(FiO2 × 100) / PaO2` — FiO2 as a fraction (e.g. 0.6), PaO2 arterial in mmHg,
  measured at the same time as FiO2. **Correction (verified):** if FiO2/PaO2 is
  not measured, PIM3 substitutes **0.23** for this whole term (a "normal"
  value equivalent to PaO2 ≈ 91 mmHg / 12 kPa on room air), **not 0** as an
  earlier version of this note stated. PIM2 used 0 for the missing-value
  substitution; PIM3 changed this to 0.23. See Verification section below.
- The three "recovery from procedure" indicators (`bypass cardiac`,
  `non-bypass cardiac`, `non-cardiac procedure`) are **mutually exclusive**: set
  the one matching the reason for ICU admission; if the admission is not a
  recovery-from-procedure admission, all three are 0.
- The three diagnosis-risk indicators (`very high-risk`, `high-risk`,
  `low-risk`) are the **main reason for ICU admission**; at most one is 1. If the
  reason is not on any list, all three are 0.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                       | label                                 | type         | units / coding                                                                                                                                                       | plausible min/max                                                                                  |
| ------------------------ | ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `sbp`                    | Systolic blood pressure               | number       | mmHg. Special values per PIM rules: **cardiac arrest → 0**; **shocked, BP unmeasurable → 30**; **unknown → 120**                                                     | 0–300 mmHg engineering bound; the coded default 120 is the "unknown" substitution (ANZICS booklet) |
| `base_excess`            | Base excess (absolute value used)     | number       | mmol/L, arterial or capillary; equation uses \|BE\|. Unknown → 0                                                                                                     | approx −40 to +40 mmol/L physiological plausibility; unknown default 0 (ANZICS booklet)            |
| `fio2`                   | FiO2 at time of PaO2                  | number       | fraction 0.21–1.0 (21%–100%). Convert % → fraction by /100. Used as `FiO2×100` (i.e. as a percent) in the ratio. Unknown → term = 0.23 (corrected; see Verification) | 0.21–1.0                                                                                           |
| `pao2`                   | Arterial PaO2                         | number       | mmHg. Must be arterial and simultaneous with FiO2. Unknown → term = 0.23 (corrected; see Verification). Convert kPa → mmHg ×7.5006                                   | ~20–600 mmHg physiological plausibility                                                            |
| `pupils`                 | Pupillary reaction to bright light    | boolean/enum | 1 = both pupils fixed AND >3 mm; 0 = reactive/other/unknown; drug- or injury-related fixed pupils = 0                                                                | 0 or 1                                                                                             |
| `mechanical_ventilation` | Mechanically ventilated in first hour | boolean      | 1 = yes (includes CPAP/BiPAP, mask or ETT); 0 = no                                                                                                                   | 0 or 1                                                                                             |
| `elective_admission`     | Elective ICU admission                | boolean      | 1 = elective; 0 = emergency/unplanned                                                                                                                                | 0 or 1                                                                                             |
| `recovery_category`      | Recovery from procedure               | enum         | one of: none / `bypass_cardiac` / `non_bypass_cardiac` / `non_cardiac` (mutually exclusive)                                                                          | enum                                                                                               |
| `diagnosis_risk`         | Main-reason risk category             | enum         | one of: none / `very_high` / `high` / `low` (mutually exclusive)                                                                                                     | enum                                                                                               |

**Units / conversion notes:**

- FiO2 in the equation is entered as a **percentage** via the `FiO2 × 100` term
  (FiO2 fraction 0.60 → 60). PaO2 is in **mmHg**. If a PaO2 is recorded in kPa,
  multiply by 7.5006 to get mmHg before use.
- **If FiO2 or PaO2 is unknown/not measured, the whole `(FiO2×100)/PaO2` term
  is set to 0.23** (a "normal" substitute value, equivalent to a PaO2 of about
  91 mmHg / 12 kPa on room air), **not 0**. This corrects an earlier version
  of this document, which stated the term defaults to 0 (that is PIM2's
  convention, not PIM3's). See Verification section.
- The SBP quadratic term divides SBP² by 1000 (e.g. SBP 120 → 120²/1000 = 14.4).
- Base excess enters as its **absolute value**, so sign does not matter.

**Timing rule (both PIM2 and PIM3):** use the **first** value of each variable
obtained from the time of first ICU contact (which may be outside the ICU, e.g.
in the emergency department or at another hospital during retrieval) up to 1 hour
after admission to the ICU. Use the first value in that window, not the worst.
(Source: ANZICS booklet.)

---

## Worked examples

The Straney 2013 paper does **not** publish a numeric worked example. The three
vectors below are **derived step-by-step from the published formula in Straney
et al. 2013 (PMID 23863821)** and are intended as unit tests. Arithmetic uses the
exact coefficients above; probabilities rounded to 2 significant figures.

### Example A — all-defaults / "unknowns" baseline (derived from formula)

Inputs: pupils reactive (0); not elective (0); not ventilated (0); base excess
unknown → |BE| 0; SBP unknown → 120; FiO2/PaO2 unknown → term **0.23**
(corrected — see Verification section; an earlier version of this example used
0 and is wrong); no recovery category; no risk diagnosis.

```
-0.0431 × 120                = -5.17200
 0.1716 × (120^2 / 1000)     = 0.1716 × 14.4 = +2.47104
 0.4214 × 0.23  (FiO2/PaO2 unknown default) = +0.09692
 intercept                   = -1.79280
 PIM3 score (logit)          = -4.39684
 P(death) = 1 / (1 + e^4.39684) = 0.01217  ≈ 1.2%
```

(Previous version of this example omitted the +0.09692 term, giving an
incorrect logit of -4.49376 and P ≈ 1.1%.)

### Example B — elective post-op non-cardiac recovery, mild derangement (derived from formula)

Inputs: pupils reactive (0); elective (1); not ventilated (0); base excess
−5.0 mmol/L → |BE| 5.0; SBP 90 mmHg; FiO2 0.40 & PaO2 100 mmHg →
(0.40×100)/100 = 0.40; recovery = non-cardiac procedure (1); no risk diagnosis.

```
-0.5378 × 1                  = -0.53780
 0.0671 × 5.0                = +0.33550
-0.0431 × 90                 = -3.87900
 0.1716 × (90^2 / 1000)      = 0.1716 × 8.1 = +1.38996
 0.4214 × 0.40               = +0.16856
-1.5164 × 1  (non-cardiac)   = -1.51640
 intercept                   = -1.79280
 PIM3 score (logit)          = -5.83198
 P(death) = 1 / (1 + e^5.83198) = 0.00292  ≈ 0.29%
```

### Example C — critically ill, ventilated, very-high-risk diagnosis (derived from formula)

Inputs: pupils both fixed & >3 mm (1); not elective (0); ventilated (1); base
excess −12 mmol/L → |BE| 12; SBP 40 mmHg (shocked but measured); FiO2 0.80 &
PaO2 60 mmHg → (0.80×100)/60 = 1.33333; no recovery category; very-high-risk
diagnosis (1) (e.g. cardiac arrest preceding ICU admission).

```
 3.8233 × 1                  = +3.82330
 0.9763 × 1                  = +0.97630
 0.0671 × 12                 = +0.80520
-0.0431 × 40                 = -1.72400
 0.1716 × (40^2 / 1000)      = 0.1716 × 1.6 = +0.27456
 0.4214 × 1.33333            = +0.56187
 1.6225 × 1  (very high-risk)= +1.62250
 intercept                   = -1.79280
 PIM3 score (logit)          = +4.54693
 P(death) = e^4.54693 / (1 + e^4.54693) = 0.9895  ≈ 98.9%
```

---

## Interpretation bands (non-directive wording, with source)

PIM3 outputs a **continuous predicted probability of death (0–1)**; the
derivation paper defines **no diagnostic cut-points or risk bands** for
individual patients. It is designed for aggregate use: the sum of individual
predicted probabilities across a cohort estimates the expected number of deaths,
which is compared with observed deaths as a **Standardised Mortality Ratio
(SMR = observed / expected)** to benchmark unit performance. Model discrimination
in the derivation cohort was AUC-ROC ≈ 0.88 overall. (Source: Straney 2013,
PMID 23863821.)

Non-directive framing for display: report the value as "PIM3 predicted mortality
= X%", describing the estimated probability of death for a patient with these
admission characteristics in the derivation population. Do **not** present it as
an individual treatment threshold. Calibration should be checked locally before
any comparative interpretation (validation studies report varying calibration by
setting).

---

## References (full citations, PMID/DOI)

1. **Straney L, Clements A, Parslow RC, Pearson G, Shann F, Alexander J, Slater A;
   ANZICS Paediatric Study Group and the Paediatric Intensive Care Audit Network.**
   Paediatric index of mortality 3: an updated model for predicting mortality in
   pediatric intensive care. _Pediatr Crit Care Med._ 2013;14(7):673–681.
   **PMID: 23863821. DOI: 10.1097/PCC.0b013e31829760cf.** — Primary
   derivation/validation paper; source of all coefficients and the intercept.

2. **ANZICS Centre for Outcome and Resource Evaluation.** _PIM2 & PIM3 for the
   ANZPIC Registry — Information Booklet_ (Version Jan 2019).
   https://www.anzics.org/wp-content/uploads/2019/07/ANZPICR-PIM2-PIM3-Information-Booklet.pdf
   — Authoritative source for variable definitions/coding (SBP special values,
   pupil criteria, mechanical-ventilation/CPAP definition, FiO2–PaO2 timing, base
   excess source, elective definition, first-hour timing rule).

3. **Lee OJ, Jung M, Kim M, Yang HK, Cho J.** Validation of the Pediatric Index of
   Mortality 3 in a Single Pediatric Intensive Care Unit in Korea.
   _J Korean Med Sci._ 2017;32(2):365–370. DOI: 10.3346/jkms.2017.32.2.365. PMC5220006.
   — Independent reproduction of the full PIM3 equation, probability formula, and
   the very-high-/high-/low-risk diagnosis lists (secondary confirmation).

**Diagnosis lists (from Straney 2013, as reproduced in refs 2 & 3):**

- **Low-risk diagnoses:** asthma; bronchiolitis; croup; obstructive sleep apnoea;
  diabetic ketoacidosis; seizure disorder.
- **High-risk diagnoses:** spontaneous cerebral haemorrhage; cardiomyopathy or
  myocarditis; hypoplastic left heart syndrome; neurodegenerative disorder;
  necrotising enterocolitis.
- **Very high-risk diagnoses:** cardiac arrest preceding ICU admission; severe
  combined immunodeficiency (SCID); leukaemia or lymphoma after first induction;
  bone marrow transplant recipient; liver failure (as the reason for ICU
  admission).

---

## Limitations & notes

- **Population/scope:** derived on 53,112 admissions across 60 PICUs in
  Australia, New Zealand, UK and Ireland (2010–2011). Intended for children
  admitted to specialist PICUs; not validated for neonatal-only units, adult
  patients, or as an individual prognostic/triage device.
- **Benchmarking tool, not a bedside prognosis:** designed to estimate expected
  mortality across cohorts (SMR), not to guide individual treatment decisions.
- **First-value rule:** uses the _first_ value from first ICU contact to +1 hour,
  which can include pre-ICU (ED / retrieval) data. Using worst values instead of
  first values will bias the score.
- **Missing-data conventions matter:** unknown SBP defaults to 120, unknown base
  excess and unknown FiO2/PaO2 default to a 0 contribution — different
  missing-value handling changes the result. Cardiac arrest → SBP 0 pushes the
  SBP terms strongly positive; verify special-value handling in implementation.
- **Calibration drift:** multiple external validations report AUC roughly 0.80–0.90
  but variable calibration (over- or under-prediction) by region and era; local
  recalibration/monitoring is advised before comparative use. (Not re-derived here
  — [NEEDS SOURCE] for any specific external SMR you cite.)
- **Not independently re-verified in this note:** the derivation-cohort AUC (0.88)
  is taken from the abstract of ref 1; per-region AUCs and calibration statistics
  were not transcribed. The exact ANZPIC diagnosis-code mappings for each
  risk-list entry live in the ANZICS Data Dictionary (ref 2 family) and were not
  transcribed field-by-field here — consult it when mapping local diagnosis codes.

---

## IP status

- **Formula, coefficients, thresholds, and the logistic equation are not
  copyrightable** — they are mathematical facts / a method, freely implementable.
- **Potentially protectable expression to review before verbatim reuse:**
  - The **descriptive wording of the diagnosis lists** (very-high / high / low
    risk) and the exact phrasing of variable definitions are transcribed from the
    Straney 2013 paper and the ANZICS Information Booklet. The underlying facts
    (which diagnoses fall in which risk tier, the coding rules) are usable, but
    **paraphrase the descriptive prose** rather than copying the booklet's
    sentences verbatim into product text. **FLAG.**
  - The **pupil descriptor** ("both fixed and > 3 mm to bright light") and the
    **SBP special-value instructions** ("cardiac arrest → 0; shocked/unmeasurable
    → 30; unknown → 120") are short factual coding rules — almost certainly not
    protectable, but reproduce as coding logic/labels rather than copied
    instructional paragraphs. **FLAG (low risk).**
- No verbatim scored **response-descriptor scale** (like a GCS-style worded item
  bank) exists in PIM3 beyond the above; the model is numeric.

---

## Verification

Independent-source check performed 2026-07-25 against sources other than (or in
addition to) the file's primary citation (Straney et al. 2013).

**Sources fetched and cross-checked:**

1. **Lee OJ et al., _J Korean Med Sci._ 2017;32(2):365–370 (PMID/PMC5220006)**
   — already listed as reference 3 in this file; fetched in full (open-access
   PMC). Independently reproduces the entire PIM3 equation.
2. **Straney L et al., _Pediatr Crit Care Med._ 2013;14(7):673–681 — PubMed
   abstract (PMID 23863821)** — the primary paper's own abstract, fetched
   directly, used to check the derivation-cohort numbers and AUC.
3. **Ray S, Rogers L, Pagel C, et al. "PaO2/FiO2 ratio derived from the
   SpO2/FiO2 ratio to improve mortality prediction using the Paediatric Index
   of Mortality-3 score in transported intensive care admissions."**
   (UCL Discovery preprint, Ray et al., cites Straney 2013 and Slater 2003 as
   refs 4/12) — fetched in full as a PDF and read directly. This is an
   independent peer-reviewed paper (not previously cited in this file) whose
   entire purpose is analysing the PIM3 FiO2/PaO2 missing-value handling, so
   it is authoritative on that specific point.
4. Multiple web searches attempting to reach the **ANZICS PIM2/PIM3
   Information Booklet** (cited as reference 2) directly — the booklet PDF
   returned HTTP 404 at its published URL and via the ANZICS Data Dictionary
   URL at the time of this check, and web.archive.org could not be fetched
   from this environment. Could not independently re-verify the booklet's
   exact wording; see [NEEDS SOURCE] items below.

**What was confirmed to match exactly (no changes needed):**

- All 13 regression coefficients and the intercept (3.8233, −0.5378, 0.9763,
  0.0671, −0.0431, 0.1716, 0.4214, −1.2246, −0.8762, −1.5164, 1.6225, 1.0725,
  −2.1766, −1.7928) — confirmed verbatim against source 1.
- The probability-of-death logistic transform — confirmed against source 1.
- The three diagnosis-risk lists (low/high/very-high) — confirmed verbatim
  against source 1, matches the file's reference 3 note.
- SBP unknown → 120 — confirmed against source 1 ("unknown = 120") and
  independent web corroboration.
- Base excess unknown → 0 — confirmed against source 1 ("unknown = 0").
- Pupillary reaction coding (both fixed & >3mm = 1; other/unknown = 0) —
  confirmed against source 1.
- Derivation cohort: 53,112 admissions, 60 PICUs, Australia/NZ/UK/Ireland,
  2010–2011, overall AUC-ROC 0.88 (range 0.88–0.89 across regions cited in the
  abstract) — confirmed against source 2 (PubMed abstract).
- All three worked-example arithmetic chains (Examples A, B, C) were
  independently recomputed term-by-term from the confirmed coefficients;
  Examples B and C reproduce exactly as originally written. Example A
  required a correction (see below).

**Correction made:**

- **FiO2/PaO2 missing-value handling was wrong and has been corrected.** The
  original text of this file stated that when FiO2/PaO2 is not measured, the
  `(FiO2×100)/PaO2` term is **0**. Source 3 (Ray et al., which cites Straney
  2013 directly on this point) states explicitly: _"PIM-2 assumes a PF value
  of 0, while PIM-3 assumes a 'normal' PF value of 0.23 (based on a PaO2 value
  of 91 mm Hg or 12 kPa when breathing room air)"_ and gives the coefficient
  application as _"0.4214\*100/PF or 0.4214\*0.23 if PF missing."_ Source 1
  independently corroborates ("FiO2 or PaO2 unknown, term = 0.23"). This file
  had conflated the **PIM2** convention (0) with **PIM3** (0.23). Fixed in:
  the formula notes, the `fio2`/`pao2` input-table rows, the units/conversion
  notes, and **Example A**, whose logit and probability have been recomputed
  (old: logit −4.49376, P≈1.1%; corrected: logit −4.39684, P≈1.2%). Examples B
  and C already had known, non-missing FiO2/PaO2 values, so they were
  unaffected and needed no change.

**[NEEDS SOURCE] — could not independently confirm, left as-is (not deleted,
not asserted as newly verified):**

- The **pupil exclusion clause** ("fixed dilated pupils due to drugs, toxins
  or local eye injury are not scored as 1") — this level of granular coding
  guidance lives in the ANZICS Information Booklet (reference 2), which was
  not accessible during this check (404 at the published URL; archive.org not
  reachable from this environment). Plausible and consistent with standard
  PIM/PIM2 practice, but not independently re-confirmed here. **[NEEDS
  SOURCE]**
- The **mechanical-ventilation CPAP/BiPAP inclusion detail** and the
  **tracheostomy-while-spontaneously-breathing exclusion** — same booklet
  dependency as above, not independently re-confirmed. **[NEEDS SOURCE]**
- The **elective-admission "could not have been foreseen" exclusion wording**
  — same booklet dependency, not independently re-confirmed. **[NEEDS
  SOURCE]**
- The **exact SBP special values for cardiac arrest (→0) and shocked/
  unmeasurable (→30)** — these appeared consistently across multiple
  secondary web sources during this check, but no single source with quotable,
  traceable full text could be fetched to confirm the exact wording against
  the ANZICS booklet itself. Numerically plausible and consistent with prior
  PIM/PIM2 convention; treat as **[NEEDS SOURCE]** for a verbatim-wording
  citation even though the values themselves are widely repeated.
- **Per-region calibration statistics and the ANZPIC diagnosis-code mappings**
  — already flagged as [NEEDS SOURCE] in the Limitations section prior to
  this check; not re-verified here, no change made.

No citations were removed. No new coefficients were invented; the one
numeric correction (0.23 default) is sourced to an independent peer-reviewed
paper (source 3) that itself cites Straney 2013 for the same figure.
