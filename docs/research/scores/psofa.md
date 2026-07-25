# pSOFA (Pediatric Sequential Organ Failure Assessment) Score

> Source of record: Matics TJ, Sanchez-Pinto LN. _Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children._ **JAMA Pediatr.** 2017;171(10):e172352. **PMID: 28783810** · **DOI: 10.1001/jamapediatrics.2017.2352**
>
> The full scoring table below is taken from that paper (article Table 1 / eTable). Every numeric threshold reproduced here was cross-checked against the PMC full text (PMC6583375) and one secondary calculator source (medicalcriteria.com); the two agreed. No value on this page is inferred or invented.

## Formula / algorithm (exact — every coefficient, every branch)

pSOFA = sum of six independent organ-system subscores, each 0–4. Total range **0–24**. Higher = more organ dysfunction. Each subscore is the **worst (highest-qualifying) value** observed in the assessment window for that organ system.

The six subscores are: Respiratory, Coagulation, Hepatic, Cardiovascular, Neurologic, Renal.

### 1. Respiratory (PaO₂:FiO₂ or SpO₂:FiO₂)

| Subscore | PaO₂:FiO₂ | SpO₂:FiO₂ | Condition                    |
| -------- | --------- | --------- | ---------------------------- |
| 0        | ≥400      | ≥292      | —                            |
| 1        | 300–399   | 264–291   | —                            |
| 2        | 200–299   | 221–264   | —                            |
| 3        | 100–199   | 148–220   | **with respiratory support** |
| 4        | <100      | <148      | **with respiratory support** |

Branch rules (from the paper):

- SpO₂:FiO₂ is used only when a PaO₂ is not available. **Only SpO₂ measurements ≤97% are used** to compute SpO₂:FiO₂ (above 97% the ratio saturates and is uninformative).
- Subscores **3 and 4 require respiratory support** (mechanical ventilation / invasive or non-invasive support). If the PaO₂:FiO₂ / SpO₂:FiO₂ falls in a 3- or 4-level band but the patient is **not** on respiratory support, the criterion for that level is not met (this mirrors adult SOFA). Subscores 0–2 have no support requirement.
- FiO₂ is a fraction 0.21–1.0 in the ratio (e.g., PaO₂ 80 mmHg on FiO₂ 0.5 → 160).
- Boundary note: as published, the SpO₂:FiO₂ upper bounds overlap the next band's lower bound at 264 and 220 (e.g., 264 appears in both the "1" and "2" rows). This is a rounding artifact of converting the PaO₂:FiO₂ cut points; at an exact boundary value assign the **higher** subscore (worst-value rule). [Overlap is verbatim from the published table; the higher-value tie-break is an implementation convention, not stated in the paper — see Limitations.]

### 2. Coagulation (Platelets, ×10³/µL)

| Subscore  | 0    | 1       | 2     | 3     | 4   |
| --------- | ---- | ------- | ----- | ----- | --- |
| Platelets | ≥150 | 100–149 | 50–99 | 20–49 | <20 |

### 3. Hepatic (Total bilirubin, mg/dL)

| Subscore  | 0    | 1       | 2       | 3        | 4     |
| --------- | ---- | ------- | ------- | -------- | ----- |
| Bilirubin | <1.2 | 1.2–1.9 | 2.0–5.9 | 6.0–11.9 | ≥12.0 |

### 4. Cardiovascular (age-adjusted MAP for 0–1; vasoactives for 2–4)

Subscores **0 and 1** are set by mean arterial pressure (MAP, mmHg) against an age band. Subscores **2–4** are set by vasoactive infusion(s), independent of MAP. Take the highest qualifying criterion.

MAP thresholds (mmHg):

| Age band       | Subscore 0 (MAP ≥) | Subscore 1 (MAP <) |
| -------------- | ------------------ | ------------------ |
| <1 month       | ≥46                | <46                |
| 1–11 months    | ≥55                | <55                |
| 12–23 months   | ≥60                | <60                |
| 24–59 months   | ≥62                | <62                |
| 60–143 months  | ≥65                | <65                |
| 144–216 months | ≥67                | <67                |
| >216 months    | ≥70                | <70                |

Vasoactive criteria (doses in µg/kg/min):

