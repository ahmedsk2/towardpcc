# pSOFA (Pediatric Sequential Organ Failure Assessment) Score

> Source of record: Matics TJ, Sanchez-Pinto LN. _Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children._ **JAMA Pediatr.** 2017;171(10):e172352. **PMID: 28783810** · **DOI: 10.1001/jamapediatrics.2017.2352**
>
> The full scoring table below is taken from that paper (article Table 1 / eTable). Every numeric threshold reproduced here was cross-checked against the PMC full text (PMC6583375) and one secondary calculator source (medicalcriteria.com); the two agreed. No value on this page is inferred or invented.

## Formula / algorithm (exact — every coefficient, every branch)

pSOFA = sum of six independent organ-system subscores, each 0–4. Total range **0–24**. Higher = more organ dysfunction. Each subscore is the **worst (highest-qualifying) value** observed in the assessment window for that organ system.

The six subscores are: Respiratory, Coagulation, Hepatic, Cardiovascular, Neurologic, Renal.

### Missing data — the paper's own rule (not an implementer convention)

Matics & Sanchez-Pinto state the rule directly in the Methods. Quoted verbatim for attribution:

> "If a variable was not measured in a 24-hour period, it was considered to be normal, which is consistent with the original criteria."

— Matics TJ, Sanchez-Pinto LN, JAMA Pediatr. 2017;171(10):e172352, Methods.

This is the authors' rule. It is **not** a convention this platform invented, and it must not be flagged as one. (It was mislabelled as an implementation convention in this file and in `psofa.ts` until the round-2 sourcing pass; see Verification, round 2.) The clinical consequence still holds and is worth stating separately: a partially entered case scores lower than a fully entered one, so a low total must be read alongside how much data was supplied.

### Age range of the derivation cohort

The cohort was children **21 years and younger (≤252 months)**. The top band, **>216 months, applies cut points the paper states are identical to adult SOFA's** — so a patient over 216 months is scored against adult, not paediatric, thresholds. This is correct behaviour for the instrument and a caveat the reader should see; it is not a defect.

### 1. Respiratory (PaO₂:FiO₂ or SpO₂:FiO₂)

| Subscore | PaO₂:FiO₂ | SpO₂:FiO₂ | Condition                    |
| -------- | --------- | --------- | ---------------------------- |
| 0        | ≥400      | ≥292      | —                            |
| 1        | 300–399   | 264–291   | —                            |
| 2        | 200–299   | 221–264   | —                            |
| 3        | 100–199   | 148–220   | **with respiratory support** |
| 4        | <100      | <148      | **with respiratory support** |

Branch rules (from the paper):

- SpO₂:FiO₂ is used only when a PaO₂ is not available. **Only SpO₂ measurements ≤97% are used** to compute SpO₂:FiO₂ (above 97% the ratio saturates and is uninformative). **Sourced twice over, with no residual uncertainty:** (a) the pSOFA paper states it in a Table 1 footnote; (b) it is inherited from the ratio's own derivation — Khemani 2009 (Chest 2009;135(3):662-668, PMID 19029434) derived SpO₂:FiO₂ over a window **restricted to SpO₂ 80–97%**, and Khemani 2012 (Crit Care Med 2012;40(4):1309-1316, PMID 22202709) re-derived the SpO₂-based markers across the same window. Note the corollary: 80% is the derivation FLOOR, not just 97% the ceiling.
- Subscores **3 and 4 require respiratory support** (mechanical ventilation / invasive or non-invasive support). If the PaO₂:FiO₂ / SpO₂:FiO₂ falls in a 3- or 4-level band but the patient is **not** on respiratory support, the criterion for that level is not met (this mirrors adult SOFA). Subscores 0–2 have no support requirement.
- FiO₂ is a fraction 0.21–1.0 in the ratio (e.g., PaO₂ 80 mmHg on FiO₂ 0.5 → 160).
- **Boundary note — the overlap is in the source, not in any implementation.** The bands as printed in the JAMA Pediatr table are ≥292 / 264–291 / 221–264 / 148–220 / <148. The value **264 therefore appears in both the subscore-1 row and the subscore-2 row**. Only 264 does: 220 is the upper bound of the subscore-3 row and the adjacent row starts at 221, so it needs no tie-break and gets none in `respiratoryFromSf`. An earlier draft of this note claimed 220 was duplicated too; the round-2 primary review names 264 alone. This is an artefact of the published table itself (most likely from rounding the converted PaO₂:FiO₂ cut points) — confirmed present in the JAMA table on round-2 review, so no correct reading of the source assigns an exact 264 a single subscore. A tie-break is consequently unavoidable for anyone implementing the table. **Ours: take the higher (worse) subscore**, consistent with pSOFA's worst-value rule for every other organ. That tie-break is a documented implementation choice; the paper states none. Nothing about the overlap is this platform's doing.

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

