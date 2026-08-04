# pSOFA (Pediatric Sequential Organ Failure Assessment) Score

> Source of record: Matics TJ, Sanchez-Pinto LN. _Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children._ **JAMA Pediatr.** 2017;171(10):e172352. **PMID: 28783810** · **DOI: 10.1001/jamapediatrics.2017.2352**
>
> The full scoring table below is taken from that paper (article Table 1 / eTable). Every numeric threshold reproduced here was cross-checked against the PMC full text (PMC6583375) and one secondary calculator source (medicalcriteria.com); the two agreed. No value on this page is inferred or invented.
>
> **Provenance upgrade, 2026-08-03:** the founder supplied the primary PDF, and the respiratory row was **read directly from the published table** rather than from a review of a review. Everything on this page attributed to that direct read carries the date; claims still resting on a secondary or second-hand pass say so.

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
- Subscores **3 and 4 require respiratory support**. That is the condition the published table prints — the words in the subscore-3 and subscore-4 cells are "with respiratory support", nothing narrower (round-1 verification read the same gate off the PMC full text; see Verification round 5 for the correction of a narrower paraphrase this file briefly carried). If the PaO₂:FiO₂ / SpO₂:FiO₂ falls in a 3- or 4-level band but the patient is **not** on respiratory support, the criterion for that level is not met (this mirrors adult SOFA). Subscores 0–2 have no support requirement. **The cap follows from those two facts alone**: a patient not on respiratory support cannot meet the 3 or 4 criterion at any ratio, so the highest band open to them is 2. That is a structural entailment of the table, not a decision an implementer makes — see the Limitations bullet, closed 2026-08-04. Note what the argument uses: only **which** bands are gated, never **what counts as** support, so it stands whichever way the next bullet is read.
- **What counts as "respiratory support" is not defined in the paper — the one open question left on this row, and it is a reading, not a missing number.** The table prints the term and neither Table 1 nor the Methods says whether non-invasive support alone satisfies it. Two readings are therefore available: the broad one (any respiratory support, invasive or non-invasive) and the narrow one (invasive mechanical ventilation only). **This platform implements the broad reading** — `psofa.ts`'s `resp_support` is a single boolean satisfied by either — because it is the term as printed, and narrowing it would add a restriction the source does not state. The narrow reading is **not excluded** by the source, and the difference is clinically real: a child on CPAP alone with a 3-band ratio scores 3 here and would score 2 under the narrow reading. This is a documented implementation reading in the same class as the SpO₂:FiO₂ tie-break below — the gate itself is sourced, so no `[NEEDS SOURCE]` marker is raised, and no claim is made about which reading the authors intended.
- FiO₂ is a fraction 0.21–1.0 in the ratio (e.g., PaO₂ 80 mmHg on FiO₂ 0.5 → 160).
- **Boundary note — the overlap is in the source, not in any implementation. Read directly from the published table, 2026-08-03.** The SpO₂:FiO₂ row prints, in order: 292 / 264–291 / 221–264 / 148–220 / <148. The value **264 therefore appears in both the subscore-1 row and the subscore-2 row**, and the published table assigns an exact 264 to two rows at once. Only 264 does: **220 appears once only** — it ends the subscore-3 row and the next row begins at 221 — so 220 needs no tie-break and correctly gets none in `respiratoryFromSf`. (An earlier draft of this note claimed 220 was duplicated too. It is not; that claim came from a second-hand re-extraction and is superseded by the direct read.) The duplication is an artefact of the published table itself, most likely from rounding the converted PaO₂:FiO₂ cut points. No correct reading of the source assigns an exact 264 a single subscore, so a tie-break is unavoidable for anyone implementing the table. **Ours: take the higher (worse) subscore**, consistent with pSOFA's worst-value rule for every other organ. That tie-break is a documented implementation choice; the paper states none. Nothing about the overlap is this platform's doing.

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