| Subscore | Criterion (any one)                                             |
| -------- | --------------------------------------------------------------- |
| 2        | Dopamine ≤5 **or** dobutamine (any dose)                        |
| 3        | Dopamine >5 **or** epinephrine ≤0.1 **or** norepinephrine ≤0.1  |
| 4        | Dopamine >15 **or** epinephrine >0.1 **or** norepinephrine >0.1 |

### 5. Neurologic (Glasgow Coma Scale, total)

| Subscore | 0   | 1     | 2     | 3   | 4   |
| -------- | --- | ----- | ----- | --- | --- |
| GCS      | 15  | 13–14 | 10–12 | 6–9 | <6  |

### 6. Renal (age-adjusted serum creatinine, mg/dL)

| Age band       | Subscore 0 | Subscore 1 | Subscore 2 | Subscore 3 | Subscore 4 |
| -------------- | ---------- | ---------- | ---------- | ---------- | ---------- |
| <1 month       | <0.8       | 0.8–0.9    | 1.0–1.1    | 1.2–1.5    | ≥1.6       |
| 1–11 months    | <0.3       | 0.3–0.4    | 0.5–0.7    | 0.8–1.1    | ≥1.2       |
| 12–23 months   | <0.4       | 0.4–0.5    | 0.6–1.0    | 1.1–1.4    | ≥1.5       |
| 24–59 months   | <0.6       | 0.6–0.8    | 0.9–1.5    | 1.6–2.2    | ≥2.3       |
| 60–143 months  | <0.7       | 0.7–1.0    | 1.1–1.7    | 1.8–2.5    | ≥2.6       |
| 144–216 months | <1.0       | 1.0–1.6    | 1.7–2.8    | 2.9–4.1    | ≥4.2       |
| >216 months    | <1.2       | 1.2–1.9    | 2.0–3.4    | 3.5–4.9    | ≥5.0       |

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id               | label                                                                 | type           | units               | conversions                                  | plausible min/max                                                                         |
| ---------------- | --------------------------------------------------------------------- | -------------- | ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `age_months`     | Patient age                                                           | number         | months              | 1 year = 12 months                           | 0 – ~250 (bands cap at ">216 months"; source: Matics 2017 age strata)                     |
| `pao2`           | Arterial PaO₂                                                         | number         | mmHg                | 1 kPa = 7.50062 mmHg                         | ~20 – 600 physiologic; ratio driver [plausible bounds NEEDS SOURCE — not stated in paper] |
| `fio2`           | Fraction inspired O₂                                                  | number         | fraction (0.21–1.0) | percent → fraction: %/100 (e.g., 50% = 0.50) | 0.21 – 1.0                                                                                |
| `spo2`           | Pulse-ox saturation                                                   | number         | %                   | —                                            | 0 – 100; **only values ≤97% used** for SpO₂:FiO₂ (Matics 2017)                            |
| `resp_support`   | On respiratory support (mech. ventilation / invasive or non-invasive) | boolean        | —                   | —                                            | required for respiratory subscores 3–4 (Matics 2017)                                      |
| `platelets`      | Platelet count                                                        | number         | ×10³/µL             | ×10³/µL = ×10⁹/L (numerically equal)         | ~1 – 1000 physiologic [bounds NEEDS SOURCE — not stated in paper]                         |
| `bilirubin`      | Total bilirubin                                                       | number         | mg/dL               | µmol/L → mg/dL: ÷17.104                      | ~0.1 – 50 physiologic [bounds NEEDS SOURCE]                                               |
| `map`            | Mean arterial pressure                                                | number         | mmHg                | MAP ≈ DBP + ⅓(SBP−DBP)                       | ~10 – 150 physiologic [bounds NEEDS SOURCE]                                               |
| `dopamine`       | Dopamine infusion rate                                                | number         | µg/kg/min           | —                                            | 0 – ~50                                                                                   |
| `dobutamine`     | Dobutamine infusion (present at any dose)                             | number/boolean | µg/kg/min           | —                                            | 0 – ~40                                                                                   |
| `epinephrine`    | Epinephrine infusion rate                                             | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                    |
| `norepinephrine` | Norepinephrine infusion rate                                          | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                    |
| `gcs`            | Glasgow Coma Scale total                                              | integer        | points              | —                                            | 3 – 15 (GCS definition)                                                                   |
| `creatinine`     | Serum creatinine                                                      | number         | mg/dL               | µmol/L → mg/dL: ÷88.42                       | age-dependent; see renal table                                                            |

