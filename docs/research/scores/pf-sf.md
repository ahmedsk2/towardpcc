# PaO2/FiO2 (P/F) and SpO2/FiO2 (S/F) ratios

Oxygenation indices used to diagnose and grade severity of acute hypoxemic
respiratory failure / (P)ARDS. This note covers the two direct ratios (P/F and
S/F), the PALICC-2 (2023) pediatric thresholds, the Berlin (2012) adult
thresholds for context, and the published S/F <-> P/F conversion equations with
their derivation papers.

Scope note: The **oxygenation index (OI)** and **oxygen saturation index (OSI)**
are the _primary_ PALICC-2 metrics for invasively ventilated children; P/F and
S/F are the primary metrics on non-invasive support and when mean airway
pressure is unavailable. OI/OSI are summarized in "Limitations & notes" for
completeness but are a separate score.

---

## Formula / algorithm (exact — every coefficient, every branch)

### Direct ratios

```
P/F ratio = PaO2 (mmHg) / FiO2 (fraction, 0.21–1.0)
S/F ratio = SpO2 (%)    / FiO2 (fraction, 0.21–1.0)
```

- PaO2 must be in **mmHg** (Berlin, PALICC, Rice, Khemani all use mmHg). If PaO2
  is in kPa: `PaO2(mmHg) = PaO2(kPa) × 7.50062`.
- FiO2 is a fraction from 0.21 (room air) to 1.0. If entered as a percentage,
  divide by 100 first.
- **S/F validity constraint (hard):** S/F is only interpretable when **SpO2 ≤ 97%**.
  Above 97% the SpO2–PaO2 relationship is on the flat top of the
  oxyhemoglobin dissociation curve and S/F loses discrimination. This constraint
  is required by every derivation paper below and by PALICC-2.
  Khemani derivations additionally restricted to SpO2 ≥ 80%.
  Source: Rice 2007 (SpO2 ≤ 97%); Khemani 2009 & 2012 (SpO2 80–97%);
  PALICC-2 (Emeriaud 2023), footnote: "When Spo2 is used, ensure that Spo2 is ≤ 97%."
- Oxygenation should be measured **at steady state, not during transient
  desaturation episodes** (PALICC-2). When titrating O2 to apply SpO2-based
  metrics, PALICC-2 targets SpO2 88–97% (DS 1.4.5).

### PALICC-2 (2023) pediatric ARDS (PARDS) thresholds — exact

**Diagnosis of PARDS (oxygenation criterion, DS 1.4.1):**

- Invasive mechanical ventilation (IMV): `OI ≥ 4` **or** `OSI ≥ 5`
- Non-invasive ventilation (NIV — full facemask CPAP/BiPAP with PEEP ≥ 5 cm H2O):
  `P/F ≤ 300` **or** `S/F ≤ 250`

**Severity stratification** (apply ≥ 4 hr after initial PARDS diagnosis, DS 1.4.4):

- IMV-PARDS (DS 1.4.5):
  - Mild/moderate: `OI < 16` or `OSI < 12`
  - Severe: `OI ≥ 16` or `OSI ≥ 12`
- NIV-PARDS (DS 1.4.2 / 1.4.3):
  - Mild/moderate: `P/F > 100` or `S/F > 150`
  - Severe: `P/F ≤ 100` or `S/F ≤ 150`

**Possible PARDS** (children on nasal support, DS 1.5.1):

- Nasal CPAP/BiPAP, or high-flow nasal cannula (≥ 1.5 L/kg/min or ≥ 30 L/min):
  `P/F ≤ 300` or `S/F ≤ 250`

**At-risk for PARDS:**

- Any interface: O2 supplementation to maintain SpO2 ≥ 88% but not meeting
  (possible) PARDS criteria.

Source: PALICC-2 Executive Summary (Emeriaud et al. 2023), Table of diagnostic
criteria. PaO2 preferred over SpO2 when available; OI/OSI preferred over P/F,S/F
on IMV.

### Berlin definition (2012) adult ARDS — context only