| id               | label                                                                    | type           | units               | conversions                                  | plausible min/max                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------ | -------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `age_months`     | Patient age                                                              | number         | months              | 1 year = 12 months                           | 0 – ~250 implementation window; cohort was ≤252 mo, bands cap at ">216 months" (Matics 2017 age strata)                                    |
| `pao2`           | Arterial PaO₂                                                            | number         | mmHg                | 1 kPa = 7.50062 mmHg                         | ~20 – 600 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `fio2`           | Fraction inspired O₂                                                     | number         | fraction (0.21–1.0) | percent → fraction: %/100 (e.g., 50% = 0.50) | 0.21 – 1.0                                                                                                                                 |
| `spo2`           | Pulse-ox saturation                                                      | number         | %                   | —                                            | 0 – 100; **only values ≤97% used** for SpO₂:FiO₂ (Matics 2017 Table 1 footnote; Khemani 2009/2012 derived it over 80–97%)                  |
| `resp_support`   | On respiratory support (invasive **or** non-invasive — see branch rules) | boolean        | —                   | —                                            | required for respiratory subscores 3–4 (Matics 2017); the paper does not define the term, and counting non-invasive support is our reading |
| `platelets`      | Platelet count                                                           | number         | ×10³/µL             | ×10³/µL = ×10⁹/L (numerically equal)         | ~1 – 1000 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `bilirubin`      | Total bilirubin                                                          | number         | mg/dL               | µmol/L → mg/dL: ÷17.104                      | ~0.1 – 50 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `map`            | Mean arterial pressure                                                   | number         | mmHg                | MAP ≈ DBP + ⅓(SBP−DBP)                       | ~10 – 150 — **implementation window; the paper specifies no bound (confirmed absent)**                                                     |
| `dopamine`       | Dopamine infusion rate                                                   | number         | µg/kg/min           | —                                            | 0 – ~50                                                                                                                                    |
| `dobutamine`     | Dobutamine infusion (present at any dose)                                | number/boolean | µg/kg/min           | —                                            | 0 – ~40                                                                                                                                    |
| `epinephrine`    | Epinephrine infusion rate                                                | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                                                                     |
| `norepinephrine` | Norepinephrine infusion rate                                             | number         | µg/kg/min           | —                                            | 0 – ~5                                                                                                                                     |
| `gcs`            | Glasgow Coma Scale total                                                 | integer        | points              | —                                            | 3 – 15 (GCS definition)                                                                                                                    |
| `creatinine`     | Serum creatinine                                                         | number         | mg/dL               | µmol/L → mg/dL: ÷88.42                       | scoring cut points are age-dependent (see renal table); the raw-input window is ours — **the paper specifies no bound (confirmed absent)** |

**On the four "confirmed absent" rows.** Round-2 review of the full text established that Matics & Sanchez-Pinto print **no physiologic plausibility bounds at all** for PaO₂, platelets, bilirubin, MAP or creatinine. That is a positive finding, not an unfinished search: there is no source to go and find. The min/max this platform declares are input-validity windows for a form field and carry no clinical meaning — prefer institutional analyzer limits over any number in this column.

**That remains true of the paper — but as of round 6 the windows are no longer uncheckable.** Published plausibility ranges for the same analytes exist **elsewhere**, so each window below now has an external comparator. See §Plausibility bounds, checked against published ranges.

## Plausibility bounds, checked against published ranges (2026-08-04)

Two outside sources publish numeric plausibility ranges covering pSOFA's analytes. **Neither is pSOFA's**, and neither converts a window here into a sourced clinical threshold — but "our invention, uncheckable" was an overstatement, and each bound can now be reported as matching a published range, narrower than one, or wider for a stated reason.

**Sources, with their provenance limits stated up front.**

- The **`phoenix` package implementation-notes documentation** publishes a _reasonable-value_ table (values outside → NULL → score zero, no imputation). Read from the docs page in full; the literal `standard_names_and_units.csv` it refers to **could not be machine-retrieved**, so nothing here is cited to that CSV. Full table reproduced in `phoenix.md` §Plausibility bounds.
- **PICANet Admission Dataset Definitions Manual v5.4 (November 2020)**: PaO₂ 3–60 kPa (22–450 mmHg), lactate 0.2–15.0 mmol/L, SBP 20–180 with a check above 200, base excess −30 to +20. **No newer PICANet manual exists — confirmed.**

**Bound-by-bound against `psofa.ts`. NO BOUND MOVED.**

