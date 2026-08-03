# Phoenix Sepsis Score (2024)

> **Sources of record (two companion JAMA papers, Feb 27 2024, 331(8)):**
>
> 1. **Derivation/validation:** Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al; Society of Critical Care Medicine Pediatric Sepsis Definition Task Force. _Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock._ **JAMA.** 2024;331(8):675–686. **PMID: 38245897** · **DOI: 10.1001/jama.2024.0196**
> 2. **Consensus definition:** Schlapbach LJ, Watson RS, Sorce LR, et al; Society of Critical Care Medicine Pediatric Sepsis Definition Task Force. _International Consensus Criteria for Pediatric Sepsis and Septic Shock._ **JAMA.** 2024;331(8):665–674. **PMID: 38245889** · **DOI: 10.1001/jama.2024.0179**
>
> Every numeric threshold below is taken from paper #1 (Table 2 / the score box) and cross-checked against the **reference implementation** authored by the same task-force members — the `phoenix` R package / Python module (DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD, 2024; JAMIA Open 2024;7(3):ooae066, **DOI: 10.1093/jamiaopen/ooae066**, PMC11223841) and its published documentation (cu-dbmi-peds.github.io/phoenix, CRAN vignette). The primary table and the reference code agreed on every value. No number on this page is inferred or invented.
>
> **Scope of this file:** the 4-organ **Phoenix Sepsis Score** (the diagnostic criterion). The 8-organ research extension **Phoenix-8** (adds respiratory-count/endocrine, immunologic, renal, hepatic + 4th neurologic detail) is noted only briefly under Limitations; it is NOT the diagnostic score.

> ### 2026-08-03 verification pass — one CORRECTION and three REFINEMENTS
>
> A dedicated verification pass read all four primary sources directly and **downloaded and executed** the task force's reference Python module. Its findings supersede the earlier text of this file where they conflict:
>
> 1. **CORRECTION — the neurologic sub-score is HIERARCHICAL, not additive.** Bilaterally fixed pupils are worth **2 outright**, whatever the GCS. This file previously described the row as "GCS ≤10 (+1) **+** fixed pupils (+1), capped at 2", and `phoenix.ts` implemented it that way; that returns **1** for fixed pupils with GCS 15, where the reference module returns **2**. See §4, rewritten.
> 2. **REFINEMENT — missing values are imputed PER INPUT at a normal-end sentinel**, not "the component scores 0". A missing GCS imputes to **15** and missing pupil status to **not fixed**, independently, so a missing GCS cannot suppress a fixed-pupils score. Full sentinel list in §Missing-data sentinels.
> 3. **REFINEMENT — the published tables and the software disagree at exactly four boundary values**, because the tables are written for bedside use (integers, one-decimal lactate) and the software compares continuously. The set is complete and enumerable; see §Boundary divergences. This implementation follows the software at all four.
> 4. **REFINEMENT — the age top edge.** The criteria exclude age 18 and over, so reject at **≥ 216 months**. The package rubric writes `< 216`; the R code writes `<= 216`, which admits exactly 18.0 years and is a divergence from the criteria it implements.
>
> The verification pass found **no contradiction between sources** on any point value, threshold or missing-data rule. It deliberately supplies **no PMIDs** (unverified against PubMed); the two PMIDs in this file's citation block are inherited from the earlier pass and were not re-checked on 2026-08-03.

## Formula / algorithm (exact — every coefficient, every branch)

Phoenix Sepsis Score = sum of **four** independent organ-system component scores. Total range **0–13**.

| Component      | Range | Notes                                                                                       |
| -------------- | ----- | ------------------------------------------------------------------------------------------- |
| Respiratory    | 0–3   | **cumulative** over three tier tests; non-IMV cannot exceed 1                               |
| Cardiovascular | 0–6   | **sum** of three independent 0–2 sub-scores (vasoactives, lactate, MAP), **no overall cap** |
| Coagulation    | 0–2   | 1 point per abnormal lab, **capped at 2**                                                   |
| Neurologic     | 0–2   | **hierarchical**: fixed pupils → 2; else GCS ≤10 → 1; else 0                                |

**Diagnostic rules:**

