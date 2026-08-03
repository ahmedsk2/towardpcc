# KDIGO AKI Staging (Pediatric)

> Source of record: **Kidney Disease: Improving Global Outcomes (KDIGO) Acute Kidney Injury Work Group.** _KDIGO Clinical Practice Guideline for Acute Kidney Injury._ **Kidney Int Suppl. 2012;2(1):1–138.** Definition = Recommendation 2.1.1; staging = Recommendation 2.1.2 / **Table 2**.
>
> Every numeric threshold on this page was taken from a source actually fetched and cross-checked across three independent reproductions of KDIGO Table 2: (a) the peer-reviewed reproduction in _Kidney Int_ (PMC3877708, "Reading between the (guide)lines"), (b) the Merck Manual Professional staging table, and (c) the QxMD/Medscape KDIGO AKI calculator. All three agreed value-for-value. The pediatric eGFR branch and its controversy were additionally cross-checked against a pediatric-optimization review (PMC12805013). The pediatric eGFR equation (bedside Schwartz) comes from Schwartz GJ et al., _J Am Soc Nephrol_ 2009 (PMID 19158356). No value here is inferred or invented.
>
> **2026-08-03 revision (score v2.0.0).** The urine-output axis, the duration handling, the indeterminate/floor policy and the age gate on the eGFR branch were rewritten against a review note taken directly from the retrieved primary guideline PDF (see reference 1 for exactly which pages). Anything cited to a page number below comes from that reading. The **corrected** structure of Table 2's urine-output rows — four (rate, duration) pairs, evaluated independently — is the substantive change: the reproductions used in the first pass are laid out as a rate ladder, which is how the v1.0.0 implementation came to branch on rate first.

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

**The four rows are (rate, duration) PAIRS, not rate bands.** Each row is an independent conjunction of a rate and a window; evaluate all four and take the **highest stage satisfied**.

| Row | Stage | Rate             | Duration       |
| --- | ----- | ---------------- | -------------- |
| 1   | **1** | **<0.5 mL/kg/h** | **6 to <12 h** |
| 2   | **2** | **<0.5 mL/kg/h** | **≥12 h**      |
| 3   | **3** | **<0.3 mL/kg/h** | **≥24 h**      |
| 4   | **3** | **anuria**       | **≥12 h**      |

**Branching on the rate first is wrong, and wrong in both directions.** `if (uo < 0.3) stage = 3 else if (uo < 0.5) stage = 1` never assigns 2 at all (row 2 is unreachable), under-stages <0.5 mL/kg/h sustained ≥12 h as Stage 1, and over-stages 0.25 mL/kg/h for 8 h as Stage 3 — 0.25 is also below 0.5, and 8 h sits inside row 1's window, so row 1 is the only row satisfied. Rec 2.1.1 criterion 3 also sets a hard floor: **below 6 hours there is no AKI on this axis at all, however low the rate**.

Row 4 stands on its own: KDIGO nowhere defines anuria numerically (neither Table 2 nor the Chapter 2.1 rationale gives a mL/kg/h value or a "zero output" definition), and no agreed nephrology definition exists elsewhere either — **confirmed absent, see Limitations** — so an anuria flag must never be converted into an **invented rate**.

**Anuria does, however, entail rows 1 and 2.** The absence of urine is necessarily below any positive cutoff, so anuria satisfies "<0.5 mL/kg/h" without assigning anuria a number at all — the entailment is logical, not definitional. **Anuria for 6 to <12 h is therefore Stage 1, not Stage 0.** Treating anuria as satisfying nothing below 12 h under-stages — the dangerous direction (Step 2a) — and produces the incoherent pair where a recorded rate of 0 over the same window stages 1 while the word "anuria" stages 0. Row 3 (<0.3 mL/kg/h) is deliberately left un-entailed: it fires only at ≥24 h, and every window establishing ≥24 h also establishes the ≥12 h at which row 4 is already Stage 3, so the entailment could not change an answer there. Where several rows are satisfied the **highest governs** as everywhere else — anuria at ≥24 h satisfies rows 2 and 4 and stages **3**.

### Step 2a — Duration is not optional, and it has no defensible default