Unit-conversion notes are standard clinical factors (bilirubin, creatinine, kPa); the pSOFA table itself is specified in mg/dL, mmHg, and ×10³/µL, so a platform using SI units must convert before applying thresholds.

## Worked examples

The original paper provides **no worked example**. The three vectors below are **derived step-by-step from the published pSOFA table in Matics & Sanchez-Pinto 2017 (PMID 28783810)** and are intended as unit-test fixtures. Each cites the specific table rows applied.

### Example A — 3-year-old (36 months → 24–59 month band); total = 15

Inputs: intubated (resp_support = true), PaO₂ 80 on FiO₂ 0.6; platelets 45; bilirubin 3.0; norepinephrine 0.05 µg/kg/min; GCS 10; creatinine 1.0.

| System           | Applied rule                                            | Subscore |
| ---------------- | ------------------------------------------------------- | -------- |
| Respiratory      | PaO₂:FiO₂ = 80/0.6 = 133 → 100–199 with support → **3** | 3        |
| Coagulation      | 45 → 20–49 → **3**                                      | 3        |
| Hepatic          | 3.0 → 2.0–5.9 → **2**                                   | 2        |
| Cardiovascular   | norepinephrine 0.05 ≤0.1 → **3**                        | 3        |
| Neurologic       | GCS 10 → 10–12 → **2**                                  | 2        |
| Renal (24–59 mo) | 1.0 → 0.9–1.5 → **2**                                   | 2        |
| **Total**        |                                                         | **15**   |

### Example B — 2-month-old (1–11 month band); total = 3

Inputs: not on respiratory support; SpO₂ 95% on room air (FiO₂ 0.21); platelets 120; bilirubin 0.5; MAP 50, no vasoactives; GCS 15; creatinine 0.35.

| System                   | Applied rule                                                    | Subscore |
| ------------------------ | --------------------------------------------------------------- | -------- |
| Respiratory              | SpO₂ 95% (≤97, valid); SpO₂:FiO₂ = 95/0.21 = 452 → ≥292 → **0** | 0        |
| Coagulation              | 120 → 100–149 → **1**                                           | 1        |
| Hepatic                  | 0.5 → <1.2 → **0**                                              | 0        |
| Cardiovascular (1–11 mo) | MAP 50 < 55, no vasoactives → **1**                             | 1        |
| Neurologic               | GCS 15 → **0**                                                  | 0        |
| Renal (1–11 mo)          | 0.35 → 0.3–0.4 → **1**                                          | 1        |
| **Total**                |                                                                 | **3**    |

### Example C — 14-year-old (168 months → 144–216 month band); maximum = 24

Inputs: intubated; PaO₂ 90 on FiO₂ 1.0; platelets 15; bilirubin 13; epinephrine 0.2 µg/kg/min; GCS 5; creatinine 4.5.

| System             | Applied rule                                        | Subscore     |
| ------------------ | --------------------------------------------------- | ------------ |
| Respiratory        | PaO₂:FiO₂ = 90/1.0 = 90 → <100 with support → **4** | 4            |
| Coagulation        | 15 → <20 → **4**                                    | 4            |
| Hepatic            | 13 → ≥12.0 → **4**                                  | 4            |
| Cardiovascular     | epinephrine 0.2 >0.1 → **4**                        | 4            |
| Neurologic         | GCS 5 → <6 → **4**                                  | 4            |
| Renal (144–216 mo) | 4.5 → ≥4.2 → **4**                                  | 4            |
| **Total**          |                                                     | **24 (max)** |

## Interpretation bands (non-directive wording, with source)

pSOFA is a **continuous 0–24 scale**; the paper does not define discrete clinical severity "bands." The following are the quantitative anchors reported in Matics & Sanchez-Pinto 2017:

- The **maximum pSOFA score** during the encounter showed excellent discrimination for in-hospital mortality: **AUROC 0.94 (95% CI 0.92–0.95)** in the derivation cohort. Higher maximum scores were associated with higher observed in-hospital mortality.
- The authors identified an **optimal cut point of >8 points** (maximum pSOFA) for separating survivors from non-survivors in this cohort. This is a statistically derived threshold in one single-center dataset, not a treatment directive.
- **Sepsis-3 operationalization (for reference, not a severity band):** in a child with confirmed/suspected infection, _sepsis_ was defined as an **acute rise in pSOFA of ≥2 points**; _septic shock_ as sepsis plus vasoactive infusion and serum lactate >2 mmol/L. Observed mortality was 12.1% (sepsis) and 32.3% (septic shock) vs 2.6% overall.