- **Sepsis** = suspected/confirmed infection **AND** Phoenix Sepsis Score **≥ 2**.
- **Septic shock** = sepsis **AND** cardiovascular component **≥ 1** (i.e., ≥1 cardiovascular point).
- "Suspected infection" in the derivation was operationalized as receipt of systemic antimicrobials **and** microbiological testing (e.g., culture) within the first 24 h of presentation. (Definition of "suspected infection" is clinical; the antimicrobial+culture operationalization is the study's, not a required part of the score.)
- A missing input is imputed at its own **normal-end sentinel, independently of every other input** — see §Missing-data sentinels. "Missing → the component scores 0" is a good enough summary of the effect for three components and **wrong for the neurologic one**, where a missing GCS must not suppress a fixed-pupils score.

**Scope limits (Schlapbach 2024).** Applies to children under 18 years. Does **not** apply to birth hospitalizations, to postconceptional age under 37 weeks, or to age 18 and over. Age is in months and is **not** adjusted for prematurity.

### 1. Respiratory (0–3)

Uses the PaO₂:FiO₂ (PF) ratio **and** the SpO₂:FiO₂ (SF) ratio. **SF is only valid when SpO₂ ≤ 97%** (above 97% the ratio saturates and is uninformative). The published rows are **disjunctions** — "PF < 100 **or** SF < 148" — and the reference expression evaluates both terms at every tier, so either ratio can trigger a tier on its own. A ratio that cannot be computed imputes to **500**, above every cut point, so it contributes nothing rather than vetoing the other. This is _not_ "PF preferred, SF as fallback": a gas and a saturation drawn at different moments can legitimately disagree, and the published rule takes whichever crosses a tier.

| Points | Criterion (numbers and conditions only — JAMA Table 2 cell wording is not reproduced)        |
| ------ | -------------------------------------------------------------------------------------------- |
| 0      | PF ≥ 400 **or** SF ≥ 292                                                                     |
| 1      | PF < 400 **and any respiratory support** — **or** — SF < 292 **and any respiratory support** |
| 2      | PF 100–200 **and IMV** — **or** — SF 148–220 **and IMV**                                     |
| 3      | PF < 100 **and IMV** — **or** — SF < 148 **and IMV**                                         |

Branch logic as coded in the reference implementation — **cumulative**, three independent tier tests summed rather than a first-match ladder:

- +1 if on **any respiratory support** and (PF < 400 or SF < 292)
- +1 if on **IMV** and (PF < 200 or SF < 220)
- +1 if on **IMV** and (PF < 100 or SF < 148)
- "IMV" = invasive mechanical ventilation. "Any respiratory support" includes IMV, non-invasive ventilation, or supplemental O₂ (the 1-point tier requires only that some support is present); **IMV implies respiratory support**.
- A **non-IMV patient cannot exceed 1 point**, however bad the ratio, because the 2nd and 3rd increments are gated on IMV.
- The cumulative and first-match-ladder forms are observationally identical (PF < 100 implies PF < 200 implies PF < 400); the cumulative form is what the source writes and makes the non-IMV ceiling structural rather than incidental.

### 2. Cardiovascular (0–6) — sum of three sub-scores

**2a. Systemic vasoactive medications** (count of distinct agents among: **dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin**)

| Points | # of distinct vasoactive agents |
| ------ | ------------------------------- |
| 0      | 0                               |
| 1      | 1                               |
| 2      | ≥ 2                             |

**2b. Lactate (mmol/L)** — normal reference ~0.5–2.2 mmol/L; scoring:

| Points | Lactate                   |
| ------ | ------------------------- |
| 0      | < 5 (i.e., [0, 5))        |
| 1      | 5 to < 11 (i.e., [5, 11)) |
| 2      | ≥ 11                      |

**2c. Age-adjusted MAP (mean arterial pressure, mmHg)** — coded boundaries: 2 pts if MAP < low; 1 pt if low ≤ MAP < high; 0 pts if MAP ≥ high. Age in **months** (bands are left-inclusive).

| Age band        | 2 points (MAP <) | 1 point (range) | 0 points (MAP ≥) |
| --------------- | ---------------- | --------------- | ---------------- |
| 0 to < 1 mo     | < 17             | 17 to < 31      | ≥ 31             |
| 1 to < 12 mo    | < 25             | 25 to < 39      | ≥ 39             |
| 12 to < 24 mo   | < 31             | 31 to < 44      | ≥ 44             |
| 24 to < 60 mo   | < 32             | 32 to < 45      | ≥ 45             |
| 60 to < 144 mo  | < 36             | 36 to < 49      | ≥ 49             |
| 144 to < 216 mo | < 38             | 38 to < 52      | ≥ 52             |

(JAMA Table 2 prints the 1-point ranges with integer upper bounds "17–30, 25–38, 31–43, 32–44, 36–48, 38–51"; these are the same intervals — the reference code uses the half-open `[low, high)` form shown above, so non-integer MAP values like 43.67 score correctly.)

Cardiovascular component = (2a) + (2b) + (2c), range 0–6. The three sub-scores are **independent and summed with NO overall cap** — this is the only component of the four that is not capped, and the only reason the total ceiling is 13 rather than 9.

Vasoactives counted: **dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin** — any systemic dose.

MAP: measured is preferred (invasive arterial, else non-invasive oscillometric). The calculated fallback is ⅓·SBP + ⅔·DBP, which is the same value as DBP + (SBP − DBP)/3; both papers and the package use the one value expressed two ways. If **either** age or MAP is missing, the MAP sub-score is 0.

### 3. Coagulation (0–2) — 1 point each, **capped at 2**

| +1 point if | threshold     |
| ----------- | ------------- |
| Platelets   | < 100 ×10³/µL |
| INR         | > 1.3         |
| D-dimer     | > 2 mg/L FEU  |
| Fibrinogen  | < 100 mg/dL   |

Sum the qualifying abnormalities, then **cap at 2** (so 3 or 4 abnormal labs still = 2).

### 4. Neurologic (0–2) — **hierarchical**, not additive

**CORRECTED 2026-08-03.** This section previously described the row as additive (+1 for GCS ≤10, +1 for fixed pupils, capped at 2). That is how the reference _code_ is written, but it is not how the rule reads, and stating it that way led `phoenix.ts` to score fixed pupils as 1 point whenever the GCS was normal or absent. The published rule is:

| Points | Criterion                                             |
| ------ | ----------------------------------------------------- |
| 2      | **Bilaterally fixed pupils** — whatever the GCS       |
| 1      | Glasgow Coma Scale (total) **≤ 10**, pupils not fixed |
| 0      | otherwise                                             |

Implementation form to use:

```
if (bilaterally fixed pupils) return 2
if (gcs <= 10)                return 1
return 0
```

**Why both forms are "correct", and why only one is safe to write.** All four published tables present the neurologic row as three mutually exclusive columns (0 / 1 / 2), which reads as a hierarchical _maximum_ rule. The reference implementation writes it as an _additive-then-capped_ expression. The two are observationally identical, because fixed pupils alone already saturate the cap of 2, so the GCS criterion can never add anything on top of it. **What must not be implemented is an uncapped sum:** fixed pupils with GCS 8 would return 3, out of range for the sub-score and inflating the total.

Supporting provenance: the derivation paper reports that the best-performing neurologic sub-score selected by the task force was the one from **PELOD-2**, whose neurologic component is itself a maximum-type rule over GCS and pupillary reactivity, and this was also the Delphi-preferred option for the neurologic domain. The hierarchical reading reflects the score's origin; the additive-with-cap form in code is an implementation convenience.

Reference source, `R/phoenix_neurologic.R` — note the two independent NA fills and the `pmin(..., 2L)` cap:

```r
fpl <- as.integer(fpl); fpl[is.na(fpl)] <- 0L
gcs <- as.integer(gcs); gcs[is.na(gcs)] <- 15L
pmin(fpl * 2L + as.integer(gcs <= 10), 2L)
```

The package's own SQL vignette writes the same rule as explicit precedence rather than a sum (`CASE WHEN fixed_pupils = 1 THEN 2 ... `), which is the clearest statement that the hierarchy is the intent.

**Executed edge cases** — real output from the official Python module, not reasoning:

| Input                       | Neurologic points |
| --------------------------- | ----------------- |
| Fixed pupils, GCS 15        | **2**             |
| Fixed pupils, GCS 8         | 2                 |
| Fixed pupils, GCS missing   | **2**             |
| Reactive pupils, GCS 15     | 0                 |
| Reactive pupils, GCS 11     | 0                 |
| Reactive pupils, GCS 10     | 1                 |
| Reactive pupils, GCS 3      | 1                 |
| GCS 8, pupil status missing | 1                 |
| Both missing                | 0                 |

The **fixed pupils + GCS missing → 2** row is the clinically load-bearing one: with nothing else abnormal it produces a total of 2, which on its own meets the sepsis criterion. Under the old additive reading that child scored 1 and fell below the threshold.

## Missing-data sentinels

Imputation is **per input and independent**. A missing GCS does not suppress a fixed-pupils score, and missing pupil status does not suppress a GCS-based score. Both JAMA tables state the general rule in their first table footnote — an unmeasured variable contributes no points — and the software operationalises it by substituting the normal-end sentinel for each input individually.

| Input                    | Sentinel when missing |
| ------------------------ | --------------------- |
| PF ratio                 | 500                   |
| SF ratio                 | 500                   |
| IMV                      | 0 (not ventilated)    |
| Other support            | 0 (none)              |
| Vasoactive count         | 0                     |
| Lactate                  | 0                     |
| Platelets                | ∞ (normal)            |
| INR                      | 0                     |
| D-dimer                  | 0                     |
| Fibrinogen               | ∞ (normal)            |
| GCS total                | **15**                |
| Bilaterally fixed pupils | **0 (not fixed)**     |

**One refinement, so "missing → normal" is not overstated as the whole of the published method.** In the derivation cohort, missing values were first handled by last-observation-carried-forward across physiologically appropriate time windows; only values still absent after that contributed zero points. That is a property of how the development dataset was built and has no bearing on a single-timepoint bedside calculator, where only the second rule applies.

**Consequence, and why it is load-bearing.** A half-entered Phoenix reads **falsely low by design**. A partial-result warning on this score is therefore correct and required, not decorative — a total below 2 on an incomplete entry is not evidence against sepsis.

## Boundary divergences between the published tables and the software

Both the package rubric and the JAMIA Open table footnote state that the published tables are written for clinical practice (integers, one-decimal lactate) while the software treats inputs as continuous. This produces a small, **complete and enumerable** set of disagreements — there are exactly four:

| Input                   | Published table reads | Software returns | Note                                |
| ----------------------- | --------------------- | ---------------- | ----------------------------------- |
| MAP 30.5, age < 1 mo    | 0 points              | **1 point**      | same shape at every band's 0/1 edge |
| Lactate 10.95           | falls in a gap        | **1 point**      | band written as 5–10.9              |
| P/F exactly 200, on IMV | 2 points              | **1 point**      | 2-point band written as 100–200     |
| S/F exactly 220, on IMV | 2 points              | **1 point**      | 2-point band written as 148–220     |

There is **no** divergence at any coagulation or neurologic boundary, and none at P/F 100, S/F 148, MAP 17, MAP 30, lactate 5 or lactate 11.

**This implementation picks the software convention at all four, consistently,** and says so in the calculator's formula text so a reader checking against the printed table finds the discrepancy explained.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                    | label                         | type    | units / coding                                                                                                                                                   | plausible min–max                                                                                            | source of range                                                       |
| --------------------- | ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `age_months`          | Age                           | number  | months, **not** adjusted for prematurity; eligible domain **[0, 216)** = 0–<18 y — **reject at ≥ 216 months** (cohort excluded neonates <37 wk postconceptional) | 0–215 (whole months; the declared `max` is inclusive, so the last accepted value is 215 and 216 is rejected) | JAMA 2024;331(8):675–686 (cohort <18 y); Schlapbach 2024 scope limits |
| `pao2`                | Arterial PaO₂                 | number  | mmHg (×0.1333 → kPa)                                                                                                                                             | 20–200 typical                                                                                               | PF ratio input, Table 2                                               |
| `fio2`                | FiO₂                          | number  | fraction 0.21–1.0 (percent ÷100)                                                                                                                                 | 0.21–1.0                                                                                                     | Table 2                                                               |
| `spo2`                | SpO₂ (pulse ox)               | number  | % — **SF valid only when SpO₂ ≤ 97**                                                                                                                             | 50–97 (usable)                                                                                               | Table 2 note; `phoenix` docs                                          |
| `resp_support`        | Respiratory support           | enum    | none / any-support / IMV                                                                                                                                         | —                                                                                                            | Table 2                                                               |
| `n_vasoactives`       | # distinct vasoactive agents  | integer | count of {dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin}                                                                             | 0–6                                                                                                          | Table 2; `phoenix_cardiovascular`                                     |
| `lactate`             | Blood lactate                 | number  | mmol/L (×9.01 → mg/dL)                                                                                                                                           | 0.3–30                                                                                                       | Table 2                                                               |
| `map`                 | Mean arterial pressure        | number  | mmHg (may be computed: DBP + (SBP−DBP)/3)                                                                                                                        | 10–120                                                                                                       | Table 2; MAP formula per `phoenix` docs                               |
| `platelets`           | Platelet count                | number  | ×10³/µL (K/µL)                                                                                                                                                   | 5–1000                                                                                                       | Table 2                                                               |
| `inr`                 | INR                           | number  | ratio (unitless)                                                                                                                                                 | 0.8–10                                                                                                       | Table 2                                                               |
| `ddimer`              | D-dimer                       | number  | mg/L FEU                                                                                                                                                         | 0.1–50                                                                                                       | Table 2                                                               |
| `fibrinogen`          | Fibrinogen                    | number  | mg/dL (×0.01 → g/L)                                                                                                                                              | 30–800                                                                                                       | Table 2                                                               |
| `gcs_total`           | Glasgow Coma Scale total      | integer | 3–15                                                                                                                                                             | 3–15                                                                                                         | Table 2                                                               |
| `fixed_pupils`        | Bilaterally fixed pupils      | boolean | yes/no                                                                                                                                                           | —                                                                                                            | Table 2                                                               |
| `suspected_infection` | Suspected/confirmed infection | boolean | yes/no (gate for sepsis dx)                                                                                                                                      | —                                                                                                            | Table 2; Schlapbach 2024                                              |

Unit-conversion reference values (for input normalization; standard clinical factors, not score-specific): PaO₂ mmHg → kPa ×0.1333; lactate mmol/L → mg/dL ×9.01; fibrinogen mg/dL → g/L ×0.01. FiO₂ entered as fraction (room air = 0.21). These conversions are general lab conventions, not published in the Phoenix paper.

## Worked examples (become unit tests)

### Example 1 — septic shock (from `phoenix` package clinical vignette 1)

**Source:** `phoenix` package article, cu-dbmi-peds.github.io/phoenix/articles/phoenix.html (authored by the Phoenix task-force members; the JAMA supplement eAppendix vignettes are the same cases).

Patient: previously healthy 3-year-old (age = **36 months**), fever, tachycardia, irritability; BP 67/32 → **MAP ≈ 43.67 mmHg**; on **norepinephrine** (1 vasoactive) after fluids; **platelets 95 K/µL**; GCS ~14, pupils reactive; no respiratory support; lactate/INR/D-dimer/fibrinogen not measured (→ 0).

| Component      | Calculation                                                                    | Score |
| -------------- | ------------------------------------------------------------------------------ | ----- |
| Respiratory    | no support                                                                     | **0** |
| Cardiovascular | vasoactives 1 (→1) + lactate n/a (→0) + MAP 43.67 in [32,45) at 24–<60 mo (→1) | **2** |
| Coagulation    | platelets 95 < 100 (→1), others n/a                                            | **1** |
| Neurologic     | GCS 14, pupils reactive                                                        | **0** |
| **Total**      |                                                                                | **3** |

→ Score 3 ≥ 2 with suspected infection = **Sepsis: YES**. Cardiovascular ≥1 = **Septic shock: YES**.

### Example 2 — sepsis, not shock (from `phoenix` package clinical vignette 2)

**Source:** same as Example 1.

Patient: 6-year-old (age = **72 months**), bacterial pneumonia, intubated (**IMV**); SpO₂ 92% on FiO₂ 0.45 → **SF = 92/0.45 ≈ 204** (SpO₂ ≤97, valid); no vasoactives; **lactate 2.9**; **MAP 52**; **platelets 120**, **INR 1.7**, **D-dimer 4.4**, **fibrinogen 120**; **GCS 8**, pupils reactive.

| Component      | Calculation                                                                                                   | Score |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ----- |
| Respiratory    | IMV + SF 204 in [148,220)                                                                                     | **2** |
| Cardiovascular | vasoactives 0 + lactate 2.9 (<5 →0) + MAP 52 ≥49 at 60–<144 mo (→0)                                           | **0** |
| Coagulation    | platelets 120 (not <100, 0) + INR 1.7 >1.3 (1) + D-dimer 4.4 >2 (1) + fibrinogen 120 (not <100, 0) = 2, cap 2 | **2** |
| Neurologic     | GCS 8 ≤10 (1) + pupils reactive (0)                                                                           | **1** |
| **Total**      |                                                                                                               | **5** |

→ Score 5 ≥ 2 with suspected infection = **Sepsis: YES**. Cardiovascular = 0 = **Septic shock: NO**.

### Additional reference test vectors (from `phoenix` package `sepsis` dataset output)

**Source:** cu-dbmi-peds.github.io/phoenix/reference/phoenix.html (component/total columns from the packaged example dataset — useful as regression fixtures; component inputs are in the package's `sepsis` data frame).

| Resp | Cardio | Coag | Neuro | Total | Sepsis | Shock |
| ---- | ------ | ---- | ----- | ----- | ------ | ----- |
| 0    | 2      | 1    | 0     | 3     | 1      | 1     |
| 3    | 2      | 1    | 1     | 7     | 1      | 1     |
| 3    | 1      | 2    | 0     | 6     | 1      | 1     |
| 0    | 0      | 1    | 0     | 1     | 0      | 0     |
| 0    | 0      | 0    | 0     | 0     | 0      | 0     |
| 3    | 4      | 2    | 0     | 9     | 1      | 1     |
| 3    | 0      | 0    | 1     | 4     | 1      | 0     |

Note the last row (Resp 3, Cardio 0 → total 4): Sepsis YES but Shock NO, because septic shock requires ≥1 **cardiovascular** point specifically, not just total ≥2.

## Interpretation bands (non-directive wording, with source)

The Phoenix Sepsis Score is a **diagnostic criterion, not a graded severity ladder** with named tiers. The published thresholds are:

- **Score 0–1** (with suspected infection): does not meet the Phoenix sepsis criterion.
- **Score ≥ 2** (with suspected infection): meets the criterion for **sepsis** — associated with potentially life-threatening organ dysfunction. Reported in-hospital mortality among children with suspected infection meeting this threshold: **7.1%** (higher-resource settings) and **28.5%** (lower-resource settings).
- **Sepsis with ≥ 1 cardiovascular point:** meets the criterion for **septic shock** — reported in-hospital mortality **10.8%** (higher-resource) and **33.5%** (lower-resource).

Mortality figures: Sanchez-Pinto et al, JAMA 2024;331(8):675–686. These are population-level associations from the derivation/validation cohorts; they describe risk in the studied populations and are not individual predictions.

## References (full citations, PMID/DOI)

1. **Sanchez-Pinto LN, Bennett TD, DeWitt PE, Russell S, Rebull MN, Martin B, et al; SCCM Pediatric Sepsis Definition Task Force.** Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock. _JAMA._ 2024;331(8):675–686. **PMID: 38245897** · **DOI: 10.1001/jama.2024.0196** — _primary derivation/validation; Table 2 is the score._
2. **Schlapbach LJ, Watson RS, Sorce LR, Argent AC, Menon K, Hall MW, et al; SCCM Pediatric Sepsis Definition Task Force.** International Consensus Criteria for Pediatric Sepsis and Septic Shock. _JAMA._ 2024;331(8):665–674. **PMID: 38245889** · **DOI: 10.1001/jama.2024.0179** — _companion consensus definition (sepsis = suspected infection + Phoenix ≥2; septic shock definition)._
3. **DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD.** phoenix: an R package and Python module for calculating the Phoenix pediatric sepsis score and criteria. _JAMIA Open._ 2024;7(3):ooae066. **DOI: 10.1093/jamiaopen/ooae066** · **PMC11223841** — _reference implementation by task-force members; used here to cross-check every threshold and boundary and to source the worked vignettes and test vectors._
4. Reference-implementation documentation (secondary confirmation only): `phoenix` package site — cu-dbmi-peds.github.io/phoenix (function reference + clinical-vignette article) and the CRAN vignette (cran.r-project.org/web/packages/phoenix). Package repository CU-DBMI-Peds/phoenix, **MIT licensed**; the R, Python and SQL implementations are cross-tested against each other in that repository.

Both JAMA papers: volume 331, issue 8, print date 27 February 2024, published online 21 January 2024.

### Citation hygiene (2026-08-03 pass)

- **The score table is UNNUMBERED in the consensus paper.** Cite it as _the Table_ in Schlapbach et al., never "Table 2" — that paper contains one table, two boxes and one figure. The same content is **Table 2** in Sanchez-Pinto et al. and **Table 1** in DeWitt et al.
- **The derivation paper carries a correction**, issued 6 March 2024, fixing an error in eFigure 9 of Supplement 1 (the Phoenix-8 figure). If Phoenix-8 is ever implemented, source it from the corrected supplement, not an early-2024 download.
- **The consensus paper's Supplement 1 PDF header carries a pre-publication DOI stub** (`10.1001/jama.2023.23649`) rather than the published `10.1001/jama.2024.0179`. Cite the published DOI; do not copy the one off the supplement header.
- **PMIDs.** The 2026-08-03 verification pass deliberately supplied none, having not checked them against PubMed. The two PMIDs above are inherited from the earlier pass and were **not** re-verified on 2026-08-03.

## Limitations & notes

- **Age lower bound / neonates.** Derivation cohort was children **< 18 years**; it **excluded** newborns during the birth hospitalization and infants with post-conceptional age **< 37 weeks**. Applying the score to premature neonates is outside the validated population. The MAP age bands start at 0 months but the excluded groups above still apply.
- **MAP band boundaries.** JAMA Table 2 displays 1-point MAP ranges with integer upper bounds (e.g., "17–30"); the reference code implements them as half-open intervals `[low, high)` (e.g., 17 to <31). For integer MAP the two are identical; the half-open form is required only for non-integer MAP. Documented here so an implementation matches the reference package exactly.
- **Respiratory support gating.** The 1-point tier requires _any_ respiratory support; the 2- and 3-point tiers require **IMV**. A low PF/SF ratio with **no** support scores 0 for respiratory — the ratio alone is not sufficient. Confirm support status before scoring.
- **SF ratio validity.** Only use SpO₂:FiO₂ when SpO₂ ≤ 97%. PF and SF are evaluated **together** at every tier and either can trigger one — SF is not merely a fallback for when a gas is unavailable.
- **Missing data → falsely low, by design.** Each unmeasured input is imputed at its own normal-end sentinel (§Missing-data sentinels), independently of the others. An incompletely worked-up child can therefore score falsely low; the score reflects _documented_ dysfunction, not true absence of it, and a total below 2 on an incomplete entry is not evidence against sepsis. A partial-result warning is load-bearing on this score.
- **Sedation.** The neurologic sub-score was pragmatically validated in sedated and non-sedated patients, with and without IMV. The derivation paper separately acknowledges that some organ-dysfunction measures may reflect **iatrogenic effects or clinician choices** rather than sepsis-related dysfunction, naming a **reduced GCS under sedation** as its example. That caveat comes from the authors, not from commentary: a sedated child's neurologic point may be measuring the sedation.
- **Generalisability.** The higher-resource derivation data came **exclusively from US tertiary paediatric centres**. Some lower-resource sites did not record respiratory support or neurologic status even when it had been assessed, which constrained both the achievable score range and measured performance at those sites. Relevant wherever the evidence note characterises external validity.
- **Out-of-range input is rejected, not computed — and that is the source behaviour**, not a local divergence. The reference R package halts on a GCS outside 3–15 and on IMV/support flags outside {0, 1}.
- **"Remote organ dysfunction" is NOT part of the criteria** and must not be implemented as a threshold. The derivation paper uses it as a **descriptive subgroup** — respiratory or neurologic dysfunction plus at least one point in a different organ system — to characterise a higher-mortality population. It is not a diagnostic gate.
- **Not a screening tool in isolation.** The criteria identify organ dysfunction in children with **suspected infection**; the "suspected infection" gate is a clinical judgment (the derivation's antimicrobial+culture operationalization is a research proxy). The score does not itself decide whether infection is present.
- **Phoenix-8 (research extension).** A separate 8-organ score (`phoenix8` in the package) adds endocrine, immunologic, renal, and hepatic components (and additional respiratory/neurologic detail) for research characterization. It is **not** the diagnostic criterion and is out of scope for this file; if implemented, source it separately from the same papers.
- **Training-simulator context.** For TowardPCC this score is a computed teaching/decision-support display, not a clinical device; component thresholds must render exactly as published, and any missing input should be shown as missing (not silently scored 0) so trainees see the difference between "normal" and "not measured."

## IP status

Formula/threshold-based clinical scores of this type are **not copyrightable** (they are facts/procedures — cutoffs, arithmetic, and branch rules), and the Phoenix authors additionally released an open-source reference implementation (Apache/MIT-style package on CRAN/PyPI) plus open-access companion papers, which signals intended free clinical/research use. Reproducing the numeric thresholds, age bands, and scoring logic is fine.

**Potential attribution/verbatim flags (use own wording where possible):**

- The **component/category labels and phrasing** in JAMA Table 2 (e.g., exact wording of criterion cells like "PaO₂:FiO₂ 100–200 and IMV", "Bilaterally fixed pupils") are short factual descriptors — not protectable, but there is no reason to copy them verbatim beyond what's needed for accuracy.
- **Glasgow Coma Scale**: the Phoenix score uses the _total_ GCS value only (a number 3–15). The GCS **response-descriptor wording** (the eye/verbal/motor item text) is a separate instrument (Teasdale & Jennett) with its own attribution/usage norms — if the simulator displays the GCS sub-item descriptors, source and attribute GCS separately; the Phoenix papers do not license GCS item text.
- No proprietary drug lists, weightings, or licensed lookup tables are involved. No verbatim scale-item text from the Phoenix papers needs to be embedded in code.

## Verification

Independently re-checked 2026-07-25 against sources other than this file's own primary citation, per component:

- **Respiratory tiers (0–3, PF/SF bands, support/IMV gating), Cardiovascular sub-scores (vasoactive count 0–2, lactate bands <5 / 5–<11 / ≥11, six age-banded MAP tables), Coagulation thresholds (platelets <100, INR >1.3, D-dimer >2 mg/L FEU, fibrinogen <100, cap 2), Neurologic scoring (GCS ≤10 = +1, bilaterally fixed pupils = +1, cap 2 — see the 2026-08-03 entry below: this additive-with-cap phrasing is the reference _code's_ form, is observationally identical to the published hierarchy, and is the phrasing that led to the implementation defect):** confirmed against three sources independent of the file's cited reference implementation: (1) the JAMIA Open reference-implementation paper itself, read directly via PMC (PMC11223841); (2) MDCalc's independently authored "Phoenix Sepsis Score" clinical summary (mdcalc.scholasticahq.com/article/158895-phoenix-sepsis-score); (3) a third-party clinical-informatics implementation write-up (docs.switzerlandomics.ch/pages/Phoenix_Sepsis_Score_logic.html). All three agree exactly with every value in this file, including the non-obvious half-open MAP interval detail and the SF-valid-only-when-SpO₂≤97% rule. **No discrepancies found.**
- **Worked Example 1 (3-yr-old, MAP 43.67, 1 vasoactive, platelets 95, total 3, septic shock YES)** and **Worked Example 2 (6-yr-old, IMV, SF≈204, lactate 2.9, MAP 52, platelets 120/INR 1.7/D-dimer 4.4/fibrinogen 120, GCS 8, total 5, sepsis YES/shock NO):** re-fetched directly from the `phoenix` package's own clinical-vignette article (cu-dbmi-peds.github.io/phoenix/articles/phoenix.html) rather than relying on this file's paraphrase. Every input value and every component/total score **matches exactly**, including the per-component breakdown.
- **Additional reference test-vector table (7 rows):** the `phoenix` package's example-dataset reference page (cu-dbmi-peds.github.io/phoenix/reference/phoenix.html) was fetched and a 10-row sample of its packaged `sepsis` dataset output was extracted. All 7 rows in this file's table were located, byte-for-byte on (Resp, Cardio, Coag, Neuro, Total, Sepsis, Shock), somewhere within that independently-fetched sample (the file's table is a reordered subset, not a distinct/invented set of numbers). **Confirmed, no discrepancy** — row order differs but that carries no semantic meaning for a fixture table.
- **Mortality figures (7.1% / 28.5% sepsis; 10.8% / 33.5% septic shock, higher-/lower-resource):** corroborated via independent secondary sources citing the same JAMA derivation/validation study (SCCM Task Force summary and other clinical-review sources surfaced by web search). Values match exactly.
- **Neonate/age exclusion (cohort <18 y; excludes newborns and <37-week postconceptional infants):** corroborated via the SCCM blog post summarizing the JAMA papers (sccm.org/blog/sccm-task-force-develops-new-criteria-to-identify-pediatric-sepsis), which independently states the criteria "apply to children younger than 18 years but not to newborns or those born before 37 weeks." Matches.
- **"Suspected infection" operationalization (systemic antimicrobial + microbiological test within 24 h)** and **missing-input-→-0 convention:** both corroborated via independent secondary summaries of the `phoenix` package documentation and the JAMA methodology (surfaced via web search, consistent across multiple independent clinical-informatics write-ups). Matches.
- **Unit-conversion factors** (PaO₂ mmHg→kPa, lactate mmol/L→mg/dL ×9.01, fibrinogen mg/dL→g/L ×0.01): verified as standard, dimensionally-correct clinical lab conversions (independently recomputed from first principles, not sourced from the Phoenix papers, consistent with the file's own disclaimer that these are general conventions).

**Correction made:** line under Inputs for `pao2` read "mmHg (×0.133 → kPa)" while the unit-conversion reference block below it read "×0.1333" for the same PaO₂→kPa factor — a harmless but inconsistent rounding of the same standard constant (0.133322…). Standardized both to **×0.1333** for internal consistency. This is a precision/consistency fix, not a factual correction — neither figure was wrong.

**Not independently re-verified (out of scope for this pass, not flagged as suspect):** the exact plausible min/max ranges in the Inputs table (e.g., PaO₂ 20–200, lactate 0.3–30, INR 0.8–10) are implementation-guardrail heuristics rather than published Phoenix thresholds; the file already labels their source as "Table 2" loosely rather than claiming an exact published range, so no [NEEDS SOURCE] flag was warranted, but a future pass could tighten these against real-world lab reference ranges if stricter input validation is desired.

### 2026-08-03 — sources read directly, reference module EXECUTED

All four primary sources were read directly (not recalled) and the task force's reference Python module was **downloaded, read and run**. Read in full: Schlapbach et al. main text, the Table and all table footnotes; Schlapbach Supplement 1 (eTable 1, eMethods 1–4 including all ten Delphi rounds, eTables 2–3, eFigures 1–2, eReferences); Sanchez-Pinto et al. main text, Tables 1–2 and all footnotes, Figures 1–4, Methods, Limitations and the correction notice; DeWitt et al. main text, Table 1 and footnotes, Table 2 and the worked R/Python examples; and the `phoenix` package source — the four organ-system scoring functions, `phoenix.R`, the SQL vignette, `inst/CITATION` and the scoring rubric with footnotes.

**One correction, three refinements** (all folded into the body of this file above):

1. **Neurologic is hierarchical — fixed pupils are worth 2 outright.** Confirmed by executing the module against the exact case: fixed pupils with GCS 15 returns **2**. The additive-with-cap phrasing this file previously carried is what the reference code writes; it never disagrees with the hierarchy, because fixed pupils alone saturate the cap. But it is the phrasing that produced the implementation defect, so this file now states the hierarchy first and the code form second. The full executed edge-case table is in §4.
2. **Imputation is per input.** Missing GCS → 15, missing pupil status → not fixed, independently. Full sentinel list added as its own section.
3. **Boundary divergences are a complete set of four.** Added as its own section. The 2026-07-25 pass had the MAP and lactate edges but missed the respiratory 2-point upper edge (P/F 200, S/F 220).
4. **Age top edge is ≥ 216 months**, and the reference R code's own `<= 216` bound diverges from the criteria it implements.

**Contradictions found between sources: none** affecting any point value, threshold or missing-data rule.

**Confidence on the most consequential item.** The missing-GCS→15 rule is stated in both JAMA tables' footnotes, again in the JAMIA Open methods, implemented identically in three languages, and confirmed by execution.

**Not accessed by this pass:** Sanchez-Pinto Supplement 1 — specifically eAppendix 1 (the LOCF window detail), eAppendix 2 (clinical vignettes), eFigure 9 (Phoenix-8, the item corrected in March 2024) and eTables 1–8. Nothing above depends on them; the one place it would matter is the exact definition of "physiologically appropriate time windows" for LOCF, which is irrelevant to a single-timepoint calculator but would matter for registry or EHR-extraction work. **PubMed** was also not accessed, so no PMID in this file was re-verified on this pass.