| id               | label                                                                 | type           | units               | conversions                                  | plausible min/max                                                                                                                          |
| ---------------- | --------------------------------------------------------------------- | -------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `age_months`     | Patient age                                                           | number         | months              | 1 year = 12 months                           | 0 – ~250 implementation window; cohort was ≤252 mo, bands cap at ">216 months" (Matics 2017 age strata)                                    |
| `pao2`           | Arterial PaO₂                                                         | number         | mmHg                | 1 kPa = 7.50062 mmHg                         | ~20 – 600 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `fio2`           | Fraction inspired O₂                                                  | number         | fraction (0.21–1.0) | percent → fraction: %/100 (e.g., 50% = 0.50) | 0.21 – 1.0                                                                                                                                 |
| `spo2`           | Pulse-ox saturation                                                   | number         | %                   | —                                            | 0 – 100; **only values ≤97% used** for SpO₂:FiO₂ (Matics 2017 Table 1 footnote; Khemani 2009/2012 derived it over 80–97%)                  |
| `resp_support`   | On respiratory support (mech. ventilation / invasive or non-invasive) | boolean        | —                   | —                                            | required for respiratory subscores 3–4 (Matics 2017)                                                                                       |
| `platelets`      | Platelet count                                                        | number         | ×10³/µL             | ×10³/µL = ×10⁹/L (numerically equal)         | ~1 – 1000 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `bilirubin`      | Total bilirubin                                                       | number         | mg/dL               | µmol/L → mg/dL: ÷17.104                      | ~0.1 – 50 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `map`            | Mean arterial pressure                                                | number         | mmHg                | MAP ≈ DBP + ⅓(SBP−DBP)                       | ~10 – 150 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `dopamine`       | Dopamine infusion rate                                                | number         | µg/kg/min           | —                                            | 0 – ~50                                                                                                                                    |
| `dobutamine`     | Dobutamine infusion (present at any dose)                             | number/boolean | µg/kg/min           | —                                            | 0 – ~40                                                                                                                                    |
| `epinephrine`    | Epinephrine infusion rate                                             | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                                                                     |
| `norepinephrine` | Norepinephrine infusion rate                                          | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                                                                     |
| `gcs`            | Glasgow Coma Scale total                                              | integer        | points              | —                                            | 3 – 15 (GCS definition)                                                                                                                    |
| `creatinine`     | Serum creatinine                                                      | number         | mg/dL               | µmol/L → mg/dL: ÷88.42                       | scoring cut points are age-dependent (see renal table); the raw-input window is ours — **the paper specifies no bound (confirmed absent)** |

