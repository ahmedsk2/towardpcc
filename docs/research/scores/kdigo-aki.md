# KDIGO AKI Staging (Pediatric)

> Source of record: **Kidney Disease: Improving Global Outcomes (KDIGO) Acute Kidney Injury Work Group.** _KDIGO Clinical Practice Guideline for Acute Kidney Injury._ **Kidney Int Suppl. 2012;2(1):1–138.** Definition = Recommendation 2.1.1; staging = Recommendation 2.1.2 / **Table 2**.
>
> Every numeric threshold on this page was taken from a source actually fetched and cross-checked across three independent reproductions of KDIGO Table 2: (a) the peer-reviewed reproduction in _Kidney Int_ (PMC3877708, "Reading between the (guide)lines"), (b) the Merck Manual Professional staging table, and (c) the QxMD/Medscape KDIGO AKI calculator. All three agreed value-for-value. The pediatric eGFR branch and its controversy were additionally cross-checked against a pediatric-optimization review (PMC12805013). The pediatric eGFR equation (bedside Schwartz) comes from Schwartz GJ et al., _J Am Soc Nephrol_ 2009 (PMID 19158356). No value here is inferred or invented.

## Formula / algorithm (exact — every coefficient and branch)

KDIGO AKI staging is **not a summed score**. It is a **classification into Stage 1, 2, or 3** based on the **worst** of two independent axes — a serum-creatinine (SCr) axis and a urine-output (UO) axis. **The assigned stage is the highest stage met by _either_ axis** (KDIGO Table 2; the two axes are evaluated separately and the more severe result governs).

### Step 0 — Does AKI exist at all? (Definition, Recommendation 2.1.1)

AKI is present if **any one** of the following holds:

1. Increase in SCr by **≥0.3 mg/dL (≥26.5 µmol/L)** within **48 hours**; **or**
2. Increase in SCr to **≥1.5 times baseline**, known or presumed to have occurred within the **prior 7 days**; **or**
3. Urine volume **<0.5 mL/kg/h for 6 hours**.

If none are met, there is no AKI and no stage is assigned.

### Step 1 — Serum-creatinine axis

| Stage | Serum-creatinine criterion (any one within the stage)                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | SCr **1.5–1.9 × baseline** (within prior 7 days) **OR** SCr increase **≥0.3 mg/dL (≥26.5 µmol/L)** within 48 h                                                                                                           |
| **2** | SCr **2.0–2.9 × baseline**                                                                                                                                                                                               |
| **3** | SCr **3.0 × baseline** **OR** increase in SCr **to ≥4.0 mg/dL (≥353.6 µmol/L)** **OR** **initiation of renal replacement therapy (RRT)** **OR** — **in patients <18 years — decrease in eGFR to <35 mL/min per 1.73 m²** |

### Step 2 — Urine-output axis

| Stage | Urine-output criterion                                 |
| ----- | ------------------------------------------------------ |
| **1** | **<0.5 mL/kg/h for 6–12 h**                            |
| **2** | **<0.5 mL/kg/h for ≥12 h**                             |
| **3** | **<0.3 mL/kg/h for ≥24 h** **OR** **anuria for ≥12 h** |

### Step 3 — Final stage

Final AKI stage = **max(SCr-axis stage, UO-axis stage)**. (KDIGO stages by the criterion that yields the greatest severity.)

### Pediatric-specific elements (the only pediatric deltas)