A rate alone is non-identifying across the full range of the scale:

| Rate        | 5 h    | 8 h     | 13 h    | 25 h                      |
| ----------- | ------ | ------- | ------- | ------------------------- |
| 0.4 mL/kg/h | No AKI | Stage 1 | Stage 2 | Stage 2 (never reaches 3) |
| 0.2 mL/kg/h | No AKI | Stage 1 | Stage 2 | Stage 3                   |

The rate does constrain the **ceiling** — 0.4 mL/kg/h can never reach Stage 3, because row 3 needs <0.3 — but it does not give a stage. KDIGO supplies no duration-unknown rule: Chapter 2.1's Research Recommendations (p. 22) state it is **not currently known how the urine-volume criteria should be applied** at all (whether the threshold means an average or a persistent reduction across the window). Chapter 2.4 is generous with defaults for missing data, but **only on the creatinine axis** (MDRD back-calculation from an assumed baseline eGFR of 75; lowest in-hospital SCr as reference). The urine-output axis receives none of it.

Assuming the shortest qualifying window systematically **under-stages** (the dangerous direction in a PICU); assuming the longest **over-stages**. Either way a duration the user never entered is fabricated and a KDIGO stage the guideline does not support is asserted.

**Implemented resolution: a banded duration input.** Bands map one-to-one onto the Table 2 rows and match what a bedside user actually knows; a free-numeric hours field invites false precision about a figure estimated from a nursing chart. Each band is recorded as which windows it establishes:

| Band selected    | `6 ≤ d < 12` | `d ≥ 12` | `d ≥ 24` | Notes                                           |
| ---------------- | ------------ | -------- | -------- | ----------------------------------------------- |
| `under-6h`       | no           | no       | no       | satisfies no row — AKI criteria not met on axis |
| `6-to-under-12h` | **yes**      | no       | no       | row 1 only                                      |
| `12h-or-more`    | no           | **yes**  | no       | rows 2 and 4; **row 3 left OPEN**, see below    |
| `24h-or-more`    | no           | **yes**  | **yes**  | all rows decidable                              |

The bands carry the guideline's real inclusivity — `6 to <12`, not `6–12` — because the boundary hour is the value most likely to be looked up. `12h-or-more` asserts a **lower bound only**: it does not exclude the window having reached 24 h, so with a rate <0.3 mL/kg/h the Stage-3 row stays reachable and the result is a floor rather than a settled Stage 2.

### Step 3 — Final stage

Final AKI stage = **max(SCr-axis stage, UO-axis stage)**. (KDIGO stages by the criterion that yields the greatest severity.) Chapter 2.1's rationale (pp. 20–21) is explicit: patients are staged by the criteria giving them the highest stage, and where creatinine and urine output map to different stages the patient is staged by the worst. The note beneath Table 3 (p. 21) states the same principle independently for RIFLE and AKIN.

### Step 3a — When the urine-output axis cannot be resolved

The highest-stage rule means a known creatinine stage still establishes a **floor** while the urine-output axis is open. KDIGO's own worked staging table does exactly this: **Table 10** (Chapter 2.4, p. 30) records Case G as stage **"≥ 1"** and Case H as **"?"**, because the reference creatinine cannot be established. The guideline leaves a stage indeterminate rather than guessing it, and the `≥` notation is therefore the guideline's own.

The implementation reports the **highest CERTAIN stage** plus a `stage_is_floor` flag (1 = read the stage as "≥"). The axis is unresolvable when:

- a rate <0.5 mL/kg/h, or anuria, is entered with **no duration band**; or
- the band is `12h-or-more` **and** the rate is <0.3 mL/kg/h, leaving row 3 open.

It is **not** flagged when the open rows could not change the answer — a rate ≥0.5 satisfies no row at any duration, a rate of 0.4 caps the axis at Stage 2, and nothing can exceed Stage 3. Reporting "≥ 2" for a case that is settled at 2 would be false caution, which erodes the flag's meaning exactly where it matters.

### Pediatric-specific elements (the only pediatric deltas)