Wording for platform display should remain descriptive (e.g., "higher scores are associated with greater organ dysfunction and higher observed mortality in the validation cohort") rather than prescriptive.

## References (full citations, PMID/DOI)

1. **Matics TJ, Sanchez-Pinto LN.** Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children. _JAMA Pediatr._ 2017;171(10):e172352. **PMID: 28783810.** **DOI: 10.1001/jamapediatrics.2017.2352.** (Primary derivation/validation paper; single-center PICU, 6303 patients / 8711 encounters, Jan 2009–Aug 2016; in-hospital mortality 2.6%.) — full text mirror: PMC6583375.
2. Secondary confirmation of table values only (not a source of any number here): Pediatric Sequential Organ Failure Assessment (pSOFA) Score. MedicalCriteria.com. https://medicalcriteria.com/web/psofa/ (accessed 2026-07-25).

Background lineage (not reproduced numerically on this page): 3. Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. _Intensive Care Med._ 1996;22(7):707-710. **PMID: 8844239.** DOI: 10.1007/BF01709751. (Original adult SOFA that pSOFA adapts.) [Cited as lineage per Matics 2017; not independently fetched for this file — NEEDS SOURCE if any adult-SOFA number is used directly.] 4. Leteurtre S, et al. PELOD-2. _Crit Care Med._ 2013;41(7):1761-1773. **PMID: 23685639.** (Source of the age-adjusted creatinine strata that Matics adapted for the renal subscore, per Matics 2017.) [Cited as lineage per Matics 2017; not independently fetched — NEEDS SOURCE if PELOD-2 values are used directly.]

## Limitations & notes

