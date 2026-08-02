# PELOD-2 (PEdiatric Logistic Organ Dysfunction-2)

> Descriptive severity score for multiple organ dysfunction syndrome (MODS) in the PICU.
> 10 variables across 5 organ systems; total range **0–33**. Higher = greater organ dysfunction severity.
> Source of record: **Leteurtre S, et al. PELOD-2. Crit Care Med 2013;41(7):1761–1773. PMID 23685639, DOI 10.1097/CCM.0b013e31828a2bbd.**
> All coefficients, thresholds, age bands, and the mortality logit below were transcribed directly from the full text of that paper (Tables 2, 5, 6; Discussion). Cross-checked internally: the point values in the final regression (Table 5) match the scoring table (Table 6), and the age cutoffs in Table 6 match Table 2.

---

## Formula / algorithm (exact — every coefficient, every branch)

PELOD-2 total score = sum of the points from all 10 variables below. Each variable contributes a single point value based on the band its (worst-in-24h) value falls into. If a variable is not measured, it is scored as **normal (0 points)** (source: Table 6 footnote a).

Total possible = **0 to 33** (paper states the score "can take all integer values from 0 to 33"). Maximum points per organ (Table 7): Neurologic 9, Respiratory 8, Cardiovascular 10, Renal 2, Hematologic 4 (9+8+10+2+4 = 33).

### NEUROLOGIC (max 9)

**Glasgow Coma Scale (lowest value)** — assess only patients with known or suspected acute CNS disease:

- GCS ≥ 11 → **0**
- GCS 5–10 → **1**
- GCS 3–4 → **4**

**Pupillary reaction** (nonreactive pupils must be > 3 mm; do not assess after iatrogenic dilatation):

- Both reactive → **0**
- Both fixed → **5**

### CARDIOVASCULAR (max 10)

**Lactatemia (mmol/L):**

- < 5.0 → **0**
- 5.0–10.9 → **1**
- ≥ 11.0 → **4**

**Mean arterial pressure (mmHg), age-banded** (do not assess during crying or iatrogenic agitation). Bands transcribed verbatim from Table 6; underlying cutoffs (Cutoff1/Cutoff2/Cutoff3) from Table 2:

| Age (months) | ≥ (=0 pts) | (=2 pts) | (=3 pts) | ≤ (=6 pts) |
| ------------ | ---------- | -------- | -------- | ---------- |
| 0 to < 1     | ≥ 46       | 31–45    | 17–30    | ≤ 16       |
| 1–11         | ≥ 55       | 39–54    | 25–38    | ≤ 24       |
| 12–23        | ≥ 60       | 44–59    | 31–43    | ≤ 30       |
| 24–59        | ≥ 62       | 46–61    | 32–44    | ≤ 31       |
| 60–143       | ≥ 65       | 49–64    | 36–48    | ≤ 35       |
| ≥ 144        | ≥ 67       | 52–66    | 38–51    | ≤ 37       |

(Regression basis, Table 5: ≥Cutoff3 = 0; Cutoff2–Cutoff3 = 2 pts, coef 0.806; Cutoff1–Cutoff2 = 3 pts, coef 1.332; <Cutoff1 = 6 pts, coef 2.891.)

### RENAL (max 2)

**Creatinine (µmol/L), age-banded** (Table 6; cutoff = Cutoff1 from Table 2 — the two higher risk levels were pooled into one class per the paper):

| Age (months) | ≤ (=0 pts) | ≥ (=2 pts) |
| ------------ | ---------- | ---------- |
| 0 to < 1     | ≤ 69       | ≥ 70       |
| 1–11         | ≤ 22       | ≥ 23       |
| 12–23        | ≤ 34       | ≥ 35       |
| 24–59        | ≤ 50       | ≥ 51       |
| 60–143       | ≤ 58       | ≥ 59       |
| ≥ 144        | ≤ 92       | ≥ 93       |

(Regression basis, Table 5: <Cutoff1 = 0; ≥Cutoff1 = 2 pts, coef 0.959.)

### RESPIRATORY (max 8)

**PaO₂ (mmHg) / FiO₂ ratio** (arterial PaO₂ only; considered normal in cyanotic congenital heart disease):

- ≥ 61 → **0**
- ≤ 60 → **2**