- The **eGFR <35 mL/min per 1.73 m²** branch of Stage 3 is **exclusive to patients <18 years** (it does not exist in the adult staging). It is intended to capture children whose absolute SCr never reaches the adult ≥4.0 mg/dL cutoff because their baseline creatinine and muscle mass are low.
- The eGFR for this branch is computed with the **bedside (2009) Schwartz equation** — see Inputs. KDIGO Table 2 states the threshold but does not itself re-derive the eGFR equation; the bedside Schwartz equation is the standard pediatric estimator (Schwartz 2009, PMID 19158356).
- The **urine-output criteria are already weight-indexed (mL/kg/h)**, so they apply to children directly with no modification.
- **Baseline SCr** in children is age- and body-size-dependent; KDIGO does not fix a single pediatric baseline method. See Limitations for the dynamic-baseline convention used in pediatric studies.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                       | label                                  | type             | units           | conversions                                    | plausible min/max                                                                                                              |
| ------------------------ | -------------------------------------- | ---------------- | --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `scr`                    | Current serum creatinine               | number           | mg/dL           | µmol/L → mg/dL: ÷ 88.4 (1 mg/dL = 88.4 µmol/L) | ~0.1 – 15 physiologic; pediatric normal is age-dependent and low [precise pediatric norms NEEDS SOURCE — not in KDIGO Table 2] |
| `scr_baseline`           | Baseline serum creatinine              | number           | mg/dL           | µmol/L → mg/dL: ÷ 88.4                         | age-dependent; used for the ×-baseline multipliers (KDIGO 2.1.2)                                                               |
| `scr_delta_48h`          | SCr rise over the preceding 48 h       | number (derived) | mg/dL           | —                                              | drives the ≥0.3 mg/dL absolute-rise criterion (KDIGO 2.1.1 / Stage 1)                                                          |
| `weight`                 | Body weight                            | number           | kg              | —                                              | needed to convert measured urine volume to mL/kg/h                                                                             |
| `urine_volume` / `hours` | Measured urine volume over an interval | number           | mL over N hours | UO (mL/kg/h) = volume ÷ weight ÷ hours         | rate 0 – ~10 mL/kg/h physiologic                                                                                               |
| `urine_output_rate`      | Urine output rate                      | number (derived) | mL/kg/h         | —                                              | compared against 0.5 / 0.3 mL/kg/h thresholds (KDIGO Table 2)                                                                  |
| `height`                 | Standing/recumbent height (length)     | number           | cm              | 1 in = 2.54 cm                                 | required only for the pediatric eGFR branch (Schwartz 2009)                                                                    |
| `age_years`              | Patient age                            | number           | years           | —                                              | eGFR <35 branch applies **only if <18 years** (KDIGO Table 2)                                                                  |
| `egfr`                   | Estimated GFR (bedside Schwartz)       | number (derived) | mL/min/1.73 m²  | eGFR = 0.413 × height(cm) ÷ SCr(mg/dL)         | compared against <35 threshold; Schwartz bedside model validated in children ~1–16 yr (PMID 19158356)                          |
| `rrt`                    | Renal replacement therapy started      | boolean          | —               | —                                              | true ⇒ Stage 3 regardless of SCr/UO (KDIGO Table 2)                                                                            |
| `anuria`                 | Anuria present                         | boolean/derived  | —               | UO essentially 0                               | ≥12 h ⇒ Stage 3 UO axis                                                                                                        |

**Conversion notes.** Creatinine SI↔conventional: divide µmol/L by 88.4 for mg/dL (KDIGO Table 2 itself lists both, e.g., 0.3 mg/dL = 26.5 µmol/L [Merck reproduction: 26.52], 4.0 mg/dL = 353.6 µmol/L [Merck: 353.60]). Urine output must be converted to **mL/kg/h** before applying thresholds; the per-kilogram indexing is what makes the adult table valid for children.

## Worked examples

KDIGO Table 2 provides **no worked example**. The three cases below are **derived step-by-step from KDIGO Table 2 (Kidney Int Suppl 2012;2:1–138)**, and Example B additionally applies the bedside Schwartz equation (Schwartz 2009, PMID 19158356). They are intended as unit-test fixtures.

### Example A — Stage 1 by serum-creatinine (5-year-old)

Inputs: baseline SCr 0.4 mg/dL; current SCr 0.7 mg/dL, measured 36 h after baseline; urine output normal; not on RRT.

| Axis              | Applied rule                                                           | Result      |
| ----------------- | ---------------------------------------------------------------------- | ----------- |
| SCr multiplier    | 0.7 ÷ 0.4 = **1.75×** → within 1.5–1.9× → **Stage 1**                  | 1           |
| SCr absolute rise | 0.7 − 0.4 = **0.3 mg/dL within 48 h** → meets ≥0.3 mg/dL → **Stage 1** | 1           |
| Urine output      | normal → **no stage**                                                  | 0           |
| **Final**         | max(1, 0, 0)                                                           | **Stage 1** |

### Example B — Stage 3 by the pediatric eGFR branch (10-year-old)

Inputs: age 10 y (**<18**, so the eGFR branch is in play); height 130 cm; current SCr 1.7 mg/dL; baseline SCr unknown; urine output not yet oliguric; not on RRT. (SCr 1.7 mg/dL is **below** the adult absolute cutoff of ≥4.0 mg/dL, so without the pediatric branch this child would not stage by absolute creatinine.)