- **Single-center derivation.** All thresholds and the >8 cut point come from one U.S. PICU cohort. External multi-center validation exists in later literature but is out of scope for this source-of-record file.
- **Respiratory support gate.** Subscores 3–4 require respiratory support. The paper does not spell out the score for a _non-supported_ patient whose ratio falls in a 3/4 band; a defensible implementation caps such a patient at subscore 2 (the highest non-support band). This capping rule is an **implementation decision, not stated in the paper** — flag for clinical sign-off. [NEEDS SOURCE for explicit paper text.]
- **SpO₂:FiO₂ boundary overlap.** The published SpO₂:FiO₂ bands share endpoint values (264, 220) between adjacent rows; the "assign higher subscore at boundary" tie-break is a convention, not paper text.
- **SpO₂ ≤97% rule** must be enforced before computing SpO₂:FiO₂, or oxygenation dysfunction will be systematically underestimated at high saturations.
- **GCS input.** pSOFA consumes only the **total GCS number**, not the individual eye/verbal/motor descriptors. Sedation, intubation, and pre-verbal age all confound GCS in children; the paper does not prescribe an adjustment — document the raw GCS used.
- **Neonatal caveat.** The <1-month band is present, but term-neonate performance is addressed in separate later literature (e.g., nSOFA); do not over-extend pSOFA to neonates without that evidence. [NEEDS SOURCE — outside this file's scope.]
- **Vasoactive subscore** takes the single highest-qualifying agent/dose; concurrent agents are not additive.
- Physiologic plausibility bounds for several raw inputs (platelets, bilirubin, MAP, PaO₂) are **not specified in the paper** and are marked [NEEDS SOURCE] above; use institutional analyzer limits for input validation rather than inventing bounds.

## Verification

Independent re-check performed 2026-07-25 by a second reviewer, against sources distinct from (or in addition to) the file's already-cited secondary source (medicalcriteria.com).

**Primary paper full text (independent fetch of PMC6583375, Matics & Sanchez-Pinto 2017):**

- Respiratory table (PaO₂:FiO₂ and SpO₂:FiO₂, all 5 bands incl. respiratory-support gate on 3–4) — **matches file exactly**.
- SpO₂:FiO₂ boundary overlap at 264 and 220 — **confirmed present in the published table** (independently re-extracted wording: "Boundary values appear as the upper limit of one band and lower limit of the next (264 and 220 appear twice)"), corroborating the file's claim that this is a verbatim table artifact, not an editing error.
- SpO₂ ≤97%-only rule — **confirmed** (PMC Table 1 footnote c: "Only Spo2 measurements of 97% or lower were used in the calculation").
- Coagulation (platelets) table — **matches file exactly** (≥150 / 100–149 / 50–99 / 20–49 / <20).
- Hepatic (bilirubin) table — **matches file exactly** (<1.2 / 1.2–1.9 / 2.0–5.9 / 6.0–11.9 / ≥12.0; the top band boundary is inclusive ≥12.0, consistent with contiguous banding).
- Cardiovascular MAP age-band table (all 7 age bands, scores 0–1) — **matches file exactly**, re-extracted verbatim from Table 1.
- Cardiovascular vasoactive criteria (subscores 2–4: dopamine, dobutamine, epinephrine, norepinephrine thresholds) — **matches file**: score 2 = dopamine ≤5 or dobutamine any dose; score 3 = dopamine >5 or epinephrine ≤0.1 or norepinephrine ≤0.1; score 4 = dopamine >15 or epinephrine >0.1 or norepinephrine >0.1.
- Neurologic (GCS) table — **matches file exactly** (15 / 13–14 / 10–12 / 6–9 / <6).
- Renal creatinine age-band table (all 7 age bands, scores 0–4) — **matches file exactly**, re-extracted verbatim from Table 1 and identical value-for-value to what's reproduced here.
- AUROC for maximum pSOFA vs. in-hospital mortality — **confirmed 0.94 (95% CI, 0.92–0.95)**, quoted verbatim from the paper.
- Optimal cut point — **confirmed** "a score higher than 8 points."
- Sepsis-3 operationalization — **confirmed**: sepsis = acute rise in pSOFA ≥2 points (≤48h before to ≤24h after infection detection/antimicrobial start); septic shock = sepsis + vasoactive infusion + max lactate >2 mmol/L. Mortality **confirmed**: sepsis 12.1%, septic shock 32.3%, overall 2.6%.

**Second independent secondary source (fpnotebook.com, "pSOFA Score"):** structurally consistent with the file for respiratory, cardiovascular (MAP age bands and vasoactive tiers), hepatic, coagulation, and neurologic components. Note: fpnotebook's respiratory band is paraphrased with plain inequalities (e.g., "PaO2/FiO2 <300" for score 2) rather than the paper's closed intervals (200–299) and omits epinephrine from its score-3 vasoactive line — read as this tertiary source's own compression/omission, not evidence against the file, since it disagrees with the primary-source re-extraction on precision, not on the file's numbers. Not used to override anything; only as a lower-weight independent triangulation.

**Worked examples A, B, and C** — recomputed independently by hand against the verified tables above (ratio math, band lookup, and six-subscore sums). All three totals (15, 3, 24) reproduce exactly; every intermediate subscore in every row checks out.

**Result: no discrepancies found.** No numeric correction was necessary anywhere in this file — every coefficient, threshold, and worked-example value already matched the primary source on independent re-fetch. Items the file already flagged `[NEEDS SOURCE]` (physiologic plausibility bounds for PaO₂/platelets/bilirubin/MAP; the non-supported-patient capping convention; direct use of the adult-SOFA or PELOD-2 lineage papers) remain unresolved by this pass — they are genuinely absent from the primary paper's text, not merely unchecked, and are left marked as-is per instruction (no citations removed, nothing invented).

## IP status

- **Formula and thresholds:** pSOFA is a threshold-/formula-based clinical score. Facts, numeric cut points, and mathematical scoring rules are **not copyrightable**; the pSOFA table can be implemented directly. Attribution to Matics & Sanchez-Pinto 2017 is an academic-integrity expectation, not a copyright requirement.
- **No verbatim scale-item prose is reproduced** here. pSOFA's subscores are numeric ranges (platelet counts, ratios, MAP, creatinine, GCS totals) with no descriptive response wording of their own.
- **Component watch — Glasgow Coma Scale:** pSOFA references the GCS _total only_. The GCS's own eye/verbal/motor **response-descriptor wording** is an external instrument that may carry its own usage/attribution terms; because pSOFA uses only the integer total, no GCS descriptor text is (or should be) copied into this platform. If a GCS data-entry widget is built elsewhere, review the descriptor wording separately — **flag**.
- No other component contributes copyrightable item wording.