**PaCO₂ (mmHg)** (arterial, capillary, or venous):

- ≤ 58 → **0**
- 59–94 → **1**
- ≥ 95 → **3**

**Invasive mechanical ventilation** (mask ventilation is NOT invasive):

- No → **0**
- Yes → **3**

### HEMATOLOGIC (max 4)

**WBC count (× 10⁹/L):**

- > 2 → **0**
- ≤ 2 → **2**

**Platelets (× 10⁹/L):**

- ≥ 142 → **0**
- 77–141 → **1**
- ≤ 76 → **2**

### Mortality probability (published logit, Table 6)

```
logit(mortality)      = -6.61 + 0.47 × (PELOD-2 score)
Probability of death  = 1 / (1 + exp[ -logit(mortality) ])
```

The authors emphasize this equation was used for the goodness-of-fit (calibration) test, and that the aim of the score is to **describe severity of illness, not to predict individual mortality**; for a population different from the derivation cohort they recommend recalibration/customization before predictive use (source: Discussion).

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id              | label                           | type    | units / conversion                                          | plausible min–max                                       | notes / source                                                                                                                         |
| --------------- | ------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `age_months`    | Patient age                     | number  | months (selects MAP & creatinine band)                      | 0–216 (≤18 y; newborns <37 wk excluded from derivation) | Methods: patients >18 y excluded                                                                                                       |
| `gcs`           | Glasgow Coma Scale (lowest)     | integer | 3–15                                                        | 3–15 (GCS instrument range)                             | Use pre-sedation estimate if sedated; assess only if known/suspected acute CNS disease. GCS is an external instrument (see IP status). |
| `pupils`        | Pupillary reaction              | enum    | `both_reactive` \| `both_fixed`                             | —                                                       | Nonreactive pupil must be >3 mm; not after iatrogenic dilatation. Binary in source (see Limitations for unilateral).                   |
| `lactate`       | Lactatemia                      | number  | mmol/L (mg/dL → mmol/L: ÷ 9.01)                             | 0–30 mmol/L (physiologic normal ≈ 0.5–2.2)              | Table 6                                                                                                                                |
| `map`           | Mean arterial pressure          | number  | mmHg                                                        | 0–200 mmHg                                              | Do not assess during crying/agitation. Age-banded (Table 6 / Table 2).                                                                 |
| `creatinine`    | Serum creatinine                | number  | µmol/L (mg/dL → µmol/L: × 88.4; i.e. µmol/L ÷ 88.4 = mg/dL) | 0–1500 µmol/L                                           | Age-banded (Table 6 / Table 2)                                                                                                         |
| `pao2_fio2`     | PaO₂/FiO₂ ratio                 | number  | ratio (PaO₂ mmHg ÷ FiO₂ fraction 0–1)                       | 0–600                                                   | Arterial PaO₂ only; normal in cyanotic CHD                                                                                             |
| `paco2`         | PaCO₂                           | number  | mmHg (kPa → mmHg: × 7.5)                                    | 10–200 mmHg                                             | Arterial/capillary/venous acceptable                                                                                                   |
| `invasive_vent` | Invasive mechanical ventilation | boolean | yes/no                                                      | —                                                       | Mask ventilation not counted                                                                                                           |
| `wbc`           | WBC count                       | number  | × 10⁹/L                                                     | 0–100                                                   | Table 6                                                                                                                                |
| `platelets`     | Platelet count                  | number  | × 10⁹/L                                                     | 0–1000                                                  | Table 6                                                                                                                                |

Conversion notes: creatinine 1 mg/dL = 88.4 µmol/L (standard clinical factor; the derivation cohort reported creatinine in µmol/L). Lactate 1 mmol/L ≈ 9.01 mg/dL. PaCO₂/PaO₂ 1 kPa = 7.5 mmHg. These unit factors are standard laboratory conversions, not values from the paper; the paper's cutoffs are all in the units shown in the tables above.

Plausible min/max are engineering input-validation bounds (physiologically plausible extremes), not from the paper except where the paper defines the categorical bands; treat them as sanity limits, not clinical thresholds.

---

## Worked examples

The primary paper does **not** publish a single-patient worked example. The three vectors below are **derived step-by-step from the published scoring table (Table 6) and the mortality logit in Leteurtre 2013 Crit Care Med (PMID 23685639)**. They are suitable as unit tests.