- The **eGFR <35 mL/min per 1.73 m²** branch of Stage 3 is **exclusive to patients <18 years** (it does not exist in the adult staging). Table 2's exact wording in the Stage 3 serum-creatinine column is "In patients <18 years, decrease in eGFR to <35 ml/min per 1.73 m²". It is intended to capture children whose absolute SCr never reaches the adult ≥4.0 mg/dL cutoff because their baseline creatinine and muscle mass are low — KDIGO's rationale (p. 21) says the automatic Stage 3 at SCr >4.0 mg/dL is problematic for smaller pediatric patients, and that pRIFLE therefore introduced an automatic Stage 3 at eCrCl <35. **No lower age bound is stated and neonates are not carved out.** The threshold is therefore age-gated in both directions: the implementation takes a required age input, and an eGFR supplied for a patient aged ≥18 y does **not** stage. Without an age, an adult's eGFR of 30 stages 3 on a criterion that does not apply to them.
- The eGFR for this branch is computed with the **bedside (2009) Schwartz equation** — see Inputs. KDIGO Table 2 states the threshold but does not itself re-derive the eGFR equation; the bedside Schwartz equation is the standard pediatric estimator (Schwartz 2009, PMID 19158356).
- The **urine-output criteria are already weight-indexed (mL/kg/h)**, so they apply to children directly with no modification. **There is no pediatric modification of the urine-output thresholds at all** — the adult figures (0.5 and 0.3 mL/kg/h at 6 / 12 / 24 h) are applied unchanged to children in Table 2.
- pRIFLE used **different** durations (Risk <0.5 for 8 h; Injury <0.5 for 16 h; Failure <0.3 for 24 h or anuric 12 h) and KDIGO did **not** adopt them. A calculator labelled "KDIGO" must use 6 / 12 / 24; silently blending the two is a defect. _(Provenance: the pRIFLE duration figures are from secondary sources reproducing Akcan-Arikan 2007, not the primary paper — verify before they ever enter a citation list.)_
- **Baseline SCr** in children is age- and body-size-dependent; KDIGO does not fix a single pediatric baseline method. See Limitations for the dynamic-baseline convention used in pediatric studies.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

Implemented inputs (what the calculator asks for):

| id             | label                             | type        | required | units          | conversions                                                                         | plausible min/max                                                                                                                   |
| -------------- | --------------------------------- | ----------- | -------- | -------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `age`          | Age                               | number      | **yes**  | years          | months ÷ 12; days ÷ 365.25                                                          | 0 – 120 validity guardrail. Must extend past 18 so the eGFR branch can be gated rather than assumed (KDIGO Table 2)                 |
| `scr`          | Current serum creatinine          | number      | **yes**  | mg/dL          | µmol/L → mg/dL: ÷ 88.4 (1 mg/dL = 88.4 µmol/L)                                      | ~0.1 – 15 physiologic; pediatric normal is age-dependent and low [precise pediatric norms NEEDS SOURCE — not in KDIGO Table 2]      |
| `scr_baseline` | Baseline serum creatinine         | number      | no       | mg/dL          | µmol/L → mg/dL: ÷ 88.4                                                              | age-dependent; used for the ×-baseline multipliers (KDIGO 2.1.2) and the ≥0.3 mg/dL rise                                            |
| `urine_output` | Urine output (rate)               | number      | no       | mL/kg/h        | —                                                                                   | rate 0 – ~10 mL/kg/h physiologic; compared against the 0.5 / 0.3 mL/kg/h row rates (KDIGO Table 2)                                  |
| `uo_duration`  | How long that rate was sustained  | categorical | no       | —              | —                                                                                   | `under-6h`, `6-to-under-12h`, `12h-or-more`, `24h-or-more` — the Table 2 windows, banded (see Step 2a)                              |
| `anuria`       | Anuria                            | boolean     | no       | —              | no rate is invented for it (no numeric definition exists to use — confirmed absent) | own Table 2 row (≥12 h ⇒ Stage 3) and, as the absence of urine is necessarily <0.5 mL/kg/h, rows 1–2 as well (6 to <12 h ⇒ Stage 1) |
| `egfr`         | Estimated GFR (bedside Schwartz)  | number      | no       | mL/min/1.73 m² | eGFR = 0.413 × height(cm) ÷ SCr(mg/dL)                                              | 1 – 200 guardrail; <35 threshold applies **only if age <18 y**; Schwartz bedside model validated ~1–16 yr (PMID 19158356)           |
| `rrt`          | Renal replacement therapy started | boolean     | no       | —              | —                                                                                   | true ⇒ Stage 3 regardless of SCr/UO (KDIGO Table 2)                                                                                 |

