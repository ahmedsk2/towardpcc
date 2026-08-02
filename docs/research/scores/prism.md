# PRISM III and PRISM IV (Pediatric Risk of Mortality)

> **Source of record (primary text):** Pollack MM. _Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care._ **US patent 5,809,477**, issued 1998-09-15. https://patents.google.com/patent/US5809477A/en — status **"Expired - Lifetime"**, anticipated expiration **2015-09-21**.
>
> The patent reproduces the **complete PRISM III threshold table, the age-band definitions, the scoring notes, and every mortality equation** verbatim. Its inventor is the first author of the derivation paper. It is used here as the primary text because the derivation paper is paywalled, and because a patent is a primary published document, not a secondary summary.
>
> **Derivation paper:** Pollack MM, Patel KM, Ruttimann UE. _PRISM III: an updated Pediatric Risk of Mortality score._ **Crit Care Med.** 1996;24(5):743-752. **PMID: 8706448** · **DOI: 10.1097/00003246-199605000-00004**. Paywalled; abstract independently fetched and reconciled against the transcribed table (see Verification).
>
> **PRISM IV:** Pollack MM, Holubkov R, Funai T, et al. _The Pediatric Risk of Mortality Score: Update 2015._ **Pediatr Crit Care Med.** 2016;17(1):2-9. **PMID: 26492059** · **DOI: 10.1097/PCC.0000000000000558**.
>
> **Two things a reader must meet before anything else.**
>
> 1. **NO PUBLISHED WORKED EXAMPLE EXISTS** for either PRISM III or PRISM IV — not in the 1996 paper, the 2016 paper, the patent, or any secondary source located. Every example on this page is **constructed from the threshold table** and labelled as such. See [`[NEEDS SOURCE]`](#needs-source--the-genuinely-open-items).
> 2. **The PRISM III age bands have already been challenged once, incorrectly.** Read [The 2026-08-01 age-band challenge](#the-2026-08-01-age-band-challenge-primary-text-vs-page-copy) **before** acting on any external report about them. The bands below are the patent's, quoted verbatim.
>
> No value on this page is inferred or invented. Where the source is ambiguous, unreadable, or silent, the page says so rather than choosing.

## Why one calculator, not two

PRISM III and PRISM IV are **not two scores**. Pollack 2016's abstract states, verbatim, "Although the physiologic ranges for the Pediatric Risk of Mortality variables have not changed" — PRISM IV reuses PRISM III's physiologic variables and thresholds **unchanged** and revises three other things: the **collection window**, the **outcome definition**, and the **mortality equation**.

So one set of physiologic entries yields one score, and the collection window decides which published equation turns that score into a probability. The equations differ in **shape**, not merely in coefficients:

- **PRISM III** is quadratic in the **total**.
- **PRISM IV does not use the total at all.** It splits the score into a **neurologic subscore** (pupils + mental status, 0–16) and a **non-neurologic subscore** (the other 15 variables, 0–58), weights them **separately** at 0.197 and 0.163 per point — a deliberate published finding that neurologic derangement carries more risk per point — and adds five non-physiologic terms.

Implemented as `packages/scoring-engine/src/scores/prism.ts`, tested in `packages/scoring-engine/src/scores/prism.test.ts`.

## Formula / algorithm (exact — every coefficient, every branch)

PRISM III = the sum of points across **17 physiologic variables subdivided into 26 ranges** (Pollack 1996 abstract, verbatim). Range **0–74**. Higher = worse. Each variable takes the **worst qualifying value** observed in the collection window.

The 74-point ceiling decomposes as **neurologic 16 + non-neurologic 58** (see [Subscore split](#subscore-split-what-prism-iv-actually-weights)).

### PRISM III age bands — verbatim from the patent

> "Ages: Neonate=0-<1 month; Infant=1 month-<12 months; Child=12 months-<144 months; Adolescent ≧144 months."

| Band           | Range                    |
| -------------- | ------------------------ |
| **Neonate**    | 0 to <1 month            |
| **Infant**     | 1 month to <12 months    |
| **Child**      | 12 months to <144 months |
| **Adolescent** | ≥144 months (≥12 years)  |

These four bands **tile the age axis with no gap and no overlap**. That property is load-bearing: a scoring function must assign a band to every age, and any quoted set of ranges that leaves an age unassigned is not the instrument's banding. They govern **systolic blood pressure, heart rate, creatinine, BUN, and PTT** — five rows, no others.

**These are NOT the PRISM IV age categories**, which split the first month in two at 14 days. One age input drives both schemes; the implementation deliberately keeps them apart rather than merging them, because merging would silently change a threshold. See [PRISM IV covariate categories](#prism-iv-the-covariate-categories-that-differ-from-the-prism-iii-bands).

### The 2026-08-01 age-band challenge (primary text vs page copy)

**An external verification report dated 2026-08-01 called the PRISM age bands the site's one launch-blocking defect.** It claimed an **18-month-old with a systolic BP of 50 mmHg should score 3, not 7**, on the strength of the age ranges printed in the **prose on the CPCCRN calculator page**.

**The report was wrong, and the patent settles it.** US 5,809,477 states "Child = 12 months-<144 months", and gives the child systolic row as **"55-75 → 3 points, <55 → 7 points"**. An 18-month-old is a Child; 50 mmHg is below 55; the score is **7**.

Two further tells that the report was reading page copy rather than the instrument:

1. **Its own quoted ranges fail to tile the age axis.** "Child (2-12 years)" beside "Adolescent (13 years and up)" leaves **12y0m–12y11m unassigned**. No total scoring function can have a hole in its domain, so the quoted ranges cannot be the banding actually in use.
2. **The direction of the proposed change was clinically dangerous.** Acting on it would have **under-scored hypotension in toddlers** — a silent regression in the falsely reassuring direction, on a mortality-severity instrument.

The bands were correct but **untested at their edges**, which is why the report was able to look plausible. They are now pinned by `prism.test.ts` → `"holds the PRISM III age boundaries exactly where the patent puts them"`, which asserts:

| Probe                     | Expectation                                            |
| ------------------------- | ------------------------------------------------------ |
| 11.9 months, SBP 50       | 3 (infant band 45–65, in-band)                         |
| 12.0 months, SBP 50       | 7 (child band <55, below-band) — the infant/child edge |
| **18 months, SBP 50**     | **7** — the disputed case itself                       |
| 143.9 months, SBP 60      | 3 (child 55–75, in-band)                               |
| 144.0 months, SBP 60      | 7 (adolescent floor 65, below-band) — child/adol. edge |
| 12 years (144 mo), SBP 60 | 7 — must land in a band at all                         |

Note the choice of 60 mmHg at the upper edge: **SBP 50 does not discriminate there**, because it is below both the child floor (55) and the adolescent floor (65) and scores 7 on either side. The first draft of that test passed the wrong assertion for exactly that reason. 60 mmHg is in-band for a child and below-band for an adolescent, so it is the value that actually tests the boundary.

**Caveat on the record itself:** the CPCCRN page prose the reviewer quoted **could not be re-fetched to confirm it** — cpccrn.org returned HTTP 503 on 2026-08-01 as it has at every prior attempt. The quoted page copy is therefore second-hand via the test file's comment. That does not affect the conclusion, which rests entirely on the patent's own text.

**The transferable lesson**, and it is the same one `docs/decisions/ADR-tier-b-ip.md` records for this instrument's IP status: a claim about what an instrument says should be checked against the instrument's primary text, not against a calculator page's descriptive prose.

### The full PRISM III threshold table

Transcribed from the patent. Every value below appears in that document; nothing is interpolated.

#### Cardiovascular and neurologic vital signs

| Variable                    | Band       | Points = 3       | Points = 4 | Points = 5           | Points = 7 | Points = 11 |
| --------------------------- | ---------- | ---------------- | ---------- | -------------------- | ---------- | ----------- |
| **Systolic BP** (mmHg, min) | Neonate    | 40–55            | —          | —                    | <40        | —           |
|                             | Infant     | 45–65            | —          | —                    | <45        | —           |
|                             | Child      | 55–75            | —          | —                    | <55        | —           |
|                             | Adolescent | 65–85            | —          | —                    | <65        | —           |
| **Temperature** (°C)        | All        | <33 **or** >40.0 | —          | —                    | —          | —           |
| **Mental status**           | All        | —                | —          | Stupor/coma (GCS <8) | —          | —           |
| **Heart rate** (bpm, max)   | Neonate    | 215–225 ⚠️       | >225       | —                    | —          | —           |
|                             | Infant     | 215–225          | >225       | —                    | —          | —           |
|                             | Child      | 185–205          | >205       | —                    | —          | —           |
|                             | Adolescent | 145–155          | >155       | —                    | —          | —           |
| **Pupillary reflexes**      | All        | —                | —          | —                    | One fixed  | Both fixed  |

⚠️ **The neonate heart-rate band carries a known source defect.** The patent's rendering prints the neonate 3-point band as **"215-255"**, which cannot be right against the **">225"** 4-point cutoff printed on the same row — the two overlap by 30 bpm, so any rate from 226 to 255 would satisfy both tiers. **215–225 is used**, matching the infant band and independent reproductions of the table. This is an OCR/rendering artefact of the patent document, re-confirmed on 2026-08-01 (the same erroneous string reproduces on re-fetch, so it is in the source rendering, not a transcription slip here). The value printed in the 1996 paper's own Table 1 is **unverified** — see [`[NEEDS SOURCE]`](#needs-source--the-genuinely-open-items).

#### Acid–base and blood gases

| Variable                 | Criterion                           | Points |
| ------------------------ | ----------------------------------- | ------ |
| **Acidosis** (one row)   | pH 7.0–7.28 **or** total CO₂ 5–16.9 | 2      |
|                          | pH <7.0 **or** total CO₂ <5         | 6      |
| **pH** (maximum)         | 7.48–7.55                           | 2      |
|                          | >7.55                               | 3      |
| **PCO₂** (mmHg, maximum) | 50.0–75.0                           | 1      |
|                          | >75.0                               | 3      |
| **Total CO₂** (maximum)  | >34.0                               | 4      |
| **PaO₂** (mmHg, minimum) | 42.0–49.9                           | 3      |
|                          | <42.0                               | 6      |

#### Chemistry

| Variable                    | Band                 | Criterion   | Points |
| --------------------------- | -------------------- | ----------- | ------ |
| **Glucose** (max)           | All                  | >200 mg/dL  | 2      |
| **Potassium** (max)         | All                  | >6.9 mmol/L | 3      |
| **Creatinine** (mg/dL, max) | Neonate              | >0.85       | 2      |
|                             | Infant **and** Child | >0.90       | 2      |
|                             | Adolescent           | >1.30       | 2      |
| **BUN** (mg/dL, max)        | Neonate              | >11.9       | 3      |
|                             | All others           | >14.9       | 3      |

Note the **creatinine row shares one cutoff between infant and child**, and the **BUN row is a two-band split only** (neonate vs everyone else). Neither follows the four-band scheme, and assuming they do is a plausible way to get this score wrong.

#### Haematology

| Variable                       | Band       | Criterion                 | Points |
| ------------------------------ | ---------- | ------------------------- | ------ |
| **WBC** (cells/mm³, min)       | All        | <3,000                    | 4      |
| **Platelets** (cells/mm³, min) | All        | 100,000–200,000           | 2      |
|                                |            | 50,000–99,999             | 4      |
|                                |            | <50,000                   | 5      |
| **PT/PTT** (s, max; one row)   | Neonate    | PT >22.0 **or** PTT >85.0 | 3      |
|                                | All others | PT >22.0 **or** PTT >57.0 | 3      |

**Only leukopenia scores** — a high WBC is worth nothing. The platelet row is **unusually shaped**: a merely low-normal 150,000 already scores 2. Only the **PTT** limb of the clotting row is age-dependent; the PT cutoff of 22.0 s is the same at every age.

#### Completeness check against the paper's own count

The paper states the score has **"17 physiologic variables subdivided into 26 ranges."** The table above transcribes exactly that:

**17 variables** = SBP, temperature, mental status, heart rate, pupillary reflexes, acidosis (pH/tCO₂), pH-high, PCO₂, total CO₂-high, PaO₂, glucose, potassium, creatinine, BUN, WBC, platelets, PT/PTT.

**26 ranges** = SBP 2 + temperature 1 + mental status 1 + heart rate 2 + pupils 2 + acidosis 2 + pH-high 2 + PCO₂ 2 + total CO₂-high 1 + PaO₂ 2 + glucose 1 + potassium 1 + creatinine 1 + BUN 1 + WBC 1 + platelets 3 + PT/PTT 1 = **26**.

Both counts reconcile exactly, which is independent evidence that **no row is missing** from this transcription.

### Row shapes that are easy to get wrong

These are the rules that separate a correct implementation from a plausible one. Each has a dedicated trap case in the test file.

1. **Acidosis is ONE row satisfied by EITHER analyte.** The lowest pH and the lowest total CO₂ share a single row, awarded **once at the worse tier**. A patient with pH 7.05 **and** total CO₂ 6 scores **2, not 4** — both satisfy the same 2-point tier and the row fires once. Never 2 and 6 together; never 2 twice.
2. **Alkalosis is a SEPARATE row, and both can score in the same patient.** The patent is explicit: _"When there are both low and high ranges, PRISM III points may be assigned for the low and the high ranges."_ A pH that swung from 6.9 to 7.6 inside the window scores **6 + 3 = 9 from pH alone**.
3. **Total CO₂ likewise scores at both ends.** A low value feeds the shared acidosis row; a value >34.0 scores 4 independently. Total CO₂ 4 with a later 35 scores **6 + 4 = 10**.
4. **Temperature is one row with two limbs.** `<33 °C` **or** `>40.0 °C` scores 3. A patient with **both** excursions still scores **3 once**, not 6.
5. **PT and PTT share one row.** Either analyte over its cutoff awards **3 once**, even when both qualify.
6. **Pupillary reflexes are not additive with mental status in the way the max suggests** — they are separate variables (11 + 5) that happen to both land in the neurologic subscore.

### Subscore split (what PRISM IV actually weights)

| Subscore           | Variables                                       | Max    |
| ------------------ | ----------------------------------------------- | ------ |
| **Neurologic**     | Pupillary reflexes (0–11) + mental status (0–5) | **16** |
| **Non-neurologic** | The remaining fifteen variables                 | **58** |
| **Total**          |                                                 | **74** |

The worst-tier sum verifies the ceiling: 7 + 3 + 5 + 4 + 11 + 6 + 3 + 3 + 4 + 6 + 2 + 3 + 2 + 3 + 4 + 3 + 5 = **74**, of which the two neurologic items contribute 5 + 11 = **16**, leaving **58**. This is declared as the score's `composition` and pinned by a test that requires both maxima to be **attained**, not merely respected.

### PRISM III mortality equations (score-only, as implemented)

Both quoted verbatim from the patent, then `P(death) = 1 / (1 + e^−R)`.

**PRISM III-12 (first 12 hours):**

```
R = -5.5434 + 0.3441 × (PRISM III-12) − 0.00267 × (PRISM III-12)²
```

**PRISM III-24 (first 24 hours):**

```
R = -6.0396 + 0.3544 × (PRISM III-24) − 0.00304 × (PRISM III-24)²
```

### PRISM III full-covariate equations (published, NOT implemented)

The patent also publishes eight-covariate versions. They are recorded here so the choice is visible and the numbers are not lost, but they are **deliberately not implemented**: they require admission-context variables this calculator does not collect for the PRISM III windows, and the score-only quadratic model is the one that matches what a user actually enters.

**PRISM III-12, full model:**

```
R = -5.8294 + 0.3318(PRISM III-12) − 0.00265(PRISM III-12)²
    + 0.4899(pre-ICU care area) − 0.6619(operative status)
    + 0.6620(previous ICU admission) − 1.7463(acute diagnosis of diabetes)
    + 0.5148(chromosomal anomaly) + 0.7634(acute or chronic oncologic disease)
    + 0.6737(acute nonoperative cardiovascular disease)
    + 1.1103(pre-ICU cardiac massage)
```

**PRISM III-24, full model:**

```
R = -6.2833 + 0.3377(PRISM III-24) − 0.00283(PRISM III-24)²
    + 0.4536(pre-ICU care area) − 0.6966(operative status)
    + 0.6650(previous ICU admission) − 1.6763(acute diagnosis of diabetes)
    + 0.5568(chromosomal anomaly) + 0.7746(acute or chronic oncologic disease)
    + 0.6467(acute nonoperative cardiovascular disease)
    + 1.1197(pre-ICU cardiac massage)
```

The patent contains **14 equations in total** across four scoring methodologies (PRISM III-12, PRISM III-24, PRISM III-APS, and the original PRISM), differing by scoring system, time window, and covariate inclusion.

### PRISM IV — the covariate categories that DIFFER from the PRISM III bands

Coefficients as implemented, cited to **Table 3 of Pollack 2016**. `P(death) = 1 / (1 + e^−R)`.

```
R = -5.776
    + [age term]
    + [admission source term]
    + 1.082 × (CPR within 24 h before admission)
    + 0.766 × (cancer, acute or chronic)
    − 1.697 × (low-risk system of primary dysfunction)
    + 0.197 × (neurologic subscore)
    + 0.163 × (non-neurologic subscore)
```

**Age categories — note these are NOT the PRISM III bands:**

| PRISM IV age category | Coefficient   |
| --------------------- | ------------- |
| <14 days              | +1.311        |
| 14 days to <1 month   | +0.968        |
| 1 month to <12 months | +0.357        |
| ≥12 months            | 0 (reference) |

**PRISM IV splits the first month at 14 days, where PRISM III has a single undivided neonate band; and PRISM IV's top category opens at 12 months, where PRISM III's child band runs to 144 months.** The two schemes are not interchangeable and must not be merged. The implementation expresses the PRISM IV age term **in days** so the 14-day boundary is exact rather than a converted fraction of a month.

**Admission source:**

| Category                                      | Coefficient   |
| --------------------------------------------- | ------------- |
| Operating room / post-anaesthesia care (PACU) | 0 (reference) |
| Emergency department                          | +0.693        |
| Another hospital                              | +1.012        |
| Inpatient unit                                | +1.626        |

An **unplanned deterioration on an inpatient unit carries the heaviest weight of the four** — heavier than arriving from another hospital.

**Low-risk system of primary dysfunction** (endocrine, haematologic, musculoskeletal, or renal) at **−1.697** is the model's **only protective term**, and a large one.

### Collection windows are not interchangeable

| Window                                                                                      | Model        | Equation available |
| ------------------------------------------------------------------------------------------- | ------------ | ------------------ |
| First **4 hours** of PICU care (laboratory values from 2 h before admission through hour 4) | **PRISM IV** | Yes                |
| First **12 hours**                                                                          | PRISM III-12 | Yes                |
| First **24 hours**                                                                          | PRISM III-24 | Yes                |

There is **no published PRISM III equation for a 4-hour window** and **no published PRISM IV equation for 12 or 24 hours**. The calculator therefore **asks** which window was collected and shows only the matching equation. Inventing a cross-window figure would be fabrication; showing a probability off its own window would be worse, because it would look correct.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                  | label                                  | type        | units      | conversions                      | plausible min/max                                                   |
| ------------------- | -------------------------------------- | ----------- | ---------- | -------------------------------- | ------------------------------------------------------------------- |
| `collection_window` | Data collection window                 | categorical | —          | —                                | `first_4h` \| `first_12h` \| `first_24h` (required)                 |
| `age`               | Age                                    | numeric     | years      | 1 year = 12 months = 365.25 days | 0–18 [UI bound — NEEDS SOURCE]                                      |
| `sbp_min`           | Systolic blood pressure (lowest)       | numeric     | mmHg (kPa) | 1 kPa = 7.50062 mmHg             | 0–300 [UI bound — NEEDS SOURCE]                                     |
| `temp_min`          | Temperature (lowest)                   | numeric     | °C         | °F → °C: (°F−32)×5/9             | 20–45 [UI bound — NEEDS SOURCE]                                     |
| `temp_max`          | Temperature (highest)                  | numeric     | °C         | as above                         | 20–45 [UI bound — NEEDS SOURCE]                                     |
| `mental_status_gcs` | Glasgow Coma Scale (lowest)            | numeric     | points     | —                                | 3–15 (GCS definition)                                               |
| `pupils`            | Pupillary reflexes                     | categorical | —          | —                                | both reactive \| one fixed \| both fixed (required)                 |
| `hr_max`            | Heart rate (highest)                   | numeric     | bpm        | —                                | 0–350 [UI bound — NEEDS SOURCE]                                     |
| `ph_min`            | pH (lowest)                            | numeric     | —          | —                                | 6.5–8 [UI bound — NEEDS SOURCE]                                     |
| `ph_max`            | pH (highest)                           | numeric     | —          | —                                | 6.5–8 [UI bound — NEEDS SOURCE]                                     |
| `tco2_min`          | Total CO₂ (lowest)                     | numeric     | mmol/L     | mmol/L = mEq/L for HCO₃⁻         | 0–60 [UI bound — NEEDS SOURCE]                                      |
| `tco2_max`          | Total CO₂ (highest)                    | numeric     | mmol/L     | as above                         | 0–60 [UI bound — NEEDS SOURCE]                                      |
| `pco2_max`          | PCO₂ (highest)                         | numeric     | mmHg (kPa) | 1 kPa = 7.50062 mmHg             | 0–200 [UI bound — NEEDS SOURCE]                                     |
| `pao2_min`          | PaO₂ (lowest)                          | numeric     | mmHg (kPa) | as above                         | 0–700 [UI bound — NEEDS SOURCE]                                     |
| `glucose_max`       | Glucose (highest)                      | numeric     | mg/dL      | mg/dL ÷ 18.0182 = mmol/L         | 0–1500 [UI bound — NEEDS SOURCE]                                    |
| `potassium_max`     | Potassium (highest)                    | numeric     | mEq/L      | mEq/L = mmol/L                   | 0–15 [UI bound — NEEDS SOURCE]                                      |
| `creatinine_max`    | Creatinine (highest)                   | numeric     | mg/dL      | µmol/L ÷ 88.42 = mg/dL           | 0–25 [UI bound — NEEDS SOURCE]                                      |
| `bun_max`           | Blood urea nitrogen (highest)          | numeric     | mg/dL      | BUN mg/dL × 0.357 = urea mmol/L  | 0–300 [UI bound — NEEDS SOURCE]                                     |
| `wbc_min`           | White blood cell count (lowest)        | numeric     | cells/mm³  | cells/mm³ = ×10⁶/L               | 0–200,000 [UI bound — NEEDS SOURCE]                                 |
| `platelets_min`     | Platelet count (lowest)                | numeric     | cells/mm³  | cells/mm³ = ×10⁶/L               | 0–2,000,000 [UI bound — NEEDS SOURCE]                               |
| `pt_max`            | Prothrombin time (highest)             | numeric     | s          | —                                | 0–200 [UI bound — NEEDS SOURCE]                                     |
| `ptt_max`           | Partial thromboplastin time (highest)  | numeric     | s          | —                                | 0–400 [UI bound — NEEDS SOURCE]                                     |
| `admission_source`  | Admission source                       | categorical | —          | —                                | OR/PACU \| ED \| another hospital \| inpatient — **PRISM IV only**  |
| `cpr_24h`           | CPR within 24 h before admission       | boolean     | —          | —                                | **PRISM IV only**                                                   |
| `cancer`            | Cancer, acute or chronic               | boolean     | —          | —                                | **PRISM IV only**                                                   |
| `low_risk_system`   | Low-risk system of primary dysfunction | boolean     | —          | —                                | **PRISM IV only** (endocrine, haematologic, musculoskeletal, renal) |

The `min`/`max` values above are **user-interface plausibility bounds for input validation, not published limits.** The source specifies no physiologic ranges for data entry. They are marked `[UI bound — NEEDS SOURCE]` rather than presented as sourced.

### Data-collection instructions, verbatim from the patent's scoring notes

These are quoted in the calculator's help text and are reproduced here as the record of their source. All confirmed verbatim on 2026-08-01.

- **Pupillary reflexes:** _"Nonreactive pupils must be >3 mm. Do not assess after iatrogenic pupillary dilation."_
- **Mental status:** _"Include only patients with known or suspected, acute CNS disease. Do not assess within 2 hours of sedation, paralysis, or anesthesia."_
- **Heart rate:** _"Do not assess during crying or iatrogenic agitation."_
- **Temperature:** _"Use rectal, oral, blood, or axillary temperatures."_
- **Whole-blood corrections:** _"Whole blood measurements should be increased as follows: glucose-10%; sodium-3 mmol/L; potassium-0.4 mmol/L."_
- **Blood gases:** pH and PCO₂ _"may be measured from arterial, capillary, or venous sites."_ PaO₂: _"Use arterial measurements only."_
- **Total CO₂:** _"Use calculated bicarbonate values from blood gases only if total CO₂ is not measured routinely."_

**Note on the sodium correction.** The whole-blood note prescribes a sodium correction, but **sodium is not a scored PRISM III variable** — verified directly against the patent's tables, where it does not appear. (It was scored in the original PRISM; PRISM III dropped it.) The correction is inherited guidance with no scoring row behind it, so the calculator does not collect sodium. Do not add a sodium row on the strength of that note.

### Missing values score zero — and that is a hazard, not a feature

Every laboratory component is optional and a blank one contributes **0**. A partially entered PRISM therefore **reads lower than the patient is**. The implementation sets `missingAsNormal: true` and the form's partial-result cue exists for exactly this reason and must stay on.

## Worked examples

**No published worked example exists.** The five cases below are **constructed from the patent's threshold table**; each scoring decision is annotated with the row that produced it, so the arithmetic is auditable line by line even though the case itself is not citable to a published patient. All five were recomputed by hand during verification and reproduce exactly.

Each case doubles as a trap for a specific way this score is easy to get wrong.

### Example A — 3-year-old, entirely normal physiology (PRISM III-12); total = 0

All 26 ranges miss. Inputs: SBP 95, temp 36.5–37.5, no mental-status entry, pupils reactive, HR 120, pH 7.35–7.42, tCO₂ 22–24, PCO₂ 40, PaO₂ 90, glucose 100, K 4.0, creatinine 0.4, BUN 10, WBC 9,000, platelets 250,000, PT 12, PTT 30.

| Output              | Value                            |
| ------------------- | -------------------------------- |
| PRISM total         | **0**                            |
| Neurologic subscore | 0                                |
| Non-neurologic      | 0                                |
| Predicted mortality | **0.39%** — `1 / (1 + e^5.5434)` |

**What it pins:** the floor is **not zero**. A logistic model with a finite intercept always returns a positive probability, and this must never be displayed as 0%.

### Example B — 8-month-old, bronchiolitis (PRISM III-12); total = 7

| Row                  | Value     | Applied rule                                                 | Points |
| -------------------- | --------- | ------------------------------------------------------------ | ------ |
| Systolic BP          | 70 mmHg   | Infant band 45–65; 70 is above it                            | 0      |
| Heart rate           | 210 bpm   | **Infant band starts at 215** — near miss                    | 0      |
| Acidosis             | pH 7.25   | 7.0–7.28 tier                                                | 2      |
| Acidosis (tCO₂ limb) | 18 mmol/L | >16.9, adds nothing to the same row                          | 0      |
| PCO₂                 | 80 mmHg   | >75.0                                                        | 3      |
| BUN                  | 12 mg/dL  | **Infant cutoff is 14.9** — would have scored 3 in a neonate | 0      |
| Platelets            | 180,000   | 100,000–200,000                                              | 2      |
| **Total**            |           |                                                              | **7**  |

Predicted mortality **3.68%**.

**What it pins:** two near-miss age traps, in opposite directions.

### Example C — 14-year-old, DKA (PRISM III-12); total = 11

| Row           | Value                  | Applied rule                                        | Points |
| ------------- | ---------------------- | --------------------------------------------------- | ------ |
| **Acidosis**  | pH 7.05 **and** tCO₂ 6 | Both satisfy the 2-point tier of **one shared row** | **2**  |
| Glucose       | 620 mg/dL              | >200                                                | 2      |
| Creatinine    | 1.5 mg/dL              | Adolescent >1.30                                    | 2      |
| BUN           | 32 mg/dL               | >14.9                                               | 3      |
| Platelets     | 150,000                | Low-normal, still in the 100k–200k tier             | 2      |
| Systolic BP   | 88 mmHg                | Adolescent band 65–85; 88 is above it               | 0      |
| Potassium     | 6.0 mmol/L             | Cutoff is **>6.9**                                  | 0      |
| WBC           | 16,000                 | **Only leukopenia scores**                          | 0      |
| Mental status | GCS 13                 | Assessed but ≥8                                     | 0      |
| **Total**     |                        |                                                     | **11** |

Predicted mortality **11.09%**.

**What it pins:** the shared acidosis row. Double-counting pH and total CO₂ gives **13** — the wrong answer this case exists to catch.

### Example D — 4-year-old, septic shock (PRISM III-12); total = 35, split 5 / 30

| Row           | Value         | Applied rule                                                  | Neuro | Non-neuro |
| ------------- | ------------- | ------------------------------------------------------------- | ----- | --------- |
| Mental status | GCS 6         | <8                                                            | **5** | —         |
| Pupils        | Reactive      | —                                                             | 0     | —         |
| Systolic BP   | 58 mmHg       | Child 55–75                                                   | —     | 3         |
| Temperature   | 32.5 °C       | <33 (one row, one award)                                      | —     | 3         |
| Heart rate    | 195 bpm       | Child 185–205                                                 | —     | 3         |
| Acidosis      | pH 7.15       | 7.0–7.28                                                      | —     | 2         |
| PCO₂          | 55 mmHg       | 50.0–75.0                                                     | —     | 1         |
| Glucose       | 260 mg/dL     | >200                                                          | —     | 2         |
| Creatinine    | 1.2 mg/dL     | Child >0.90                                                   | —     | 2         |
| BUN           | 30 mg/dL      | >14.9                                                         | —     | 3         |
| WBC           | 2,200         | <3,000                                                        | —     | 4         |
| Platelets     | 65,000        | 50,000–99,999                                                 | —     | 4         |
| **PT/PTT**    | PT 24, PTT 45 | PT >22.0 fires; PTT 45 ≤57.0 does not — **row awards 3 once** | —     | 3         |
| **Totals**    |               |                                                               | **5** | **30**    |

**Total 35.**

**What it pins:** the subscore split that PRISM IV depends on, and the shared PT/PTT row.

### Example E — 10-day-old, severe perinatal asphyxia (PRISM IV, 4-hour window); total = 67, split 16 / 51

| Row           | Value                  | Applied rule                                     | Neuro  | Non-neuro |
| ------------- | ---------------------- | ------------------------------------------------ | ------ | --------- |
| Pupils        | Both fixed             | Heaviest single item in the score                | **11** | —         |
| Mental status | GCS 5                  | <8                                               | **5**  | —         |
| Systolic BP   | 35 mmHg                | Neonate <40                                      | —      | 7         |
| Temperature   | 40.5 °C                | >40.0                                            | —      | 3         |
| Heart rate    | 230 bpm                | Neonate >225                                     | —      | 4         |
| **Acidosis**  | pH 6.95 **and** tCO₂ 4 | Both in the <7.0 / <5 tier of one row            | —      | **6**     |
| PCO₂          | 80 mmHg                | >75.0                                            | —      | 3         |
| PaO₂          | 38 mmHg                | <42.0                                            | —      | 6         |
| Glucose       | 250 mg/dL              | >200                                             | —      | 2         |
| Potassium     | 7.5 mmol/L             | >6.9                                             | —      | 3         |
| Creatinine    | 1.0 mg/dL              | Neonate >0.85                                    | —      | 2         |
| BUN           | 20 mg/dL               | Neonate >11.9                                    | —      | 3         |
| WBC           | 2,500                  | <3,000                                           | —      | 4         |
| Platelets     | 40,000                 | <50,000                                          | —      | 5         |
| **PT/PTT**    | PT 30, PTT 95          | Both over the neonate cutoffs — **still 3 once** | —      | 3         |
| **Totals**    |                        |                                                  | **16** | **51**    |

**Total 67.** Non-physiologic terms active: admission source = another hospital, CPR within 24 h = true.

**What it pins:** the PRISM IV equation with a maxed neurologic subscore, and the **14-day age boundary** — this patient is on the young side of a split PRISM III does not have at all.

### Ceiling vector (threshold probe, not a clinical case)

Every row at its worst tier simultaneously: **74 = 16 neurologic + 58 non-neurologic**. This is a branch-coverage probe, not a patient, and is deliberately kept out of the worked-example set — dressing a probe up as a patient would misrepresent what it is. It is what proves the declared `composition` maxima are **attainable** rather than merely respected.

## Interpretation bands (non-directive wording, with source)

**No severity bands are authored.** This is recorded in the implementation as `interpretationStatus: "pending"` — a **content gap, not an absence by design**. Published mortality strata exist for this score and simply have not been written yet. Saying so is the difference between "no band applies" and "we have not written one."

The published quantitative anchors, for reference and not as bands:

**PRISM III (Pollack 1996):** 11,165 admissions, 543 deaths, 32 PICUs. AUROC — PRISM III-12 development **0.947 ± 0.007**, validation **0.941 ± 0.021**; PRISM III-24 development **0.958 ± 0.006**, validation **0.944 ± 0.021**. Hosmer-Lemeshow goodness of fit showed no significant calibration error (p = 0.2496 / 0.1374 / 0.4168 / 0.5504).

**PRISM IV (Pollack 2016):** 10,078 admissions, unadjusted mortality **2.7%** (site range 1.3–5.0%), 75/25 derivation/validation split. AUROC **0.88 ± 0.013** (development) and **0.90 ± 0.018** (validation). Hosmer-Lemeshow p = 0.39 (development) and 0.50 (validation).

### The calibration gap is large and must be visible

PRISM III was derived on early-1990s data and **over-predicts substantially in modern cohorts** — which is precisely why PRISM IV was recalibrated on the 2011–2013 cohort. The size of that gap is worth seeing rather than being told. Using **Example D** (total 35, split 5 / 30) and the published equations:

| Model        | Predicted mortality for the same physiology |
| ------------ | ------------------------------------------- |
| PRISM III-12 | **≈ 96.2%**                                 |
| PRISM IV     | **≈ 52.5%**                                 |

The PRISM III-12 equation crosses **50% at a score of about 19** and reaches **96% by 35**. Both models are implemented exactly as published — **the divergence is the recalibration, not an error** — but it means a PRISM III figure should not be read as a current estimate of anything. Where both are available, **PRISM IV is the current model and PRISM III the historical comparator.**

### Population instrument, not a bedside prognosis

PRISM estimates mortality risk for a **population**. It is a case-mix and benchmarking instrument: summed across a cohort it yields an expected death count for a standardised mortality ratio. **Applied to one patient it says nothing actionable.** Display wording must stay descriptive and must not read as a prognosis for the child in front of the user.

## `[NEEDS SOURCE]` — the genuinely open items

Listed plainly. None of these is papered over, and none is a placeholder for a value that was invented instead.

1. **No published worked example exists for either model.** Not in Pollack 1996, Pollack 2016, the patent, or any secondary source located. The test cases are constructed from the threshold table and labelled as such. **The natural oracle is the authors' own CPCCRN calculators** (https://www.cpccrn.org/calculators/prismivcalculator/ and `/prismiiicalculator/`), which have returned **HTTP 503 behind a rate limit at every attempt** — during research, during implementation, and again on **2026-08-01** (`Retry-After: 3600`). **Unreconciled.** This is the single most valuable outstanding verification for this score: one successful round-trip against either calculator would convert all five constructed cases into reconciled ones.
2. **The neonate heart-rate 3-point band.** The patent's rendering prints **"215-255"**, which is internally inconsistent with the **">225"** cutoff on the same row. **215–225** is used, matching the infant band and independent reproductions. The value **as printed in the 1996 paper's own Table 1 is unverified** — the paper is paywalled and was not obtained. This is a source-defect resolution, not a sourced value, and is flagged as such in the code.
3. **The glucose mg/dL vs mmol/L discrepancy.** The source prints **200 mg/dL** and **11.0 mmol/L** as if equivalent, but **200 mg/dL = 11.1 mmol/L**. The two limbs are not the same threshold. The **mg/dL limb is treated as authoritative** here. Which limb the authors intended, and whether the mmol/L figure is a rounding of the mg/dL one or a separately chosen cut point, is **not stated in any source located**.
4. **PRISM IV Table 3 coefficients were not independently re-extracted.** Pollack 2016 is paywalled; the Medscape mirror returned HTTP 402 and no open-access reproduction of the full coefficient table was located. The coefficients in the implementation are cited to Table 3 and are **structurally corroborated** only — PRISM 4-C (Alvarez Elias et al., _J Pediatr Hematol Oncol_ 2020;42(7):e563-e568, **PMID 32986390**) recalibrates the same two-weight form, publishing `logit = −4.110 + 0.219 × neurologic + 0.177 × non-neurologic`, which confirms the **shape** of the PRISM IV model but not its **values**. Obtaining Table 3 is the second outstanding verification.
5. **Interpretation bands are unauthored** (`interpretationStatus: "pending"`). Published mortality strata exist and have not been transcribed.
6. **Input plausibility bounds** (`min`/`max` on every numeric field) are UI validation limits with **no published basis**. The source specifies no data-entry ranges. Use institutional analyser limits rather than treating these as clinical bounds.
7. **PRISM III's full eight-covariate equations are published but not implemented.** Recorded above. Implementing them would require collecting pre-ICU care area, operative status, previous ICU admission, acute diabetes, chromosomal anomaly, oncologic disease, acute non-operative cardiovascular disease, and pre-ICU cardiac massage — none of which this calculator asks for in the PRISM III windows. **Not a source gap; a scope decision.**

## References (full citations, PMID/DOI)

1. **Pollack MM.** _Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care._ **US patent 5,809,477**, issued 1998-09-15. https://patents.google.com/patent/US5809477A/en — **primary source** for the complete PRISM III threshold table, the age-band definitions, the scoring notes quoted in the calculator help text, and all mortality equations. Status **"Expired - Lifetime"**, anticipated expiration **2015-09-21**.
2. **Pollack MM, Patel KM, Ruttimann UE.** _PRISM III: an updated Pediatric Risk of Mortality score._ **Crit Care Med.** 1996;24(5):743-752. **PMID: 8706448** · **DOI: 10.1097/00003246-199605000-00004.** The derivation paper. **Paywalled**; abstract fetched and reconciled, full table not obtained — the patent (ref. 1) supplies it.
3. **Pollack MM, Holubkov R, Funai T, et al.** _The Pediatric Risk of Mortality Score: Update 2015._ **Pediatr Crit Care Med.** 2016;17(1):2-9. **PMID: 26492059** · **DOI: 10.1097/PCC.0000000000000558.** PRISM IV — source of the subscore split and every coefficient in Table 3. **Paywalled**; abstract fetched, Table 3 not independently re-extracted (see `[NEEDS SOURCE]` item 4).
4. **Collaborative Pediatric Critical Care Research Network.** PRISM IV calculator. https://www.cpccrn.org/calculators/prismivcalculator/ — the authors' own implementation and the natural reconciliation oracle. **HTTP 503 at every attempt, most recently 2026-08-01. Not yet reconciled.**
5. **Alvarez Elias AC, et al.** _PRISM 4-C: An Adapted PRISM IV Algorithm for Children With Cancer._ **J Pediatr Hematol Oncol.** 2020;42(7):e563-e568. **PMID: 32986390.** Used **only** as structural corroboration of the PRISM IV two-weight form; contributes no threshold or coefficient to this page.
6. Independent validation cohort corroborating the PRISM IV 4-hour collection window ("laboratory data from 2 hours prior to 4 hours after admission, and physiological data within 4 hours of admission were collected"): _Comparative Performance of Pediatric Risk of Mortality IV and Pediatric Index of Mortality 3 in Critically Ill Children with Cancer._ PMC12186081. Window corroboration only; contributes no threshold.

## Limitations & notes

- **Population instrument.** PRISM is for case-mix adjustment and benchmarking, not individual prognosis. See [Interpretation bands](#interpretation-bands-non-directive-wording-with-source).
- **PRISM III is a historical comparator.** Derived on 1990s practice; over-predicts markedly in modern cohorts. Do not present a PRISM III probability as a current estimate.
- **Blank components score zero**, so a partially entered score reads lower than the patient is. The partial-result cue is a safety control, not decoration.
- **Mental status is conditional.** Enter it **only** for known or suspected acute CNS disease, and **not within 2 hours** of sedation, paralysis, or anaesthesia. Entering a sedation-depressed GCS inflates the neurologic subscore — the subscore PRISM IV weights most heavily.
- **Whole-blood chemistry needs correcting before entry**: glucose +10%, potassium +0.4 mmol/L. (The source also prescribes sodium +3 mmol/L, but sodium is not a scored PRISM III variable — see above.)
- **Worst-value semantics.** Every physiologic field is the worst value in the window, which is why several variables appear twice (lowest and highest pH; lowest and highest total CO₂). Entering a single spot value understates the score.
- **The bidirectional rows are the most common implementation error.** The patent explicitly permits scoring both a low and a high range of the same analyte. An implementation that treats pH as one row will silently under-score every patient whose pH swung.
- **Age bands differ between PRISM III and PRISM IV** and must never be unified. See the two tables above.
- **The neonate heart-rate band rests on a source-defect resolution**, not a clean citation. Flagged in `[NEEDS SOURCE]` item 2.
- **The mortality output is a population estimate off a specific window.** The calculator refuses to show a probability for a window whose model does not exist.

## Verification

Independent re-check performed **2026-08-01**, against the primary sources directly rather than against the implementation.

**US patent 5,809,477 (re-fetched):**

- Age bands — **confirmed verbatim**: "Ages: Neonate=0-<1 month; Infant=1 month-<12 months; Child=12 months-<144 months; Adolescent ≧144 months."
- Full threshold table (all 17 variables) — **matches this page row for row**, including the infant/child shared creatinine cutoff and the neonate-vs-everyone-else BUN split.
- Bidirectional scoring rule — **confirmed verbatim**: "When there are both low and high ranges, PRISM III points may be assigned for the low and the high ranges."
- Both implemented score-only equations — **confirmed verbatim**: `R = −5.5434 + 0.3441(PRISM III-12) − 0.00267(PRISM III-12)²` and `R = −6.0396 + 0.3544(PRISM III-24) − 0.00304(PRISM III-24)²`.
- Both full-covariate equations — **confirmed verbatim** as transcribed above. Patent contains **14 equations** across four methodologies.
- All seven scoring notes (pupil >3 mm, mental-status conditions, heart-rate exclusion, temperature sites, whole-blood corrections, blood-gas sample types, bicarbonate substitution) — **confirmed verbatim**.
- **Sodium confirmed absent** from the PRISM III-12 and PRISM III-24 tables, despite the whole-blood note prescribing a sodium correction.
- Patent status — **confirmed** "Expired - Lifetime", anticipated expiration **2015-09-21**.
- **Neonate heart-rate OCR defect reproduces on re-fetch** — the rendering again returned "215-255" against ">225" on the same row. The defect is therefore **in the source document's rendering**, not a transcription error on this page. Resolution to 215–225 stands.

**Pollack 1996 abstract (PubMed 8706448, re-fetched):**

- "The PRISM III score has 17 physiologic variables subdivided into 26 ranges" — **confirmed verbatim**, and **reconciled by arithmetic** against the transcribed table (17 and 26 both compute exactly; see the completeness check above). This is the strongest available evidence that the table here is complete.
- "stratified by age (neonate, infant, child, adolescent)" — **confirmed verbatim**, corroborating the patent's four-band scheme independently of the patent.
- Cohort (11,165 admissions, 543 deaths, 32 PICUs), all four AUROCs, all four Hosmer-Lemeshow p-values — **confirmed verbatim**.

**Pollack 2016 abstract (PubMed 26492059, re-fetched):**

- Public-domain statement — **confirmed verbatim**: "recalibrates the Pediatric Risk of Mortality score, placing the algorithms (Pediatric Risk of Mortality IV) in the public domain."
- Unchanged physiologic ranges — **confirmed**, actual wording: "Although the physiologic ranges for the Pediatric Risk of Mortality variables have not changed". **Correction of record:** the implementation's header docblock paraphrases this as "the PRISM score for physiologic variables and their ranges did not change" and presents it inside quotation marks. The claim is accurate; the quotation is a paraphrase, not the paper's words. Do not re-quote the docblock version as verbatim.
- Covariate list — **confirmed verbatim**: "the subcategories of neurologic and nonneurologic Pediatric Risk of Mortality scores, age, admission source, cardiopulmonary arrest within 24 hours before admission, cancer, and low-risk systems of primary dysfunction."
- Performance (AUROC 0.88 ± 0.013 / 0.90 ± 0.018; H-L p = 0.39 / 0.50; 10,078 admissions; 2.7% mortality) — **confirmed verbatim**.

**Not verified this pass, and recorded as such:**

- **PRISM IV Table 3 coefficients.** Paper paywalled; Medscape mirror returned **HTTP 402**; no open-access reproduction of the table located. Structural corroboration only, via PRISM 4-C (PMID 32986390). See `[NEEDS SOURCE]` item 4.
- **CPCCRN calculators.** Re-attempted 2026-08-01 → **HTTP 503, `Retry-After: 3600`**. Third documented failure. No worked example reconciled.
- **Independent reproduction of the 215–225 neonate band.** Located at search-snippet strength (a PRISM III validation paper reproducing the table with "Neonate 215-225"); the source PDF was not machine-extractable, so this is corroboration, not a citation, and item 2 stays open.

**Worked examples A–E** — all five recomputed by hand against the verified table: row selection, the shared-row rules, the subscore split, and both logistic equations. **All five reproduce exactly** (0, 7, 11, 35, 67; subscores 0/0, 0/7, 0/11, 5/30, 16/51; probabilities 0.39%, 3.68%, 11.09%). The 74-point ceiling was recomputed independently from the worst tier of every row and **sums to 74 = 16 + 58**.

**Result:** no numeric correction was necessary to the threshold table, the age bands, or the PRISM III equations. One documentation correction is recorded above (the paraphrased quotation in the implementation's docblock). Two verification gaps remain genuinely open and are listed in `[NEEDS SOURCE]`; they are absent from the accessible sources, not merely unchecked.

## IP status

> ## DECIDED 2026-08-02 — publish, treating the algorithms as uncopyrightable
>
> **Founder decision:** publish PRISM III and PRISM IV with full attribution to
> the derivation study, on the basis that a table of physiologic cut-points and
> a logistic equation is a method of operation under 17 USC 102(b) rather than
> copyrightable expression. See `docs/decisions/ADR-tier-b-ip.md`, third
> addendum.
>
> **The obligation that comes with it:** every published surface names the study,
> and `references` must resolve. Attribution is an academic-integrity duty
> independent of copyright, and it is what makes this position defensible rather
> than merely convenient.
>
> **The evidence below is unchanged and stays on the record.** The footnote
> exists, says what it says, and has not been withdrawn; the current patent
> assignee is VPS LLC, not Children's National. The decision is taken in view of
> those facts, not in ignorance of them. What would reopen it is a communication
> from VPS LLC or Children's National asserting a claim against this specific
> use — nothing else.
>
> ---
>
> ## The evidence, as recorded 2026-08-01
>
> This section previously read **"Freely reproducible"** and concluded the
> licence question was closed. An adversarial re-check found it answered the
> wrong claim, and two of its factual premises are wrong. The implementation
> still declares `ipStatus: { kind: "freely-reproducible" }`; that declaration
> and this section now disagree, deliberately, until a human decides.
>
> **1. Patent expiry does not retire the copyright assertion.** Pollack's own
> derivation papers carry a rights footnote (Crit Care Med 1996;24(5):743-752 at
> p.752; repeated in J Pediatr 1997;131(4):575-81) whose substance is:
>
> > "PRISM III and updated PRISM algorithms are copyrighted and may be the
> > subject of one or more patents held by Children's Research Institute.
> > However, the equations are available without charge for research uses
> > including the independent verification of their accuracy and reliability.
> > Children's National Medical Center may receive compensation resulting from
> > nonresearch uses of PRISM III and PRISM algorithms."
>
> That is three assertions joined by "and" — copyright, patent, and a
> research/non-research split. The 2015 patent expiry retires exactly one. Note
> the footnote's own hedging: the patent is "may be", the copyright is flat. A
> free public calculator for practising clinicians is a **clinical** use, not
> "research uses including the independent verification of their accuracy" — it
> falls on the wrong side of the line the authors themselves drew.
>
> **2. The rights holder is not who this document said.** The assignment chain
> on the patent record, verified independently 2026-08-01:
> Children's Research Institute → **Children's Hospital of Los Angeles**
> (2007-11-01) → **VPS LLC** (2008-04-07). VPS LLC is Virtual Pediatric Systems,
> a for-profit subscription PICU benchmarking product that markets PRISM 3.
> Naming Children's National has been wrong since 2008, and it means any
> permission approach has at least two possible counterparties.
>
> **3. The public-domain grant names PRISM IV, not PRISM III.** Pollack 2016
> opens "the prediction algorithms (Pediatric Risk of Mortality IV)". This
> calculator also implements the PRISM III-12 and PRISM III-24 score-only
> quadratic mortality equations, which are outside that grant and are the most
> direct target of "PRISM III and updated PRISM algorithms are copyrighted".
>
> **4. The footnote was never read.** It is in the body of a paywalled paper at
> p.752; this note's own reference 2 records the full text as not obtained. The
> one document that settles the question is the one the research skipped.
>
> **Why this matters even though the claim is probably weak.** A table of
> physiologic cut-offs and a logistic equation is thin ground under 17 USC
> 102(b), and the "facts and formulae are not copyrightable" bullet below is
> probably right on the merits. But this project declined **PEWS, FLACC,
> COMFORT-B, CAPD and SOS-PD** on asserted claims without waiting to see whether
> those claims would hold. The same standard applied here puts PRISM back at
> `NEEDS-LEGAL-REVIEW` — which is where `ADR-tier-b-ip.md` originally had it,
> and the 2026-07-31 addendum retired that row without ever quoting or answering
> this footnote. It answered Wikipedia and medicalalgorithms.com, both of which
> are patent-based.
>
> **What closes it:** obtain Pollack 1996 p.752 and read the footnote in context
> — a one-page read that resolves it either way — or get a written statement
> from whichever of Children's National or VPS LLC holds the copyright.
>
> **The narrower de-risking path, if a decision is wanted sooner:** ship
> **PRISM IV only**. Its algorithms carry an explicit public-domain grant from
> the authors, the physiologic table is unchanged between the two ("the PRISM
> score for physiologic variables and their ranges did not change") so the table
> travels with the grant, and dropping the PRISM III-12/-24 equations removes
> the only component whose clearance depends on reading patent expiry as
> extinguishing a copyright claim.
>
> Note there is **nothing to strip**: unlike FLACC or COMFORT-B, PRISM has no
> item wording of its own, so the paraphrase route that de-risks a prose scale
> does not apply. The assertion is over the algorithm itself.

The reasoning below is retained as originally written, because it is what the
`freely-reproducible` declaration currently rests on. Read it against the
correction above rather than instead of it. Full history in
`docs/decisions/ADR-tier-b-ip.md` (addendum, 2026-07-31).

- **The patent has expired.** US 5,809,477, which reproduces the entire PRISM III table and every mortality equation, shows status **"Expired - Lifetime"** with anticipated expiration **2015-09-21**. Verified directly against the patent record, and re-verified 2026-08-01.
- **PRISM IV was placed in the public domain by its own authors.** Pollack 2016's abstract states the work's objective included "placing the algorithms (Pediatric Risk of Mortality IV) in the public domain". The authors' own NIH-funded network (CPCCRN) publishes a free public calculator.
- **The content is facts and formulae, not item wording.** PRISM III is a table of physiologic cut-offs plus a logistic equation. Facts, numeric cut points, and mathematical scoring rules are **not copyrightable**. This is the category that `ADR-tier-b-ip.md` itself identifies as IP-clean, and it is why PRISM was always the odd one out in that document's Tier-B table.
- **No copyrightable item wording is reproduced.** PRISM has no descriptive response-option prose of its own. The one component with external wording is the **Glasgow Coma Scale**, and PRISM consumes only the **integer total** — no GCS eye/verbal/motor descriptor text is copied into this platform. If a GCS descriptor widget is built elsewhere, review that separately.
- **The "licence-only" claim is stale.** It is still repeated by Wikipedia and by medicalalgorithms.com (which declines to publish PRISM III because it "is protected by patent"). Those statements **pre-date the 2015 expiry** and were never revised. `ADR-tier-b-ip.md` originally inherited them and rated PRISM `NEEDS-LEGAL-REVIEW` for over a week on that basis.
  **← This bullet is the error.** Both cited sources are patent-based, so rebutting them rebuts only the patent claim. The ADR's original rating rested on the authors' copyright footnote, not on Wikipedia — see the correction at the top of this section.
- **Attribution** to Pollack et al. and to the patent is an academic-integrity expectation, not a copyright requirement, and is carried in the score's `references`.