### Example 1 — All-normal patient → score 0 (derived from formula in Leteurtre 2013)

Any age. GCS 15, pupils both reactive, lactate 1.0, MAP normal-for-age, creatinine normal-for-age, PaO₂/FiO₂ 300, PaCO₂ 40, no invasive ventilation, WBC 10, platelets 300.

- Points: 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 = **0**
- logit = -6.61 + 0.47 × 0 = -6.61 → P = 1/(1+e^6.61) = **≈ 0.0013 (0.13%)**

### Example 2 — 3-year-old (24–59 mo band), mixed dysfunction → score 9 (derived from formula in Leteurtre 2013)

GCS 8 → 1; pupils both reactive → 0; lactate 6.0 mmol/L → 1; MAP 40 mmHg (band 32–44 for 24–59 mo) → 3; creatinine 30 µmol/L (≤50) → 0; PaO₂/FiO₂ 200 (≥61) → 0; PaCO₂ 50 (≤58) → 0; invasive ventilation Yes → 3; WBC 10 (>2) → 0; platelets 100 (77–141) → 1.

- Points: 1 + 0 + 1 + 3 + 0 + 0 + 0 + 3 + 0 + 1 = **9**
- logit = -6.61 + 0.47 × 9 = -2.38 → P = 1/(1+e^2.38) = **≈ 0.085 (8.5%)**

### Example 3 — 8-month-old (1–11 mo band), maximum dysfunction → score 33 (derived from formula in Leteurtre 2013; boundary/max test)

GCS 3 → 4; pupils both fixed → 5; lactate 12.0 mmol/L (≥11.0) → 4; MAP 20 mmHg (≤24 for 1–11 mo) → 6; creatinine 30 µmol/L (≥23 for 1–11 mo) → 2; PaO₂/FiO₂ 50 (≤60) → 2; PaCO₂ 100 (≥95) → 3; invasive ventilation Yes → 3; WBC 1.5 (≤2) → 2; platelets 50 (≤76) → 2.

- Points: 4 + 5 + 4 + 6 + 2 + 2 + 3 + 3 + 2 + 2 = **33** (equals the published maximum)
- logit = -6.61 + 0.47 × 33 = 8.90 → P = 1/(1+e^-8.90) = **≈ 0.9999 (99.99%)**

---

## Interpretation bands (non-directive wording, with source)

PELOD-2 is a **continuous** descriptive score (0–33); the paper does **not** define named severity categories (e.g., mild/moderate/severe). Higher totals correspond to more severe cumulative organ dysfunction. Two published, source-backed ways to contextualize a value:

**A. Observed mortality by number of dysfunctional organs (Table 8, derivation cohort, n=3,671):**

| Organ dysfunctions | Mean PELOD-2 (SD) | Observed in-PICU mortality |
| ------------------ | ----------------- | -------------------------- |
| 0                  | 0 (0.0)           | 0.4%                       |
| 1                  | 2.3 (0.8)         | 0.3%                       |
| 2                  | 4.9 (1.3)         | 1.2%                       |
| 3                  | 7.5 (2.0)         | 7.1%                       |
| 4                  | 11.5 (4.4)        | 30.5%                      |
| 5                  | 16.8 (5.2)        | 59.0%                      |

(Mean PELOD-2 in nonsurvivors was 14.9 [SD 6.1] vs 4.2 [SD 3.2] in survivors; overall median score 4, IQR 2–7.)

**B. Predicted probability of death at selected scores — DERIVED from the published logit** `-6.61 + 0.47×score` (reference points, not clinical decision thresholds):

| PELOD-2 score | Predicted mortality probability |
| ------------- | ------------------------------- |
| 0             | ≈ 0.1%                          |
| 5             | ≈ 1.4%                          |
| 10            | ≈ 12.9%                         |
| 15            | ≈ 60.8%                         |
| 20            | ≈ 94.2%                         |
| 25            | ≈ 99.4%                         |
| 33            | ≈ 100.0%                        |

Non-directive framing: these values describe a population-level association between the score and outcome in the derivation cohort. The authors state the score is intended to describe severity of organ dysfunction and caution against using the logit for individual mortality prediction outside the derivation population without recalibration. Any display should present the number and this context, not a directive/action.