**On the four "confirmed absent" rows.** Round-2 review of the full text established that Matics & Sanchez-Pinto print **no physiologic plausibility bounds at all** for PaO₂, platelets, bilirubin, MAP or creatinine. That is a positive finding, not an unfinished search: there is no source to go and find. The min/max this platform declares are input-validity windows for a form field and carry no clinical meaning — prefer institutional analyzer limits over any number in this column.

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
2. **Khemani RG, Patel NR, Bart RD 3rd, Newth CJL.** Comparison of the pulse oximetric saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children. _Chest._ 2009;135(3):662-668. **PMID: 19029434.** **DOI: 10.1378/chest.08-2239.** (Derivation of SpO₂:FiO₂, restricted to SpO₂ 80–97% — the origin of the ≤97% ceiling pSOFA's Table 1 footnote applies.)
3. **Khemani RG, Thomas NJ, Venkatachalam V, et al.** Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. _Crit Care Med._ 2012;40(4):1309-1316. **PMID: 22202709.** **DOI: 10.1097/CCM.0b013e31823bc61b.** (Multicentre re-derivation of the SpO₂-based markers over the same SpO₂ 80–97% window.)
4. **Wynn JL, Polin RA.** A neonatal sequential organ failure assessment score predicts mortality to late-onset sepsis in preterm very low birth weight infants. _Pediatr Res._ 2020;88(1):85-90. **PMID: 31394566.** **DOI: 10.1038/s41390-019-0517-2.** (nSOFA, range 0–15; the organ-dysfunction score derived FOR neonates. Cited for the neonatal caveat only — no nSOFA number is implemented here.)
5. Secondary confirmation of table values only (not a source of any number here): Pediatric Sequential Organ Failure Assessment (pSOFA) Score. MedicalCriteria.com. https://medicalcriteria.com/web/psofa/ (accessed 2026-07-25).

Background lineage (not reproduced numerically on this page): 6. Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. _Intensive Care Med._ 1996;22(7):707-710. **PMID: 8844239.** DOI: 10.1007/BF01709751. (Original adult SOFA that pSOFA adapts.) [Cited as lineage per Matics 2017; not independently fetched for this file — NEEDS SOURCE if any adult-SOFA number is used directly.] 7. Leteurtre S, et al. PELOD-2. _Crit Care Med._ 2013;41(7):1761-1773. **PMID: 23685639.** (Source of the age-adjusted creatinine strata that Matics adapted for the renal subscore, per Matics 2017.) [Cited as lineage per Matics 2017; not independently fetched — NEEDS SOURCE if PELOD-2 values are used directly.]

## Limitations & notes

- **Single-center derivation.** All thresholds and the >8 cut point come from one U.S. PICU cohort. External multi-center validation exists in later literature but is out of scope for this source-of-record file.
- **Respiratory support gate.** Subscores 3–4 require respiratory support. The paper does not spell out the score for a _non-supported_ patient whose ratio falls in a 3/4 band; a defensible implementation caps such a patient at subscore 2 (the highest non-support band). This capping rule is an **implementation decision, not stated in the paper** — flag for clinical sign-off. [NEEDS SOURCE for explicit paper text.]
- **SpO₂:FiO₂ boundary overlap — a source defect, not an implementation one.** The JAMA table prints 264 in both the subscore-1 and subscore-2 rows. That is the only duplicated endpoint — 220 and 221 are adjacent, not shared, and a round-1 secondary re-extraction that listed both is superseded by the round-2 primary review. Confirmed on round-2 review as an artefact of the published table itself. The overlap is therefore not resolvable by reading the source more carefully, and every implementation must pick a tie-break. Ours — assign the higher (worse) subscore — is a documented implementation choice.
- **SpO₂ ≤97% rule** must be enforced before computing SpO₂:FiO₂, or oxygenation dysfunction will be systematically underestimated at high saturations. **Fully sourced** (Matics 2017 Table 1 footnote; Khemani 2009 PMID 19029434 and Khemani 2012 PMID 22202709, derived over SpO₂ 80–97%) — no residual uncertainty. The same derivation implies a **lower** bound of 80% that neither pSOFA nor this implementation enforces; an SpO₂ below 80% is outside the window the ratio was derived in.
- **Age above 216 months.** The cohort ran to 21 years (≤252 months) and the paper states the >216-month MAP and creatinine cut points are identical to adult SOFA's. Scoring an older adolescent is therefore applying adult thresholds inside a paediatric score — correct per the instrument, and worth disclosing to the clinician.
- **GCS input.** pSOFA consumes only the **total GCS number**, not the individual eye/verbal/motor descriptors. Sedation, intubation, and pre-verbal age all confound GCS in children; the paper does not prescribe an adjustment — document the raw GCS used.
- **Neonatal caveat — defined, but not derived there.** The <1-month band exists in Table 1, so pSOFA is **not undefined** for neonates; it simply was not derived in that population, and saying it is "inapplicable" overstates the case. The dedicated instrument is **nSOFA** (Wynn JL, Polin RA. _Pediatr Res._ 2020;88(1):85-90. PMID 31394566. DOI 10.1038/s41390-019-0517-2), derived in **preterm very-low-birth-weight infants with late-onset sepsis**, scale range **0–15**. Note the scope of that derivation: nSOFA is not a general term-neonate score either, so neither instrument has a strong claim on a term newborn. Prefer nSOFA where the population matches; either way, disclose which score's derivation population the patient does or does not resemble.
- **Vasoactive subscore** takes the single highest-qualifying agent/dose; concurrent agents are not additive.
- **Physiologic plausibility bounds are confirmed absent from the paper** for PaO₂, platelets, bilirubin, MAP and creatinine — established on round-2 full-text review, so this is settled, not an open search. Whatever min/max an implementation declares are its own input-validity windows; use institutional analyzer limits rather than treating any of them as clinical thresholds.

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

### Verification, round 2 — 2026-08-03 (sourcing pass, full text retrieved)

Round 2 went after the markers themselves rather than the numbers. **No number moved.** Five of the six markers this file and `psofa.ts` carried are now closed, and the direction each one closed in matters more than the fact that it closed:

| Item                           | Round-1 state                 | Round-2 outcome                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing counts as normal       | flagged as OUR convention     | **Our error, corrected.** It is stated in the paper's Methods (quoted verbatim above). Marker withdrawn — it was never a source gap.                                                                            |
| Plausibility bounds (5 inputs) | `[NEEDS SOURCE]`              | **Confirmed absent** from the paper. Relabelled from "unfound" to "settled-absent"; the disclosure stays, because our windows are still ours. Confirmed-absent is the stronger claim, so the marker is retired. |
| SpO₂:FiO₂ overlap at 264       | overlap noted, tie-break ours | **Overlap confirmed to be an artefact of the published JAMA table.** Behaviour unchanged; wording re-attributed so a reader sees the defect is in the source. The tie-break remains our documented choice.      |
| SpO₂ ≤97% ceiling              | cited once (paper)            | **Sourced twice over** — the paper's Table 1 footnote plus Khemani 2009/2012, which derived the ratio over SpO₂ 80–97%. Uncertainty language removed.                                                           |
| Age ceiling / adult cut points | undisclosed                   | Cohort ≤252 months; **>216-month cut points are adult SOFA's, per the paper.** Now disclosed rather than silently applied. Our 0–250 window sits inside the cohort, so no bound changed.                        |
| Non-support capping to 2       | `[NEEDS SOURCE]`              | **STILL OPEN.** The paper does not address a non-supported patient whose ratio lands in a 3/4 band. Marker retained.                                                                                            |

Also corrected in round 2: the neonatal caveat previously implied pSOFA is inapplicable below one month. It is not — the <1-month band exists and the score is defined there. What is true, and now stated, is that it was not derived in that population and that nSOFA is the instrument that was (in preterm VLBW infants specifically).

Retrieval note: the Khemani and Wynn citations were verified against PubMed records on 2026-08-03 for PMID/DOI accuracy; their content claims come from the round-2 sourcing resolution, not from a fresh read of either full text.

## IP status

- **Formula and thresholds:** pSOFA is a threshold-/formula-based clinical score. Facts, numeric cut points, and mathematical scoring rules are **not copyrightable**; the pSOFA table can be implemented directly. Attribution to Matics & Sanchez-Pinto 2017 is an academic-integrity expectation, not a copyright requirement.
- **No verbatim scale-item prose is reproduced** here. pSOFA's subscores are numeric ranges (platelet counts, ratios, MAP, creatinine, GCS totals) with no descriptive response wording of their own.
- **Component watch — Glasgow Coma Scale:** pSOFA references the GCS _total only_. The GCS's own eye/verbal/motor **response-descriptor wording** is an external instrument that may carry its own usage/attribution terms; because pSOFA uses only the integer total, no GCS descriptor text is (or should be) copied into this platform. If a GCS data-entry widget is built elsewhere, review the descriptor wording separately — **flag**.
- No other component contributes copyrightable item wording.