All require PEEP or CPAP ≥ 5 cm H2O; PaO2 in mmHg:

- Mild: `200 < P/F ≤ 300`
- Moderate: `100 < P/F ≤ 200`
- Severe: `P/F ≤ 100`

Source: ARDS Definition Task Force (Ranieri et al.) 2012.

### S/F <-> P/F conversion equations (each with its derivation paper)

1. **Rice 2007 (adult, ARDSNet derivation) — linear:**

   ```
   S/F = 64 + 0.84 × (P/F)          [r = 0.89, p < 0.0001]
   ```

   Correspondences reported: S/F 235 ↔ P/F 200; S/F 315 ↔ P/F 300.
   (SpO2 ≤ 97%.) Source: Rice et al. 2007.

2. **Khemani 2009 (pediatric derivation) — linear:**

   ```
   S/F = 76 + 0.62 × (P/F)          [R² = 0.61, p < 0.0001]
   ```

   Correspondences reported: S/F 201 ↔ P/F 200; S/F 263 ↔ P/F 300.
   (SpO2 80–97%.) Source: Khemani et al. 2009.

3. **Khemani 2012 (pediatric prospective validation) — nonlinear (reciprocal):**
   ```
   1/(S/F) = 0.00232 + 0.443/(P/F)
   ```
   Equivalent solved form: `S/F = 1 / (0.00232 + 0.443/(P/F))`.
   S/F cutoffs from this model: ARDS S/F = 221 (95% CI 215–226);
   ALI S/F = 264 (95% CI 259–269). (SpO2 80–97%; 1,190 gases, 137 children.)
   Source: Khemani et al. 2012. This is the more accurate pediatric model
   across the full SpO2 range and is preferred over the 2009 linear form.