---

## References (full citations, PMID/DOI)

1. **Leteurtre S, Duhamel A, Salleron J, Grandbastien B, Lacroix J, Leclerc F; Groupe Francophone de Réanimation et d'Urgences Pédiatriques (GFRUP). PELOD-2: an update of the PEdiatric logistic organ dysfunction score. Crit Care Med. 2013 Jul;41(7):1761–1773.** PMID: **23685639**. DOI: **10.1097/CCM.0b013e31828a2bbd**. — PRIMARY derivation/validation paper; full text obtained and transcribed (Tables 2, 5, 6, 7; Discussion). Source of all coefficients, thresholds, age bands, and the mortality logit.

2. **Leteurtre S, Duhamel A, Deken V, Lacroix J, Leclerc F; GFRUP. Daily estimation of the severity of organ dysfunctions in critically ill children by using the PELOD-2 score. Crit Care. 2015 Sep 15;19(1):324.** PMID: **26369662**. DOI: **10.1186/s13054-015-1054-y**. — Companion paper introducing the daily (dPELOD-2) application; citation verified. (Its reproduction of the scoring table was not captured in the fetched HTML, so all numeric values here rest on reference 1.)

Lineage (cited within reference 1's bibliography; NOT independently fetched — listed for provenance only, do not treat as verified here): original PELOD — Leteurtre S, et al. Validation of the paediatric logistic organ dysfunction (PELOD) score. Lancet 2003;362:192–197; and Leteurtre S, et al. Med Decis Making 1999;19:399–410.

---

## Limitations & notes

- **Descriptive, not a bedside mortality predictor.** The paper repeatedly frames PELOD-2 as a severity-of-MODS descriptor and secondary/outcome measure for trials; the logit was used for calibration testing, and predictive use in other populations requires customization/recalibration (Discussion).
- **Worst-value-in-24h rule.** Each variable uses the most abnormal value in the scoring window; if measured more than once in 24 h, use the worst (Table 6 footnote a).
- **Unmeasured = normal.** Missing variables are scored 0. This means the score can be artificially low if labs/ABGs were not drawn; document assumptions in the platform.
- **GCS caveats.** Use the lowest GCS; if sedated, record estimated pre-sedation GCS; assess only patients with known/suspected acute CNS disease. GCS itself is an external instrument (see IP status).
- **Pupillary reaction is binary in the source** (`both reactive` = 0, `both fixed` = 5). The paper gives **no** point value for a **unilateral** fixed pupil. Implementation must choose an explicit rule (the derivation used a dichotomy where only "both fixed" scores; anything not-both-fixed scored 0). This is an implementation decision, **not** specified by the paper — flag it for clinical review. [NEEDS SOURCE for unilateral handling]
- **MAP/HR not during crying or iatrogenic agitation; pupils not after iatrogenic dilatation** (Table 6 footnotes).
- **PaO₂ arterial only**; PaO₂/FiO₂ treated as normal in cyanotic congenital heart disease. PaCO₂ may be arterial, capillary, or venous.
- **Age-band boundaries** are inclusive as printed in Table 6 (e.g., MAP 1–11 mo: "≤24" = 6 pts, "25–38" = 3 pts). Encode the printed ranges exactly; note that a raw cutoff value (e.g., MAP = 16 for 0–<1 mo) falls in the "≤16" (=6) band per Table 6's printed ranges.
- **MAP 45 mmHg is unscored by Table 6 in the 24–59 month band — a gap in the source, closed here downward.** That band prints `≥62 → 0`, `46–61 → 2`, `32–44 → 3`, `≤31 → 6`: 45 falls in none of them. The other five age bands tile the axis without a gap (0–<1: …30/31–45/≥46; 1–11: …38/39–54/≥55; 12–23: …43/44–59/≥60; 60–143: …48/49–64/≥65; ≥144: …51/52–66/≥67), and the creatinine bands are contiguous in all six, so this is a one-value defect in the printed table rather than a deliberate exclusion. The paper states no rule for it, so any implementation must choose one and the choice is not derivable from the source. **This calculator assigns 45 → 3 points** — the descending `≥`-cascade in `mapPoints` falls through to the 3-point band, extending it up to 45. That is the more conservative (higher-severity) reading, which for a severity score is the safer default. The public ESPNIC calculator closes the same gap the other way, assigning 45 → 2 by extending the 2-point band down. Neither is wrong against Leteurtre 2013, because Leteurtre 2013 does not say; a total computed here for a 2–4-year-old with a MAP of exactly 45 mmHg will therefore be 1 point higher than the same case run through ESPNIC, and that is the only input at which the two disagree. Pinned by a test (`pelod2.test.ts`) so the choice stays deliberate. [NEEDS SOURCE for the intended value — unresolvable from the publication]
- **Derivation population:** France + Belgium, 9 PICUs, 3,671 children, median age 15.5 mo, mortality 6.0%; premature newborns admitted at birth and patients >18 y excluded. Generalizability to US/UK or high-surgical-volume PICUs was flagged by the authors as requiring verification.
- **Performance (derivation):** AUC 0.942 (95% CI 0.925–0.960); after optimism correction AUC 0.934, Hosmer-Lemeshow χ² 9.31 (p=0.317).
- No external/independent verification of individual coefficients beyond the primary paper was performed here; a second full-text reproduction of the scoring table (e.g., a validated calculator) could not be captured during research and would be worth adding as belt-and-suspenders confirmation.

---

## Verification

Independent verification pass performed 2026-07-25. Method: re-fetched the primary source paper as a standalone PDF from an independent third-party host (not the file's original transcription source) and checked every coefficient, threshold, age band, and worked example in this document against it line-by-line; independently recomputed all worked-example arithmetic from scratch; independently verified both reference citations via PubMed; and searched for independent secondary reproductions of the scoring table (society calculator, companion paper, open-source implementations) to cross-check.

**Sources checked:**

1. **Primary paper, independently re-fetched full text (PDF):** Leteurtre S, et al. PELOD-2: An Update of the PEdiatric Logistic Organ Dysfunction Score. Crit Care Med 2013;41(7):1761–1773. Fetched from `intensivo.sochipe.cl/subidos/catalogo3/Update Pelod Crit Care Med 2013.pdf` (independent host from this document's original transcription pass) — full text including Tables 1–8 and Discussion. This is the same underlying paper cited as "Source of record" in this file, but the fetch/transcription/verification pass was performed independently in this session, re-reading the actual published tables rather than trusting the prior transcription.
   - **Table 2** (age cutoffs, Cutoff1/2/3 for MAP and creatinine): matches this file's Table 6 bands and the parenthetical cutoff notes exactly (MAP Cutoff1/2/3 = 16/30/46, 25/39/55, 30/44/60, 32/46/62, 35/49/65, 37/51/67 for the six age bands; creatinine Cutoff1 = 70/22/34/50/58/93).
   - **Table 5** (final logistic regression / points): every coefficient and point value transcribed in this file's parenthetical "Regression basis" notes matches exactly — GCS (0.650→1pt, 1.942→4pt), pupils (2.510→5pt), lactate (0.508→1pt, 1.804→4pt), MAP (0.806→2pt, 1.332→3pt, 2.891→6pt), creatinine (0.959→2pt), PaO₂/FiO₂ (0.964→2pt), PaCO₂ (0.484→1pt, 1.514→3pt), ventilation (1.384→3pt), WBC (0.761→2pt), platelets (0.373→1pt, 0.782→2pt).
   - **Table 6** (scoring table, all point values and age-banded MAP/creatinine ranges): matches this file's formula section and tables exactly, cell for cell, including the footnote "If a variable is not measured, it should be considered normal" and the printed logit equation `Logit (mortality) = –6.61 + 0.47 × PELOD-2 score` / `Probability of death = 1/(1 + exp[–logit(mortality)])`.
   - **Table 7** (max points per organ): Neurologic 9, Respiratory 8, Cardiovascular 10, Renal 2, Hematologic 4 — matches exactly.
   - **Table 8** (mortality by number of organ dysfunctions): mean PELOD-2 (SD) and mortality % for 0–5 dysfunctions all match this file's Interpretation-bands Table A exactly (e.g., 4 dysfunctions: mean 11.5 [SD 4.4], 30.5% mortality; 5 dysfunctions: mean 16.8 [SD 5.2], 59.0% mortality).
   - **Discussion/Results text:** AUC 0.942 (95% CI 0.925–0.960), post-optimism-correction AUC 0.934 with Hosmer-Lemeshow χ²=9.31 (p=0.317), median PELOD-2 4 (IQR 2–7), nonsurvivor mean 14.9 (SD 6.1) vs survivor mean 4.2 (SD 3.2), "can take all integer values from 0 to 33," derivation cohort n=3,671 across 9 France/Belgium PICUs, patients >18y and premature (<37wk) newborns excluded, and the public-domain statement — all match this file's text verbatim in substance.
   - **Reference list (in the paper itself):** ref #2 (Lancet 2003;362:192–197, original PELOD validation) and ref #10 (Med Decis Making 1999;19:399–410, original PELOD development) match this file's "Lineage" citations exactly.
2. **PubMed record for PMID 23685639** (primary paper) — independently confirmed authors, journal (Critical Care Medicine), year 2013, volume 41, issue 7, pages 1761–1773, DOI 10.1097/CCM.0b013e31828a2bbd. Matches Reference 1 in this file exactly.
3. **PubMed record for PMID 26369662** (companion daily-PELOD-2 paper) — independently confirmed authors, journal (Critical Care), year 2015, volume 19, issue 1, article 324, DOI 10.1186/s13054-015-1054-y. Matches Reference 2 in this file exactly.
4. **Companion paper full text** (Leteurtre et al., Crit Care 2015;19:324, fetched via PMC PMC4570178 and via SpringerLink/BioMedCentral): independently confirmed it does **not** restate the PELOD-2 scoring table, thresholds, or logit formula — it only references the 2013 paper for those. This matches and corroborates this file's own caveat under Reference 2 ("Its reproduction of the scoring table was not captured... all numeric values here rest on reference 1").
5. **ESPNIC (European Society of Paediatric Neonatal Intensive Care) PELOD-2 Score Calculator** (professional-society resource, espnic.eu): independently confirms the same 10 input variables/domains used by this file (GCS, pupillary reaction, MAP, lactate, PaO₂/FiO₂, PaCO₂, mechanical ventilation, creatinine, WBC, platelets) and the same day-1/2/5/8/12/16/18 measurement schedule. The page's numeric scoring thresholds are rendered client-side and were not extractable from the fetched HTML, so this source corroborates variable selection but not individual cutoff values.
6. **Independent open-source implementation** (GitHub `razvanazamfirei/pelod2`, Stata source `src/pelod2.ado`, third-party transcription unaffiliated with the authors or with this document): independently reproduces the logit intercept −6.61 and coefficient 0.47, and the lactate, PaO₂/FiO₂, PaCO₂, WBC, platelets, pupils, ventilation, creatinine, and MAP thresholds/points all consistent with this file. One discrepancy noted: that third-party tool bins GCS as "≤5 → 4 pts, 6–10 → 1 pt," whereas the primary paper's Table 6 (independently re-read in check #1 above) and this file both state "3–4 → 4 pts, 5–10 → 1 pt." This file's GCS bands are correct per the primary source; the third-party calculator appears to have an off-by-one boundary bug in its own code. No change made to this file.
7. **Worked examples — independently recomputed from scratch** (not just re-checked against the source): all three worked examples' point sums and logit/probability arithmetic were recalculated independently.
   - Example 1: 0 points → logit −6.61 → P = 1/(1+e^6.61) ≈ 0.00134 (0.13%). Confirmed.
   - Example 2: point sum 1+0+1+3+0+0+0+3+0+1 = 9 → logit −2.38 → P = 1/(1+e^2.38) ≈ 0.0847 (8.5%). Confirmed.
   - Example 3: point sum 4+5+4+6+2+2+3+3+2+2 = 33 (matches published max) → logit 8.90 → P = 1/(1+e^−8.90) ≈ 0.99986 (99.99%). Confirmed.
   - Interpretation-bands Table B (predicted mortality at scores 0, 5, 10, 15, 20, 25, 33): independently recomputed all seven values from the logit equation; all matched the file's stated ≈0.1%, 1.4%, 12.9%, 60.8%, 94.2%, 99.4%, 100.0%.

**Outcome:** No discrepancies found. Every coefficient, threshold, age band, max-points-per-organ figure, mortality-logit constant, Table 8 figure, and worked-example calculation in this file matches the independently re-fetched primary source and, where available, independent secondary sources. **Corrections made: 0.**

**Still [NEEDS SOURCE] (unchanged by this pass):** the unilateral-fixed-pupil scoring rule flagged in Limitations & Notes — no source (primary paper, companion paper, ESPNIC calculator, or third-party implementations) was found that assigns an explicit point value to a unilateral fixed pupil; the primary paper's Table 6 is binary (both reactive / both fixed) only. This remains an implementation decision requiring clinical-team sign-off, not a sourcing gap that could be closed by further literature search.

---

## IP status

- **Formula, thresholds, coefficients, and age bands are NOT copyrightable** (facts / a mathematical algorithm). The authors additionally state PELOD-2 "will be in the public domain, which means that it can be freely used in clinical trials" (Abstract & Discussion). Free to implement.
- **Scale-item wording is functional/trivial and not copyrightable:** "Both reactive"/"Both fixed", "No"/"Yes" (invasive ventilation) are non-expressive functional labels.
- **External dependency — Glasgow Coma Scale (GCS).** PELOD-2 consumes a GCS _total-score band_ (3–4, 5–10, ≥11) but does **not** reproduce the GCS response descriptors. The GCS instrument itself (Teasdale & Jennett) has its own attribution/usage conventions; if the platform also renders a GCS _entry scale_ with verbatim response descriptors (e.g., "Obeys commands", "Localizes to pain"), that wording belongs to the GCS instrument and should be sourced/attributed separately — it is outside PELOD-2's own (public-domain) content. **Flag:** verify GCS descriptor wording provenance wherever a GCS input widget is built.
- No PELOD-2-specific verbatim scale-item text in this document appears copyright-encumbered.

---

## Organ maxima

The published maximum attainable points per organ system (Leteurtre 2013 **Table 7**), re-derived here **independently from the ten term-level branches transcribed above** rather than copied from Table 7 — so that the two are a genuine cross-check rather than one number written down twice. Each cell is the largest value its branch can return.

| Organ system   | Constituent variables (max each)                                         | Organ max |
| -------------- | ------------------------------------------------------------------------ | --------- |
| Neurologic     | GCS 3–4 → **4**; pupils both fixed → **5**                               | **9**     |
| Cardiovascular | lactate ≥ 11.0 → **4**; MAP below the age band's lowest cutoff → **6**   | **10**    |
| Renal          | creatinine ≥ the age-band cutoff → **2**                                 | **2**     |
| Respiratory    | PaO₂/FiO₂ ≤ 60 → **2**; PaCO₂ ≥ 95 → **3**; invasive ventilation → **3** | **8**     |
| Hematologic    | WBC ≤ 2 → **2**; platelets ≤ 76 → **2**                                  | **4**     |
| **Total**      |                                                                          | **33**    |

9 + 10 + 2 + 8 + 4 = **33**, which reconciles exactly with (a) Table 7 as transcribed at the top of this file, (b) the paper's statement that the score "can take all integer values from 0 to 33", and (c) Worked example 3 above, whose maximum-dysfunction vector sums to 33 term by term. All three agree; no discrepancy.

The age-banded terms (MAP, creatinine) reach their maxima in **every** age band — the bands move the thresholds, not the point values — so the organ maxima are age-independent and the total ceiling is 33 for any patient age.

**Grouping is the published structure, not an implementation choice.** The five organ systems and the assignment of each variable to one of them are exactly as printed in Table 6; this file's "Formula / algorithm" section is organised by those same five headings. Nothing here regroups or reinterprets the source.

**Machine-readable form.** `packages/scoring-engine/src/scores/pelod2.ts` declares this decomposition as its `composition` block, using the component ids `neurologic`, `cardiovascular`, `renal`, `respiratory` and `haematologic` with the maxima in the table above. The id `haematologic` uses the British spelling to match the score's existing `Haematological` input-group label; it denotes the organ system this section calls **Hematologic** (the US spelling used by the paper). A registry-wide gate asserts each declared id is actually emitted, and `pelod2.test.ts` asserts across several severity vectors that the five emitted subscores sum to the total and that none exceeds the max declared here.