| Step                    | Computation                                               | Result      |
| ----------------------- | --------------------------------------------------------- | ----------- |
| eGFR (bedside Schwartz) | 0.413 × 130 ÷ 1.7 = 53.69 ÷ 1.7 = **31.6 mL/min/1.73 m²** | 31.6        |
| Pediatric eGFR branch   | 31.6 **< 35** and patient **<18 y** → **Stage 3**         | 3           |
| **Final**               | Stage 3 (pediatric eGFR criterion)                        | **Stage 3** |

This case exercises the pediatric-only branch: the same eGFR in an adult (≥18 y) would **not** trigger Stage 3 under KDIGO Table 2.

### Example C — Stage 3 by urine output (12-kg toddler)

Inputs: weight 12 kg; total measured urine 60 mL over the past 24 h; SCr axis not staging.

| Step      | Computation                                           | Result      |
| --------- | ----------------------------------------------------- | ----------- |
| UO rate   | 60 mL ÷ 12 kg ÷ 24 h = **0.208 mL/kg/h**              | 0.208       |
| UO axis   | 0.208 **< 0.3 mL/kg/h sustained ≥24 h** → **Stage 3** | 3           |
| **Final** | max(SCr axis, 3) → **Stage 3**                        | **Stage 3** |

## Interpretation bands (non-directive, with source)

KDIGO AKI staging **is itself the interpretation** — the three stages are an ordinal severity classification, not a continuous score, and the guideline frames them as a basis for monitoring/management intensity rather than as a directive number.

- **Stage 1** = least severe AKI meeting definition; **Stage 2** = intermediate; **Stage 3** = most severe (includes need for RRT and, in children, eGFR <35). (KDIGO Table 2.)
- Higher KDIGO stage is **associated** with higher mortality and greater risk of RRT/adverse outcomes in the outcome literature; the guideline itself is a **classification**, not a treatment threshold. Any platform display should stay descriptive (e.g., "Stage 3 indicates the most severe AKI category by KDIGO criteria") and avoid prescriptive wording.
- KDIGO deliberately **harmonizes the earlier RIFLE and AKIN systems**; the pediatric analogue **pRIFLE** (Akcan-Arikan 2007) predates it and is a separate instrument — not reproduced here.

There are **no additional numeric "cut-point" bands** beyond the three stages themselves.

## References (full, PMID/DOI/URL)

1. **KDIGO Acute Kidney Injury Work Group.** KDIGO Clinical Practice Guideline for Acute Kidney Injury. _Kidney Int Suppl._ 2012;2(1):1–138. DOI: 10.1038/kisup.2012.1. Guideline PDF: https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf (definition = Rec 2.1.1; staging = Rec 2.1.2 / Table 2). _[Primary source of record for all staging thresholds. Official PDF returned HTTP 403 to automated fetch; Table 2 values were obtained from the three independent reproductions below, which agreed exactly.]_
2. **Palevsky PM, et al.** Reading between the (guide)lines — the KDIGO practice guideline on acute kidney injury in the individual patient. _Kidney Int._ 2014;85(1):49–61. PMC3877708. https://pmc.ncbi.nlm.nih.gov/articles/PMC3877708/ — reproduces KDIGO Table 2 verbatim, **including** the "in patients <18 years, decrease in eGFR to <35 mL/min per 1.73 m²" Stage 3 branch. _(Primary extraction source for the staging table on this page.)_
3. **Merck Manual Professional Edition.** Staging Criteria for Acute Kidney Injury (KDIGO 2012). https://www.merckmanuals.com/professional/multimedia/table/staging-criteria-for-acute-kidney-injury-kdigo-2012 — confirmed exact µmol/L values (0.3 mg/dL = 26.52 µmol/L; 4.0 mg/dL = 353.60 µmol/L) and UO durations. _(Independent corroboration.)_
4. **QxMD / Medscape KDIGO AKI Staging calculator.** https://qxmd.com/calculate/definition_17/kdigo-aki-staging — confirmed SCr multipliers (1.5–1.9 / 2.0–2.9 / 3.0×), UO thresholds, and the pediatric eGFR <35 branch. _(Independent corroboration.)_
5. **Schwartz GJ, Muñoz A, Schneider MF, et al.** New equations to estimate GFR in children with CKD. _J Am Soc Nephrol._ 2009;20(3):629–637. PMID: 19158356. DOI: 10.1681/ASN.2008030287. — bedside equation **eGFR = 0.413 × height(cm) ÷ SCr(mg/dL)**; derived from 349 children (CKiD cohort), applicable range ~1–16 yr. _(Source for the eGFR used by the Stage 3 pediatric branch.)_
6. **Pediatric optimization review of KDIGO AKI criteria.** PMC12805013. https://pmc.ncbi.nlm.nih.gov/articles/PMC12805013/ — documents the eGFR-branch controversy in young children and a proposed restriction to age >3 months; also describes a dynamic 7-day baseline-SCr convention. _(Source for pediatric caveats in Limitations.)_
7. **KDOQI (Palevsky PM, et al.).** US Commentary on the 2012 KDIGO Clinical Practice Guideline for Acute Kidney Injury. _Am J Kidney Dis._ 2013;61(5):649–672. PMID: 23499048. DOI: 10.1053/j.ajkd.2013.02.349. https://www.ajkd.org/article/S0272-6386(13)00471-X/fulltext — national-society commentary confirming the KDIGO definition/staging. _(Fetch returned 403; cited for provenance, not for any unique number here.)_

