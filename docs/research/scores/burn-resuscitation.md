# Pediatric burn fluid resuscitation (Parkland, modified Brooke, Galveston, Cincinnati)

Estimated 24-hour intravenous fluid volume for acute burn shock resuscitation in
children. This is a **dosing/therapy formula, not a diagnostic severity score** —
it outputs a starting fluid volume and infusion rate that is then **titrated to
urine output**, not a risk band. Several formulas coexist; this note gives the
exact coefficients for each, plus the pediatric additions (maintenance fluid,
dextrose) that distinguish children from adults, and the TBSA-estimation method
(Lund–Browder) children require.

Key pediatric differences vs. adults, up front:

1. Children get a **lower weight coefficient** in the crystalloid formulas
   (typically 3 mL vs. 4 mL/kg/%TBSA for Parkland) but a **higher per-kg
   baseline need**, so pediatric protocols **add maintenance fluid** (Holliday–
   Segar) on top of the resuscitation volume — adults do not.
2. Children get **dextrose** in the maintenance fluid (limited glycogen stores →
   hypoglycemia risk).
3. **%TBSA must be estimated with the age-adjusted Lund–Browder chart**, not the
   Rule of Nines (a child's head is a much larger fraction of BSA than an
   adult's).
4. **Surface-area–based formulas** (Galveston, Cincinnati) exist specifically for
   children because burn losses and maintenance both scale with body surface
   area, which the weight-only formulas track poorly at the extremes of size.

---

## Formula / algorithm (exact — every coefficient and branch)

### Common structure

- Fluid: **lactated Ringer's (LR)** for initial resuscitation across all age
  groups.
- **Clock starts at the time of the burn injury, not the time of presentation.**
  The first-8-hour volume is counted from injury; if the patient arrives late,
  the already-elapsed time is subtracted and the remaining first-8h volume is
  given over the time left. (StatPearls NBK534227, NBK537190.)
- Standard temporal split (Parkland, modified Brooke, Galveston, Cincinnati):
  **half of the 24-hour resuscitation volume in the first 8 hours, the remaining
  half over the next 16 hours.** (StatPearls; Romanowski & Palmieri 2017.)
- %TBSA counts **second- and third-degree (partial- and full-thickness) burn
  only**; superficial (first-degree/erythema) is excluded. (StatPearls.)

### 1. Parkland formula (Baxter)

```
Adult:      24-h LR volume = 4 mL × weight(kg) × %TBSA
Pediatric:  24-h LR volume = 3 mL × weight(kg) × %TBSA   ("modified Parkland")
            half in first 8 h, remainder over next 16 h
```

- Adult coefficient **4 mL/kg/%TBSA**; pediatric commonly reduced to
  **3 mL/kg/%TBSA**. (StatPearls NBK534227 & NBK537190; the pediatric 3 mL rate
  is explicitly used as "modified Parkland formula rate (3 mL/%TBSA/kg/day)" in
  the institutional protocol assessment, PMC11958416.)
- **Pediatric addition — maintenance fluid** on top of the resuscitation volume,
  because the Parkland formula alone under-resuscitates small children (it
  ignores baseline metabolic water needs). Maintenance is computed by the
  **Holliday–Segar** method (below), typically as a dextrose-containing fluid.
  (StatPearls NBK537190; Romanowski & Palmieri 2017.)

### 2. Modified Brooke formula

```
Adult:      24-h LR volume = 2 mL × weight(kg) × %TBSA
Pediatric:  24-h LR volume = 3 mL × weight(kg) × %TBSA
            half in first 8 h, remainder over next 16 h
            + maintenance fluid (children)
```

- Adult **2 mL/kg/%TBSA**; pediatric **3 mL/kg/%TBSA**. (StatPearls NBK534227.)
- The 2024 **American Burn Association Clinical Practice Guideline** recommends
  _initiating_ adult resuscitation at the **modified-Brooke 2 mL/kg/%TBSA** rate
  (to reduce over-resuscitation/"fluid creep") and titrating up as needed; the
  CPG scope is **adults ≥20% TBSA only** and does not set a pediatric starting
  coefficient. (Cartotto et al. 2024, PMID 38051821.)

### 3. Galveston formula (Shriners–Galveston; surface-area based, includes maintenance)

```
24-h volume = 5000 mL/m² × (BSA burned, m²)      [resuscitation]
            + 2000 mL/m² × (total BSA, m²)        [maintenance]
            half in first 8 h, remainder over next 16 h
Fluid: lactated Ringer's + 12.5 g of 25% albumin per liter + 5% dextrose as needed
```

- `BSA burned (m²) = %TBSA/100 × total BSA (m²)`.
- Resuscitation term **5000 mL/m² of BSA burned**; maintenance term
  **2000 mL/m² of total BSA**. (Romanowski & Palmieri 2017, ref. to Carvajal;
  StatPearls NBK534227.)
- Maintenance is **built into** the formula (unlike Parkland/Brooke, where it is
  added separately). This is a major reason SA-based formulas are favored in
  small children.

### 4. Cincinnati formula (Shriners–Cincinnati; weight + surface-area, age-branched fluid)

```
24-h volume = 4 mL × weight(kg) × %TBSA  +  1500 mL/m² × (total BSA, m²)
            half in first 8 h, remainder over next 16 h

Older children — LR throughout.
Younger children — age-branched fluid composition:
   first 8 h:  LR + 50 mEq sodium bicarbonate per liter
   second 8 h: LR alone
   third 8 h:  LR + 12.5 g of 25% albumin per liter
```

- Weight term **4 mL/kg/%TBSA** plus surface-area term **1500 mL/m² total BSA**.
  (Romanowski & Palmieri 2017; StatPearls NBK534227 — the latter states the
  surface-area term as 1500 mL/m² of total BSA.)
- In **younger children**, add **5% dextrose** to the fluids (hypoglycemia risk).
  (Romanowski & Palmieri 2017.)

### Maintenance fluid — Holliday–Segar method (added to Parkland/modified-Brooke in children)

24-hour maintenance **water** volume:

```
first 10 kg:        100 mL/kg/day
next 10 kg (11–20): + 50 mL/kg/day
each kg above 20:   + 20 mL/kg/day
```

Equivalent hourly "**4–2–1 rule**": 4 mL/kg/h for the first 10 kg, +2 mL/kg/h for
the next 10 kg, +1 mL/kg/h for each kg above 20. (Holliday & Segar 1957,
PMID 13431307.)

- In burn maintenance, this is commonly delivered as a **dextrose-containing
  fluid** (e.g., 5% dextrose in LR, or D5 ½-normal saline) and run continuously,
  **in addition to** the LR resuscitation volume. One published pediatric-burn
  maintenance regimen: **LR with 5% dextrose at 4 mL/kg/h (0–10 kg) + 2 mL/kg/h
  (10–20 kg) + 1 mL/kg/h for each kg > 20 kg** — i.e., the 4-2-1 rule applied to
  a D5-LR maintenance drip. (StatPearls NBK534227.)

### Body-surface-area (BSA) for the SA-based formulas — Mosteller

```
BSA (m²) = √( height(cm) × weight(kg) / 3600 )
```

(Mosteller 1987, PMID 3657876. This is the standard US bedside BSA equation;
Du Bois is an alternative.)

### %TBSA estimation in children — Lund–Browder (NOT Rule of Nines)

- Use the **age-adjusted Lund–Browder chart** for children. The **Rule of Nines
  is inaccurate in children** because body proportions differ by age — the head
  is a much larger fraction of BSA and the legs a smaller fraction than in
  adults. (StatPearls NBK534227 & NBK537190.)
- The **"rule of palm"** (patient's palm+fingers ≈ 1% TBSA) is a supplementary
  estimate for small/scattered burns. (StatPearls.)

#### The table — resolved 2026-08-03

Percent of TBSA, **per side** for paired segments (each cell is one limb, not
the pair). Shipped as `packages/scoring-engine/src/data/lund-browder.ts`.

| Segment                     |   0 |   1 |   5 |  10 |  15 | Adult |
| --------------------------- | --: | --: | --: | --: | --: | ----: |
| Head                        |  19 |  17 |  13 |  11 |   9 |     7 |
| Neck                        |   2 |   2 |   2 |   2 |   2 |     2 |
| Trunk, front                |  13 |  13 |  13 |  13 |  13 |    13 |
| Trunk, back                 |  13 |  13 |  13 |  13 |  13 |    13 |
| Buttock (each)              | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |   2.5 |
| Genitalia and perineum      |   1 |   1 |   1 |   1 |   1 |     1 |
| Upper arm (each)            |   4 |   4 |   4 |   4 |   4 |     4 |
| Forearm (each)              |   3 |   3 |   3 |   3 |   3 |     3 |
| Hand (each)                 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |   2.5 |
| Thigh (each)                | 5.5 | 6.5 |   8 | 8.5 |   9 |   9.5 |
| Lower leg (each)            |   5 |   5 | 5.5 |   6 | 6.5 |     7 |
| Foot (each)                 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 |   3.5 |
| **Total (all 19 segments)** | 100 | 100 | 100 | 100 | 100 |   100 |

"Lower leg" is knee to ankle, exclusive of the foot; "forearm" is elbow to
wrist, exclusive of the hand. Five rows vary with age (head, both thighs, both
lower legs); the other fourteen are constant. Head −12, thighs +8, lower legs +4
across birth → adult — a net of zero, which is why every column closes at 100.

**Age bands.** The chart labels columns as point ages; the JTS worksheets label
the same columns as bands. Bands are what is implemented: 0 → birth to <1 y,
1 → 1 to <5 y, 5 → 5 to <10 y, 10 → 10 to <15 y, 15 → 15 to <16 y, Adult → 16 y
and over. A 3-year-old takes the "1" column; a 7-year-old takes the "5".

**Attribution — read this before citing it, and note that it has three sources,
not one.** Collapsing them into a single sentence would give the least-checked
fact the standing of the best-checked one.

1. **The cells and the per-form dates — from the worksheets themselves.** The
   values are those of the US DoD **Joint Trauma System Burn Care CPG** Lund
   Browder Burn Estimate & Diagram worksheets, read in full for the compiled
   Lund–Browder implementation reference of 3 August 2026: Infant (July 2025)
   supplies the age-0 column, Pediatric (June 2025) ages 1/5/10/15, Adult (June 2025) the adult column and the printed 100 total. Those three dates are
   **form** dates, not the guideline's.
2. **The CPG identifier and its own date — checked live.** The JTS CPG index at
   `jts.health.mil` lists Burn Care as **CPG ID 12, dated 10 June 2025** and
   carries all three worksheets; that was read directly at jts.health.mil on
   **2026-08-03**. The compiled reference gives the CPG number but **no
   CPG-level date** — only the per-form dates in (1) — so 10 June 2025 is a
   live-index fact and must not be presented as coming from that document.
3. **The 1944 original — NOT obtained.** _Surg Gynecol Obstet_ vol. 79 is not
   digitised in any reachable open repository and no copy was read, so the
   correct attribution is **"after Lund & Browder (1944), as reproduced in the
   JTS worksheets"**, never a bare claim on the 1944 paper. Specifically
   unconfirmed: whether the 19-row tabular layout appears in that form in 1944;
   the 1944 publication is generally described as presenting body diagrams with
   an A/B/C growth inset, and the expanded table may be a later reformatting for
   worksheet use.

Two independent
reproductions agree cell-for-cell (Vanderbilt/Monroe Carell paediatric burn
fluid resuscitation protocol, March 2025, all five paediatric columns; Wayne
State University Surgery Burn Protocol #23, the 15-year and adult columns).

**Known transcription defects — this is why the totals are gated.** Most charts
in circulation sum to **101%**.

| Defect                 | Circulating value | Value used here     | Basis                                 |
| ---------------------- | ----------------- | ------------------- | ------------------------------------- |
| Hand, per aspect       | 1.5 (hand = 3)    | **1.25** (hand 2.5) | Lundin & Alsbjørn 2013; closes at 100 |
| Half a thigh at age 10 | 4½ (thigh = 9)    | **4¼** (thigh 8.5)  | Miminas 2007; closes at 100           |

The hand error adds 0.25 per aspect × 2 aspects × 2 hands = **+1.0 in every
column** and is the documented cause of the 101% charts (Lundin & Alsbjørn,
_Burns_ 2013;39(4):819–820). The thigh error inflates the **10-year column
alone**. A third, heavily degraded scanned variant carries several errors at
once (trunk-front 17 in the 1–4 band, buttocks and hands 2 instead of 2.5, head
10 instead of 11 at 10–14). **Rule: do not use any Lund–Browder chart you have
not summed yourself.**

**Cross-check against the printed inset.** The classic chart prints A/B/C "half"
values, where half means one aspect (front or back) of one limb — so B × 2 is a
whole thigh. Half-head 9½/8½/6½/5½/4½/3½, half-thigh 2¾/3¼/4/4¼/4½/4¾, half-leg
2½/2½/2¾/3/3¼/3½ each double exactly to the rows above. This lineage (Miminas,
_Wounds UK_ 2007) is independent of the JTS worksheets, so the agreement is a
second opinion rather than a restatement.

**Anterior/posterior split** is needed only if a single aspect of a segment can
be selected, which this calculator does not offer. It is **not** 50/50: trunk,
buttocks and genitalia are asymmetric, and the adult column totals 48 anterior /
52 posterior on the JTS form. The paediatric anterior/posterior totals shift
with the head/limb redistribution and are **not verified here** — check them
against the JTS paediatric form directly before implementing aspect-level
selection.

### Threshold to initiate formal IV resuscitation

- **ABLS / ABA:** formal resuscitation for burns **≥20% TBSA** (adults). Many
  pediatric centers use a **lower trigger (≥15% TBSA)**; some initiate at **>10%
  TBSA** in children. Practice varies. (StatPearls; ABA CPG scope ≥20% adults;
  institutional pediatric protocol PMC11958416 used **TBSA ≥15% if <10 kg and
  ≥20% if ≥10 kg**.)

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                  | label                                      | type   | units / conversion                                    | plausible min/max                                                                                            |
| ------------------- | ------------------------------------------ | ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `weight_kg`         | Body weight                                | number | kg. From lb: ÷2.2046                                  | ~0.5–150 kg (pediatric device bound; not a cited clinical threshold) [NEEDS SOURCE]                          |
| `tbsa_pct`          | %TBSA burned (2nd + 3rd degree)            | number | % (0–100), via **Lund–Browder** in children           | 0–100%; formal resuscitation typically triggered at ≥15–20% (StatPearls; PMC11958416)                        |
| `height_cm`         | Height/length (for BSA formulas)           | number | cm. From in: ×2.54                                    | ~30–200 cm (input-validity bound) [NEEDS SOURCE]                                                             |
| `bsa_m2`            | Total body surface area (derived)          | number | m² = √(height·weight/3600) (Mosteller)                | derived; ~0.1–2.2 m² typical (arithmetic consequence of height/weight bounds) [NEEDS SOURCE for hard bounds] |
| `formula`           | Formula selection                          | enum   | parkland / modified_brooke / galveston / cincinnati   | selection, not a measured value                                                                              |
| `age_band`          | Age (for Lund–Browder + Cincinnati branch) | enum   | 6 Lund–Browder bands: <1, 1–4, 5–9, 10–14, 15, ≥16 yr | determines head/thigh/lower-leg %; and Cincinnati "younger vs older" fluid branch                            |
| `time_since_burn_h` | Hours elapsed since injury                 | number | h. Used to back-date the first-8h window              | 0–24 (resuscitation clock runs from injury; StatPearls)                                                      |

Derived outputs:

| id             | meaning                                                     | formula                                                        |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `resus_24h_ml` | Total 24-h resuscitation crystalloid volume                 | per selected formula above                                     |
| `first8h_ml`   | Volume for first 8 h (from injury)                          | `resus_24h_ml / 2`                                             |
| `first8h_rate` | Infusion rate, first 8 h                                    | `first8h_ml / (8 − time_since_burn_h)` mL/h                    |
| `next16h_rate` | Infusion rate, next 16 h                                    | `(resus_24h_ml / 2) / 16` mL/h                                 |
| `maint_24h_ml` | Holliday–Segar maintenance (children; Parkland/Brooke only) | 100/50/20 mL/kg/day (Galveston/Cincinnati include maintenance) |

Notes on bounds: the fluid coefficients (4/3/2 mL, 5000/2000/1500 mL/m²), the
100/50/20 Holliday–Segar tiers, and the Mosteller denominator (3600) are exact
published constants. Weight/height outer bounds are engineering input-validation
limits, **not** publication-derived values — flagged [NEEDS SOURCE].

---

## Worked examples (each cited; all derived from the formulas above)

**Example 1 — Pediatric Parkland (3 mL) + Holliday–Segar maintenance**
_(derived from the modified-Parkland formula in StatPearls NBK537190 + Holliday–Segar 1957)_

- Child: 15 kg, 25% TBSA (partial+full thickness), presenting at time of injury.
- Resuscitation LR = 3 × 15 × 25 = **1125 mL** over 24 h.
  - First 8 h: 1125 / 2 = 562.5 mL → 562.5 / 8 = **70.3 mL/h**.
  - Next 16 h: 562.5 mL → 562.5 / 16 = **35.2 mL/h**.
- Maintenance (Holliday–Segar): first 10 kg × 100 + next 5 kg × 50 =
  1000 + 250 = **1250 mL/day** ≈ 52 mL/h, as D5-containing fluid, run
  continuously **on top** of the LR.
- Combined first-8h infusion ≈ 70.3 + 52 = **~122 mL/h**.

**Example 2 — Adult Parkland (4 mL), no maintenance added**
_(derived from the Parkland formula in StatPearls NBK537190)_

- Adult: 70 kg, 40% TBSA.
- LR = 4 × 70 × 40 = **11 200 mL** over 24 h.
  - First 8 h: 5600 mL → **700 mL/h**.
  - Next 16 h: 5600 mL → **350 mL/h**.
- Adults: **no separate maintenance fluid** is added. (Contrast with Ex. 1.)

**Example 3 — Pediatric modified Brooke (3 mL) + maintenance**
_(derived from the modified-Brooke pediatric coefficient in StatPearls NBK534227 + Holliday–Segar 1957)_

- Child: 20 kg, 30% TBSA.
- LR = 3 × 20 × 30 = **1800 mL** over 24 h → first 8 h 900 mL (**112.5 mL/h**);
  next 16 h 900 mL (**56.3 mL/h**).
- Maintenance (Holliday–Segar): 10 × 100 + 10 × 50 = **1500 mL/day** (~62.5 mL/h)
  as D5-containing fluid on top.

**Example 4 — Galveston (surface-area based, maintenance included)**
_(derived from the Galveston formula in Romanowski & Palmieri 2017; BSA via Mosteller 1987)_

- Child: height 95 cm, weight 15 kg, 30% TBSA.
- Total BSA = √(95 × 15 / 3600) = √(1425/3600) = √0.3958 = **0.629 m²**.
- BSA burned = 0.30 × 0.629 = **0.1888 m²**.
- Resuscitation = 5000 × 0.1888 = **943.8 mL**.
- Maintenance = 2000 × 0.629 = **1258.3 mL**.
- 24-h total = 943.8 + 1258.3 = **2202 mL** → first 8 h 1101 mL (**137.6 mL/h**);
  next 16 h 1101 mL (**68.8 mL/h**). Fluid: LR + 12.5 g 25% albumin/L + 5%
  dextrose as needed. (No separate maintenance drip — it is inside the formula.)

**Example 5 — Cincinnati (weight + surface-area, age-branched fluid)**
_(derived from the Cincinnati formula in Romanowski & Palmieri 2017 / StatPearls NBK534227; BSA via Mosteller)_

- Same child: 15 kg, 30% TBSA, BSA 0.629 m² (younger child).
- Volume = (4 × 15 × 30) + (1500 × 0.629) = 1800 + 943.5 = **2743.5 mL** over 24 h
  → first 8 h 1371.8 mL (**171.5 mL/h**); next 16 h (**85.7 mL/h**).
- Younger-child fluid branch: first 8 h **LR + 50 mEq NaHCO₃/L**; second 8 h
  **LR alone**; third 8 h **LR + 12.5 g 25% albumin/L**; add 5% dextrose.

**Example 6 — Holliday–Segar maintenance standalone (26 kg child)**
_(derived from Holliday & Segar 1957)_

- 26 kg: 10 × 100 + 10 × 50 + 6 × 20 = 1000 + 500 + 120 = **1620 mL/day**
  (= 67.5 mL/h). 4-2-1 check: 40 + 20 + 6 = 66 mL/h (rounding of 1620/24). ✓

**Example 7 — Pisano's five-centre spread, and where this score sits in it**
_(Pisano C, et al. Burns 2021;47(3):545–550, DOI 10.1016/j.burns.2020.04.013 —
the worked example in §7.3 of the 2016–2026 review; see R.4)_

- Child: **5 years old, 25 kg, 20% TBSA**. Pisano's point is that the estimated
  24-hour requirement for this one child ranges **1500–3560 mL (3.0–7.1
  mL/kg/%TBSA)** depending only on which of five ABA-verified paediatric burn
  centres they arrive at.
- This score's pediatric-Parkland output = 3 × 25 × 20 = **1500 mL** — the
  **bottom** of that span, i.e. 3.0 mL/kg/%TBSA. First 8 h = **750 mL**.
- Holliday–Segar maintenance at 25 kg = 1000 + 500 + 5 × 20 = **1600 mL/day**;
  combined = **3100 mL**, which lands inside the span but still below its top.
- This is the honest way to show the number: not "1500 mL is the answer" but
  "1500 mL is one end of a published 2.4-fold spread for this exact child".

---

## Interpretation bands (non-directive, with source)

**This formula has no severity/interpretation bands.** It is a **dosing
estimate**, not a classifier. The clinically meaningful "output interpretation"
is the **resuscitation endpoint (urine output)** that the calculated rate is then
titrated against, plus the injury-size threshold that triggers formal
resuscitation. These are targets/triggers, not risk strata:

**Urine-output titration targets** (report the source-specific value; the
literature is not uniform):

- **Adults:** 0.5–1.0 mL/kg/h, or ~30–50 mL/h. The 2024 ABA CPG target is
  **0.5 mL/kg/h (30–50 mL/h)**. (Cartotto et al. 2024; StatPearls.)
- **Children:** commonly **1.0–1.5 mL/kg/h** (StatPearls NBK537190); an
  alternative widely cited split is **1 mL/kg/h if <30 kg and 0.5 mL/kg/h if
  ≥30 kg** (StatPearls NBK534227). **Infants** are sometimes targeted higher
  (~1–2 mL/kg/h). Sources disagree by ~0.5 mL/kg/h; carry the range, do not pick
  one silently.
- **Reconciled against the 2016–2026 table in R.3, which widens this further.**
  The **>30 kg target spans 0.3–1.0 mL/kg/h** once Stevens 2023's 0.3–0.7 is
  included — a threefold range, and Stevens sits below even the adult 0.5–1.0.
  The **banding variable itself is disputed**: AWMF 006/128 bands by
  developmental stage (infants and toddlers 1–2, school-age 0.5–1), North
  American sources band by weight, and the switch weight ranges 20–40 kg. Carry
  all of it; the "<30 kg = 1, ≥30 kg = 0.5" split above is one line through a
  disagreement, not the disagreement.

**Threshold to start formal resuscitation:** ≥20% TBSA (ABLS/ABA, adults); many
pediatric centers ≥15%; some >10% in children (see Formula section).

The formula volume is explicitly a **starting estimate to be titrated**, not a
volume to be delivered rigidly — over-resuscitation ("fluid creep") is a
recognized harm and is the reason the 2024 ABA CPG lowered the adult starting
coefficient to 2 mL/kg/%TBSA. (Cartotto et al. 2024.)

---

## The 2016–2026 evidence review (added 2026-08-03)

A second sourcing pass, deliberately restricted to evidence published 2016–2026.
Its first finding governs everything below it.

### R.0 Inside a ten-year window there is no derivation of anything

**No primary derivation exists in-window for any coefficient this score uses.**
Parkland (Baxter & Shires 1968), Galveston (Carvajal 1980), Cincinnati
(Shriners, via a 2009 textbook chapter), Brooke (Reiss 1953), the Ivy index
(2000) and the "children need ~6 mL/kg/%TBSA" figure (Graves 1988) all predate
2016 by decades. Everything in-window is **restatement, practice audit, or
consensus synthesis**. Any coefficient a clinical tool displays is a convention
with 40–70-year-old provenance and no modern re-derivation. That is not a reason
to reject it; it is a reason to label it accurately, which is what this section
exists to make possible.

**Provenance of this section.** The figures below are taken from this project's
compiled burn-resuscitation evidence review of 2026-08-03, which records the
seven sources in R.0.1 as read in full. The originals were **not re-fetched**
for this pass, so every number here is at one remove and is attributed to the
named study, never to a reading of it done here.

#### R.0.1 Sources of the review

| Source                                                                                                                                        | Type                                | Population                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| Cartotto R, et al. ABA CPG on Burn Shock Resuscitation. _J Burn Care Res_ 2024;45(3):565–589                                                  | Systematic-review CPG               | Adults ≥20% TBSA             |
| Greenhalgh DG, Cartotto R, Taylor SL, et al. Burn resuscitation practices in North America: ABRUPT. _Ann Surg_ 2023;277(3):512–519            | Prospective observational, 21 sites | Adults ≥20% TBSA             |
| Vasileiadis V, Najem S, Reinshagen K, et al. Fluid and burns in children — German Burn Registry 2015–2022. _Eur J Pediatr_ 2024;183:5479–5488 | Registry cohort, 30 centres         | Children <16 y, ≥15% TBSA    |
| Pisano C, Fabia R, Shi J, et al. Variation in acute fluid resuscitation among pediatric burn centers. _Burns_ 2021;47(3):545–550              | Protocol comparison, 5 centres      | Children ≥15% TBSA           |
| Stevens JV, Prieto NS, Ridelman E, et al. Weight-based vs BSA-based fluid resuscitation predictions. _Burns_ 2023;49(1):120–128               | Retrospective, single centre        | Children ≤18 y, ≥15% TBSA    |
| DGKCH et al. AWMF S2k-Leitlinie 006/128, Version 3.0, 15.08.2024                                                                              | National consensus guideline        | Children, birth to adulthood |
| Romanowski KS, Palmieri TL. _Burns Trauma_ 2017;5:26                                                                                          | Narrative review                    | Children                     |

**Not accessed.** The **ABLS Provider Manual** — ABA course material, no DOI,
cited second-hand by ABRUPT, by Pisano's "ABA" column and by StatPearls. It is
the source most clinicians actually follow and the apparent origin of the 30 kg
figure. **No ABA or ISBI clinical practice guideline covering _paediatric_ burn
shock resuscitation was located**; the 2024 ABA CPG makes no reference to a
companion paediatric document.

### R.1 The 30 kg maintenance threshold — real, traceable, and not universal

**Pisano 2021, Table 2** is the primary tabulation. Five ABA-verified paediatric
burn centres in the Pediatric Injury Quality Improvement Collaborative, plus the
ABA position, side by side:

| Parameter                                    | ABA       | Centre 1  | Centre 2  | Centre 3  | Centre 4  | Centre 5                   |
| -------------------------------------------- | --------- | --------- | --------- | --------- | --------- | -------------------------- |
| TBSA threshold to start resuscitation        | 20%       | 15%       | 20%       | 15%       | 20%       | 10% (0–12 y) / 15% (13+ y) |
| Parkland coefficient (no / with inhalation)  | 3 or 4    | 3 or 4    | 2 or 3    | 4         | 3 or 6    | 4 or 6                     |
| **Maintenance IV fluid started below**       | **30 kg** | **20 kg** | **40 kg** | **30 kg** | **20 kg** | **age <1 year**            |
| Urine-output goal of 1 mL/kg/h applies below | 30 kg     | 30 kg     | 40 kg     | 30 kg     | 20 kg     | 30 kg                      |

**What this establishes.**

1. The 30 kg figure is **real and traceable to the ABA** (i.e. to ABLS course
   material), as tabulated by Pisano et al.
2. It is a threshold **below which maintenance is added**, not above which it is
   withdrawn — a framing difference that matters.
3. Actual practice ranges **20 kg to 40 kg**, plus one centre using **age <1
   year** instead of any weight.
4. One centre supplies **no additional maintenance IVF at all**.

**What it does not establish: any derivation.** Pisano et al. tabulated the ABA
position; they did not test it, and the ABA source is a course manual, not a
systematic review. The threshold is consensus. **Derivation of any maintenance
weight threshold (20, 30 or 40 kg): [SETTLED-ABSENT]** (relabelled 2026-08-03).
These are pragmatic brackets; **no derivation study exists** for any of the three
figures, and none is going to be found by searching again.

**The counter-position — no threshold at all.** AWMF S2k 006/128 (valid
15.08.2024–14.08.2029) takes a different structure entirely:

- Maintenance (_Grundbedarf_) is Holliday–Segar 100/50/20 mL/kg/day, and **no
  weight threshold for maintenance appears anywhere in the guideline** —
  maintenance applies to all children.
- From **15% TBSA**, an additional burn requirement of **3–4 mL/kg/%TBSA** is
  indicated _on top of_ basal requirement, flagged particularly for children who
  cannot drink adequately because of analgosedation.
- Below 15% TBSA without ventilation, maintenance-level fluid is generally
  needed only while the child cannot meet needs orally; above 10% TBSA urine
  output should be monitored regularly through the first 24 h.
- Enteral fluid counts against basal requirement; enteral nutrition should begin
  on day 1.
- The guideline states explicitly that the paediatric evidence base is
  insufficient and that its fluid statements rest on **expert consensus,
  evidence level IV**.

This is consistent with the German Burn Registry's method, which applied
Parkland + Holliday–Segar ("Parkland\*") to every child <16 y with ≥15% TBSA
with no weight cutoff.

**Handling here.** Do not display a single threshold as fact. This score adds
Holliday–Segar maintenance with **no weight threshold** — the AWMF structure —
and states the range with its sources: ABA/ABLS <30 kg; published paediatric
burn-centre practice 20–40 kg (Pisano 2021), one centre using age <1 y and one
adding none; AWMF 006/128 (2024) applying maintenance to all children. No
derivation exists for any of these values.

### R.2 The clock, and the fluid already given

**Confirmed in-window: the 8-hour window runs from time of injury, not
presentation, and pre-arrival fluid is subtracted.**

- **ABRUPT** designated the time of burn injury as time 0 and anchored all
  hourly data collection there. Mean time from burn to burn-centre admission was
  **2.9 ± 2.6 h**, and patients had already received **1553 ± 1782 mL** before
  arrival. The correction is not a rounding matter.
- **Children's Hospital of Michigan algorithm** (Stevens 2023, Fig. A.1) — the
  most fully specified paediatric algorithm in the accessed set: %TBSA by
  age-appropriate Lund–Browder and establish time of injury (TOI) → Parkland at
  4 mL/kg/%TBSA → **subtract any fluid received before admission** → half the LR
  over the first 8 h post-TOI, half over the next 16, with 25% albumin at
  2 g/kg/h from the 8-hour mark → hourly urine, target **0.8–1.2 mL/kg/h if
  ≤30 kg, 0.3–0.7 mL/kg/h if >30 kg** → ±15% rate step after 2 consecutive hours
  outside target, then albumin, then dopamine 3 mcg/kg/min. (A pre-2019 step
  escalating the coefficient to 6 mL/kg/%TBSA for inhalation injury was
  **withdrawn in 2019**.)

The rate arithmetic that follows from it:

```
rate₁ (mL/h) = (0.5 × total volume − fluid already given) ÷ (8 − hours since injury)
rate₂ (mL/h) = (0.5 × total volume) ÷ 16
```

- The denominator of rate₁ approaches zero or goes negative on delayed
  presentation. Any implementation must handle that explicitly rather than
  divide by zero or emit an absurd rate.
- "Fluid already given" must be a **required** input wherever a rate is emitted.
- **Maintenance is not titrated.** Titration acts on resuscitation fluid only;
  maintenance runs at the weight-based rate.

**Derivation of the 8 h / 16 h split itself: [SETTLED-ABSENT]** (relabelled
2026-08-03 — previously carried as `[NO SOURCE]`, i.e. as an unfinished search).
**No controlled derivation of the split exists.** It is absent from ABA CPG 2024,
which does not address it in any of its ten PICO questions, and absent from every
in-window source reviewed. Universal in practice, derived nowhere.

**One qualifier travels with this, and must not be dropped:** the 1968 primary
(Baxter & Shires) has **not been read directly**, so "absent from the original"
rests on the secondary literature that restates it rather than on the paper
itself. That is why the finding is stated as settled-absent _pending that one
primary_ — stronger than "we could not find it", weaker than "we read the
original and it is not there". Obtaining Baxter & Shires 1968 is the only thing
that would change the statement, and it would change it from qualified to
unqualified, not from open to closed.

**What this score implements, stated so the gap is not mistaken for
completeness.** It has no `time_since_burn_h` input, no fluid-already-given
input and emits no infusion rates. Its first-8-hour figure is exactly half the
24-hour volume — a **gross volume measured from the time of injury, not the
volume still to be given**. A child who received 500 mL in the ambulance needs
that subtracted by hand, and one arriving 3 hours after the burn has the
remainder to run over 5 hours, not 8.

### R.3 Urine-output targets — the disagreement, quantified

| Source                                     | Infant / small child        | Mid range                                       | Larger child                           |
| ------------------------------------------ | --------------------------- | ----------------------------------------------- | -------------------------------------- |
| Stevens 2023 protocol                      | —                           | ≤30 kg: **0.8–1.2**                             | >30 kg: **0.3–0.7**                    |
| Pisano 2021 (1 mL/kg/h goal applies below) | —                           | <20 kg (C4), <30 kg (ABA/C1/C3/C5), <40 kg (C2) | —                                      |
| AWMF S2k 006/128 (2024)                    | Infants & toddlers: **1–2** | —                                               | School-age: **0.5–1**                  |
| Romanowski & Palmieri 2017                 | —                           | <30 kg: **1**                                   | >30 kg: **0.5**                        |
| ABRUPT (adults, achieved)                  | —                           | —                                               | **0.87 ± 0.51** against a 0.5–1.0 goal |

Three separate disagreements are visible:

1. **The >30 kg target spans 0.3–1.0 mL/kg/h.** Stevens' 0.3–0.7 is markedly
   lower than every other source and lower than the adult 0.5–1.0. Displaying
   "0.5 mL/kg/h" for a 35 kg child is picking one end of a threefold range.
2. **The banding variable itself differs.** German guidance bands by
   **developmental stage** (infant/toddler vs school-age); North American
   guidance bands by **weight**. They are not interchangeable — a large
   5-year-old and a small 9-year-old fall differently.
3. **The weight at which the band switches ranges 20–40 kg.**

Additional endpoint notes:

- **Electrical injury:** AWMF directs volume escalation — with diuretics and/or
  urine alkalinisation if needed — until urine output is roughly **double** the
  usual burn target. Persistent dark urine under that regimen indicates
  extensive muscle necrosis or ongoing ischaemia.
- **Which weight to index to is unsettled.** In ABRUPT, actual body weight
  exceeded predicted in 84% of adults (90.0 ± 24.8 vs 69.5 ± 10.4 kg); urine
  output indexed to actual weight was 0.87 vs 1.1 mL/kg/h to predicted.
- **Urine output can mislead.** Oliguria in intra-abdominal hypertension
  reflects renal hypoperfusion, not hypovolaemia. AWMF pairs urine output with
  CVP, MAP and blood gas/lactate rather than treating it as a single trigger.
- **Titration asymmetry**, stated in the German registry discussion: in practice
  low urine output prompts rapid rate increases, but high urine output does not
  prompt correspondingly rapid reductions.
- Both the ABA CPG (in adults) and AWMF (in children, largely because
  pulse-contour/thermodilution device size is impractical) land on urine output
  as the practical endpoint rather than invasive or semi-invasive monitoring.

**Optimal hourly urine-output goal in children: [SETTLED-ABSENT]** (relabelled
2026-08-03). Every published target is **expert or review consensus only**, and
the optimum is stated as undefined by Romanowski & Palmieri 2017 and by AWMF
006/128, which grades all its fluid statements at evidence level IV. There is no
study to find; the disagreement quantified above is the state of the field, not a
hole in this review.

### R.4 Delivered volume — and both directions of failure

**North America is over-delivering.**

| Source                      | Population              | 24-h volume delivered                           |
| --------------------------- | ----------------------- | ----------------------------------------------- |
| Stevens 2023, single centre | 110 children, ≥15% TBSA | **6.6–7.6 mL/kg/%TBSA** by weight group         |
| Pisano 2021, 5 centres      | 52 children, ≥15% TBSA  | **6.35 mL/kg/%TBSA** overall                    |
| Pisano 2021, by centre      |                         | 5.10, 5.13, 6.15, 6.53, **9.09** (ANOVA p=0.02) |
| ABRUPT 2023, adults         | 379 adults, ≥20% TBSA   | 4.6 ± 2.2                                       |

Pisano's per-centre gap between received and estimated volume was −0.15 ± 1.33,
+0.37 ± 1.19, +2.53 ± 2.53, +3.57 ± 3.32 and **+5.19 ± 4.30** mL/kg/%TBSA
(ANOVA p=0.0002); three of five centres' own guidelines produced estimates
significantly below what was actually delivered.

**The single most useful line for a limitations panel** is Pisano's worked
example: a **5-year-old, 25 kg, 20% TBSA** burn would have an estimated 24-hour
requirement ranging from **1500 mL to 3560 mL (3.0–7.1 mL/kg/%TBSA)** depending
only on which of those five centres they arrived at. **This score's own
pediatric-Parkland output for that child is 3 × 25 × 20 = 1500 mL — the bottom
of that span**, and its combined figure with Holliday–Segar maintenance
(1500 + 1600) is 3100 mL, still inside it.

**Europe is under-delivering — the counter-signal, and it must be carried.** In
the German Burn Registry (407 children, 30 centres, Germany/Switzerland/Austria,
≥15% TBSA), **86.5% received less than Parkland\*** (Parkland at 4 mL/kg/%TBSA
plus Holliday–Segar maintenance). Mixed-effect negative binomial regression on
length of stay:

| Deviation                    | Rate ratio | 95% CI                    |
| ---------------------------- | ---------- | ------------------------- |
| Giving twice Parkland\*      | 1.42       | **0.83–2.33** (crosses 1) |
| Giving half Parkland\*       | 0.89       | 0.81–0.97                 |
| _Multiple imputation:_ twice | 1.20       | **0.24–5.98**             |
| _Multiple imputation:_ half  | 0.89       | **0.68–1.16**             |

Only the restriction arm reaches significance, only in the unimputed model, at
an 11% reduction. The authors note the over-resuscitation effect is probably
overestimated and can only be estimated imprecisely — **do not build a warning
threshold on this finding**. Three caveats before citing it against the North
American data:

- The cohort is **scald-predominant toddlers**: median age 1 (IQR 1–6), median
  TBSA 20 (IQR 16–25), 74.2% scalds. Not a severe-flame-burn PICU population.
- **The denominators differ.** Parkland\* includes maintenance, so the German
  comparator is a higher bar and "below Parkland\*" is easier to reach than
  "above Parkland".
- **Six of the seven children who died were under-resuscitated** relative to
  Parkland\*, which cuts against the paper's own headline.

**No guideline-endorsed volume ceiling exists.** ABA CPG 2024 recommends
selective monitoring of intra-abdominal and intra-ocular pressure — a monitoring
trigger, not a cap. The Ivy index (250 mL/kg/24 h) and the 6 mL/kg/%TBSA trigger
both originate outside the window and are not endorsed as thresholds by any
current guideline, though both remain in use as outcome measures. The one hard
in-window numeric bound is **AWMF 006/128 Empfehlung 10** (100% consensus,
12/12): in children with ≥10% TBSA, volume replacement should use isotonic
crystalloid and **10 mL/kg body weight per hour should not initially be
exceeded** — a prehospital/early-phase cap.

### R.5 BSA versus weight, and the obesity signal (Stevens 2023)

110 children ≥15% TBSA at one ABA-verified paediatric centre over 12 years, all
resuscitated by Parkland, with Galveston and Cincinnati predictions computed
retrospectively:

- **Galveston significantly underpredicted** the fluid actually given at 24 h
  (p=0.042), across all weight groups.
- **Parkland and Cincinnati predictions did not differ significantly** from
  fluid given at 24 h.
- At 8 h none of the three differed significantly (p=0.098, 0.078, 0.109).

**The caveat that matters:** this compares prediction against what was
_delivered_, not against outcome — and R.4 suggests what was delivered was not
right. Stratified by CDC percentile (11 underweight, 60 normal, 18 overweight,
21 obese), total fluid was 7.4 / 7.6 / 6.6 / 6.6 mL/kg/%TBSA (p=0.554) and urine
output 1.8 / 1.5 / 1.5 / 1.3 mL/kg/h (p=0.674); **overweight children received
more total fluid than obese children** (p=0.023) while Parkland _predicted_ more
for the obese, and ventilator days differed by group (1.7 / 2.5 / 12.4 / 5.0,
p=0.030). A prior suggestion that BSA-based formulas suit patients ≤20 kg is a
second weight threshold, distinct from the 30 kg one and equally unvalidated.

**Head-to-head outcome comparison of Cincinnati vs Galveston vs Parkland in
children: [SETTLED-ABSENT]** (relabelled 2026-08-03). Stevens compares
predictions against delivered volume, not outcomes. **No trial exists** — this is
an absence in the literature, not an unfinished search.

### R.6 The inhalation-injury modifier, and why none is shipped

| Source                           | No inhalation injury | With inhalation injury              |
| -------------------------------- | -------------------- | ----------------------------------- |
| Stevens 2023 (Michigan protocol) | 4 mL/kg/%TBSA        | **6** (pre-2019 only; discontinued) |
| Pisano 2021, Centre 4            | 3                    | **6**                               |
| Pisano 2021, Centre 5            | 4                    | **6**                               |
| Pisano 2021, Centre 2            | 2                    | **3**                               |
| Pisano 2021, ABA column          | 3                    | **4**                               |

The Michigan centre abandoned its 6 mL/kg adjustment in 2019. Any tool offering
an inhalation modifier should carry a date and a source with it, because at
least one centre withdrew theirs. This score offers none.

### R.7 Never trust the formula name

"Modified/revised Brooke" resolves to three different coefficients across three
peer-reviewed in-window sources: **2** (ABA CPG 2024, PICO Q3), **"2–3"**
(ABRUPT 2023 discussion), **3** (Romanowski & Palmieri 2017, Table 1). Milner
2024 splits the label, giving modified Brooke 2 and _paediatric_ Brooke 3.
Implementation consequence: **display the coefficient explicitly; never let the
formula name carry it.** This score prints "3 mL/kg/%TBSA" in every output
label, which is the mitigation.

### R.8 The eight live controversies — present as controversies

| #   | Question                          | Position A                                                   | Position B                                                                                   |
| --- | --------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Adult starting coefficient        | **2 mL/kg/%TBSA** — ABA CPG 2024, on 2 studies / 88 patients | **4 mL/kg/%TBSA is accurate; 2 may not be feasible** — ABRUPT 2023, 379 patients, 21 centres |
| 2   | "Modified Brooke" coefficient     | 2 (ABA CPG 2024)                                             | 3 (Romanowski 2017); "2–3" (ABRUPT)                                                          |
| 3   | Maintenance threshold in children | <30 kg (ABA, per Pisano Table 2); 20–40 kg across centres    | No threshold; maintenance for all (AWMF 006/128, 2024)                                       |
| 4   | Urine-output banding variable     | Weight (North American)                                      | Developmental stage (German)                                                                 |
| 5   | >30 kg urine-output target        | 0.3–0.7 (Stevens protocol)                                   | 0.5–1.0 (most other sources)                                                                 |
| 6   | Direction of paediatric error     | Over-resuscitation, 6.35–7.6 mL/kg/%TBSA (US)                | Under-resuscitation, 86.5% below Parkland\* (DACH)                                           |
| 7   | BSA vs weight basis               | Galveston underpredicts real practice (Stevens 2023)         | BSA better suited ≤20 kg (cited in Stevens discussion)                                       |
| 8   | Inhalation-injury coefficient     | 6 mL/kg/%TBSA (2 centres)                                    | 3–4 (ABA); one centre withdrew its 6 in 2019                                                 |

**Controversy 1 is the important one**, and it is not a fringe dispute. ABA CPG
2024 recommends starting at **2 mL/kg/%TBSA**; its PICO Q3 asked specifically
whether starting at 2 versus 4 reduces total volume, affects AKI or reduces
oedema-related complications, and the recommendation rests on **exactly two
studies, 88 adults**:

| Study       | Design       | n   | Result                                                                                                                                         |
| ----------- | ------------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Chung 2009  | Case-control | 52  | Modified Brooke 3.8 ± 1.2 vs Parkland 5.9 ± 1.1 mL/kg/%TBSA (p<0.001). No difference in PaO₂:FiO₂, ventilator-free days, ACS, AKI or mortality |
| Saitoh 2021 | RCT          | 36  | Modified Brooke 3.6 ± 1.1 vs Baxter 4.59 ± 1.58 (p=0.05). No difference in AKI at 48 h, ACS or survival                                        |

Neither showed an outcome difference; the CPG excluded mortality as a formal
PICO outcome because available studies were too small and heterogeneous.
**ABRUPT 2023 concludes the opposite** — in 379 adults across 21 US and Canadian
burn centres documented hourly for 48 h, delivered 24-hour volume was
**4.6 ± 2.2 mL/kg/%TBSA** (crystalloid-only subgroup 3.7 ± 1.7, albumin subgroup
5.2 ± 2.3; 48-h total 7.4 ± 3.7), and the authors state that for burns >20% TBSA
the Parkland target of 4 is accurate and that attaining a 2 mL/kg/%TBSA goal may
not be feasible.

**Why the CPG did not resolve it.** ABRUPT _was_ in the CPG evidence table, but
only against the albumin questions (Q1, Q2). It could not address Q3 because it
had no 2-versus-4 comparator arm — every patient started from centre-specific
protocols. That exclusion is methodologically defensible, and the substantive
tension is not thereby resolved: the guideline recommends a starting rate that
the largest contemporaneous prospective dataset suggests clinicians do not in
practice achieve. Present it as a live controversy with both citations, **not**
as a superseded-and-current pair. Both figures are adult; neither licenses a
paediatric starting coefficient.

### R.9 [SETTLED-ABSENT] after this review

Relabelled 2026-08-03. These five were previously listed as "still [NO SOURCE]",
which reads as a search that could still succeed. It cannot: each was established
**not to exist**, and that is a stronger and more useful statement than "not
found". **Do not re-search them.** What they mean for the calculator is unchanged
— each is a place where a printed number is convention rather than evidence.

- **Derivation of the 8 h / 16 h split.** In use universally, derived nowhere. No
  controlled derivation exists. _Qualifier:_ Baxter & Shires 1968 was not read
  directly, so this is settled-absent **pending that one primary** (see R.2).
- **Derivation of any maintenance weight threshold** (20, 30 or 40 kg).
  Pragmatic brackets, documented in practice, never tested.
- **Optimal hourly urine-output goal in children.** Expert and review consensus
  only; stated as undefined by the two sources that address it directly.
- **Any paediatric equivalent of the ABA CPG.** **None exists.** The 2024 CPG
  (Cartotto, _J Burn Care Res_ 2024;45(3):565–589) scopes itself explicitly to
  adults with ≥20% TBSA and frames every PICO question "among adults". This is
  now stated as a positive finding rather than as a marker awaiting a search, and
  it is what leaves the paediatric starting coefficient resting on convention.
- **Head-to-head outcome comparison of Cincinnati vs Galveston vs Parkland in
  children.** No trial exists.

### R.10 Residual gaps this review could not close

- **ABLS Provider Manual** — see R.0.1. The apparent origin of the 30 kg figure,
  and not accessed.
- **German Burn Registry, self-declared:** no data on urine output or arterial
  pressure monitoring, the specific formula used at each contributing centre was
  unknown, and no data on oral feeding or on the method of calculating daily
  fluid requirement were collected. The last two have since been added to the
  registry protocol, so that gap closes in a future registry year, not in
  anything currently published.
- **Pisano sample size:** 52 patients across 5 centres, 10–12 each. The protocol
  comparison (Table 2) is robust because protocols are documents; the outcome
  analysis is not powered for anything.

---

## References (full, PMID/DOI/URL)

1. **StatPearls — Burn Fluid Resuscitation** (Parkland, modified Brooke [adult 2
   / peds 3 mL], Galveston 5000+2000 mL/m², Cincinnati 4 mL/kg/%TBSA + 1500
   mL/m², LR, urine-output targets, Lund–Browder). Mehta M, Tudor GJ. _Burn
   Fluid Resuscitation._ StatPearls Publishing; updated 2023.
   URL: https://www.ncbi.nlm.nih.gov/books/NBK534227/ (Bookshelf ID NBK534227).

2. **StatPearls — Parkland Formula** (4 mL adult / 3 mL peds; half in first 8 h;
   pediatric maintenance addition; Lund–Browder; urine 1.0–1.5 mL/kg/h in
   children). Baartmans MG, et al. / StatPearls Publishing.
   URL: https://www.ncbi.nlm.nih.gov/books/NBK537190/ (Bookshelf ID NBK537190).

3. **Romanowski KS, Palmieri TL.** Pediatric burn resuscitation: past, present,
   and future. _Burns Trauma._ 2017;5:26. (Galveston and Cincinnati exact
   compositions incl. albumin/bicarbonate/dextrose; dextrose for infants.)
   PMID: **28879205**. DOI: **10.1186/s41038-017-0091-y**.

4. **Holliday MA, Segar WE.** The maintenance need for water in parenteral fluid
   therapy. _Pediatrics._ 1957;19(5):823–832. (100/50/20 mL/kg/day maintenance.)
   PMID: **13431307**.

5. **Mosteller RD.** Simplified calculation of body-surface area. _N Engl J Med._
   1987;317(17):1098. (BSA = √(ht·wt/3600).) PMID: **3657876**.
   DOI: **10.1056/NEJM198710223171717**.

6. **Cartotto R, Johnson LS, Savetamal A, et al.** American Burn Association
   Clinical Practice Guidelines on Burn Shock Resuscitation. _J Burn Care Res._
   2024;45(3):565–589. (Adult starting rate 2 mL/kg/%TBSA modified Brooke; UOP
   0.5 mL/kg/h; albumin; scope adults ≥20% TBSA.) PMID: **38051821**.
   DOI: **10.1093/jbcr/irad125**.

7. **Institutional pediatric protocol assessment** (modified Parkland 3
   mL/%TBSA/kg/day; resuscitation triggers TBSA ≥15% if <10 kg, ≥20% if ≥10 kg;
   mean UOP 1.74 mL/kg/h). _J Burn Care Res_ 2025 abstract, PMC11958416.
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC11958416/.

8. **Lund CC, Browder NC.** The estimation of areas of burns. _Surg Gynecol
   Obstet._ 1944;79:352–358. (Chart of record. **Not obtained** — see the
   attribution note in the Lund–Browder table section.)

9. **US Department of Defense, Joint Trauma System.** _Burn Care_ Clinical
   Practice Guideline (CPG ID 12), with the Adult / Pediatric / Infant Lund
   Browder Burn Estimate & Diagram worksheets (June 2025, June 2025, July 2025).
   Source of the exact per-segment percentages shipped. Those three dates are
   the **worksheet** dates carried on the forms; the guideline's own date, **10
   June 2025**, is from the JTS CPG index page, read at jts.health.mil on
   2026-08-03 — see the attribution list in the Lund–Browder table section.
   URL: https://jts.health.mil/index.cfm/CPGs/cpgs.

10. **Lundin K, Alsbjørn B.** The 101 percent in Lund-Browder charts — a
    commentary. _Burns._ 2013;39(4):819–820. (One aspect of each hand is 1.25%,
    not 1.5% — the documented cause of the 101% charts.) PMID: **22980775**.
    DOI: **10.1016/j.burns.2012.08.016**.

11. **Murari A, Singh KN.** Lund and Browder chart — modified versus original: a
    comparative study. _Acute Crit Care._ 2019;34(4):276–281. (Open access;
    restates the 101% defect and the chart's clinimetric limitations.)
    DOI: **10.4266/acc.2019.00647**.

12. **Miminas DA.** A critical evaluation of the Lund and Browder chart. _Wounds
    UK._ 2007;3(3):58–68. (Half-body A/B/C inset values, including thigh-B at
    age 10 as 4¼; expert-panel and applicability limitations.)

13. **Rumpf RW, Stewart WC, Martinez SK, et al.** Comparison of the Lund and
    Browder table to computed tomography scan three-dimensional surface area
    measurement for a pediatric cohort. _J Surg Res._ 2018;221:275–284.
    DOI: **10.1016/j.jss.2017.08.019**.

14. **Greenhalgh DG, Cartotto R, Taylor SL, et al.** Burn resuscitation
    practices in North America: results of the Acute Burn ResUscitation
    Multicenter Prospective Trial (ABRUPT). _Ann Surg._ 2023;277(3):512–519.
    (379 adults ≥20% TBSA, 21 centres; delivered 4.6 ± 2.2 mL/kg/%TBSA at 24 h;
    time 0 = time of injury; pre-arrival volume 1553 ± 1782 mL; 4 accurate and 2
    possibly not feasible.) DOI: **10.1097/SLA.0000000000005166**.

15. **Pisano C, Fabia R, Shi J, et al.** Variation in acute fluid resuscitation
    among pediatric burn centers. _Burns._ 2021;47(3):545–550. (Table 2: five
    PIQIC centres plus the ABA column; maintenance initiated <30 kg per ABA,
    20–40 kg across centres, one centre by age <1 y; the 25 kg / 20% TBSA
    1500–3560 mL worked example.) DOI: **10.1016/j.burns.2020.04.013**.

16. **Vasileiadis V, Najem S, Reinshagen K, et al.** Fluid management and
    outcomes in children with burns — German Burn Registry 2015–2022. _Eur J
    Pediatr._ 2024;183:5479–5488. (407 children <16 y ≥15% TBSA, 30 centres;
    86.5% below Parkland\*; six of seven deaths under-resuscitated.)
    DOI: **10.1007/s00431-024-05797-9**.

17. **Stevens JV, Prieto NS, Ridelman E, et al.** Weight-based versus body
    surface area-based fluid resuscitation predictions in pediatric burn
    patients. _Burns._ 2023;49(1):120–128. (110 children; Galveston
    underpredicts delivered volume; CDC-percentile strata; Fig. A.1 Children's
    Hospital of Michigan algorithm with pre-arrival subtraction, TOI clock and
    the 0.8–1.2 / 0.3–0.7 mL/kg/h urine targets.)
    DOI: **10.1016/j.burns.2022.03.007**.

18. **DGKCH, DGV, DGKJ et al.** Behandlung thermischer Verletzungen im
    Kindesalter (Verbrennung, Verbrühung). AWMF S2k-Leitlinie 006/128, Version
    3.0, 15.08.2024, valid to 14.08.2029. (Holliday–Segar maintenance for all
    children with **no** weight threshold; 3–4 mL/kg/%TBSA burn requirement from
    15% TBSA; urine 1–2 mL/kg/h infants and toddlers, 0.5–1 school-age;
    Empfehlung 10 — do not initially exceed 10 mL/kg/h; all fluid statements
    expert consensus, evidence level IV.) AWMF register 006/128;
    URL: https://register.awmf.org/de/leitlinien/detail/006-128.

Primary-source note: the **Galveston** formula originates with Carvajal HF
(pediatric surface-area resuscitation, 1980s Shriners–Galveston) and the
**Cincinnati** (Shriners–Cincinnati) formula with the Cincinnati Shriners group;
both are cited via Romanowski & Palmieri 2017 (refs 26–27 therein) rather than
fetched in the original — flagged in Limitations.

---

## Limitations & notes

- **Every formula is a starting estimate, titrated to urine output** (and
  hemodynamics). Delivered volume routinely differs from the formula: in
  PMC11958416 the modified-Parkland target was 3 mL/%TBSA/kg but mean delivered
  was 2.99 mL/%TBSA/kg — i.e., titration, not rigid delivery. Do not present the
  computed volume as a fixed prescription.
- **Pediatric-vs-adult divergence is the whole point of this note:** children get
  a lower crystalloid coefficient **but** an added maintenance fluid and
  dextrose, and SA-based formulas (Galveston/Cincinnati) that fold maintenance
  in. A tool that applies an adult Parkland (4 mL, no maintenance, no dextrose)
  to a child is clinically wrong on three axes.
- **Coefficient variability:** "pediatric Parkland" is quoted as **3 mL** in
  StatPearls/PMC11958416 but some references retain 4 mL for children and instead
  rely on maintenance to cover baseline needs. The modified-Brooke pediatric rate
  is 3 mL. Because centers differ, the formula and its coefficient should be an
  explicit, user-selected input, not hard-coded.
- **Fluid clock runs from the time of burn, not arrival.** Late presentation
  compresses the remaining first-8h volume into fewer hours — the rate, not the
  volume, changes. Build this in.
- **Urine-output targets disagree across sources** (adult 0.5 vs 0.5–1.0; child
  1.0–1.5 vs the <30 kg = 1 / ≥30 kg = 0.5 split; infants up to ~2). Carry the
  range with citations; do not silently pick one.
- **Over-resuscitation ("fluid creep")** is a documented harm; the 2024 ABA CPG
  responded by lowering the adult starting coefficient to 2 mL/kg/%TBSA and
  encouraging albumin to cap volumes. The CPG is **adults-only** — it does **not**
  license a 2 mL pediatric starting rate. [Pediatric-specific high-grade CPG for
  the starting coefficient: **[SETTLED-ABSENT]** (relabelled 2026-08-03) — there
  is no graded RCT-backed pediatric CPG because **there is no paediatric
  equivalent of the ABA CPG at all**; the 2024 CPG scopes itself to adults with
  ≥20% TBSA and frames every PICO question that way, and a 2016–2026 search found
  no counterpart. Current pediatric practice rests on 3–4 mL formulas plus
  maintenance, and will until somebody writes one. See R.9.]
- **Over-resuscitation is not the only failure direction**, and presenting it as
  such would be a one-sided reading of the evidence. R.4: 86.5% of children in
  the German registry received **less** than Parkland\*, and six of the seven
  who died were **under**-resuscitated. The ABA's own 2 mL starting figure is
  itself contested by ABRUPT within a year (R.8, controversy 1).
- **The 30 kg maintenance threshold is real but not universal** (R.1): ABA/ABLS
  <30 kg, published centre practice 20–40 kg, one centre by age <1 y, one adding
  none, and AWMF 006/128 applying maintenance to all children with no threshold.
  Display the range, never a single threshold as fact. This score adds
  maintenance with no threshold, matching the AWMF structure.
- **Pre-arrival fluid is not subtracted and no rate is emitted** (R.2). The
  clock runs from injury and pre-arrival volume should be deducted — ABRUPT
  measured a mean 1553 ± 1782 mL already given before arrival in adults — but
  this score takes neither an elapsed-time nor a fluid-given input, so its
  first-8-hour figure is a gross volume, not a remaining one. State the gap
  rather than implying completeness.

### Lund–Browder — sourcing gap closed 2026-08-03, with one caveat that stays open

The full 19-segment × 6-band table is now sourced and shipped (see the table
section above). Two things did not close, and neither should be quietly dropped.

- **The 1944 original was still not read.** The attribution is "after Lund &
  Browder (1944), as reproduced in the JTS worksheets", and it must stay that
  way until the paper is obtained through a library. Whether the 19-row tabular
  layout is a 1944 artefact or a later worksheet reformatting is unconfirmed.
- **The chart's own validity is a real limitation, not a formality.** Its
  anthropometric substrate dates from Funke (1858), Du Bois (1915), Berkow
  (1924) and Boyd (1935) — Lund and Browder assembled it, they did not measure
  it — and it has never been revalidated against modern population data. It was
  never developed or validated by an expert panel using stringent scientific
  principles or defined protocols; concurrent validity against computerised
  planimetry appears high, but other clinimetric properties are largely
  unstudied. Lund and Browder claimed applicability to 95.5% of the population.
  The chart ignores obesity, breast size, pregnancy and amputation. Erythema
  (first-degree) is excluded from %TBSA. Inter-rater variability is substantial
  and grows with burn size, overestimation being the commoner direction of error
  outside burn centres.

The earlier note in this file also carried **wrong numbers** — it summarized the
head fraction as "≈19 → ~14 → ~11 → ~9 → ~7%", where the chart is
19/17/13/11/9/7. That is exactly the failure mode a tertiary summary produces
and is why the table is now gated rather than described.

- **Galveston/Cincinnati originals (Carvajal; Shriners–Cincinnati)** are cited
  secondhand via Romanowski & Palmieri 2017; the numeric coefficients
  (5000/2000/1500 mL/m², albumin 12.5 g/L, NaHCO₃ 50 mEq/L) are corroborated
  across Romanowski and StatPearls, but the **original derivation papers were not
  directly fetched** — flagged for a verification pass.
- **BSA method matters** for Galveston/Cincinnati: Mosteller vs Du Bois give
  slightly different BSA and thus different volumes; state which is used. Small
  infants are where BSA-based and weight-based formulas diverge most.
- **Not a standalone diagnosis of burn severity** — TBSA%, depth, inhalation
  injury, and comorbidity drive disposition; the resuscitation volume is one
  downstream calculation.
- Composition details (dextrose, albumin, bicarbonate) are **regimen-specific and
  institution-specific**; the core deliverable of a calculator is the crystalloid
  volume/rate + a maintenance volume, with additive composition surfaced as
  guidance, not auto-prescribed.

---

## IP status

- **Not copyrightable.** Parkland, modified Brooke, Galveston, Cincinnati, and
  Holliday–Segar are arithmetic formulas built from coefficients and thresholds
  (4/3/2 mL/kg/%TBSA; 5000/2000/1500 mL/m²; 100/50/20 mL/kg/day; the 8h/16h
  split; Mosteller's √(ht·wt/3600)). Numbers, formulas, and clinical thresholds
  are facts, not protected expression.
- **No verbatim copyrightable scale wording** is embedded — unlike ordinal
  symptom scales (e.g., GCS descriptors), these formulas have no proprietary
  response-descriptor text to reproduce.
- The **Lund–Browder chart diagram/artwork** and the **prose/table layout** of
  StatPearls, the ABA CPG, and the Romanowski review are copyrighted _expression_
  (figures, wording). Reproduce only the **numeric percentages/coefficients** and
  paraphrase — do not copy the chart image or guideline paragraphs verbatim. This
  note copies no figure and no verbatim guideline paragraph.
- The shipped Lund–Browder table is **numbers only**. No body diagram and no JTS
  worksheet layout is reproduced, and every segment label is this project's own
  anatomical wording ("Lower leg, right (knee to ankle)"), not transcribed from
  any published form.
- The names "Shriners", "Galveston", "Cincinnati", "Parkland", "Brooke" are place/
  institution names attached to the formulas by convention; using them to label a
  formula is nominative/descriptive, not an IP concern for the math.
