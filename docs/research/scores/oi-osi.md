# Oxygenation Index (OI) and Oxygen Saturation Index (OSI)

Two bedside oxygenation-defect indices that combine the ventilator support
required (mean airway pressure, MAP, and FiO2) with the oxygenation achieved
(PaO2 or SpO2). Unlike the P/F and S/F ratios, OI and OSI incorporate MAP, so
they reflect the _cost_ of the oxygenation, not just the oxygenation itself.
They are the **primary metrics for grading PARDS severity in invasively
ventilated children** under both PALICC 2015 and PALICC-2 (2023).

- **OI** needs an arterial PaO2 → requires an arterial line (invasive).
- **OSI** substitutes pulse-oximeter SpO2 for PaO2 → non-invasive, but only
  interpretable when **SpO2 ≤ 97%**, and only validated down to **SpO2 80%**
  (see the SpO2-floor note under Inputs).

Both are only defined on positive-pressure ventilation (a mean airway pressure
must exist). Higher value = worse oxygenation.

Scope note: the P/F and S/F ratios (non-invasive/NIV metrics and the PALICC-2
metrics when MAP is unavailable) are a separate note (`pf-sf.md`). This note is
OI/OSI specifically.

---

## Formula / algorithm (exact)

```
OI  = (MAP × FiO2 × 100) / PaO2     [MAP in cmH2O, FiO2 fraction 0.21–1.0, PaO2 in mmHg]
OSI = (MAP × FiO2 × 100) / SpO2     [MAP in cmH2O, FiO2 fraction 0.21–1.0, SpO2 in %]
```

- **MAP** = mean airway pressure, in **cmH2O**, read from the ventilator. Only
  meaningful on positive-pressure ventilation (conventional IMV or HFOV).
- **FiO2** is a **fraction 0.21–1.0**. If entered as a percentage, divide by 100.
- **PaO2** is in **mmHg**. From kPa: `PaO2(mmHg) = PaO2(kPa) × 7.50062`.
- **SpO2** is a percentage. **OSI is valid only when SpO2 ≤ 97%** (hard guard;
  see below).
- Higher OI/OSI ⇒ worse oxygenation defect (rises as MAP or FiO2 rise, or as
  PaO2/SpO2 fall).

**The ×100 / FiO2-convention trap (critical for implementation).** The two ways
the literature writes OI are numerically identical — only the FiO2 unit differs:

```
(MAP × FiO2_fraction × 100) / PaO2   ≡   (MAP × FiO2_percent) / PaO2
```

The PALICC/PALICC-2 executive-summary tables render OI as
`MAP × FiO2 / PaO2` (FiO2 expressed as a **percentage**, e.g. 60), which is the
**same number** as the explicit-×100 form with FiO2 as a fraction (0.60). The
explicit `(MAP × FiO2 × 100)/PaO2` form is written verbatim in Slaughter 2025.
Worked example 3 below proves the equivalence. **Implement one convention
consistently — mixing them gives a 100× error.**

### Threshold algorithm (which guideline version)

Diagnosis and severity thresholds differ between the two consensus editions.
PARDS diagnosis is made **on invasive mechanical ventilation (IMV) with PEEP**,
and severity is graded (in PALICC-2, ≥ 4 h after diagnosis).

**PALICC 2015 — three-tier severity (IMV):**

| Severity | OI          | OSI              |
| -------- | ----------- | ---------------- |
| Mild     | 4 ≤ OI < 8  | 5 ≤ OSI < 7.5    |
| Moderate | 8 ≤ OI < 16 | 7.5 ≤ OSI < 12.3 |
| Severe   | OI ≥ 16     | OSI ≥ 12.3       |

Diagnosis on IMV requires OI ≥ 4 (or OSI ≥ 5). Source: PALICC 2015
(consensus recommendations, PMID 25647235).

**PALICC-2 2023 — two-tier severity (IMV):**

| Category        | OI      | OSI      |
| --------------- | ------- | -------- |
| Diagnosis (IMV) | OI ≥ 4  | OSI ≥ 5  |
| Mild–Moderate   | OI < 16 | OSI < 12 |
| Severe          | OI ≥ 16 | OSI ≥ 12 |