Lineage (not reproduced numerically): 8. **Akcan-Arikan A, et al.** Modified RIFLE criteria in critically ill children with acute kidney injury (**pRIFLE**). _Kidney Int._ 2007;71(10):1028–1035. PMID: 17396113. _(Predecessor pediatric AKI classification; not the source of any KDIGO threshold here — NEEDS SOURCE if pRIFLE-specific values are ever used.)_

## Limitations & notes

- **Not a summed score.** Implementers must evaluate the SCr and UO axes independently and take the **maximum** stage; treating it as additive is wrong.
- **Baseline creatinine is the hardest input.** KDIGO does not mandate a single pediatric baseline method. Pediatric studies commonly use a **dynamic baseline** (e.g., mean SCr over the prior 7 days, per PMC12805013); a known outpatient baseline is preferred when available. Baseline choice materially changes the multiplier-based stage — surface which baseline was used. [Exact KDIGO-endorsed pediatric baseline rule NEEDS SOURCE — the guideline discusses options rather than fixing one.]
- **Pediatric eGFR branch is contested for young children.** The <35 mL/min/1.73 m² branch was written for patients <18 y, but GFR rises developmentally from birth and only approaches adult levels around age 2; applying eGFR <35 to infants can misclassify normal physiology. A proposed refinement restricts it to age **>3 months** (PMC12805013). The bedside Schwartz equation itself was validated in children ~1–16 y with CKD, not neonates — do not extrapolate below its validated range without a neonatal-specific estimator. [NEEDS SOURCE for a neonatal eGFR method.]
- **Units.** Thresholds are specified in mg/dL and mL/kg/h; SI-unit platforms must convert (÷88.4 for creatinine) before applying. The µmol/L equivalents (26.5 / 353.6) are rounded in the source table (Merck lists 26.52 / 353.60) — treat the **mg/dL** values as authoritative and derive SI equivalents to avoid boundary drift.
- **Urine output requires accurate weight and a valid collection interval.** The 6–12 h vs ≥12 h vs ≥24 h windows and the anuria-≥12 h branch require timed collection; spot estimates are insufficient to assign the UO axis.
- **RRT overrides.** Initiation of RRT is Stage 3 by definition irrespective of SCr/UO; a platform should let an explicit RRT flag force Stage 3.
- **Single guideline, evolving evidence.** This file encodes the 2012 KDIGO criteria (the current standard); newer AKI biomarker/subphenotype work is out of scope for this source-of-record file.

## IP status

- **Formula and thresholds: not copyrightable.** KDIGO AKI staging is a set of factual numeric cut points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations). Facts and mathematical criteria are not subject to copyright and may be implemented directly. Attribution to KDIGO 2012 is an academic-integrity expectation, not a copyright requirement.
- **Copyrighted prose caveat — flag.** The **full text of the KDIGO guideline** (Kidney Int Suppl 2012) and Table 2's surrounding narrative are copyrighted editorial prose. This page reproduces **only the numeric criteria and short factual descriptors** (e.g., "1.5–1.9 × baseline", "<0.3 mL/kg/h for ≥24 h"), which are facts — not the guideline's explanatory paragraphs. Do **not** paste verbatim guideline narrative into the product; re-express any explanatory text in original wording.
- **No copyrightable scale-item wording.** Unlike descriptor-based instruments (e.g., GCS response items), KDIGO staging has no proprietary response prose — every criterion is a number, ratio, or rate.
- **Bedside Schwartz equation** (eGFR = 0.413 × height ÷ SCr) is likewise a mathematical formula (a fact), freely implementable with attribution to Schwartz 2009.