Quantities the clinician derives before entering (not asked for directly): body **weight** and **urine volume over an interval**, since UO (mL/kg/h) = volume ÷ weight ÷ hours; **height**, for the bedside Schwartz eGFR; and the **SCr rise over 48 h**, which the implementation approximates as (current − baseline) rather than a timed delta.

Outputs:

| id               | meaning                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `kdigo_stage`    | integer 0–3 — the highest stage that is CERTAIN across both axes                                                                              |
| `stage_is_floor` | 1 when the urine-output axis is unresolvable and could still raise the stage; read `kdigo_stage` as "≥" (KDIGO Chapter 2.4 Table 10 notation) |

**Conversion notes.** Creatinine SI↔conventional: divide µmol/L by 88.4 for mg/dL (KDIGO Table 2 itself lists both, e.g., 0.3 mg/dL = 26.5 µmol/L [Merck reproduction: 26.52], 4.0 mg/dL = 353.6 µmol/L [Merck: 353.60]). Urine output must be converted to **mL/kg/h** before applying thresholds; the per-kilogram indexing is what makes the adult table valid for children.

## Worked examples

KDIGO Table 2 provides **no worked example** of staging itself (Chapter 2.4's Table 10 works examples of the reference-creatinine problem, not of the urine-output rows). The cases below are **derived step-by-step from KDIGO Table 2 (Kidney Int Suppl 2012;2:1–138)**, and Example B additionally applies the bedside Schwartz equation (Schwartz 2009, PMID 19158356). They are the unit-test fixtures in `kdigo-aki.test.ts`.

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

Inputs: weight 12 kg; total measured urine 60 mL over the past 24 h (band `24h-or-more`); SCr axis not staging.

| Step      | Computation                                            | Result      |
| --------- | ------------------------------------------------------ | ----------- |
| UO rate   | 60 mL ÷ 12 kg ÷ 24 h = **0.208 mL/kg/h**               | 0.208       |
| UO row 3  | 0.208 **< 0.3 mL/kg/h** and window **≥24 h** → Stage 3 | 3           |
| **Final** | max(SCr axis, 3) → **Stage 3**, settled                | **Stage 3** |

### Example D — the under-staging case: <0.5 mL/kg/h for 14 h is Stage 2

Inputs: UO 0.4 mL/kg/h, band `12h-or-more`; SCr axis not staging.

| Row       | Test                                                                         | Satisfied   |
| --------- | ---------------------------------------------------------------------------- | ----------- |
| 1         | rate <0.5 ✓ **and** 6 ≤ d < 12 ✗                                             | no          |
| 2         | rate <0.5 ✓ **and** d ≥ 12 ✓                                                 | **yes → 2** |
| 3         | rate <0.3 ✗                                                                  | no          |
| 4         | anuria ✗                                                                     | no          |
| **Final** | max of satisfied rows → **Stage 2**, and settled (0.4 can never reach row 3) | **Stage 2** |

A rate-first implementation returns Stage 1 here, because row 2 is unreachable when the rate bands are treated as exclusive.

### Example E — the over-staging case: <0.3 mL/kg/h for only 8 h is Stage 1

Inputs: UO 0.25 mL/kg/h, band `6-to-under-12h`; SCr axis not staging.

| Row       | Test                                                 | Satisfied   |
| --------- | ---------------------------------------------------- | ----------- |
| 1         | rate <0.5 ✓ (0.25 is also <0.5) **and** 6 ≤ d < 12 ✓ | **yes → 1** |
| 2         | rate <0.5 ✓ **and** d ≥ 12 ✗                         | no          |
| 3         | rate <0.3 ✓ **and** d ≥ 24 ✗                         | no          |
| 4         | anuria ✗                                             | no          |
| **Final** | **Stage 1**                                          | **Stage 1** |

A rate-first implementation returns Stage 3 here — over-staging by two stages. This is the single most important case in the suite.

### Example F — below the 6-hour floor: no AKI on this axis

Inputs: UO 0.4 mL/kg/h, band `under-6h`; SCr axis not staging. No row is satisfied (Rec 2.1.1 criterion 3 requires 6 h), so the axis contributes nothing and the reported stage is **0** — "the definition is not met on the criteria entered", not an error, and not a lower bound, because the band settles the question.

### Example G — anuria is its own row

Inputs: anuria present, band `12h-or-more`, no rate entered; SCr axis not staging. Row 4 is satisfied → **Stage 3**.

With band `6-to-under-12h` instead, row 4 is **not** satisfied (it needs ≥12 h) — but row 1 **is**, because anuria is the absence of urine and so is necessarily <0.5 mL/kg/h. The axis contributes **Stage 1**. No numeric definition of anuria is used to get there; entering the measured rate (e.g. a recorded 0 mL/kg/h) alongside it gives the same Stage 1. With band `under-6h` the axis contributes **0** — the Rec 2.1.1 six-hour floor binds regardless of the entailment. With band `24h-or-more`, rows 2 and 4 are both satisfied and the maximum governs → **Stage 3**.

### Example H — duration unknown, creatinine known: report a floor

Inputs: age 5 y; baseline SCr 0.4, current SCr 0.7 (→ SCr axis Stage 1); UO 0.4 mL/kg/h, **no band entered**.

| Step             | Computation                                                        | Result   |
| ---------------- | ------------------------------------------------------------------ | -------- |
| SCr axis         | 1.75× and +0.3 mg/dL → Stage 1                                     | 1        |
| UO axis, certain | no band → no row is established                                    | 0        |
| UO axis, ceiling | 0.4 mL/kg/h could satisfy row 1 or 2 → up to Stage 2               | 2        |
| **Final**        | certain = max(1, 0) = 1; ceiling = max(1, 2) = 2 → **"≥ Stage 1"** | 1, floor |

This is Table 10 Case G's notation applied to the urine-output axis instead of the reference creatinine.

### Example I — the flag only fires when it can bind

Same as H but with a creatinine axis already at Stage 2 (baseline 0.4, current 1.0). The UO ceiling for a 0.4 mL/kg/h rate is Stage 2, which does not exceed the creatinine axis, so the answer is a **settled Stage 2** — no floor flag. Change the rate to 0.2 mL/kg/h and the ceiling becomes Stage 3, so it reports **"≥ Stage 2"**.

### Example J — the `12h-or-more` band leaves row 3 open

Inputs: UO 0.2 mL/kg/h, band `12h-or-more`; SCr axis not staging. Row 2 is satisfied (Stage 2, certain). Row 3 needs ≥24 h, which the band neither establishes nor excludes, so the ceiling is Stage 3 → **"≥ Stage 2"**. Selecting `24h-or-more` closes it and settles the answer at Stage 3.

## Interpretation bands (non-directive, with source)

KDIGO AKI staging **is itself the interpretation** — the three stages are an ordinal severity classification, not a continuous score, and the guideline frames them as a basis for monitoring/management intensity rather than as a directive number.

- **Stage 1** = least severe AKI meeting definition; **Stage 2** = intermediate; **Stage 3** = most severe (includes need for RRT and, in children, eGFR <35). (KDIGO Table 2.)
- Higher KDIGO stage is **associated** with higher mortality and greater risk of RRT/adverse outcomes in the outcome literature; the guideline itself is a **classification**, not a treatment threshold. Any platform display should stay descriptive (e.g., "Stage 3 indicates the most severe AKI category by KDIGO criteria") and avoid prescriptive wording.
- KDIGO deliberately **harmonizes the earlier RIFLE and AKIN systems**; the pediatric analogue **pRIFLE** (Akcan-Arikan 2007) predates it and is a separate instrument — not reproduced here.

There are **no additional numeric "cut-point" bands** beyond the three stages themselves.

## References (full, PMID/DOI/URL)

1. **KDIGO Acute Kidney Injury Work Group.** KDIGO Clinical Practice Guideline for Acute Kidney Injury. _Kidney Int Suppl._ 2012;2(1):1–138. DOI: 10.1038/kisup.2012.1. Guideline PDF: https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf (definition = Rec 2.1.1; staging = Rec 2.1.2 / Table 2, p. 19; highest-stage rule = Chapter 2.1 rationale, pp. 20–21; UO limitations and the "not known how urine volume criteria should be applied" research recommendation = p. 22; indeterminate-staging precedent = Chapter 2.4, Table 10, p. 30). _[Primary source of record for all staging thresholds. The 2026-07-25 pass could not fetch the official PDF (HTTP 403) and used the three independent reproductions below, which agreed exactly. The v2.0.0 pass (2026-08-03) worked from a review note taken directly from the retrieved primary PDF — Summary of Recommendation Statements p. 8, Chapter 2.1 pp. 19–22, Tables 2 and 3, Chapter 2.4 pp. 28–31 with Tables 7/9/10, and Chapter 1.2 on grading. Everything sourced to a page number above comes from that reading, not from recall. Note also that Recs 2.1.1 and 2.1.2 are **Not Graded**: Chapter 1.2 says the Work Group chose ungraded statements for diagnosis and staging deliberately and does not intend them as weaker.]_
2. **Palevsky PM, et al.** Reading between the (guide)lines — the KDIGO practice guideline on acute kidney injury in the individual patient. _Kidney Int._ 2014;85(1):49–61. PMC3877708. https://pmc.ncbi.nlm.nih.gov/articles/PMC3877708/ — reproduces KDIGO Table 2 verbatim, **including** the "in patients <18 years, decrease in eGFR to <35 mL/min per 1.73 m²" Stage 3 branch. _(Independent corroboration, and the extraction source for the 2026-07-25 pass — its urine-output rows are laid out as a rate ladder, which is how v1.0.0 came to branch on rate first. The corrected (rate, duration) row structure is taken from reference 1, the retrieved primary PDF, not from here.)_
3. **Merck Manual Professional Edition.** Staging Criteria for Acute Kidney Injury (KDIGO 2012). https://www.merckmanuals.com/professional/multimedia/table/staging-criteria-for-acute-kidney-injury-kdigo-2012 — confirmed exact µmol/L values (0.3 mg/dL = 26.52 µmol/L; 4.0 mg/dL = 353.60 µmol/L) and UO durations. _(Independent corroboration.)_
4. **QxMD / Medscape KDIGO AKI Staging calculator.** https://qxmd.com/calculate/definition_17/kdigo-aki-staging — confirmed SCr multipliers (1.5–1.9 / 2.0–2.9 / 3.0×), UO thresholds, and the pediatric eGFR <35 branch. _(Independent corroboration.)_
5. **Schwartz GJ, Muñoz A, Schneider MF, et al.** New equations to estimate GFR in children with CKD. _J Am Soc Nephrol._ 2009;20(3):629–637. PMID: 19158356. DOI: 10.1681/ASN.2008030287. — bedside equation **eGFR = 0.413 × height(cm) ÷ SCr(mg/dL)**; derived from 349 children (CKiD cohort), applicable range ~1–16 yr. _(Source for the eGFR used by the Stage 3 pediatric branch.)_
6. **Pediatric optimization review of KDIGO AKI criteria.** PMC12805013. https://pmc.ncbi.nlm.nih.gov/articles/PMC12805013/ — documents the eGFR-branch controversy in young children and a proposed restriction to age >3 months; also describes a dynamic 7-day baseline-SCr convention. _(Source for pediatric caveats in Limitations.)_
7. **KDOQI (Palevsky PM, et al.).** US Commentary on the 2012 KDIGO Clinical Practice Guideline for Acute Kidney Injury. _Am J Kidney Dis._ 2013;61(5):649–672. PMID: 23499048. DOI: 10.1053/j.ajkd.2013.02.349. https://www.ajkd.org/article/S0272-6386(13)00471-X/fulltext — national-society commentary confirming the KDIGO definition/staging. _(Fetch returned 403; cited for provenance, not for any unique number here.)_

Lineage (not reproduced numerically): 8. **Akcan-Arikan A, et al.** Modified RIFLE criteria in critically ill children with acute kidney injury (**pRIFLE**). _Kidney Int._ 2007;71(10):1028–1035. PMID: 17396113. _(Predecessor pediatric AKI classification; not the source of any KDIGO threshold here — NEEDS SOURCE if pRIFLE-specific values are ever used.)_

## Limitations & notes

- **Not a summed score.** Implementers must evaluate the SCr and UO axes independently and take the **maximum** stage; treating it as additive is wrong.
- **The UO rows are conjunctions, not a rate ladder.** Test all four (rate, duration) pairs independently and take the highest satisfied. Branching on rate first is the defect that shipped in v1.0.0: it made Stage 2 unreachable, under-staged <0.5 mL/kg/h for ≥12 h, and over-staged 0.25 mL/kg/h for 8 h as Stage 3. See Examples D and E.
- **A rate without a duration is not a stage.** Do not invent a default window in either direction; report an explicit indeterminate and, where the creatinine axis gives a stage, a floor in KDIGO's own "≥" notation (Table 10). See Step 2a and Step 3a.
- **Baseline creatinine is the hardest input.** KDIGO does not mandate a single pediatric baseline method. Pediatric studies commonly use a **dynamic baseline** (e.g., mean SCr over the prior 7 days, per PMC12805013); a known outpatient baseline is preferred when available. Baseline choice materially changes the multiplier-based stage — surface which baseline was used. [Exact KDIGO-endorsed pediatric baseline rule NEEDS SOURCE — the guideline discusses options rather than fixing one.]
- **Pediatric eGFR branch is contested for young children.** The <35 mL/min/1.73 m² branch was written for patients <18 y, but GFR rises developmentally from birth and only approaches adult levels around age 2; applying eGFR <35 to infants can misclassify normal physiology. A proposed refinement restricts it to age **>3 months** (PMC12805013). The bedside Schwartz equation itself was validated in children ~1–16 y with CKD, not neonates — do not extrapolate below its validated range without a neonatal-specific estimator. [NEEDS SOURCE for a neonatal eGFR method.]
- **Units.** Thresholds are specified in mg/dL and mL/kg/h; SI-unit platforms must convert (÷88.4 for creatinine) before applying. The µmol/L equivalents (26.5 / 353.6) are rounded in the source table (Merck lists 26.52 / 353.60) — treat the **mg/dL** values as authoritative and derive SI equivalents to avoid boundary drift.
- **RESOLVED 2026-08-03 — 88.42 vs 88.4 µmol/L per mg/dL is clinically immaterial, not an open item.** KDIGO prints **88.4**, which is the standard; the implementation converts with the project-wide shared constant `CREATININE_UMOL_PER_MGDL = 88.42` in `packages/scoring-engine/src/units/concentration.ts`, derived from creatinine's molar mass of 113.12 g/mol. **The difference is ~0.02% and crosses no published threshold in either direction**: KDIGO's 4.0 mg/dL Stage-3 cutoff is 353.60 µmol/L at 88.4 against 353.68 at 88.42, and its 0.3 mg/dL rise is 26.52 against 26.53. Both land on the same two-decimal mg/dL figure at every threshold this score prints (353.6 µmol/L → 4.00; a 26.5 µmol/L rise → 0.30), so **no KDIGO stage turns on the difference**, and the score's `notes` states both numbers side by side so they do not appear to disagree silently. The constant is **not** KDIGO-specific — pSOFA and PRISM use it, and the SI-canonical `UMOL_PER_L_PER_MGDL_CREATININE` in the same file is separately set to 88.4 for PELOD-2. **Do not change the shared constant**, and do not re-open this as a question: it is a documented implementation choice with a known, immaterial magnitude. If some future score's threshold ever did turn on the fourth significant figure, that score's own note is where to say so.
- **Urine output requires accurate weight and a valid collection interval.** The 6-to-<12 h vs ≥12 h vs ≥24 h windows and the anuria-≥12 h row require timed collection; spot estimates are insufficient to assign the UO axis.
- **Weight basis is undefined by the guideline.** KDIGO does not state whether mL/kg/h is indexed to actual, ideal or lean body weight, and lists that question — alongside fluid balance, percent volume overload and diuretic use — as an open research recommendation (p. 22). This calculator applies the rate exactly as entered and takes no position. [NEEDS SOURCE for a KDIGO-endorsed weight basis.]
- **KDIGO's own stated limits on the UO axis** (p. 22): it is less well validated than the creatinine criteria; clinical judgement about drugs (ACE inhibitors are the guideline's example), fluid balance and other factors is required; and in very obese patients the criteria may capture patients with normal urine output.
- **Anuria has no numeric definition — CONFIRMED ABSENT (2026-08-03), not unfound.** There is none anywhere in Table 2 or the Chapter 2.1 rationale, and re-searching on 2026-08-03 established the stronger fact: **no single agreed nephrology definition of anuria exists** to borrow from outside the guideline either. The term is deliberately clinical, and that is the settled answer — **do not re-search this.** An implementation must therefore never derive a **rate** from an anuria flag; the current behaviour, which treats anuria as a clinical flag and gives it no millilitre figure, is now positively justified rather than merely cautious. It must equally not read that as "anuria satisfies no rate row": the absence of urine is necessarily below any positive cutoff, so anuria satisfies the <0.5 mL/kg/h rows by entailment and anuria for 6 to <12 h is Stage 1. The prohibition is on inventing a number, not on applying the inequality the word already guarantees.
- **RRT overrides.** Initiation of RRT is Stage 3 by definition irrespective of SCr/UO; a platform should let an explicit RRT flag force Stage 3.
- **The ≥4.0 mg/dL route to Stage 3 is not standalone in the guideline — and the implementation currently applies it as if it were.** The Chapter 2.1 rationale (p. 21) states the patient must _first_ satisfy the Rec 2.1.1 creatinine-change definition (≥0.3 mg/dL within 48 h, or ≥1.5× baseline); this was a deliberate 2012 change from AKIN's wording, described as bringing definition and staging into parity. `kdigo-aki.ts` applies `SCr ≥ 4.0 → Stage 3` to the entered creatinine on its own, which over-stages a chronically elevated creatinine. Gating it on Rec 2.1.1 would instead under-stage every case entered without a baseline (KDIGO's honest answer there is Table 10's "?", not Stage 0). **Deliberately unresolved as of v2.0.0** and disclosed in the score's `notes`; it is a clinical decision, not a code tidy-up. The behaviour is pinned by a test so a change cannot be silent.
- **Timeframes are for diagnosis, not staging** (Chapter 2.4, pp. 30–31). A patient may be staged across the whole episode: a 50% SCr rise over 5 days reaching three-fold at 3 weeks is diagnosed as AKI and ultimately staged 3. There is no stipulation that the 48-hour or 7-day window be the first of the admission.
- **Laboratory error and inter-laboratory bias ("pseudo-AKI")** should be considered; KDIGO advises repeating suspicious results (Chapter 2.4, p. 31).
- **Single guideline, evolving evidence.** This file encodes the 2012 KDIGO criteria (the current standard); newer AKI biomarker/subphenotype work is out of scope for this source-of-record file.

## IP status

- **Formula and thresholds: not copyrightable.** KDIGO AKI staging is a set of factual numeric cut points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations). Facts and mathematical criteria are not subject to copyright and may be implemented directly. Attribution to KDIGO 2012 is an academic-integrity expectation, not a copyright requirement.
- **Copyrighted prose caveat — flag.** The **full text of the KDIGO guideline** (Kidney Int Suppl 2012) and Table 2's surrounding narrative are copyrighted editorial prose. This page reproduces **only the numeric criteria and short factual descriptors** (e.g., "1.5–1.9 × baseline", "<0.3 mL/kg/h for ≥24 h"), which are facts — not the guideline's explanatory paragraphs. Do **not** paste verbatim guideline narrative into the product; re-express any explanatory text in original wording.
- **No copyrightable scale-item wording.** Unlike descriptor-based instruments (e.g., GCS response items), KDIGO staging has no proprietary response prose — every criterion is a number, ratio, or rate.
- **Bedside Schwartz equation** (eGFR = 0.413 × height ÷ SCr) is likewise a mathematical formula (a fact), freely implementable with attribution to Schwartz 2009.