Directionality: S/F rises monotonically with P/F. Lower ratio = worse
oxygenation. Both ratios fall as FiO2 rises for a given oxygenation, and as
PaO2/SpO2 fall for a given FiO2.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id         | label                                  | type   | units / conversion                                                        | plausible min/max                                                                                          |
| ---------- | -------------------------------------- | ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pao2`     | Arterial partial pressure of O2        | number | mmHg. From kPa: ×7.50062                                                  | ~10–700 mmHg (input-validity bound, not a cited threshold) [NEEDS SOURCE]                                  |
| `spo2`     | Pulse oximeter O2 saturation           | number | % (0–100). **Valid for S/F only when ≤ 97%**; Khemani models valid 80–97% | 0–100%; S/F undefined/uninterpretable when > 97% (Rice 2007; Khemani 2009/2012; PALICC-2)                  |
| `fio2`     | Fraction of inspired O2                | number | fraction 0.21–1.0. From %: ÷100                                           | 0.21 (room air) – 1.0 (definitional; PALICC/Berlin)                                                        |
| `pf_ratio` | P/F ratio (derived)                    | number | PaO2(mmHg) / FiO2                                                         | ~10 (PaO2 10, FiO2 1.0) – ~476 (PaO2 100, FiO2 0.21) typical clinical range [NEEDS SOURCE for hard bounds] |
| `sf_ratio` | S/F ratio (derived)                    | number | SpO2(%) / FiO2                                                            | ~80 (SpO2 80, FiO2 1.0) – ~462 (SpO2 97, FiO2 0.21) within valid SpO2≤97 window                            |
| `map_awp`  | Mean airway pressure (for OI/OSI only) | number | cm H2O                                                                    | context input for OI/OSI, not the ratios                                                                   |

Notes on bounds: FiO2 0.21–1.0 and SpO2 0–100% are definitional. The SpO2 ≤ 97%
ceiling for S/F is a cited hard constraint. The absolute PaO2 min/max and the
derived-ratio outer bounds are engineering input-validation limits, **not**
values from a specific publication — flagged [NEEDS SOURCE].

---

## Worked examples (each with its source; these become unit tests)

**Example 1 — P/F direct + Berlin band** _(derived from formula; band from Berlin 2012)_

- Inputs: PaO2 = 80 mmHg, FiO2 = 0.5
- P/F = 80 / 0.5 = **160**
- Band: 100 < 160 ≤ 200 → Berlin **moderate** ARDS (with PEEP ≥ 5).

**Example 2 — S/F direct + PALICC-2 NIV band** _(derived from formula; band from PALICC-2 2023)_

- Inputs: SpO2 = 90% (≤ 97, valid), FiO2 = 0.6
- S/F = 90 / 0.6 = **150**
- Diagnosis: S/F 150 ≤ 250 → meets NIV-PARDS oxygenation criterion.
- Severity: S/F ≤ 150 → **severe** NIV-PARDS.

**Example 3 — Khemani 2012 reciprocal conversion at P/F 200** _(computed from the published equation in Khemani 2012; reproduces the paper's ARDS cutoff)_

- Input: P/F = 200
- 1/(S/F) = 0.00232 + 0.443/200 = 0.00232 + 0.002215 = 0.004535
- S/F = 1 / 0.004535 = **220.5 ≈ 221**
- Matches the paper's reported ARDS S/F cutoff of 221 (95% CI 215–226). ✓

**Example 4 — Khemani 2012 reciprocal conversion at P/F 300** _(computed from the published equation in Khemani 2012; reproduces the paper's ALI cutoff)_

- Input: P/F = 300
- 1/(S/F) = 0.00232 + 0.443/300 = 0.00232 + 0.0014767 = 0.0037967
- S/F = 1 / 0.0037967 = **263.4 ≈ 264**
- Matches the paper's reported ALI S/F cutoff of 264 (95% CI 259–269). ✓

**Example 5 — Khemani 2009 linear conversion at P/F 300** _(derived from formula S/F = 76 + 0.62 × P/F in Khemani 2009)_

- Input: P/F = 300
- S/F = 76 + 0.62 × 300 = 76 + 186 = **262**
- Paper states the P/F 300 correspondence as S/F 263 (the ~1-unit gap reflects
  rounding of the published slope/intercept to 2 significant figures). ✓ (approx)

**Example 6 — Rice 2007 linear conversion at P/F 200** _(derived from formula S/F = 64 + 0.84 × P/F in Rice 2007)_

- Input: P/F = 200
- S/F = 64 + 0.84 × 200 = 64 + 168 = **232**
- Paper states the P/F 200 correspondence as S/F 235 (≈3-unit gap from rounded
  coefficients). ✓ (approx)

**Example 7 — SpO2 > 97% guard** _(constraint from Rice 2007 / Khemani / PALICC-2)_

- Inputs: SpO2 = 99%, FiO2 = 0.4
- S/F = 99/0.4 = 247.5 numerically, but SpO2 > 97 → **S/F must be flagged
  invalid / not interpretable**; do not classify severity from it.

---

## Interpretation bands (non-directive wording, with source)

Bands describe classification only; they do not prescribe management.

**Berlin 2012 (adult ARDS), P/F in mmHg, PEEP/CPAP ≥ 5:**

- P/F 200–300 (200 < P/F ≤ 300): corresponds to the _mild_ category.
- P/F 100–200 (100 < P/F ≤ 200): corresponds to the _moderate_ category.
- P/F ≤ 100: corresponds to the _severe_ category.
- Reported associated hospital mortality: mild 27%, moderate 32%, severe 45%
  (Ranieri 2012).

**PALICC-2 2023 (pediatric), non-invasive ventilation:**

- P/F ≤ 300 or S/F ≤ 250 (SpO2 ≤ 97): meets the NIV-PARDS oxygenation criterion.
- P/F > 100 or S/F > 150: corresponds to the _mild/moderate_ NIV-PARDS category.
- P/F ≤ 100 or S/F ≤ 150: corresponds to the _severe_ NIV-PARDS category.

**PALICC-2 2023 (pediatric), invasive ventilation** (severity graded by OI/OSI,
not P/F, S/F): OI < 16 or OSI < 12 = mild/moderate; OI ≥ 16 or OSI ≥ 12 = severe.

**Khemani pediatric S/F cutoffs** (screening equivalents for the older ALI/ARDS
definitions, SpO2 80–97%):

- S/F 264 (Khemani 2012) / 263 (Khemani 2009): corresponds to the ALI threshold
  (equivalent to P/F 300).
- S/F 221 (Khemani 2012) / 201 (Khemani 2009): corresponds to the ARDS threshold
  (equivalent to P/F 200).

---

## References (full citations, PMID/DOI)

1. **PALICC-2 (pediatric thresholds, primary):** Emeriaud G, López-Fernández YM,
   Iyer NP, et al; Second Pediatric Acute Lung Injury Consensus Conference
   (PALICC-2) of the Pediatric Acute Lung Injury and Sepsis Investigators
   (PALISI) Network. Executive Summary of the Second International Guidelines for
   the Diagnosis and Management of Pediatric Acute Respiratory Distress Syndrome
   (PALICC-2). _Pediatr Crit Care Med._ 2023;24(2):143–168.
   PMID: **36661420**. DOI: **10.1097/PCC.0000000000003147**.

2. **Berlin definition (adult context):** ARDS Definition Task Force; Ranieri VM,
   Rubenfeld GD, Thompson BT, Ferguson ND, Caldwell E, Fan E, Camporota L,
   Slutsky AS. Acute respiratory distress syndrome: the Berlin Definition.
   _JAMA._ 2012;307(23):2526–2533. PMID: **22797452**.
   DOI: **10.1001/jama.2012.5669**.

3. **S/F derivation — pediatric, linear:** Khemani RG, Patel NR, Bart RD 3rd,
   Newth CJL. Comparison of the pulse oximetric saturation/fraction of inspired
   oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children.
   _Chest._ 2009;135(3):662–668. PMID: **19029434**.
   DOI: **10.1378/chest.08-2239**.

4. **S/F validation — pediatric, nonlinear (preferred pediatric model):**
   Khemani RG, Thomas NJ, Venkatachalam V, Scimeme JP, Berutti T, Schneider JB,
   Ross PA, Willson DF, Hall MW, Newth CJL; Pediatric Acute Lung Injury and
   Sepsis Network Investigators (PALISI). Comparison of SpO2 to PaO2 based
   markers of lung disease severity for children with acute lung injury.
   _Crit Care Med._ 2012;40(4):1309–1316. PMID: **22202709**.
   DOI: **10.1097/CCM.0b013e31823bc61b**.

5. **S/F derivation — adult, linear (foundational):** Rice TW, Wheeler AP,
   Bernard GR, Hayden DL, Schoenfeld DA, Ware LB; NIH NHLBI ARDS Network.
   Comparison of the SpO2/FiO2 ratio and the PaO2/FiO2 ratio in patients with
   acute lung injury or ARDS. _Chest._ 2007;132(2):410–417. PMID: **17573487**.
   DOI: **10.1378/chest.07-0617**.

---

## Limitations & notes

- **S/F requires SpO2 ≤ 97%** — above this the oxyhemoglobin dissociation curve
  plateaus and S/F cannot discriminate severity. Enforce as a hard guard.
  Khemani pediatric models were derived only for SpO2 80–97%; treat S/F below
  SpO2 80% or above 97% as out-of-range.
- **Two pediatric conversions exist and disagree slightly.** Prefer the Khemani
  2012 nonlinear/reciprocal model (prospective, multicenter, reproduces its own
  cutoffs 221/264 exactly). The 2009 linear form (S/F = 76 + 0.62·P/F) is a
  reasonable approximation but the reported correspondences (201/263) come from
  the unrounded regression, so a from-formula computation lands ~1 unit off.
  The Rice 2007 adult equation (S/F = 64 + 0.84·P/F) is derived in adults and
  should be flagged if applied to children (adult-derived value).
- **Metric hierarchy (PALICC-2):** PaO2-based metrics are preferred over
  SpO2-based when a PaO2 is available; on IMV, OI/OSI are preferred over P/F,S/F.
  P/F and S/F are the graded metrics on NIV and for possible/at-risk PARDS.
- **OI / OSI (adjacent indices, not this score):**
  `OI = (FiO2 × mean airway pressure(cm H2O) × 100) / PaO2(mmHg)` with FiO2 as a
  fraction 0.21–1.0; `OSI = (FiO2 × mean airway pressure × 100) / SpO2`.
  Note: the PALICC-2 executive-summary table renders these as
  "MAP × FiO2 / PaO2" and "MAP × FiO2 / SpO2"; the ×100 factor (and FiO2-as-
  fraction convention) is the standard published form — treat the FiO2 unit
  convention carefully when implementing. Higher OI/OSI = worse. These require
  mean airway pressure and are only defined on positive-pressure ventilation.
- **FiO2 estimation error dominates on nasal cannula/low-flow** — true FiO2 is
  unknown, so P/F and S/F are unreliable there; PALICC-2 restricts NIV-PARDS
  diagnosis to full-facemask CPAP/BiPAP with PEEP ≥ 5.
- **PaO2 units**: kPa vs mmHg is a common data-entry error (P/F 300 mmHg = 40
  kPa). Validate/convert on input.
- Berlin severity mortality figures are population associations, not
  individual-patient predictions.

---

## IP status

- **Not copyrightable.** P/F and S/F are arithmetic ratios; the PALICC-2 and
  Berlin thresholds and the Rice/Khemani regression coefficients are facts
  (numbers, formulas, cutoffs), which are not protected by copyright.
- **No verbatim scale-item / response-descriptor wording** is embedded here
  (unlike GCS-type ordinal scales). There is nothing analogous to copyrightable
  descriptor phrases to reproduce — only numeric thresholds and equations.
- The _prose/table layout_ of the PALICC-2 and Berlin publications is
  copyrighted as expression; reproduce only the numeric criteria and paraphrase
  surrounding text (as done here). No verbatim guideline paragraphs are copied.

---

## Verification

Independent-source check performed 2026-07-25. For each item, at least one
source distinct from (or in addition to) this file's primary citation was
checked. No numeric corrections were required — every coefficient, threshold,
and worked example matched. Two pre-existing [NEEDS SOURCE] flags remain
unresolved and are carried forward unchanged (not fabricated).

**Rice 2007 (S/F = 64 + 0.84 × P/F, r = 0.89, p < 0.0001; S/F 235 ↔ P/F 200,
S/F 315 ↔ P/F 300; SpO2 ≤ 97%):** Confirmed via PubMed abstract (PMID 17573487) directly, and independently corroborated by a secondary paper citing
the same Rice cutoffs (Bilan et al. 2015, _J Cardiovasc Thorac Res_, via
PMC4378672, which quotes "cut-off 235 for SF... cut-off of 315 for SF"). Exact
match, no correction.

**Khemani 2009 (S/F = 76 + 0.62 × P/F, R² = 0.61, p < 0.0001; S/F 201 ↔ P/F
200, S/F 263 ↔ P/F 300; SpO2 80–97%):** Confirmed via PubMed abstract (PMID
19029434). Exact match, no correction.

**Khemani 2012 (1/(S/F) = 0.00232 + 0.443/(P/F); ARDS S/F = 221 [95% CI
215–226], ALI S/F = 264 [95% CI 259–269]; 1,190 gases, 137 children; SpO2
80–97%):** Confirmed via PubMed abstract (PMID 22202709) directly, and
independently corroborated by a secondary review (PMC9345592, "Rationale and
limitations of the SpO2/FiO2 as a possible substitute for PaO2/FiO2..."),
which restates the same equation and both cutoffs with matching CIs. Exact
match, no correction.

**PALICC-2 (2023) thresholds** (IMV diagnosis OI ≥ 4 or OSI ≥ 5; NIV diagnosis
P/F ≤ 300 or S/F ≤ 250; IMV severity OI < 16/OSI < 12 vs OI ≥ 16/OSI ≥ 12; NIV
severity P/F > 100 or S/F > 150 [mild/moderate] vs P/F ≤ 100 or S/F ≤ 150
[severe]; possible-PARDS nasal-support P/F ≤ 300 or S/F ≤ 250 with HFNC ≥ 1.5
L/kg/min or ≥ 30 L/min; NIV interface requires full facemask + PEEP/CPAP ≥ 5 cm
H2O; SpO2 target 88–97%): Confirmed via direct fetch of an open-access PMC
review article (PMC12257685, "Pediatric Acute Respiratory Distress Syndrome
Updates in the Light of the PALICC-2 Guidelines"), which quotes the PALICC-2
diagnostic/severity table verbatim, and independently cross-checked against a
second secondary source (dontforgetthebubbles.com/pards/, a pediatric EM
reference site). Both independent sources matched the file's numbers exactly.
Note: an initial AI-summarized web search pass mis-transcribed the NIV S/F
diagnostic cutoff as "264" (confusing it with the Khemani 2012 ALI cutoff);
this was caught and discarded on direct fetch of the primary-quoting PMC
article, which confirms **250** is correct as already stated in this file. No
correction needed — flagging the near-miss for the record.

**Berlin 2012** (mild 200 < P/F ≤ 300, moderate 100 < P/F ≤ 200, severe
P/F ≤ 100, PEEP/CPAP ≥ 5; mortality 27%/32%/45%): Confirmed via PubMed
(PMID 22797452) and independently corroborated by secondary summaries
(MSD Manual Professional Edition Berlin Definition table; PMC review
articles citing the same 27%/32%/45% mortality figures). Exact match, no
correction.

**OI / OSI formulas** (`OI = FiO2 × MAP × 100 / PaO2`; `OSI = FiO2 × MAP × 100
/ SpO2`, FiO2 as a fraction, higher = worse): Confirmed via independent
tertiary sources (respiratorytherapyzone.com oxygenation-index calculator;
PMC review on OI vs OSI for neonatal ECMO selection, PMC12234480). Exact
match, no correction.

**kPa → mmHg conversion factor (×7.50062):** Confirmed as the standard
physical-constant conversion (1 kPa = 7.500615758... mmHg, rounds to
7.50062) via standard unit-conversion references. Exact match, no
correction.

**Worked examples 1–7:** Independently re-computed by hand against the
formulas above (not just re-read from the file):

- Ex.1: 80/0.5 = 160 → Berlin moderate (100 < 160 ≤ 200). Correct.
- Ex.2: 90/0.6 = 150 → S/F ≤ 250 (meets NIV-PARDS) and S/F ≤ 150 (severe). Correct.
- Ex.3: 1/(S/F) = 0.00232 + 0.443/200 = 0.004535 → S/F = 220.5 ≈ 221. Correct, matches Khemani 2012 ARDS cutoff.
- Ex.4: 1/(S/F) = 0.00232 + 0.443/300 = 0.0037967 → S/F = 263.4 ≈ 264. Correct, matches Khemani 2012 ALI cutoff.
- Ex.5: 76 + 0.62×300 = 262 (paper's rounded correspondence is 263; file already
  correctly attributes the ~1-unit gap to coefficient rounding). Correct.
- Ex.6: 64 + 0.84×200 = 232 (paper's rounded correspondence is 235; file
  already correctly attributes the ~3-unit gap to coefficient rounding). Correct.
- Ex.7: 99/0.4 = 247.5 numerically, correctly flagged invalid since SpO2 > 97%. Correct.

**Unresolved [NEEDS SOURCE] items (carried forward, not fabricated):**

- `pao2` plausible min/max (~10–700 mmHg) — no publication found specifying
  this as a validated physiologic/input-validity bound; remains
  **[NEEDS SOURCE]**.
- `pf_ratio` derived outer bounds (~10–476) — likewise an arithmetic
  consequence of the input bounds rather than a cited value; remains
  **[NEEDS SOURCE]**.

**Corrections made to this file as a result of verification: none.** All
cited coefficients, thresholds, and worked examples were independently
reproduced from at least one source distinct from the file's listed primary
citation.
