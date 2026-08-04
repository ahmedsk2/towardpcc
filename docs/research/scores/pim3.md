# PIM3 (Paediatric Index of Mortality 3)

> Purpose: predicts probability of death for a child at the time of admission to a
> paediatric intensive care unit (PICU), from data collected at first ICU contact.
> It is a **unit-level case-mix / benchmarking** tool, not an individual prognostic
> device. Derivation/validation: Straney et al., _Pediatr Crit Care Med_ 2013
> (PMID 23863821; DOI 10.1097/PCC.0b013e31829760cf).

**Source status (2026-08-03).** The full text of Straney 2013 — pages 673–681,
including Table 1 (p675), Table 3 (p677), Table 4 (p678) and **Appendix 1
(pp 679–681)** — has now been read, together with Supplemental Digital Content 1
and the ANZICS registry information booklet. Appendix 1 carries the diagnosis
lists, their qualifying rules and every coding and missing-value convention, so
the rules that this file previously carried as `[NEEDS SOURCE]` on the strength
of the unreachable booklet are now sourced to the paper itself. **One clause is
not, and never will be** — the tracheostomy exclusion is a registry
data-dictionary convention, closed on 2026-08-03 by reading the booklet rather
than by finding a paper. See [Open gaps](#open-gaps--needs-source).

Derivation cohort: 53,112 admissions, 60 ICUs, Australia / New Zealand / Ireland
/ UK, 2010–2011 (ANZPIC registry and PICANet). 1,962 observed deaths against
1,889 expected, SMR 1.00 (0.99–1.01) — Table 4, p678.

---

## Formula / algorithm (exact — every coefficient, every branch)

PIM3 is a single logistic-regression equation. Compute the linear predictor
(the "PIM3 score", a logit), then map it to a probability with the logistic
function.

**Linear predictor (logit):**

```
PIM3 score =
    (3.8233  × pupils fixed to light)
  + (-0.5378 × elective admission)
  + (0.9763  × mechanical ventilation, first hour)
  + (0.0671  × absolute[base excess])
  + (-0.0431 × SBP)
  + (0.1716  × (SBP^2 / 1000))
  + (0.4214  × ((FiO2 × 100) / PaO2))
  - (1.2246  × recovery, bypass cardiac procedure)
  - (0.8762  × recovery, non-bypass cardiac procedure)
  - (1.5164  × recovery, non-cardiac procedure)
  + (1.6225  × very high-risk diagnosis)
  + (1.0725  × high-risk diagnosis)
  - (2.1766  × low-risk diagnosis)
  - 1.7928
```

**Probability of death:**

```
Probability of death = exp(PIM3 score) / (1 + exp(PIM3 score))
```

Equivalently `1 / (1 + exp(-PIM3 score))`.

### Coefficient table — Straney 2013, Table 3, p677

All terms p < 0.001; coefficients are on the logit scale.

| Term                                    | Coefficient | 95% CI             | Odds ratio | Transformation          |
| --------------------------------------- | ----------: | ------------------ | ---------: | ----------------------- |
| Intercept                               | **−1.7928** | −2.2763 to −1.3093 |     0.1665 | —                       |
| Pupils fixed to light                   | **+3.8233** | 3.4581 to 4.1885   |    45.7554 | none                    |
| Elective admission                      | **−0.5378** | −0.7234 to −0.3522 |     0.5840 | none                    |
| Mechanical ventilation, first hour      | **+0.9763** | 0.8234 to 1.1293   |     2.6547 | none                    |
| Base excess (mmol/L)                    | **+0.0671** | 0.0576 to 0.0766   |     1.0694 | **absolute value**      |
| SBP, linear (mmHg)                      | **−0.0431** | −0.0524 to −0.0338 |     0.9578 | none                    |
| SBP, quadratic                          | **+0.1716** | 0.1248 to 0.2183   |     1.1872 | **SBP² ÷ 1000**         |
| Oxygenation                             | **+0.4214** | 0.3313 to 0.5115   |     1.5241 | **(FiO₂ × 100) ÷ PaO₂** |
| Recovery — bypass cardiac procedure     | **−1.2246** | −1.4915 to −0.9576 |     0.2939 | none                    |
| Recovery — non-bypass cardiac procedure | **−0.8762** | −1.2418 to −0.5106 |     0.4164 | none                    |
| Recovery — non-cardiac procedure        | **−1.5164** | −1.7998 to −1.2330 |     0.2195 | none                    |
| Very high-risk diagnosis                | **+1.6225** | 1.4706 to 1.7744   |     5.0657 | none                    |
| High-risk diagnosis                     | **+1.0725** | 0.9071 to 1.2380   |     2.9228 | none                    |
| Low-risk diagnosis                      | **−2.1766** | −2.4825 to −1.8708 |     0.1134 | none                    |

Three transformations are easy to lose in a port and each is asserted by a
fixture below: base excess enters as an **absolute value**; SBP enters
**twice**, linearly and as SBP²/1000; oxygenation is **(FiO₂ × 100) ÷ PaO₂**
with FiO₂ a fraction and PaO₂ in mmHg.

The three recovery indicators are mutually exclusive. The three diagnosis
indicators are one variable, not three — see
[Diagnosis tiers](#diagnosis-tiers--one-variable-highest-wins-never-additive).
Elective admission is independent and may co-occur with any of them.

---

## Diagnosis tiers — ONE variable, highest wins, never additive

**Straney 2013, Methods, p674.** Unlike PIM2 — where a high-risk and a low-risk
condition could both be counted — PIM3 assigns a patient with conditions in more
than one tier to **exactly one** group, in the order:

```
very high risk  >  high risk  >  low risk
```

The paper illustrates the rule twice:

- **p674** — hypoplastic left heart syndrome (high risk) admitted with acute
  bronchiolitis (low risk) is coded high risk only. This is fixture F.
- **p681** — the paper's own worked example is deliberately built with both a
  very high-risk and a high-risk condition, and applies only the very high-risk
  term. This is fixture A.

**This is the single most likely defect when porting from a PIM2
implementation.** On fixture A, leaving the high-risk term in place returns
**72.34%** where the published answer is **47.22%** — a 25-percentage-point
error on the one case the paper supplies with the correct answer. The
implementation resolves the tiers itself in `calculate` and
`pim3.test.ts` pins the suppression from both directions.

### How the tiers were built — Methods, p674

Diagnoses were assigned by their odds ratio in an interim multivariable model:
very high risk = OR above 5, high risk = a statistically significant OR between
1 and 5, low risk = a statistically significant OR below 1. The fitted odds
ratios in Table 3 (5.0657 / 2.9228 / 0.1134) sit either side of those
thresholds as expected.

### The lists — Appendix 1, p680. Complete as published.

Five, five and six conditions respectively. Nothing is elided here; a list that
gains or loses a condition is a clinical change, and `pim3.test.ts` pins the
counts.

**Very high-risk (+1.6225)** — cardiac arrest preceding ICU admission; severe
combined immune deficiency; leukaemia or lymphoma after first induction; bone
marrow transplant recipient; liver failure.

**High-risk (+1.0725)** — spontaneous cerebral haemorrhage; cardiomyopathy or
myocarditis; hypoplastic left heart syndrome; neurodegenerative disorder;
necrotising enterocolitis.

**Low-risk (−2.1766)** — asthma; bronchiolitis; croup; obstructive sleep apnoea;
diabetic ketoacidosis; seizure disorder.

### Qualifying rules — Appendix 1 coding rules f–n, p680, paraphrased

Paraphrased deliberately: the facts (which condition, which tier, which
qualifier) are usable, the paper's sentences are not ours to transcribe. See
[IP status](#ip-status).

- **All tiers** — the condition must be the **main reason for the ICU
  admission**. Where that is in doubt, record none.
- **Spontaneous cerebral haemorrhage** — spontaneous only, e.g. from an aneurysm
  or an arteriovenous malformation. Traumatic bleeds are out, and so are
  intracranial bleeds outside the brain itself, such as a subdural.
- **Hypoplastic left heart syndrome** — counts at any age, but only where a
  Norwood operation or an equivalent was needed in the newborn period to keep
  the child alive.
- **Neurodegenerative disorder** — needs a progressive loss of milestones, or a
  diagnosis in which that loss is certain. A specific named diagnosis is not
  required.
- **Cardiac arrest** — in-hospital and out-of-hospital both count. Needs a
  documented absent pulse or external cardiac compression. A past history of
  arrest does not count.
- **Leukaemia or lymphoma** — only where the admission is about the malignancy
  or its treatment.
- **Liver failure** — acute or chronic, but admission following a _planned_
  liver transplant is excluded. (The registry reads this exclusion more broadly;
  see [registry divergence](#anzpic-registry-code-numbers--documented-deliberately-not-implemented).)
- **Bronchiolitis** — covers a child presenting with either respiratory distress
  or central apnoea where the clinical diagnosis is bronchiolitis.
- **Obstructive sleep apnoea** — covers admission after adenoidectomy or
  tonsillectomy where the apnoea is the main reason. **Such a case also carries
  a procedure-recovery term** — both apply; the tier precedence rule is scoped
  to the diagnosis variable and never suppresses a recovery term. Fixture in
  `pim3.test.ts`.
- **Seizure disorder** — status epilepticus, epilepsy, a febrile convulsion or
  another epileptic syndrome, where the admission is to control the seizures or
  to recover from them or from their treatment.

### Changes from PIM2 — Results, p676

| Change                                   | Direction                                          |
| ---------------------------------------- | -------------------------------------------------- |
| HIV infection                            | **removed** (was PIM2 high-risk)                   |
| Recovery after elective liver transplant | **removed** from the liver-failure definition      |
| Bone marrow transplant recipient         | **added** — very high risk                         |
| Necrotising enterocolitis                | **added** — high risk                              |
| Seizure disorder                         | **added** — low risk                               |
| High- and low-risk both countable        | **replaced** by a single categorical, highest wins |

Migration is not cosmetic: recoding an Italian PIM2 cohort to PIM3 moved 649
seizure patients (5.8%) into low risk and reclassified 389 PIM2 high-risk
children (3.5%) as very high risk — roughly one admission in eleven changes tier
(Wolfler 2016, p253).

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                         | label                                 | type    | units / coding                                                                                                            | plausible min/max                                                                    |
| -------------------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pupils`                   | Pupils fixed to bright light          | boolean | 1 = both **> 3 mm and fixed**; 0 = anything else, including unknown                                                       | 0 or 1                                                                               |
| `mechanical_ventilation`   | Mechanically ventilated in first hour | boolean | 1 = any of invasive ventilation, mask or nasal CPAP, BiPAP, negative-pressure ventilation, at any point in the first hour | 0 or 1                                                                               |
| `elective_admission`       | Elective ICU admission                | boolean | 1 = the admission could have been postponed more than six hours without harm                                              | 0 or 1                                                                               |
| `recovery_category`        | Recovery from a procedure             | enum    | `none` / `bypass_cardiac` / `non_bypass_cardiac` / `non_cardiac` (mutually exclusive)                                     | enum                                                                                 |
| `very_high_risk_diagnosis` | Very high-risk diagnosis              | enum    | `none` + the 5 published conditions                                                                                       | enum                                                                                 |
| `high_risk_diagnosis`      | High-risk diagnosis                   | enum    | `none` + the 5 published conditions                                                                                       | enum                                                                                 |
| `low_risk_diagnosis`       | Low-risk diagnosis                    | enum    | `none` + the 6 published conditions                                                                                       | enum                                                                                 |
| `sbp`                      | Systolic blood pressure               | number  | mmHg. **Unknown → 120**; **cardiac arrest → 0**; **shocked, BP unmeasurable → 30**                                        | **min 0 is load-bearing** (sentinel); max 300 is an engineering bound, not published |
| `base_excess`              | Base excess (absolute value used)     | number  | mmol/L, arterial or capillary; the equation uses \|BE\|. **Unknown → 0**                                                  | −40 to +40 engineering bound, not published                                          |
| `fio2`                     | FiO₂ at the time of the PaO₂          | number  | fraction 0.21–1.0; entered as % is converted by ÷100. Used as `FiO2 × 100` in the ratio                                   | 0.21 (room air) to 1.0 engineering bound, not published                              |
| `pao2`                     | Arterial PaO₂                         | number  | mmHg; kPa accepted and converted. Must be simultaneous with the FiO₂                                                      | 20–600 engineering bound, not published                                              |

**The three diagnosis tiers are collected as three questions, not one.** This
matches how the data actually exists — the ANZPIC registry carries three
dedicated PIM fields, `PIM3_VHR`, `PIM3_HR` and `PIM3_LR` — and it is the only
shape in which the precedence rule is the _model's_ job rather than the
clinician's. A single "pick your risk tier" control silently delegates the
paper's most consequential rule to the person least equipped to know it applies,
and makes the defect it guards against untestable. Superseded design: v1.0.x
shipped one `diagnosis_risk` enum; see the v1.1.0 changelog entry.

**Units / conversion notes:**

- FiO₂ enters the equation as a **percentage** via `FiO₂ × 100` (fraction 0.60 →
  60). PaO₂ is in **mmHg**; a PaO₂ recorded in kPa is converted at
  1 mmHg = 101.325/760 kPa before use.
- The SBP quadratic term divides SBP² by 1000 (SBP 120 → 120²/1000 = 14.4).
- Base excess enters as its **absolute value**, so sign does not matter.
- No `canonicalDecimals` on any input: the paper prints no alternate-unit
  restatement of any of its own values.

### Missing values and coding — Appendix 1, p680

| Input             | Unknown / special coding                                                  |
| ----------------- | ------------------------------------------------------------------------- |
| Systolic BP       | **unknown = 120**; **cardiac arrest = 0**; **shocked, unmeasurable = 30** |
| Oxygenation ratio | **FiO₂ or PaO₂ unknown → the whole term is 0.23**                         |
| Base excess       | **unknown = 0**                                                           |
| Pupils            | both > 3 mm and fixed = 1; anything else, **including unknown** = 0       |

**The 0.23 substitution is part of the published model**, not a registry
convention. Methods, p674 derives it from a normal PaO₂ in room air —
(0.21 × 100) / 90 — and identifies the selected model form explicitly as the one
that imputes 0.23. **PIM2 imputed 0 for this ratio; inheriting that default is a
real porting defect.** On the all-missing fixture it moves the result from 1.22%
to 1.11% — small in absolute terms, systematic, and applied to the large
majority of admissions.

**Missingness is the ordinary case, not the exception.** In the derivation
cohort PaO₂ was missing for 55.8% and FiO₂ for 41.1% of admissions (Table 1,
p675); a single-centre US series reported base excess missing in 97.2% and the
oxygenation ratio in 97.3% (Baloglu 2021). Fixture E exercises the full
imputation path and exists to be a regression fixture.

**Measurement window.** Observations at or about the first face-to-face (not
telephone) contact between the patient and a doctor from the ICU or a specialist
paediatric transport team, through to one hour after ICU arrival. Use the
**first** value of each variable in that window — not the worst. First contact
may be in the ICU, the emergency department, a ward, or another hospital during
retrieval.

**Further definitional notes.** Pupillary findings are not recorded as abnormal
where they can be attributed to drugs, toxins or local eye injury. Recovery from
a procedure includes radiology procedures and cardiac catheterisation, but
excludes a patient arriving from theatre where the recovery is not the main
reason for admission — a head-injury patient admitted after insertion of an ICP
monitor is admitted for the head injury.

### The SBP terms are U-shaped, and 0 / 30 are sentinels

`−0.0431·SBP + 0.1716·SBP²/1000` reaches its minimum at **SBP ≈ 125.6 mmHg**.
Both hypotension and hypertension raise predicted mortality.

| SBP (mmHg)            |     0 |     30 |     50 |     70 |     90 |    120 |  **125.6** |    160 |    200 |
| --------------------- | ----: | -----: | -----: | -----: | -----: | -----: | ---------: | -----: | -----: |
| Contribution to logit | 0.000 | −1.139 | −1.726 | −2.176 | −2.489 | −2.701 | **−2.706** | −2.503 | −1.756 |

Two consequences, both asserted in `pim3.test.ts`:

- **Recording SBP = 0 for cardiac arrest contributes +2.70096 logit relative to
  the unknown default of 120.** That is how the arrest case acquires its weight.
  Any plausibility guard that rejects SBP 0 or SBP 30 **breaks the score** —
  these are coded sentinels, not measurements, and the `min: 0` on the `sbp`
  input exists for exactly this reason.
- **Newborns are systematically over-predicted.** Neonates sit physiologically
  well below the nadir, so the blood-pressure terms inflate their score.
  Observed for both PIM2 and PIM3 in the Italian validation.

---

## Worked examples

All seven fixtures are implemented in `packages/scoring-engine/src/scores/pim3.test.ts`.
Fixture A is the paper's own; the rest are computed term-by-term from the
coefficient table above and are labelled as derived rather than published.

### A — the paper's own worked example (p681) · pins the precedence rule

Six-year-old on chemotherapy for relapsed leukaemia, presenting with febrile
neutropenia, with a known chemotherapy-induced cardiomyopathy. SBP 70 mmHg at
first ICU-doctor contact, pupils reactive. Admitted, intubated and ventilated;
an arterial gas within the first hour shows PaO₂ 65 mmHg on FiO₂ 0.7 and a base
excess of −12 mmol/L.

Inputs: pupils 0 · elective 0 · ventilated 1 · |BE| 12 · SBP 70 · oxygenation
(0.7 × 100)/65 = 1.07692 · **very high risk 1 (leukaemia after first induction)
AND high risk 1 (cardiomyopathy) → very high risk only**.

```
 0.9763 × 1                  = +0.97630
 0.0671 × 12                 = +0.80520
-0.0431 × 70                 = -3.01700
 0.1716 × (70^2 / 1000)      = +0.84084
 0.4214 × 1.07692            = +0.45382
 1.6225 × 1  (very high risk)= +1.62250
 1.0725 × 0  (high risk SUPPRESSED) = 0.00000
 intercept                   = -1.79280
 PIM3 score (logit)          = -0.11114
 P(death)                    = 0.472242  ≈ 47.22%
```

Published values: −0.11114 → 47.22%. **Match to five decimal places.** With the
high-risk term left in, the logit is +0.96136 and the answer 72.34%.

The SBP used is 70, the value at first ICU-doctor contact — not an earlier
emergency-department reading. The registry booklet's variant of this case drops
the cardiomyopathy and therefore exercises nothing; the paper's version is the
one to use.

### B — elective post-operative, recovery from a bypass cardiac procedure

Ventilated, SBP 95, pupils reactive, no blood gas (so |BE| imputes 0 and the
oxygenation term imputes 0.23).

```
-0.5378 + 0.9763 - 4.0945 + 1.54869 + 0.09692 - 1.2246 - 1.7928
 PIM3 score (logit) = -5.02779    P(death) = 0.006511  ≈ 0.65%
```

### C — bronchiolitis as the main reason for admission (low risk)

Eight-month-old on nasal CPAP (which counts as mechanical ventilation), SBP 85,
no blood gas.

```
 0.9763 - 3.6635 + 1.23981 + 0.09692 - 2.1766 - 1.7928
 PIM3 score (logit) = -5.31987    P(death) = 0.004870  ≈ 0.49%
```

### D — out-of-hospital cardiac arrest, the SBP = 0 sentinel

Fixed dilated pupils, SBP recorded 0, base excess −20, PaO₂ 60 on FiO₂ 1.0,
ventilated, very high-risk diagnosis (cardiac arrest before admission).

```
 3.8233 + 0.9763 + 1.3420 + 0.00000 + 0.00000 + 0.70233 + 1.6225 - 1.7928
 PIM3 score (logit) = +6.67363    P(death) = 0.998738  ≈ 99.87%
```

Both SBP terms are zero here, which is the point: the arrest weight comes from
their _absence_ relative to a normal pressure.

### E — the imputation floor: every optional input absent

Exercises SBP = 120, |BE| = 0 and oxygenation = 0.23 with no flags set.

```
-5.17200 + 2.47104 + 0.09692 - 1.79280
 PIM3 score (logit) = -4.39684    P(death) = 0.012166  ≈ 1.22%
```

A wrong default fails silently here. Inheriting PIM2's oxygenation default of 0
gives −4.49376 → 1.11% and nothing else changes, which is why this is a
regression fixture.

### F — precedence, low-severity variant (paper, p674)

Hypoplastic left heart syndrome (high risk) admitted with acute bronchiolitis
(low risk); otherwise as fixture E. Resolves to (very high, high, low) =
(0, 1, 0).

```
 fixture E baseline -4.396838  +1.0725 (high risk, low risk suppressed)
 PIM3 score (logit) = -3.32434    P(death) = 0.034746  ≈ 3.47%
```

### G — shocked with an unmeasurable BP, the SBP = 30 sentinel

SBP recorded 30, ventilated, base excess −8, no blood gas.

```
 0.9763 + 0.5368 - 1.2930 + 0.15444 + 0.09692 - 1.7928
 PIM3 score (logit) = -1.32134    P(death) = 0.210596  ≈ 21.06%
```

### Machine-readable fixture set

```json
[
  {
    "id": "A",
    "source": "Straney 2013 p681",
    "in": {
      "pupils": 0,
      "elective": 0,
      "mechvent": 1,
      "be": -12,
      "sbp": 70,
      "fio2": 0.7,
      "pao2": 65,
      "recov": null,
      "vhr": 1,
      "hr": 1,
      "lr": 0
    },
    "expect": { "resolved": [1, 0, 0], "logit": -0.11114, "pct": 47.22 }
  },
  {
    "id": "B",
    "in": { "elective": 1, "mechvent": 1, "sbp": 95, "recov": "bypass" },
    "expect": { "resolved": [0, 0, 0], "logit": -5.02779, "pct": 0.65 }
  },
  {
    "id": "C",
    "in": { "mechvent": 1, "sbp": 85, "lr": 1 },
    "expect": { "resolved": [0, 0, 1], "logit": -5.31987, "pct": 0.49 }
  },
  {
    "id": "D",
    "in": { "pupils": 1, "mechvent": 1, "be": -20, "sbp": 0, "fio2": 1.0, "pao2": 60, "vhr": 1 },
    "expect": { "resolved": [1, 0, 0], "logit": 6.67363, "pct": 99.87 }
  },
  { "id": "E", "in": {}, "expect": { "resolved": [0, 0, 0], "logit": -4.39684, "pct": 1.22 } },
  {
    "id": "F",
    "source": "Straney 2013 p674",
    "in": { "hr": 1, "lr": 1 },
    "expect": { "resolved": [0, 1, 0], "logit": -3.32434, "pct": 3.47 }
  },
  {
    "id": "G",
    "in": { "mechvent": 1, "be": -8, "sbp": 30 },
    "expect": { "resolved": [0, 0, 0], "logit": -1.32134, "pct": 21.06 }
  }
]
```

---

## Implementation traps

1. **Additive diagnosis terms.** Fixture A returns 72.34% instead of 47.22% if
   the high-risk term is not suppressed. Highest tier wins; never sum.
2. **SBP sentinels rejected by range validation.** 0 and 30 are legal inputs
   carrying real weight. `min: 0` on the `sbp` input is not negotiable.
3. **PIM2's imputation inherited.** The oxygenation ratio imputes **0.23**,
   not 0.
4. **A FiO₂ without a PaO₂ (or vice versa) is not half a ratio.** If either is
   missing the whole term is 0.23; a supplied FiO₂ alone contributes nothing.
5. **Worst value instead of first value.** The score takes the _first_ recorded
   value in the window.
6. **Regional recalibrations mistaken for the published model.** ANZICS also
   publishes PIM3-anz13 and PIM3-anz15, with entirely different coefficients
   (anz13 pupils 4.371172, intercept −2.299542). This implementation is the
   published international model; the authors' own naming convention appends
   region and final data year (PIM3-ANZ11).
7. **Individual-patient use.** PIM3 is validated for groups. It should not be
   used to describe, or to make decisions about, an individual patient — which
   is why that statement ships as a `caution`, beside the number, rather than in
   the limitations prose.

---

## ANZPIC registry code numbers — documented, deliberately not implemented

**This calculator ingests no registry data, so it maps no registry codes.** The
divergence is recorded here so that nobody later writes a single mapper and
believes it is correct.

The three tiers map to dedicated PIM fields in the ANZPIC registry — `PIM3_VHR`,
`PIM3_HR`, `PIM3_LR` — separate from the registry's general hierarchical
diagnosis list (a record carries a primary and an underlying diagnosis from the
ANZPIC Diagnostic Codes Table _as well as_ these small PIM-specific
enumerations). **The code numbers are not the paper's.**

| Tier         | Straney 2013, p680        | ANZPIC registry                                                              |
| ------------ | ------------------------- | ---------------------------------------------------------------------------- |
| High risk 5  | Necrotising enterocolitis | **Septic shock** — collected by the registry, **not used** by PIM3           |
| High risk 6  | —                         | Necrotising enterocolitis                                                    |
| Very high 6  | —                         | Necrotising enterocolitis — retired, use high-risk 6                         |
| Very high 7  | —                         | SCID **and** bone marrow transplant recipient (combination code)             |
| Very high 8  | —                         | Leukaemia/lymphoma after first induction **and** BMT recipient (combination) |
| Low risk 1–6 | identical in both         | identical in both                                                            |

Consequences for anyone who later ingests registry records:

1. **One mapper is wrong.** A `code == 5 → high risk` test is correct against the
   paper and _inverted_ against the registry: it would score septic shock as
   high risk and necrotising enterocolitis as none. Two mappers, explicitly
   labelled by source.
2. **Septic shock must be excluded** from the PIM3 high-risk term. Where it
   coexists with another high-risk code, registry guidance prefers the other
   code so the high-risk factor is still captured.
3. **Very-high-risk codes 7 and 8 are combination codes.** A naive `code in 1..5`
   membership test silently drops two of the highest-risk categories.
4. **The liver-transplant exclusion differs.** The paper excludes admission after
   an _elective_ liver transplant; the registry excludes recovery after
   transplantation for acute or chronic liver failure generally, and resolves
   the edge case in the other direction — a readmission where graft liver
   failure is the primary reason _does_ qualify. Pick one reading and say which.

The registry also derives its recovery terms centrally, combining a PIM2-format
`Recovery` / `Bypass` pair with the primary-diagnosis procedure code, rather than
collecting the three PIM3 recovery terms directly. Another reason a naive
field-for-field mapping does not exist.

Source: ANZICS, _PIM2 & PIM3 for the ANZPIC Registry — Information Booklet_
(version Jan 2019), retrieved 2026-08-03. Grey literature, no DOI, and its
published URL returns HTTP 404 (re-verified 2026-08-02), so it is named in the
implementation's references rather than linked. **No computed value depends on
it** — the code mappings above are not consumed — but one rule this calculator
_states_ does: the tracheostomy clause on the ventilation criterion, which the
paper does not address (see [Open gaps](#open-gaps--needs-source)).

---

## Interpretation bands (non-directive wording, with source)

PIM3 outputs a **continuous predicted probability of death (0–1)**; the
derivation paper defines **no diagnostic cut-points or risk bands** for
individual patients. It is designed for aggregate use: the sum of individual
predicted probabilities across a cohort estimates the expected number of deaths,
compared with observed deaths as a **Standardised Mortality Ratio
(SMR = observed / expected)** to benchmark unit performance. Discrimination in
the derivation cohort was AUC-ROC ≈ 0.88.

Non-directive framing for display: report the value as "PIM3 predicted mortality
= X%", describing the estimated probability of death for a patient with these
admission characteristics in the derivation population. Do **not** present it as
an individual treatment threshold, and surface the group-level-only limitation
beside the number rather than below it. Calibration should be checked locally
before any comparative interpretation.

`interpretationStatus` is `not-applicable`, corrected 2026-08-03. It previously
read `pending`, on the claim that PIM3 has published mortality strata not yet
authored here. Straney 2013 publishes no cut-points and no risk bands, so there
are none to author — the absence is a property of the score, not a content gap.
The old value promised a page that could never be written, and contradicted the
line directly above it in `pim3.ts`, which already said the paper defines no
bands.

### Closed permanently, not pending further search — 2026-08-04

The 2026-08-03 correction fixed the status but left the question looking open.
It is not. Two independent grounds close it:

1. **No paediatric mortality model publishes endorsed severity tiers** — a
   confirmed negative across the family, not an unsearched gap. Registries
   report **unit-level** SMRs with funnel plots and outlier detection, never
   per-patient bands; calibration papers use post-hoc predicted-probability
   intervals **for goodness-of-fit only**, which is a check on the model's
   output and not a severity scale that can be lifted out of it.
2. **Dichotomising a continuous prediction is argued against on statistical
   grounds.** Altman DG, Royston P. _The cost of dichotomising continuous
   variables._ **BMJ 2006;332(7549):1080. PMID 16675816. PMCID PMC1458573.** —
   categorisation is "unnecessary for statistical analysis and has some serious
   drawbacks". See also Royston P, Altman DG, Sauerbrei W. _Dichotomizing
   continuous predictors in multiple regression: a bad idea._ **Stat Med
   2006;25:127–141.**
   **Provenance limit:** the widely-quoted "equivalent to discarding a third of
   the data" effect size was **not re-extracted** and is treated as WEAK — do
   not quote a number for it.

Both are now stated in `pim3.ts` → `notes`, so a reader is told the absence is
settled rather than being left to infer it from silence.

### The individual-use restriction, in the authors' own words

Straney 2013 was read in **full text** on 2026-08-04. It states the restriction
directly, and this is now carried **verbatim and attributed** in `pim3.ts` —
both in the caution beside the result and in `notes` — in place of this
platform's earlier paraphrase of it:

> "These models are not intended for prognostic use on individual patients;
> however, they have been used to assess..."

The sentence continues into the group-level uses the model **is** for, which is
why the platform quotes the leading clause and describes the remainder rather
than reproducing it. Pinned by `pim3.test.ts` → `"carries the derivation paper's
own words, not a paraphrase of them"`.

**Do not manufacture parallels.** The equivalent verbatim statements from
**PRISM IV (Pollack 2016)** and **PIM2 (Slater 2003)** were **NOT retrieved**.
Their individual-use positions are WEAK on this page and no quotation may be
attributed to either until its full text is read.

---

## References (full citations, PMID/DOI)

1. **Straney L, Clements A, Parslow RC, Pearson G, Shann F, Alexander J, Slater A;
   ANZICS Paediatric Study Group and the Paediatric Intensive Care Audit Network.**
   Paediatric index of mortality 3: an updated model for predicting mortality in
   pediatric intensive care. _Pediatr Crit Care Med._ 2013;14(7):673–681.
   **PMID 23863821. DOI 10.1097/PCC.0b013e31829760cf.** Primary source: all
   coefficients and the intercept (Table 3, p677), the diagnosis lists,
   qualifying rules, precedence rule and every coding/missing-value convention
   (Appendix 1, p680). Supplemental Digital Content 1 at `links.lww.com/PCC/A68`.

2. **Wolfler A, Osello R, Gualino J, et al; Italian Network of Pediatric Intensive
   Care Units.** The importance of mortality risk assessment: validation of the
   Pediatric Index of Mortality 3 score. _Pediatr Crit Care Med._
   2016;17(3):251–256. DOI 10.1097/PCC.0000000000000657. — Italian multicentre
   validation (AUC 0.88, SMR 0.98, H-L p = 0.21); neonatal over-prediction; the
   measured cost of migrating a PIM2 cohort.

3. **Lee OJ, Jung M, Kim M, Yang HK, Cho J.** Validation of the Pediatric Index of
   Mortality 3 in a Single Pediatric Intensive Care Unit in Korea.
   _J Korean Med Sci._ 2017;32(2):365–370. DOI 10.3346/jkms.2017.32.2.365.
   PMC5220006. — Independent reproduction of the full equation, probability
   transform and diagnosis lists; haemato-oncology under-prediction.

4. **Arias López MdP, Fernández AL, Ratto ME, et al.** Pediatric Index of Mortality
   3: an evaluation of function among ICUs in Argentina. _Pediatr Crit Care Med._
   2018;19(12):e653–e661. DOI 10.1097/PCC.0000000000001741. — Argentine
   multicentre evaluation (AUC 0.83, SMR 1.3, H-L p < 0.001); HIV and
   post-liver-transplant admissions still carrying local mortality risk.

5. **Solomon LJ, Morrow BM, Argent AC.** Paediatric Index of Mortality scores: an
   evaluation of function in the Paediatric Intensive Care Units of a South
   African province. _Pediatr Crit Care Med._ 2021;22(9):813–821.
   DOI 10.1097/PCC.0000000000002693. — South African multicentre evaluation
   (AUC 0.81, SMR 1.28, H-L p < 0.001, highest SMR 6.67 in the lowest-risk
   decile). The only **multicentre** evaluation of PIM3 in a resource-varied
   setting, and still the comparator for that question — but **no longer the
   closest comparator for a Gulf deployment**, which now has its own evaluations
   (refs 9 and 10). That earlier framing is corrected, not merely supplemented.

6. **Baloglu O, Nagy LR, Sonawane A, et al.** Simplified Pediatric Index of
   Mortality 3 score by explainable machine learning algorithm. _Crit Care
   Explor._ 2021;3(10):e0561. DOI 10.1097/CCE.0000000000000561. — Scale of
   real-world missingness in the blood-gas inputs.

7. **Slater A, Shann F, Pearson G.** PIM2: a revised version of the Paediatric
   Index of Mortality. _Intensive Care Med._ 2003;29:278–285.
   DOI 10.1007/s00134-002-1601-2. — The predecessor whose additive diagnosis
   handling and oxygenation default of 0 are the two behaviours PIM3 changed.
   Cited for the contrast; not implemented.

8. **ANZICS Centre for Outcome and Resource Evaluation.** _PIM2 & PIM3 for the
   ANZPIC Registry — Information Booklet_, version Jan 2019. **Retrieved
   2026-08-03.** Grey literature, no DOI; its published URL returns HTTP 404
   (re-verified 2026-08-02), so it is named rather than linked. Normative for the
   registry code numbers in the section above, which this implementation does not
   consume, **and** for the one coding rule it does state to the user: a
   tracheostomy with unassisted spontaneous breathing is not ventilation in the
   first hour. No peer-reviewed source addresses that case.

9. **Malhotra D, Nour N, El Halik M, Zidan M.** Performance of the Paediatric
   Index of Mortality 3 score in a tertiary paediatric ICU in Dubai. _Dubai Med
   J._ 2019;3(1):19–25. **DOI 10.1159/000505205.** **Full text read 2026-08-04.**
   Latifa Hospital, Dubai; single centre, **n = 583**, **46 deaths (7.9%)**.
   **Stable findings:** **AUC 0.78 (95% CI 0.69–0.87)**; **overall SMR 0.53**
   (over-prediction across the unit); **SMR 2.1 in the sepsis subgroup**
   (under-prediction, and nothing else in the paper contradicts it).
   **Unstable, and carried as such:** its predicted-probability strata cut two
   ways and disagree — **SMR 2.67 in the 1–5% band** (severe under-prediction)
   against **SMR 0.33 for p < 14.3% and 0.72 for p > 14.3%** (over-prediction
   across that same low range). Both cuts are this study's own. The regional
   evaluation this platform did not previously have.

10. **Alkhalifah AS, AlSoqati A, Zahraa J.** Performance of paediatric mortality
    scores in a tertiary paediatric intensive care unit in Saudi Arabia.
    _Front Pediatr._ 2022;10:926686. **DOI 10.3389/fped.2022.926686.** King Fahad
    Medical City, Riyadh; **n = 3396**, children under 14. Verbatim conclusion:
    _"These models had sufficient discrimination ability and poor calibration…
    The worst calibration and discrimination were recorded for infants
    <12 months of age."_ **PRISM III** performed best in the 60–120-month group
    (AUC 0.87). **Provenance limit:** the review that supplied this captured the
    quoted conclusion and that one PRISM III figure. **No PIM3-specific statistic
    from this study is asserted anywhere on this page or in the implementation**,
    and a later editor must not fill that in from memory.

---

## Limitations & notes

- **The paper contradicts itself on the age range, and this is not resolved
  here.** The abstract describes admissions of children younger than 18 at
  admission; the inclusion criteria in Methods state younger than 16. State it
  as **under 16** — how the field reads it — and record the discrepancy rather
  than silently picking. The Korean group extended validation to under-18s
  precisely because the developmental data covered under-16s.
- **Neonatal over-prediction.** Neonates sit well below the 125.6 mmHg SBP nadir,
  so the paired blood-pressure terms inflate their score. Documented in the
  Italian validation for both PIM2 and PIM3.
- **Haemato-oncology under-prediction, and badly.** Discrimination in this
  subgroup fell to c-index 0.66 against 0.74–0.83 in others, with observed
  mortality 18.73% against 7.13% predicted (Lee 2017). Note the interaction with
  the tier lists: leukaemia/lymphoma and bone marrow transplant are both very
  high-risk terms, and the model still under-predicts this group.
- **Neurological admissions were under-predicted in the derivation cohort
  itself** — SMR 1.32 (1.16–1.50), Table 4, p678. The only diagnostic group
  significantly off in the original data.
- **Calibration travels far worse than discrimination.** Italy AUC 0.88 /
  SMR 0.98 (H-L p = 0.21, good); Argentina AUC 0.83 / SMR 1.3 (p < 0.001);
  South Africa AUC 0.81 / SMR 1.28 (p < 0.001), with the **highest SMR (6.67) in
  the LOWEST risk decile** — in **that** cohort the model was least trustworthy
  exactly where a reader is most likely to be reassured by it. Keep that claim
  scoped to Solomon 2021, which is where it is uncontradicted: it is **not**
  corroboration for the same claim in the Gulf, where the one study that
  stratified by predicted probability contradicts itself (next bullet).
  Recalibrate and monitor locally before comparative interpretation.
- **THE GULF HAS ITS OWN EVIDENCE NOW, and the two series agree on less than
  the first pass claimed.**
  This replaces the earlier line naming South Africa as the closest Gulf
  comparator; that was a proxy, and a proxy is no longer needed.
  - **Dubai** (Malhotra 2019, single centre, n = 583, 46 deaths, 7.9%) —
    **the robust findings**: **AUC 0.78 (0.69–0.87)**, **overall SMR 0.53** —
    the model **over**-predicted deaths across the unit — and **SMR 2.1 in
    sepsis**, under-prediction inside an over-predicting unit.
  - **Dubai, the unstable part, and BOTH halves are carried.** The paper
    stratifies by predicted probability twice and the two cuts disagree in the
    same region of the scale:
    - **fine-grained: SMR 2.67 in the 1–5% band** — severe **under**-prediction;
    - **coarse: SMR 0.33 for p < 14.3% against 0.72 for p > 14.3%** —
      **over**-prediction across that same low range.

    One cohort of 583, two stratifications, opposite directions. That is a
    **subgroup instability, not a direction**, so **no claim about the low end of
    the scale is made from this study** — and neither figure may be carried
    without the other. Carrying only the 2.67 is what produced the retracted
    v1.2.0 conclusion.

  - **Riyadh** (Alkhalifah 2022, n = 3396, under 14): sufficient discrimination,
    poor calibration, **worst calibration AND discrimination in infants under
    12 months**. The per-model figure captured is PRISM III's (AUC 0.87,
    60–120 months); **no PIM3-specific statistic from it is claimed.**
  - **The conclusion, which is the part a reader actually needs.**
    **Discrimination travels between populations; calibration frequently does
    not.** The regional under-prediction that survives its own paper is the one
    in **sepsis**, by a factor of about 2 — that is the clinically consequential
    finding and it is uncontradicted. **A unit-level SMR below 1 does not make
    the model safe on the admissions inside it**: Dubai's 0.53 conceals a
    doubling of risk in sepsis. Where the model is least trustworthy here is in
    a **septic child** (Dubai) and in an **infant under 12 months** (Riyadh) —
    both statements resting on the study that supports them. This is the honest
    framing for a Gulf deployment, and it is now carried in a `caution` beside
    the result rather than only in prose.
- **Conditions dropped from the model that still carry local mortality risk.**
  HIV infection and post-liver-transplant admissions were removed as
  non-predictive in the derivation population; the Argentine authors flag both as
  still associated with higher mortality in their setting.
- **Benchmarking tool, not a bedside prognosis.** Validated for groups. Ships as
  a `caution`, beside the result.
- **Population/scope.** Derived on 53,112 admissions across 60 PICUs in
  Australia, New Zealand, the UK and Ireland (2010–2011). Not validated for
  neonatal-only units, adult patients, or as an individual triage device.
- **First-value rule.** Uses the _first_ value from first contact to +1 hour,
  which may include pre-ICU data. Using worst values instead biases the score.
- **Missing-data conventions matter**, and the imputation path is the common
  path — see the missing-values table above.

### Open gaps — [NEEDS SOURCE]

**None. All seven are closed** — six on 2026-08-03 (four by Appendix 1, p680, the
rest as the table below records) and the seventh, the tracheostomy clause, by the
round-2 sourcing pass the same day.

- **CLOSED — a tracheostomy with unassisted spontaneous breathing is not
  ventilation for the first-hour criterion.** Source: ANZICS Centre for Outcome
  and Resource Evaluation, _PIM2 & PIM3 for the ANZPIC Registry — Information
  Booklet_, version January 2019, which states in its ventilation-in-the-first-
  hour guidance that tracheostomy with spontaneous breathing does not constitute
  ventilation. **Retrieved 2026-08-03.** The wording is not reproduced here
  beyond the rule itself.

  **Close it at the right strength.** This is a **registry data-dictionary
  convention**, grey literature with no DOI, and its published anzics.org URL
  still returns HTTP 404 (re-verified 2026-08-02) — which is why the
  implementation names and dates it rather than shipping it as a resolvable
  reference. **No peer-reviewed source addresses the edge case at all.** Straney
  2013 Appendix 1 (p680) is an inclusion list — invasive ventilation, mask or
  nasal CPAP, BiPAP, negative-pressure ventilation — and says nothing about
  tracheostomy, so its silence neither confirms nor contradicts the booklet. The
  reason to follow the booklet is not that it is authoritative in the literature
  sense; it is that it is how the ANZPIC registry coded the variable in the data
  the model was fitted on, so following it keeps this calculator consistent with
  the derivation. Anyone who wants a stronger answer needs a primary study that
  does not exist. **Do not re-open this as an unfound gap: it is answered, and
  answered as weakly as it will ever be.**

**Closed on 2026-08-03** (each was previously `[NEEDS SOURCE]` because it had
been attributed to the unreachable booklet):

| Was unsourced                                       | Now sourced to                                           |
| --------------------------------------------------- | -------------------------------------------------------- |
| Pupil exclusion for drugs, toxins, local eye injury | Appendix 1, p680                                         |
| Mechanical ventilation includes CPAP / BiPAP        | Appendix 1, p680 (also negative-pressure ventilation)    |
| The elective-admission definition                   | Appendix 1, p680 — postponable > 6 hours without harm    |
| SBP special values 0 / 30 / 120                     | Appendix 1, p680                                         |
| Per-region calibration statistics                   | Wolfler 2016, Arias López 2018, Solomon 2021             |
| The ANZPIC diagnosis-code mappings                  | ANZICS booklet, transcribed in full in the section above |

The engineering plausibility bounds on `sbp` (upper), `base_excess`, `fio2` and
`pao2` remain what they always were — input-validity limits chosen here, not
published thresholds — and are labelled as such in the implementation. They are
not gaps to close; the paper publishes no ranges.

---

## IP status

- **Formula, coefficients, intercept, the logistic transform and the tier
  precedence rule are not copyrightable** — mathematical facts / a method,
  freely implementable.
- **Which conditions sit in which tier is a fact and is used.** The condition
  names as implemented are ordinary clinical terms (asthma, croup, necrotising
  enterocolitis); nothing distinctive to the paper's expression is carried.
- **Potentially protectable expression, paraphrased rather than transcribed.**
  The Appendix 1 qualifying rules, the pupil descriptor and the SBP
  special-value instructions are written in this project's own words in both
  this note and the implementation's help text. The underlying facts are usable;
  the sentences are not ours. **FLAG.**
- No verbatim scored **response-descriptor scale** exists in PIM3 — the model is
  numeric — so there is no item bank to license, unlike the coma-scale family.

---

## Verification

### 2026-08-03 — primary source read in full; diagnosis model rebuilt on it

**What was read.** Straney 2013 complete, pages 673–681, including Table 1
(p675), Table 2 (p676), Table 3 (p677), Table 4 and Figure 1 (p678) and
**Appendix 1 (pp 679–681)**; Supplemental Digital Content 1
(`pcc_14_7_2013_04_18_straney_201438_sdc1.xls`, sheet "Model forms"); the ANZICS
_PIM2 & PIM3 for the ANZPIC Registry_ Information Booklet (version Jan 2019) in
full, including the code enumerations, the coding Q&A, the ANZ recalibrations and
the ANZPIC Diagnostic Codes Table 2019; Slater 2003 (PIM2); Wolfler 2016;
Lee 2017; Arias López 2018; Solomon 2021; Baloglu 2021.

**Confirmed unchanged.** All 13 coefficients and the intercept, the logistic
transform, the three diagnosis lists, and the imputation defaults (SBP 120,
|BE| 0, oxygenation 0.23) — every one re-read from Table 3 and Appendix 1 rather
than recalled. No value in this file changed as a result.

**Corrected.** The diagnosis model. This file previously described the three
tiers only as "at most one is 1", which is true of the _result_ but says nothing
about how a patient with conditions in two tiers is resolved — and the
implementation delegated that resolution to the user through a single
`diagnosis_risk` picker. Methods p674 states the precedence rule explicitly and
the paper's own worked example (p681) is built to exercise it. The tiers are now
three inputs resolved by the model, and the failure mode is pinned by fixture A
in both directions (47.22% published, 72.34% additive).

**Two observations from the supplement worth recording.** Its footnote states
that all 48 candidate models contained the pupils, elective, respiratory-support
and three risk-diagnosis terms — the diagnostic tiers were structural throughout
model selection and were never candidates for removal; only the four
transformations varied. And the selected model 18 (mean AUC 0.8853565, median
χ² 9.43154, matching the paper's reported 0.89 and 9.43) was marginally beaten on
mean AUC by model 34 (0.8853750, a difference of 1.85 × 10⁻⁵, adding a cubic SBP
term) which calibrated worse (median χ² 11.141). The choice was parsimony and
calibration at an immaterial discrimination cost. This does not affect the
published coefficients.

**Not accessed:** Supplemental Table 1 of Arias López 2018
(`links.lww.com/PCC/A772`), which reproduces the PIM3 coefficients with odds
ratios — redundant now that Table 3 has been read directly.

### 2026-07-25 — independent cross-check (retained)

Performed against sources other than the primary citation. Fetched: Lee 2017 in
full (open-access PMC), the PubMed abstract of Straney 2013, and Ray et al.
(UCL Discovery preprint) whose entire subject is the PIM3 FiO₂/PaO₂
missing-value handling.

**Correction made then, and still standing.** The FiO₂/PaO₂ missing-value
substitution was wrong in this file: it stated the term is **0** when
unmeasured. That is **PIM2's** convention. PIM3 substitutes **0.23**, a normal
value based on a PaO₂ of about 91 mmHg / 12 kPa on room air. Ray et al. state the
coefficient application directly, and Lee 2017 corroborates. Fixed then in the
formula notes, the `fio2` / `pao2` rows, the conversion notes and the
all-defaults worked example (old: logit −4.49376, P ≈ 1.1%; corrected: −4.39684,
P ≈ 1.22%). Now independently re-confirmed against Methods p674, which derives
0.23 as (0.21 × 100) / 90 and names the selected model form as the one imputing
it.

The 2026-07-25 attempt to reach the ANZICS booklet failed (404 at the published
URL and at the Data Dictionary URL; web.archive.org unreachable from that
environment), which is why the variable-coding rules were carried as
`[NEEDS SOURCE]` until Appendix 1 was read. All but one are now closed from the
paper itself; the exception is listed under
[Open gaps](#open-gaps--needs-source).

**Nothing in this file is inferred.** The diagnostic code ordinals flagged as
uncertain in earlier drafts are read directly from Appendix 1, p680. All three
lists are confirmed complete and independently corroborated across the paper, the
registry manual and three peer-reviewed validation studies.

### 2026-08-04 — round-3 pass: regional calibration

**No coefficient, input, imputation default, tier list or computed probability
changed.** Implementation version **1.2.0**. What changed is that the page now
describes how the model behaves where this platform deploys.

- **Two Gulf evaluations added** as references 9 and 10 (Dubai full text read
  2026-08-04; Riyadh carried at the strength the supplying review recorded).
- **The South Africa framing was corrected, not extended.** "The closest
  comparator for a Gulf-region deployment" was true only while the region had no
  study of its own. It now has two. South Africa keeps the narrower claim it can
  support: the only multicentre evaluation in a resource-varied setting.
- **The conclusion is stated, not just the statistics.** Discrimination travels;
  calibration frequently does not. A new `caution` says so beside the result,
  because an over-predicting overall SMR is the single most misleading figure in
  this evidence. ⚠️ **The low-probability half of the conclusion this pass drew
  was withdrawn the same day — see the verification pass below.**
- **Provenance discipline, recorded so it survives an edit.** The Riyadh study's
  one per-model figure is **PRISM III's**. Nothing on this page or in the
  implementation attributes a statistic from it to PIM3, and a test in
  `pim3.test.ts` fails if that disclaimer is removed from the reference note.

### 2026-08-04 — verification of the round-3 pass: one conclusion withdrawn

**No coefficient, input, imputation default, tier list or computed probability
changed.** Implementation version **1.2.1**, reason `clarification`.

**The defect.** The pass above shipped a user-facing caution saying, in effect,
that the reassuring end of the scale is the least trustworthy part of it — that a
low predicted probability is where this model has been shown to be most wrong —
and rested that on Malhotra 2019's **SMR 2.67 in the 1–5% predicted-probability
band**. The **same paper** stratifies the same cohort a second way and reports
**SMR 0.33 for p < 14.3% against 0.72 for p > 14.3%**: **over**-prediction, not
under-prediction, across that low range. The page carried one cut and not the
other, which turned an unstable subgroup result into a stated finding.

**The fix.**

- **Both stratifications are now carried**, in the reference note, in
  `Limitations & notes`, in the implementation's `notes` and in the `caution`.
  Neither may appear without the other; `pim3.test.ts` pins all five figures
  (2.67, 1–5%, 14.3%, 0.33, 0.72) in the surfaced text and in the reference note.
- **The conclusion is weakened to what the data supports.** The robust findings
  from that study are the **overall SMR 0.53**, the **AUC 0.78** and the **sepsis
  subgroup SMR 2.1**. The predicted-probability strata are recorded as unstable,
  and **no direction is asserted for the low end of the scale**.
- **The sepsis finding stays prominent**, in the caution beside the result. It is
  not contradicted anywhere in the paper and it is the clinically consequential
  one.
- **"Least trustworthy" is kept but re-anchored** — to a septic child (Dubai) and
  an infant under 12 months (Riyadh), each resting on the study that supports it,
  rather than to the low end of the probability scale.

**Propagation checked.** The same figures and the same conclusion had been copied
onto the PRISM page, which cites the Dubai study as a deliberately-labelled PIM3
data point. `docs/research/scores/prism.md` and `prism.ts` carry the identical
correction (implementation version **2.2.1**). No other score cites Malhotra 2019.