PALICC-2 **collapsed** the 2015 three-tier scheme into mild-moderate vs severe
for IMV, and **changed the OSI severe cutoff from 12.3 (2015) to 12 (2023)**.
The OI severe cutoff (≥ 16) is unchanged. PALICC-2 footnote: when SpO2 is used,
ensure SpO2 ≤ 97%. Source: PALICC-2 (Emeriaud 2023, PMID 36661420).

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id        | label                             | type   | units / conversion                                                                                             | plausible min/max                                                                                                                                                   |
| --------- | --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map_awp` | Mean airway pressure              | number | **cmH2O** (ventilator-reported). 1 cmH2O ≈ 0.9806 hPa/mbar (near 1:1)                                          | typical ventilated range ~5–35 cmH2O; only defined on positive-pressure ventilation. Hard numeric bounds are input-validation, not a cited threshold [NEEDS SOURCE] |
| `fio2`    | Fraction of inspired O2           | number | fraction 0.21–1.0. From %: ÷100                                                                                | 0.21 (room air) – 1.0 (definitional; PALICC/PALICC-2)                                                                                                               |
| `pao2`    | Arterial partial pressure of O2   | number | **mmHg**. From kPa: ×7.50062                                                                                   | ~10–700 mmHg (input-validity bound, not a cited threshold) [NEEDS SOURCE]                                                                                           |
| `spo2`    | Pulse oximeter O2 saturation      | number | %. **Valid for OSI only in 80–97%** (ceiling: Thomas 2010 / PALICC-2; floor: Khemani 80–97% derivation window) | **80–97%** enforced. Above 97 OSI is uninterpretable (cited). Below 80 it is outside the derivation window — a documented implementation choice, see below          |
| `oi`      | Oxygenation index (derived)       | number | (MAP × FiO2 × 100) / PaO2                                                                                      | ~0 upward; OI > 40 is the ELSO neonatal-ECMO consideration threshold (Slaughter 2025 citing ELSO) — neonatal context, not a pediatric-severity cutoff               |
| `osi`     | Oxygen saturation index (derived) | number | (MAP × FiO2 × 100) / SpO2                                                                                      | ~0 upward; **only valid for SpO2 80–97%**                                                                                                                           |

Notes on bounds: FiO2 0.21–1.0 is definitional. The SpO2 ≤ 97% ceiling for OSI is a
cited hard constraint (Thomas 2010; PALICC-2). Absolute MAP and PaO2 numeric limits
are engineering input-validation values, **not** from a specific publication — flagged
[NEEDS SOURCE].

**The OSI SpO2 FLOOR (added 2026-08-03) — a documented implementation choice, not a
citation.** The two ends of the OSI SpO2 window do not have the same standing and the
file should not imply they do:

- **Ceiling 97% — CITED.** Thomas 2010 restricted its data to SpO2 ≤ 97% and PALICC-2
  requires the same; above the plateau of the dissociation curve SpO2 stops tracking
  PaO2 and OSI cannot discriminate.
- **Floor 80% — NO OSI-SPECIFIC PUBLISHED BOUND EXISTS.** OSI was validated inside the
  same SpO2 **80–97%** window as the SpO2-based S/F models (Khemani 2009, Chest
  135(3):662–668, derivation restricted to SpO2 80–97%; Khemani 2012, Crit Care Med
  40(4):1309–1316). 80 is therefore the **derivation floor**, adopted here as the
  accepted lower bound so OSI is graded only where it was validated — and it is the
  same window `pf-sf.md` already applies to S/F. State it as an implementation choice
  anchored to the derivation window; do not cite it as an OSI threshold.
- **What was rejected:** the implementation previously accepted SpO2 down to **1%**.
  That floor is not defensible against any primary source and has been removed. A
  saturation of 70% is a real reading, but grading it with OSI is extrapolation beyond
  the evidence, so the calculator refuses rather than extrapolates.

---

## Worked examples

**Example 1 — OI, severe band** _(derived from formula; band from PALICC 2015 / PALICC-2)_

- Inputs: MAP = 20 cmH2O, FiO2 = 0.60, PaO2 = 60 mmHg
- OI = (20 × 0.60 × 100) / 60 = 1200 / 60 = **20**
- Band: OI ≥ 16 → **severe** PARDS under both PALICC 2015 (severe ≥ 16) and
  PALICC-2 (severe ≥ 16).

**Example 2 — OSI, valid SpO2, moderate/mild-moderate band** _(derived from formula; bands from PALICC 2015 and PALICC-2)_

- Inputs: MAP = 15 cmH2O, FiO2 = 0.50, SpO2 = 92% (≤ 97, valid)
- OSI = (15 × 0.50 × 100) / 92 = 750 / 92 = **8.15**
- PALICC 2015: 7.5 ≤ OSI < 12.3 → **moderate**.
- PALICC-2: OSI < 12 → **mild–moderate**.

**Example 3 — FiO2 convention equivalence (the ×100 check)** _(derived; demonstrates the two renderings agree)_

- Same patient as Example 1: MAP = 20, PaO2 = 60, FiO2 = 60% = 0.60.
- Fraction + ×100 form: (20 × 0.60 × 100) / 60 = **20**.
- Percentage form (PALICC table rendering, no ×100): (20 × 60) / 60 = **20**.
- Identical. Confirms the ×100 factor exactly compensates for FiO2-as-fraction;
  do not apply both.

**Example 4 — OSI validity guard (SpO2 > 97%)** _(constraint from Thomas 2010 / PALICC-2)_

- Inputs: MAP = 12 cmH2O, FiO2 = 0.40, SpO2 = 99%
- OSI would compute as (12 × 0.40 × 100) / 99 = 480 / 99 = 4.85 numerically,
  **but SpO2 = 99 > 97 → OSI must be flagged invalid / not interpretable.**
  Do not classify severity from it (oxyhemoglobin curve is flat above ~97%).

**Example 5 — OI↔OSI mapping cross-check** _(computed from the published regression in Slaughter 2025; reproduces the PALICC OSI↔OI correspondence)_

- Slaughter 2025 (neonatal) linear fit: `OI = 1.978 × OSI − 6.743`
  (Pearson r = 0.643, p < 0.001).
- At OSI = 7.5 (PALICC 2015 mild/moderate boundary): OI = 1.978 × 7.5 − 6.743 =
  14.835 − 6.743 = **8.09 ≈ 8** — matches PALICC's OSI 7.5 ↔ OI 8 boundary.
- At OSI = 12.3 (PALICC 2015 severe boundary): OI = 1.978 × 12.3 − 6.743 =
  **17.6** (near OI 16). At OSI = 5 (diagnostic): OI = **3.15** (near OI 4).
- Interpretation: PALICC chose the OSI thresholds to approximate the OI thresholds;
  a neonatal-derived regression roughly reproduces them (best at the 7.5↔8 point).
  **Flag: this regression is neonatal-derived** — see Limitations.

**Example 6 — OI below the diagnostic threshold** _(derived from formula; threshold from PALICC-2)_

- Inputs: MAP = 10 cmH2O, FiO2 = 0.50, PaO2 = 150 mmHg
- OI = (10 × 0.50 × 100) / 150 = 500 / 150 = **3.33**
- OI < 4 → does **not** meet the IMV oxygenation criterion for PARDS.

**Example 7 — ×100 convention ANCHOR (both indices)** _(derived; the magnitude guard the implementation pins by test)_

Example 3 shows the two renderings agree. This one exists to make the two ways of
getting it WRONG visible, at inputs chosen so the candidate answers are orders of
magnitude apart rather than adjacent:

- OI inputs: MAP = 20 cmH2O, FiO2 = 1.0 (fraction), PaO2 = 100 mmHg
  - correct (fraction + ×100): (20 × 1.0 × 100) / 100 = **20**
  - ×100 dropped: (20 × 1.0) / 100 = 0.2 — **100× too small**
  - ×100 applied to a percentage: (20 × 100 × 100) / 100 = 2000 — **100× too large**
- OSI inputs: MAP = 20 cmH2O, FiO2 = 1.0 (fraction), SpO2 = 80% (the floor of the
  valid window; 100% would be rejected as > 97)
  - correct: (20 × 1.0 × 100) / 80 = **25**
  - ×100 dropped: 0.25; ×100 on a percentage: 2500.

Both vectors are asserted in the test suites (`oxygenation-index.test.ts`,
`oxygen-saturation-index.test.ts`) with a tolerance far too tight to absorb a
100-fold slip, so a future "simplification" of the formula fails loudly.

---

## Interpretation bands (non-directive, with source)

Bands describe classification only; they do not prescribe management. Higher
OI/OSI = worse oxygenation defect. All apply to invasively ventilated children.

**PALICC 2015 (pediatric, IMV, PEEP ≥ 5) — three-tier:**

- OI 4 to < 8, or OSI 5 to < 7.5: corresponds to the _mild_ category.
- OI 8 to < 16, or OSI 7.5 to < 12.3: corresponds to the _moderate_ category.
- OI ≥ 16, or OSI ≥ 12.3: corresponds to the _severe_ category.
- (Diagnosis on IMV requires OI ≥ 4 or OSI ≥ 5.)

**PALICC-2 2023 (pediatric, IMV) — two-tier:**

- OI ≥ 4 or OSI ≥ 5 (SpO2 ≤ 97): meets the IMV PARDS oxygenation criterion.
- OI < 16 or OSI < 12: corresponds to the _mild–moderate_ category.
- OI ≥ 16 or OSI ≥ 12: corresponds to the _severe_ category.
- (Severity applied ≥ 4 h after initial diagnosis.)

**Thomas 2010 screening equivalents (older ALI/ARDS definitions, SpO2 ≤ 97%):**

- OSI ≈ 6.5 corresponds to the acute-lung-injury (ALI) criterion.
- OSI ≈ 7.8 corresponds to the ARDS criterion.
- (These predate and differ from the PALICC bands; provided for lineage only.)

**Neonatal ECMO context (not a pediatric-severity band):**

- OI > 40 (sustained 0.5–6 h) is an ELSO neonatal-ECMO _consideration_ criterion
  (Slaughter 2025 citing ELSO). Neonatal, not applicable to PARDS severity in
  older children.

---

## References (full, PMID/DOI)

1. **PALICC-2 (2023) — primary pediatric thresholds:** Emeriaud G,
   López-Fernández YM, Iyer NP, et al; Second Pediatric Acute Lung Injury
   Consensus Conference (PALICC-2) of the Pediatric Acute Lung Injury and Sepsis
   Investigators (PALISI) Network. Executive Summary of the Second International
   Guidelines for the Diagnosis and Management of Pediatric Acute Respiratory
   Distress Syndrome (PALICC-2). _Pediatr Crit Care Med._ 2023;24(2):143–168.
   PMID: **36661420**. DOI: **10.1097/PCC.0000000000003147**.

2. **PALICC 2015 — consensus recommendations (severity table source):**
   Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute
   respiratory distress syndrome: consensus recommendations from the Pediatric
   Acute Lung Injury Consensus Conference. _Pediatr Crit Care Med._
   2015;16(5):428–439. PMID: **25647235**. DOI: **10.1097/PCC.0000000000000350**.

3. **PALICC 2015 — definition/incidence/epidemiology proceedings:** Khemani RG,
   Smith LS, Zimmerman JJ, Erickson S; Pediatric Acute Lung Injury Consensus
   Conference Group. Pediatric acute respiratory distress syndrome: definition,
   incidence, and epidemiology: proceedings from the Pediatric Acute Lung Injury
   Consensus Conference. _Pediatr Crit Care Med._ 2015;16(5 Suppl 1):S23–S40.
   PMID: **26035358**. DOI: **10.1097/PCC.0000000000000432**.
   (This is the PMID given in the task brief; the graded OI/OSI severity table
   itself is in reference 2.)

4. **OSI derivation in children (SpO2 ≤ 97% constraint):** Thomas NJ, Shaffer ML,
   Willson DF, Shih MC, Curley MAQ. Defining acute lung disease in children with
   the oxygenation saturation index. _Pediatr Crit Care Med._ 2010;11(1):12–17.
   PMID: **19561556**. DOI: **10.1097/PCC.0b013e3181b0653d**.

5. **OI vs OSI comparison + explicit ×100 formula + OI↔OSI regression:**
   Slaughter J, Sites J, Ballard H, Bauer J, Schadler A, Severyn N. Comparison of
   the oxygenation index and the oxygen saturation index as clinical indicators
   for neonatal ECMO. _Front Pediatr._ 2025;13:1586985. PMID: **40630719**.
   DOI: **10.3389/fped.2025.1586985**. (Neonatal population — cited for the
   formula rendering and the OI↔OSI cross-check, flagged as neonatal-derived.)

6. **SpO2 80–97% derivation window (source of this score's SpO2 floor):**
   Khemani RG, Patel NR, Bart RD 3rd, Newth CJL. Comparison of the pulse oximetric
   saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired
   oxygen ratio in children. _Chest._ 2009;135(3):662–668. PMID: **19029434**.
   DOI: **10.1378/chest.08-2239**. — _Pediatric derivation restricted to SpO2
   80–97%._

7. **Pediatric prospective validation in the same window:** Khemani RG, Thomas NJ,
   Venkatachalam V, et al; PALISI. Comparison of SpO2 to PaO2 based markers of lung
   disease severity for children with acute lung injury. _Crit Care Med._
   2012;40(4):1309–1316. PMID: **22202709**. DOI: **10.1097/CCM.0b013e31823bc61b**.
   — _Same SpO2 80–97% window; bibliographic details as already verified in
   `pf-sf.md`._

---

## Limitations & notes

- **OI is invasive, OSI is not.** OI requires an arterial PaO2 (arterial line);
  OSI uses pulse oximetry and spares arterial draws. OSI is the practical choice
  when no arterial line is present, at the cost of validity constraints below.
- **OSI valid only for SpO2 80–97%.** The ceiling is cited; the floor is a
  documented implementation choice anchored to the Khemani derivation window — the
  two are not equally sourced, and the Inputs section says which is which.
- **The 97% ceiling itself (hard guard).** Above ~97% the oxyhemoglobin
  dissociation curve plateaus and SpO2 no longer tracks PaO2, so OSI cannot
  discriminate severity. Thomas 2010 used only data points with SpO2 ≤ 97%;
  PALICC-2 requires the same. Note Slaughter 2025 (neonatal) did **not** enforce
  this ceiling — a limitation of that dataset, and a reason to prefer the
  pediatric derivation for children.
- **Both require a mean airway pressure** → only defined on positive-pressure
  ventilation (conventional IMV or HFOV). Undefined for spontaneous breathing,
  nasal cannula, or standard NIV masks; PALICC uses P/F and S/F there instead.
- **Guideline-version drift — pick one explicitly.** PALICC-2 (2023) collapsed
  the 2015 three-tier severity (mild/moderate/severe) into two tiers
  (mild-moderate vs severe) for IMV, **and moved the OSI severe cutoff from
  12.3 (2015) to 12 (2023)**. The OI severe cutoff (≥ 16) and the diagnostic
  entry (OI ≥ 4 / OSI ≥ 5) are unchanged. An implementation must state which
  edition's bands it applies.
- **FiO2 / ×100 convention** is the top implementation hazard: the value is
  identical whether FiO2 is a fraction (with ×100) or a percentage (without),
  but applying both — or neither — yields a 100× error. See worked example 3.
- **PaO2 units** (kPa vs mmHg) are a common data-entry error; validate/convert on
  input (P/F-style: 40 kPa = 300 mmHg).
- **Measure at steady state**, not during transient desaturation (PALICC-2).
- **Pediatric-appropriateness:** the OI/OSI severity bands here are pediatric
  (PALICC/PALICC-2) and the OSI derivation (Thomas 2010) is pediatric. The
  OI > 40 ECMO figure and the OI = 1.978·OSI − 6.743 regression are **neonatal**
  (ELSO / Slaughter 2025) and are used only as context/cross-check, not as
  pediatric severity thresholds.
- **OI↔OSI agreement is only moderate** (Pearson r ≈ 0.64 in Slaughter 2025,
  neonatal); the OSI bands approximate the OI bands but are not interchangeable
  patient by patient.
- **MAP depends on ventilator mode/waveform;** HFOV MAP and conventional-vent MAP
  are not physiologically equivalent even at the same numeric value.
- These indices classify a physiologic defect; they are not individual-patient
  outcome predictions.

---

## IP status

- **Not copyrightable.** OI and OSI are arithmetic formulas; the PALICC 2015 and
  PALICC-2 diagnostic/severity thresholds (4, 8, 16; 5, 7.5, 12.3, 12) and the
  Thomas/Slaughter cutoffs and regression coefficients are facts (numbers,
  formulas), which copyright does not protect.
- **No verbatim scale-item / descriptor wording** is embedded (unlike ordinal
  scales such as GCS). There is nothing analogous to copyrightable descriptor
  phrases — only numeric thresholds and equations.
- The **prose/table layout** of the PALICC, PALICC-2, and journal publications is
  copyrighted expression; only the numeric criteria are reproduced here and the
  surrounding text is paraphrased. No verbatim guideline paragraphs are copied.

---

## Verification

Independent-source check performed 2026-07-25. Each load-bearing value was
confirmed against at least one source distinct from a single summary.

**OI/OSI formulas** `(MAP × FiO2 × 100)/PaO2` and `.../SpO2`: the explicit
×100 form was fetched verbatim from Slaughter 2025 (PMC12234480: "OI = (MAP ×
FiO2 × 100)/PaO2"); the FiO2-as-percentage rendering `MAP × FiO2 / PaO2` was
fetched from the PALICC-2-quoting review (PMC12257685) and brownpedsresidency.
Both renderings reconciled (worked example 3). No correction.

**PALICC 2015 three-tier bands** (OI 4–8/8–16/≥16; OSI 5–7.5/7.5–12.3/≥12.3):
fetched verbatim from brownpedsresidency.org/pards and corroborated by
web-search extracts quoting "mild (4 ≤ OI < 8 or 5 ≤ OSI < 7.5), moderate
(8 ≤ OI < 16 or 7.5 ≤ OSI < 12.3), severe (OI ≥ 16 or OSI ≥ 12.3)." Primary
paper confirmed as PMID 25647235 (main recommendations) via PubMed. No
correction.

**PALICC-2 two-tier bands** (diagnosis OI ≥ 4 / OSI ≥ 5; severe OI ≥ 16 /
**OSI ≥ 12**, not 12.3): confirmed via two independent fetches — PMC12257685
("Mild-Moderate: OI < 16 OSI < 12; Severe: OI ≥ 16 OSI ≥ 12") and
dontforgetthebubbles.com/pards ("The severe OSI cutoff is 12, not 12.3").
The 12 vs 12.3 change between editions was specifically checked and is real.
No correction.

**Thomas 2010** (OSI = FiO2 × MAP / SpO2; SpO2 ≤ 97% data restriction; OSI 6.5 ≈
ALI, 7.8 ≈ ARDS; 255 children): fetched from the full text (PMC2936504) and
citation confirmed via PubMed (PMID 19561556, DOI 10.1097/PCC.0b013e3181b0653d).
No correction.

**Slaughter 2025** (OI = 1.978·OSI − 6.743, r = 0.643; ELSO OI > 40; explicit
×100 formula): fetched from full text and citation (PMC12234480; PMID 40630719;
DOI 10.3389/fped.2025.1586985). Regression cross-check recomputed by hand
(OSI 7.5 → OI 8.09) and reproduces the PALICC OSI↔OI boundary. No correction.

**Citations:** PALICC-2 PMID 36661420 / DOI 10.1097/PCC.0000000000003147 (from
prior verified `pf-sf.md`); PALICC 2015 recommendations PMID 25647235 / DOI
10.1097/PCC.0000000000000350 and def/epi proceedings PMID 26035358 / DOI
10.1097/PCC.0000000000000432 both confirmed via PubMed. The task-supplied PMID
26035358 was found to be the def/epi _proceedings_ paper; the graded severity
table is in the companion recommendations paper (25647235) — both are cited and
the distinction is noted rather than glossed.

**Worked examples 1–6:** recomputed by hand against the formulas —
Ex1 1200/60 = 20 (severe); Ex2 750/92 = 8.15 (moderate / mild-moderate);
Ex3 both renderings = 20; Ex4 480/99 = 4.85 but SpO2 > 97 → invalid;
Ex5 1.978×7.5 − 6.743 = 8.09 ≈ 8; Ex6 500/150 = 3.33 (< 4, sub-diagnostic).
All correct.

**Unresolved [NEEDS SOURCE] items (carried forward, not fabricated):** `map_awp`
hard numeric bounds and `pao2` plausible min/max — arithmetic input-validation
limits, no publication found specifying them as validated bounds. Remain
**[NEEDS SOURCE]**.

**Corrections made as a result of verification: none.** Every formula, threshold,
coefficient, and worked example was reproduced from at least one independently
fetched source.

### Second independent verification pass (2026-07-25, separate session)

A second, independent verifier re-checked every threshold, coefficient, and
reference in this file against freshly fetched sources (distinct fetches from
the pass above), rather than trusting the existing Verification section as-is.

- **Formulas:** `OI = (MAP × FiO2 × 100)/PaO2` and the OSI analog re-confirmed
  verbatim from Slaughter 2025 full text (PMC12234480). Matches file. No change.
- **PALICC 2015 three-tier OI bands** (4–8 mild / 8–16 moderate / ≥16 severe on
  IMV) re-confirmed via brownpedsresidency.org/pards. Matches file. No change.
- **PALICC-2 2023 two-tier bands** (severe OI ≥16 or OSI ≥12; mild-moderate
  OI <16 or OSI <12) re-confirmed via dontforgetthebubbles.com/pards
  ("Severe if OI ≥16 or OSI ≥12"). Matches file, confirms the 12.3→12
  edition change. No change.
- **Slaughter 2025 regression** `OI = 1.978(OSI) − 6.743`, Pearson r = 0.643,
  p < 0.001, and the ELSO OI > 40 (0.5–6 h) neonatal ECMO-consideration
  threshold re-confirmed from PMC12234480 full text. Matches file. No change.
- **Thomas 2010** OSI ≈ 6.5 (ALI) / 7.8 (ARDS) equivalents and the SpO2 ≤ 97%
  data-restriction re-confirmed via independent web search of the abstract/
  full text. Matches file. No change.
- **All five references' bibliographic details** (title, journal, year, volume,
  issue, pages/DOI) re-confirmed directly from PubMed entries for PMID
  25647235, 26035358, and 36661420, and from the publisher record for PMID
  40630719 — all exactly match the reference list in this file. No change.
- **Worked Examples 1–6:** arithmetic independently redone by hand
  (1200/60=20; 750/92=8.15; percentage-form check=20; 480/99=4.85 with
  SpO2>97 invalidity; 1.978×7.5−6.743=8.09, 1.978×12.3−6.743≈17.6,
  1.978×5−6.743≈3.15; 500/150=3.33). All match the file. No change.
- **Still [NEEDS SOURCE], unchanged:** `map_awp` and `pao2` plausible
  min/max input-validation bounds — no publication located that specifies
  these as validated numeric bounds. Not fabricated; left flagged.

**Corrections made in this second pass: none.** No discrepancies were found
between the file's stated values and the independently fetched primary/
secondary sources.

### Round-3 sourcing resolution (2026-08-03)

Scope: the FiO2 convention, the PALICC edition actually implemented, and the OSI
SpO2 floor. Provenance stated per item.

- **FiO2 percentage form — CONFIRMED, and now guarded.** PALICC-2 (2023) defines
  the index as **MAP(cmH2O) × FiO2(percent) ÷ PaO2(mmHg)**; FiO2 must be the
  percentage form in that rendering. Both implementations here take FiO2 as a
  fraction and multiply by 100, which is the identical quantity — **verified
  correct, no behaviour changed**. What changed is that the convention is now
  stated as a requirement in each score's user-visible formula text, and worked
  example 7 pins the magnitude in both test suites. Nothing previously stopped a
  future "simplification" from dropping the ×100 and shipping a silent 100-fold
  error; something does now.
- **PALICC-2 two-tier bands — CONFIRMED, already correct.** OI ≥ 4 (or OSI ≥ 5)
  defines PARDS on invasive ventilation; mild–moderate is OI < 16 / OSI < 12;
  severe is OI ≥ 16 / OSI ≥ 12. **The implementation was already on the 2023
  edition, including the OSI severe cutoff of 12 rather than the 2015 value of
  12.3** — checked specifically because tertiary sources routinely conflate the
  two editions and a reader may arrive expecting 12.3. No divergence found, so
  no band was changed; the OSI band description now says outright that 12 is the
  applied value and 12.3 is the superseded one.
- **PALICC 2015 three-tier scheme** (OI 4–<8 / 8–<16 / ≥16; OSI 5–<7.5 /
  7.5–<12.3 / ≥12.3) is retained in this note for lineage only. It is not what
  either score computes.
- **OSI SpO2 floor — CHANGED, 1% → 80%.** This is the one behavioural change of
  the round. There is **no published OSI-specific lower bound**; 80% is the lower
  end of the SpO2 80–97% window OSI was validated in (Khemani 2009/2012,
  references 6–7), and the same window `pf-sf.md` already enforces for S/F. The
  previous 1% floor was not defensible against any primary source. Recorded as a
  documented implementation choice anchored to the derivation window — **not** as
  an OSI threshold, which would claim more than the literature says.
- **Still [NEEDS SOURCE], unchanged:** `map_awp` (5–50 cmH2O) and `pao2`
  (10–700 mmHg) input-validation bounds. No publication specifies them.

**Corrections to computed values in this round:** none for OI. For OSI, no formula
or band changed; only the accepted SpO2 domain narrowed, so any reading the score
previously graded inside 80–97% is unchanged.