| Input            | Ours      | Published comparator                 | Verdict                                                     |
| ---------------- | --------- | ------------------------------------ | ----------------------------------------------------------- |
| `fio2`           | 0.21–1.00 | Phoenix notes: [0.21, 1.00]          | **IDENTICAL**                                               |
| `spo2`           | 0–100     | Phoenix notes: [0, 100]              | **IDENTICAL** — see the ≤97% note below                     |
| `gcs`            | 3–15      | Phoenix notes: 3–15                  | **IDENTICAL** (also the instrument's own definition)        |
| `pao2`           | 20–600    | Phoenix notes [0, ∞); PICANet 22–450 | ours sits between the two. **Kept**                         |
| `map`            | 10–150    | Phoenix notes: [1, 300]              | ours narrower; highest cut point here is 70. **Kept**       |
| `creatinine`     | 0.1–20    | Phoenix notes: [0, 50]               | ours narrower; highest cut point here is 5.0. **Kept**      |
| `bilirubin`      | 0.1–50    | Phoenix notes: total bili [0, 100]   | ours narrower; top scoring band starts at 12. **Kept**      |
| `platelets`      | 1–1000    | Phoenix notes: [0, ∞)                | published is open above — nothing to adopt. **Kept**        |
| `age_months`     | 0–250     | Phoenix declares [0, 216)            | **deliberately WIDER — see below**                          |
| vasoactive rates | see table | none anywhere                        | no published comparator of any kind for a rate in µg/kg/min |

**Why nothing was adopted wholesale.** A form field refusing a typo is doing a different job from a data pipeline's outlier filter. Several published ranges are open above; adopting them removes the guardrail rather than sourcing it. Every kept-narrower window already sits well outside the highest cut point it must admit, so none of them can suppress a scoring band.

**The age window must stay wider, and this is the one place importing a published number would be a real error.** Phoenix's `[0, 216)` months is that score's **eligibility domain** (children under 18), not a plausibility bound for a paediatric age field. pSOFA's cohort ran to **252 months** and its top band is explicitly **">216 months"**. Adopting 216 here would refuse adolescents pSOFA was derived on. Pinned in `psofa.test.ts`, including that 216 months still selects the paediatric 144–216 band.

**One bound gains a second, independent source.** The Phoenix table states separately that an SpO₂ above 97 is **unusable** for an SpO₂:FiO₂ ratio. That is the same ≤97% gate this score applies, reached from a source other than this paper's Table 1 footnote and other than Khemani 2009/2012 — a third leg under a rule that already had two.

**The vasoactive rate windows have no comparator at all.** The only published figure for vasoactive support in this family of scores is Phoenix's **count of distinct agents (integer 0–6)**, which is a different quantity from an infusion rate. The DOSE cut points these windows sit around (5, 15, 0.1 µg/kg/min) are of course published, in Matics 2017 Table 1.

**CONFIRMED NEGATIVE — VPS, PC4 and PHIS publish NO public numeric plausibility or edit-check bounds.** Proprietary, behind login. Stated because it is a positive finding and because it explains why independent implementations of one score diverge on what they will accept: for most inputs there is no public standard to converge on.

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
- **Respiratory support gate — the cap at 2 is STRUCTURALLY ENTAILED by the published table, not an implementation decision. CLOSED 2026-08-04 (round 4); gate re-worded the same day (round 5).** Subscores 3 and 4 are each gated on **respiratory support**, the table's own row condition; no lower band carries any support requirement. A patient not on respiratory support therefore **cannot satisfy the 3 or 4 criterion at all**, however low the ratio falls, and subscore 2 is the highest band that remains available to them. The cap is a consequence of the criteria as published — it needs no separate sentence in the paper, and the paper's silence is not a gap. This was carried as `[NEEDS SOURCE]` through rounds 1–3 on the mistaken premise that a rule the paper never states **in words** must have been invented here; the marker is therefore **withdrawn as mis-attributed**, not resolved by new evidence, and it is the last one this file carried. **Do not re-open it and do not re-flag it for clinical sign-off** — there is nothing left to sign off on, because the calculator is not making a choice at whether-this-band-is-gated. It does make one at what-counts-as-support (next bullet), and that is a different question: the entailment above uses only which bands are gated, so it is untouched by it.
- **What counts as respiratory support is undefined in the source, and we read it broadly. Disclosed, not marked.** The paper prints "with respiratory support" and never says whether non-invasive support alone qualifies. `psofa.ts` accepts invasive **or** non-invasive support as satisfying the gate; the narrower reading (invasive ventilation only) is not ruled out by the source and would score a child on non-invasive support alone one or two points lower on this row. Round 4 stated the gate as "mechanical ventilation" — narrower than the printed table and narrower than the code, so the shipped text promised a stricter rule than the calculator applied; corrected in round 5 / `psofa.ts` v1.3.0. Because the gate itself is sourced and this file makes no claim about the authors' intent, this is a documented implementation reading (like the 264 tie-break) rather than a `[NEEDS SOURCE]` gap. A reader whose institution uses the narrow reading should know that this calculator does not.
- **Contrast with Phoenix — same situation, opposite structure. Do not generalise the cap. UPGRADED 2026-08-04 (round 6) from a structural inference to a fact read off Phoenix's published code.** The entailment above is specific to how pSOFA's table is built and does not transfer to the other organ-dysfunction score on this platform. In **Phoenix**, a patient on no respiratory support scores **0** on the respiratory criterion however low the ratio goes, and even **1** point requires at least non-invasive support. So the same child, at the same ratio, off support, is **pSOFA respiratory 2 and Phoenix respiratory 0** simultaneously — a two-point divergence produced entirely by the two tables' differing support requirements, with no disagreement about the physiology. Through round 5 that was inferred by comparing two printed tables. It no longer is: the Phoenix task force **publishes the SQL**, which derives a single flag — `IIF(fio2 > 0.21 OR vent = 1, 1, 0) AS other_respiratory_support` — and scores `imv * (…two tiers…) + other_respiratory_support * IIF(pfr < 400 OR sfr < 292, 1, 0)`. **The mechanism is the difference, and it is worth stating over the outcome: Phoenix multiplies every tier by a support flag; pSOFA attaches a support condition to its top two bands only.** Phoenix's floor at 0 is explicit in their code exactly as pSOFA's ceiling at 2 is entailed by this table. A reader moving between the scores must not assume the ratio alone means the same thing in both, and an implementer must not "harmonise" one to the other.

- **HIGH-FLOW NASAL CANNULA — NEW 2026-08-04, and the practical edge of the undefined term above.** pSOFA never defines "respiratory support", and the broad reading implemented here (see the previous bullet) takes high flow to satisfy the gate. **Phoenix agrees and says so explicitly**, including high flow within `other_respiratory_support`. **PICANet and ANZPIC both EXCLUDE HFNC from the mechanical-ventilation field** they collect. So the same child on high flow is "supported" for both of these scores and "not ventilated" in both major paediatric registries — a real, citable inconsistency, and one that surfaces the moment a score is read alongside registry-derived case-mix or ventilation figures. Note what this does and does not do to the undefined-term problem: it shows the neighbouring instrument resolving the ambiguity the same way this platform does, which is corroboration of the reading, **not** evidence about what Matics & Sanchez-Pinto intended. **NOT RETRIEVED, and not to be assumed:** no cohort has quantified how much the CPAP-versus-HFNC choice, or counting HFNC on one side and not the other, shifts the score distribution. The direction is obvious; the magnitude is unknown.
- **SpO₂:FiO₂ boundary overlap — a source defect, not an implementation one. Read directly from the published table, 2026-08-03.** The JAMA table prints 264 in both the subscore-1 and subscore-2 rows. That is the only duplicated endpoint: 220 appears once only, ending the subscore-3 row where the next row begins at 221, so 220 needs no tie-break and gets none. (A round-1 secondary re-extraction listed both 264 and 220; that is wrong on 220 and is superseded by the direct read of the source PDF.) The overlap is an artefact of the published table itself, so it is not resolvable by reading the source more carefully, and every implementation must pick a tie-break. Ours — assign the higher (worse) subscore — is a documented implementation choice.
- **SpO₂ ≤97% rule** must be enforced before computing SpO₂:FiO₂, or oxygenation dysfunction will be systematically underestimated at high saturations. **Fully sourced** (Matics 2017 Table 1 footnote; Khemani 2009 PMID 19029434 and Khemani 2012 PMID 22202709, derived over SpO₂ 80–97%) — no residual uncertainty. The same derivation implies a **lower** bound of 80% that neither pSOFA nor this implementation enforces; an SpO₂ below 80% is outside the window the ratio was derived in.
- **Age above 216 months.** The cohort ran to 21 years (≤252 months) and the paper states the >216-month MAP and creatinine cut points are identical to adult SOFA's. Scoring an older adolescent is therefore applying adult thresholds inside a paediatric score — correct per the instrument, and worth disclosing to the clinician.
- **GCS input.** pSOFA consumes only the **total GCS number**, not the individual eye/verbal/motor descriptors. Sedation, intubation, and pre-verbal age all confound GCS in children; the paper does not prescribe an adjustment — document the raw GCS used.
- **Neonatal caveat — defined, but not derived there.** The <1-month band exists in Table 1, so pSOFA is **not undefined** for neonates; it simply was not derived in that population, and saying it is "inapplicable" overstates the case. The dedicated instrument is **nSOFA** (Wynn JL, Polin RA. _Pediatr Res._ 2020;88(1):85-90. PMID 31394566. DOI 10.1038/s41390-019-0517-2), derived in **preterm very-low-birth-weight infants with late-onset sepsis**, scale range **0–15**. Note the scope of that derivation: nSOFA is not a general term-neonate score either, so neither instrument has a strong claim on a term newborn. Prefer nSOFA where the population matches; either way, disclose which score's derivation population the patient does or does not resemble.
- **Vasoactive subscore** takes the single highest-qualifying agent/dose; concurrent agents are not additive.
- **Physiologic plausibility bounds are confirmed absent from the paper** for PaO₂, platelets, bilirubin, MAP and creatinine — established on round-2 full-text review, so this is settled, not an open search. Whatever min/max an implementation declares are its own input-validity windows; use institutional analyzer limits rather than treating any of them as clinical thresholds. **Round 6 adds an outside check, and does not weaken this:** published plausibility ranges for the same analytes exist elsewhere (the `phoenix` implementation notes; PICANet v5.4), three of this score's windows turn out to be identical to a published range, and none was changed. See §Plausibility bounds, checked against published ranges. **VPS, PC4 and PHIS publish none at all** — confirmed negative, which is why implementations of the same score legitimately differ on what they accept.

## Verification

Independent re-check performed 2026-07-25 by a second reviewer, against sources distinct from (or in addition to) the file's already-cited secondary source (medicalcriteria.com).

**Primary paper full text (independent fetch of PMC6583375, Matics & Sanchez-Pinto 2017):**

- Respiratory table (PaO₂:FiO₂ and SpO₂:FiO₂, all 5 bands incl. respiratory-support gate on 3–4) — **matches file exactly**.
- SpO₂:FiO₂ boundary overlap at 264 and 220 — reported as **confirmed present in the published table** (independently re-extracted wording: "Boundary values appear as the upper limit of one band and lower limit of the next (264 and 220 appear twice)"), corroborating the file's claim that this is a verbatim table artifact, not an editing error. **⚠ Half wrong, and superseded — see round 3.** The direct read of the source PDF on 2026-08-03 shows 264 duplicated but **220 appearing once only**. This round-1 line is left standing as the record of what a second-hand re-extraction claimed; do not cite it for 220.
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

| Item                           | Round-1 state                 | Round-2 outcome                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing counts as normal       | flagged as OUR convention     | **Our error, corrected.** It is stated in the paper's Methods (quoted verbatim above). Marker withdrawn — it was never a source gap.                                                                                                                                                                                                                                                                    |
| Plausibility bounds (5 inputs) | `[NEEDS SOURCE]`              | **Confirmed absent** from the paper. Relabelled from "unfound" to "settled-absent"; the disclosure stays, because our windows are still ours. Confirmed-absent is the stronger claim, so the marker is retired.                                                                                                                                                                                         |
| SpO₂:FiO₂ overlap at 264       | overlap noted, tie-break ours | **Overlap confirmed to be an artefact of the published JAMA table** — but at second hand, from a review rather than the table. Behaviour unchanged; wording re-attributed so a reader sees the defect is in the source. The tie-break remains our documented choice. **Upgraded to a direct read of the source PDF in round 3.**                                                                        |
| SpO₂ ≤97% ceiling              | cited once (paper)            | **Sourced twice over** — the paper's Table 1 footnote plus Khemani 2009/2012, which derived the ratio over SpO₂ 80–97%. Uncertainty language removed.                                                                                                                                                                                                                                                   |
| Age ceiling / adult cut points | undisclosed                   | Cohort ≤252 months; **>216-month cut points are adult SOFA's, per the paper.** Now disclosed rather than silently applied. Our 0–250 window sits inside the cohort, so no bound changed.                                                                                                                                                                                                                |
| Non-support capping to 2       | `[NEEDS SOURCE]`              | **Round-2 verdict: STILL OPEN** — "the paper does not address a non-supported patient whose ratio lands in a 3/4 band", marker retained. **⚠ Superseded by round 4 (2026-08-04): the marker should never have been raised.** The paper does not need to address the case, because its own criteria already settle it. Left standing as the record of what round 2 concluded; do not cite it as current. |

Also corrected in round 2: the neonatal caveat previously implied pSOFA is inapplicable below one month. It is not — the <1-month band exists and the score is defined there. What is true, and now stated, is that it was not derived in that population and that nSOFA is the instrument that was (in preterm VLBW infants specifically).

Retrieval note: the Khemani and Wynn citations were verified against PubMed records on 2026-08-03 for PMID/DOI accuracy; their content claims come from the round-2 sourcing resolution, not from a fresh read of either full text.

### Verification, round 3 — 2026-08-03 (primary PDF read directly)

The founder supplied the primary PDF — Matics TJ, Sanchez-Pinto LN, _JAMA Pediatr._ 2017;171(10):e172352 — which had been unobtainable through rounds 1 and 2. It was extracted and **read directly**. This section records only what the direct read establishes; it is not a review of a review, and that distinction is the point of the round.

**No number moved. No behaviour changed. Provenance only.**

The published SpO₂:FiO₂ respiratory row prints these values, in row order (subscore 0 → 4):

| Subscore printed | 0   | 1       | 2       | 3       | 4    |
| ---------------- | --- | ------- | ------- | ------- | ---- |
| SpO₂:FiO₂        | 292 | 264–291 | 221–264 | 148–220 | <148 |

Two findings, both from the table itself:

1. **264 appears in BOTH the subscore-1 row (264–291) and the subscore-2 row (221–264).** The overlap is in the published table. This was previously carried in this file and in `psofa.ts` as "confirmed on round-2 review" — a second-hand attribution. It is now **read directly from the published table, 2026-08-03**. The finding is unchanged; only its standing improved, from corroborated-at-one-remove to observed in the primary.
2. **220 appears once only.** It ends the subscore-3 row, and the next row begins at 221. There is no duplication at 220, so it needs no tie-break — and `respiratoryFromSf` correctly gives it none. This positively retires the round-1 claim that 220 was duplicated too (see the ⚠ note in the round-1 verification list above), which no longer rests on "a later review disagreed" but on the printed row.

What the direct read does **not** change: the paper still states **no tie-break** for an exact 264. Assigning the worse subscore (2) at exactly 264 therefore remains **this implementation's documented choice**, made to match pSOFA's worst-value rule for every other organ. Upgrading the provenance of the overlap does not convert our tie-break into a sourced one, and it must not be recorded as if it had.

Scope of this round: the SpO₂:FiO₂ respiratory row only. Every other threshold on this page keeps the provenance its own round gave it, and the one surviving `[NEEDS SOURCE]` marker — the non-support capping rule — is **still open**; the direct read did not address it. _(⚠ That last clause is superseded: round 4 closed the marker. See below.)_

### Verification, round 4 — 2026-08-04 (the last marker, closed as mis-attributed)

**No number moved. No behaviour changed. Attribution only.** After this round pSOFA carries **zero** `[NEEDS SOURCE]` markers.

Rounds 1–3 all reached the same verdict on the non-support cap — the paper never says what an unsupported patient with a 3/4-band ratio scores, therefore capping at 2 is our decision — and all three were wrong about the second half. The reasoning fails because it treats "not stated in prose" as equivalent to "not determined by the source". Here it is not:

1. Subscores **3 and 4 each carry a support requirement**. That much is printed in Table 1 and was never in doubt; it is the row condition, verified in round 1 against the full text and again in round 3 against the PDF. _(⚠ As originally written this clause said "a **mechanical-ventilation** requirement" and attributed that wording to Table 1. The table prints "with respiratory support"; the narrowing was round 4's own paraphrase and is corrected in round 5 below. The step is sound either way — it only needs the bands to be gated — but the wording was wrong and is not to be restored.)_
2. **No band below 3 carries any support requirement.** Also printed.
3. A patient on no respiratory support therefore **fails the 3 and 4 criteria by construction**, at every ratio, including a ratio of zero. The only bands they can satisfy are 0, 1 and 2.
4. So the score for such a patient is whichever of 0–2 their ratio selects, and the maximum attainable is **2**. Nothing was chosen; the table already answers.

What follows for the record:

- The marker is **withdrawn as mis-attributed**, which is a different act from resolving one. No new evidence was obtained and none was needed — the closing argument uses only table facts that rounds 1 and 3 had already verified. Anyone re-deriving this will find nothing new to fetch, which is the point: **re-searching cannot help and should not be attempted.**
- The behaviour in `respiratoryFromPf` / `respiratoryFromSf` is **unchanged** — the cap returned 2 before and returns 2 now.
- The old "flag for clinical sign-off" instruction is retired. There is no implementation choice at this branch for a clinician to endorse or overrule.
- **Contrast with Phoenix, added the same day.** The entailment is a property of pSOFA's table, and the neighbouring score inverts it: Phoenix scores an unsupported patient **0** on the respiratory criterion at any ratio, and even 1 point requires at least non-invasive support. `psofa.ts` now states this in `notes`, because the natural over-generalisation ("an unsupported hypoxaemic child scores 2 on organ-dysfunction scores") is false the moment a reader moves to the other score. See the Limitations bullet above for the worked divergence.

What round 4 does **not** touch: the SpO₂:FiO₂ tie-break at an exact 264 remains **this implementation's documented choice**. The published table assigns 264 to two rows at once and states no tie-break; that is a genuine gap in the source, not an entailment, and closing the capping marker has no bearing on it. Do not let "pSOFA has no `[NEEDS SOURCE]` markers" be read as "pSOFA makes no implementation choices" — it makes them, and they are disclosed. _(⚠ Round 4 wrote that the tie-break was "the only such choice left" and that the score "makes exactly one". Round 5 identified a second: how the undefined term "respiratory support" is read. The count was wrong, not the tie-break's status.)_

### Verification, round 5 — 2026-08-04 (the gate's wording, narrowed in round 4, put back)

**No number moved. No behaviour changed. Wording and one new disclosure.** Round 4 closed the capping marker correctly but stated the gate more narrowly than either the source or this implementation, and the narrow wording propagated into `psofa.ts` (two doc comments and `notes`), into this file's Limitations bullet, and into a test that pinned it. Round 5 removes it.

**What the published table's gate actually is.** The subscore-3 and subscore-4 cells of the respiratory row print **"with respiratory support"** — the general term. That is what this file's own reproduction of Table 1 has said since round 1, and round-1 verification against the PMC full text recorded it the same way ("all 5 bands incl. respiratory-support gate on 3–4 — matches file exactly"). Round 3's direct PDF read covered the SpO₂:FiO₂ numeric row and did not revisit the gate. **"Mechanical ventilation" appears nowhere in any recorded read of the table**; it entered in round 4 as a paraphrase, and round 4 compounded it by attributing the paraphrase to Table 1 ("that much is printed in Table 1"). It was not printed there.

**Why it mattered clinically, and not just editorially.** `psofa.ts` has always exposed one boolean, `resp_support`, whose help text says invasive or non-invasive. So the code has always run the broad gate: a child on CPAP alone with a 3-band ratio scores 3. Meanwhile the shipped notes and comments told the reader that subscores 3 and 4 require mechanical ventilation, i.e. that the same child caps at 2. **The published text stated a stricter gate than the calculator applied**, and — worse — round 4's closing argument for the cap was stated on the narrow reading while the calculator ran on the broad one.

**What is now stated everywhere (code, help text, notes, doc comments, this file):** subscores 3 and 4 require **respiratory support**; no band below 3 carries any support requirement.

**The entailment, restated on the reading we implement.** A patient who is not on respiratory support fails the subscore-3 and subscore-4 criteria by construction, at every ratio including zero; the only bands they can satisfy are 0, 1 and 2; so the maximum attainable is 2. The argument uses exactly two facts — 3 and 4 are gated, nothing below 3 is — and **neither of them mentions what counts as support**. It is therefore invariant under both readings of the term, and round 4's conclusion survives its own wording error intact. The correction strengthens the argument rather than weakening it: it no longer depends on a reading the source does not state.

**The genuinely open question, now flagged rather than settled silently.** The paper prints "respiratory support" and **never defines it** — not in Table 1, not in the Methods, on any read this file records. Whether non-invasive support alone satisfies the gate is thus **not determined by the source**, and both readings remain available:

| Reading                                       | Child on CPAP alone, ratio in the 3 band | Status here                       |
| --------------------------------------------- | ---------------------------------------- | --------------------------------- |
| Broad — any respiratory support, NIV included | respiratory **3**                        | **what this platform implements** |
| Narrow — invasive mechanical ventilation only | respiratory **2**                        | not excluded by the source        |

We implement the broad reading, because it is the term as printed and the narrow one adds a restriction the paper does not state. That is a **documented implementation reading**, disclosed in `notes`, on the `resp_support` field itself, and here — the second such choice on this score, alongside the 264 tie-break. It is deliberately **not** marked `[NEEDS SOURCE]`: the gate itself is sourced, the choice is disclosed, and no claim is made about which reading Matics & Sanchez-Pinto intended. pSOFA still carries zero unsourced claims. Anyone who wants the ambiguity closed rather than disclosed would need the authors or a subsequent definitional source, not another pass over this paper.

Pinned in `psofa.test.ts` so it cannot silently revert: the notes must state the gate as respiratory support, must not contain "mechanical ventilation" at all, must keep the disclosure of the reading, and must keep the sentence establishing that the cap does not depend on which reading is taken. The `resp_support` help text is pinned the same way. `psofa.ts` goes to **v1.3.0** with a changelog entry, since the help text and notes are user-visible.

### Verification, round 6 — 2026-08-04 (bounds get an outside comparator; the Phoenix contrast gets a mechanism; HFNC)

**No number moved.** No threshold, age band, subscore, total or input bound changed, and nothing that computed before is rejected now. `psofa.ts` → **v1.4.0**.

**1. The bounds stop being "ours, uncheckable".** Rounds 2–5 correctly established that Matics & Sanchez-Pinto publish no plausibility bounds — still true, still confirmed absent. What was overstated was the implication that there was therefore nothing to check these windows against. There is: published plausibility ranges for the same analytes exist in the `phoenix` implementation notes and in PICANet v5.4. Every bound on this score has now been compared. **Three are identical to a published range** (FiO₂ 0.21–1.00, SpO₂ 0–100, GCS 3–15). **Five are narrower and are kept**, with the published alternative named beside each in `psofa.ts` and in §Plausibility bounds. **One — the age window — is deliberately wider and must stay so**, because Phoenix's `[0, 216)` is an eligibility domain for a different score and pSOFA's cohort ran to 252 months. **Nothing was adopted wholesale; no bound moved.**

**2. A third leg under the ≤97% rule.** The Phoenix table independently states that an SpO₂ above 97 is unusable for an SpO₂:FiO₂ ratio. That gate already had two citations (this paper's Table 1 footnote; Khemani 2009/2012's 80–97% derivation window) and now has a third from a different instrument.

**3. VPS, PC4 and PHIS publish no public plausibility bounds — confirmed negative.** Proprietary, behind login. Recorded as a finding rather than a gap, because it is the explanation for why independent implementations diverge on accepted input.

**4. The Phoenix contrast is upgraded from inference to sourced fact, with the mechanism.** Rounds 4–5 established the contrast by comparing two printed tables. The Phoenix task force publishes its SQL; the flag and the scoring expression are reproduced in the Limitations bullet above. The useful form of the finding is the mechanism, not the outcome: **Phoenix multiplies every tier by a support flag; pSOFA attaches a support condition to its top two bands only.** Nothing about pSOFA's own gate changes — the v1.3.0 settlement stands in full: subscores 3 and 4 require respiratory support, the term is undefined in the paper, and reading it broadly is this platform's disclosed choice.

**5. New — HFNC.** High flow satisfies the broad reading here and is explicitly counted by Phoenix, while PICANet and ANZPIC both exclude it from the mechanical-ventilation field. Its own Limitations bullet above; surfaced in `notes` and on the `resp_support` field, which is where the question is actually answered. Treated as **corroboration of the reading by a neighbouring instrument, not as evidence about the pSOFA authors' intent** — that distinction is load-bearing and is stated in the bullet.

**6. One test constraint was rescoped, deliberately and not silently.** `psofa.test.ts` banned the phrase "mechanical ventilation" anywhere in `notes`, a round-5 guard against re-narrowing this score's own gate. Round 6 adds a paragraph about two registries whose collection field is literally named for mechanical ventilation, and a blanket ban would have forced that finding to be paraphrased into something less accurate to satisfy a test aimed at a different sentence. The ban is now scoped to the region before the cross-score marker, and the marker itself is pinned so the region cannot be silently widened. **The protection is unchanged where it was aimed:** no sentence describing pSOFA's gate may narrow it, and a second assertion checks the scoped region still contains the gate discussion.

**Not retrieved on this pass:** the literal `standard_names_and_units.csv` behind the Phoenix reasonable-value table; any cohort quantifying the CPAP/HFNC effect on score distribution; any public plausibility bounds from VPS, PC4 or PHIS (confirmed absent rather than unfound). No PMID was re-verified on this pass.

## IP status

- **Formula and thresholds:** pSOFA is a threshold-/formula-based clinical score. Facts, numeric cut points, and mathematical scoring rules are **not copyrightable**; the pSOFA table can be implemented directly. Attribution to Matics & Sanchez-Pinto 2017 is an academic-integrity expectation, not a copyright requirement.
- **No verbatim scale-item prose is reproduced** here. pSOFA's subscores are numeric ranges (platelet counts, ratios, MAP, creatinine, GCS totals) with no descriptive response wording of their own.
- **Component watch — Glasgow Coma Scale:** pSOFA references the GCS _total only_. The GCS's own eye/verbal/motor **response-descriptor wording** is an external instrument that may carry its own usage/attribution terms; because pSOFA uses only the integer total, no GCS descriptor text is (or should be) copied into this platform. If a GCS data-entry widget is built elsewhere, review the descriptor wording separately — **flag**.
- No other component contributes copyrightable item wording.
