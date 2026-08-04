# Source requests — 2026-08-03

Seven prompts for a research-capable chat with journal access. Each closes a
specific `[NEEDS SOURCE]` marker or an unverifiable constant currently shipping
on the site.

**Paste one prompt per conversation.** They are deliberately self-contained —
the answering model has no access to this repository, so nothing is assumed.

Two rules are repeated inside every prompt, on purpose:

1. **Numbers, not prose.** `docs/decisions/ADR-tier-b-ip.md` forbids reproducing
   published scale-item wording verbatim; every option label on this site is our
   own paraphrase. Thresholds, coefficients and cut-points are facts and are
   fine. Descriptor sentences are expression and are not.
2. **An explicit way to say "I could not get this."** A confidently recalled
   coefficient that turns out to be wrong is far more dangerous than an admitted
   gap, because it will look sourced. Every prompt ends with a required
   accessibility declaration.

When answers come back, paste them in whole — including the "could not access"
parts. Do not filter them first.

---

## 1. PRISM III mortality coefficients — HIGHEST VALUE

> I need the exact logistic-regression coefficients from the PRISM III paper:
> Pollack MM, Patel KM, Ruttimann UE, "PRISM III: an updated Pediatric Risk of
> Mortality score", Critical Care Medicine 1996;24(5):743–752. Please confirm the
> citation is right before answering.
>
> The paper reports two models, PRISM III-12 (12-hour) and PRISM III-24
> (24-hour). For **each** model give me:
>
> 1. The intercept.
> 2. The coefficient on the PRISM III physiologic score.
> 3. Every other term in the equation — admission source, age category, prior
>    ICU admission, cancer, post-operative status, CPR before admission, or any
>    other covariate — with its exact coefficient and how it is coded (reference
>    category, dummy coding, whether age enters as a category or continuously).
> 4. The exact algebraic form. Is it `logit(p) = intercept + b1*score + ...`, and
>    is the score entered linearly or transformed?
>
> Then give me two or three fully worked examples from the paper or its
> supplement if any exist: a set of inputs, the resulting score, and the
> predicted mortality, so I can check an implementation reproduces them.
>
> Separately, and importantly: report the **observed calibration**. For the
> derivation cohort, at roughly what PRISM III score does predicted mortality
> reach 50%? Any published calibration table, decile plot, or
> observed-vs-expected figure would be ideal.
>
> Context for why I am asking: an implementation I am reviewing crosses 50%
> mortality at a score of 19 and reaches 96% by 35. I suspect that is far too
> steep. Please tell me plainly whether that is consistent with the published
> model or not.
>
> Constraints on your answer:
>
> - Give **numeric coefficients and thresholds only**. Do not reproduce
>   descriptive prose, scale-item wording, or table text verbatim — I need the
>   numbers, not the expression.
> - Cite the exact table or page number for every number.
> - State clearly, at the end, whether you actually retrieved the full text, or
>   whether any part is from recollection or a secondary source. If you could not
>   access it, say so explicitly rather than reconstructing. An admitted gap is
>   more useful to me than a confident guess — these numbers drive a mortality
>   estimate shown to clinicians.

---

## 2. PIM3 — ANZPIC diagnostic groupings — HIGHEST VALUE

> I need the diagnosis lists used by PIM3 (Paediatric Index of Mortality 3):
> Straney L, Clements A, Parslow RC, et al., "Paediatric index of mortality 3",
> Pediatric Critical Care Medicine 2013;14(7):673–681. Confirm the citation.
>
> PIM3 assigns different coefficients to three diagnostic groups — commonly
> described as very-high-risk, high-risk and low-risk. I need **the complete
> membership of each group**, exactly as the model defines it:
>
> 1. Every condition in the very-high-risk list, with its coefficient.
> 2. Every condition in the high-risk list, with its coefficient.
> 3. Every condition in the low-risk list, with its coefficient.
> 4. The rule when a patient matches more than one group — highest risk wins,
>    additive, or something else?
> 5. Whether these map onto ANZPIC (Australian and New Zealand Paediatric
>    Intensive Care) registry diagnostic codes, and if so, the actual code
>    identifiers rather than descriptions alone.
>
> Also give me the rest of the model so I can verify an implementation end to
> end: the intercept, and the coefficients on every other term — base excess,
> SBP, FiO2/PaO2, mechanical ventilation, pupillary reaction, elective
> admission, recovery after a procedure, bypass — with the units each is
> expressed in and any transformation applied (squared terms, absolute values).
>
> Then: two or three worked examples with inputs and the resulting predicted
> mortality.
>
> Constraints:
>
> - **Numbers and condition names only.** Do not reproduce the paper's
>   descriptive prose verbatim; a bare list of condition names plus coefficients
>   is exactly right.
> - Cite table and page for each block.
> - State at the end whether you actually accessed the full text and its
>   supplementary material. The diagnostic groupings are the most error-prone
>   input in this score, so if the lists are incomplete in what you can see, say
>   which parts are missing rather than filling them in.

---

## 3. Lund–Browder chart — per-segment percentages

> I need the Lund–Browder burn surface-area chart as a complete numeric table.
> Original source is believed to be Lund CC, Browder NC, "The estimation of
> areas of burns", Surgery Gynecology & Obstetrics 1944;79:352–358 — please
> confirm, and note that most modern reproductions come via burn-care textbooks
> or the American Burn Association.
>
> Give me a table with one row per body segment (head, neck, anterior trunk,
> posterior trunk, each buttock, each upper arm, each forearm, each hand,
> genitalia, each thigh, each leg, each foot) and one column per standard age
> band (0, 1, 5, 10, 15 years, adult), with the **percentage of total body
> surface area** in each cell.
>
> Please also answer:
>
> 1. Which segments change with age and which are fixed?
> 2. Are the published values per-side or combined for paired parts?
> 3. Do the columns sum to 100 in the original? If the commonly reproduced
>    version does not sum correctly, say so — I want to know about any rounding
>    discrepancy before I implement it.
> 4. Is there a single authoritative modern reproduction I should cite instead of
>    the 1944 original?
>
> Constraints:
>
> - **The numeric table only.** No accompanying instructional prose.
> - Cite the source for the exact table you give me, and tell me whether it is
>   the 1944 original or a later reproduction — if reproductions differ, say how.
> - State at the end whether you retrieved this or are recalling it. If figures
>   vary between sources, give me the variants rather than picking one silently.

---

## 4. KDIGO AKI — urine-output staging and its duration windows

> I need the exact urine-output criteria from the KDIGO Clinical Practice
> Guideline for Acute Kidney Injury (Kidney International Supplements
> 2012;2(1):1–138), which is open access. Confirm the citation.
>
> Give me the staging table verbatim in **numeric form**: for each of Stages 1,
> 2 and 3, the urine-output rate threshold and the duration it must be sustained
> for. Include the anuria criterion. Do the same for the serum-creatinine axis.
>
> Then answer these directly:
>
> 1. If a patient's urine output is below 0.5 mL/kg/h for 14 hours, what stage is
>    that, on the urine-output axis alone?
> 2. If it is below 0.3 mL/kg/h for only 8 hours — not yet meeting the longer
>    window — what stage is that?
> 3. When the creatinine axis and the urine-output axis give different stages,
>    which governs?
> 4. Is there a paediatric-specific modification, in particular an eGFR-based
>    criterion (something like eGFR below 35 mL/min/1.73m² forcing Stage 3)? If
>    so, quote its exact wording and, crucially, the **age range it applies to**.
> 5. Does the guideline say anything about how to stage when duration is unknown
>    or not recorded? Is there any guidance on defaulting conservatively?
>
> Question 5 matters most to me. I am reviewing a calculator that takes a rate
> but no duration, and I need to know whether the guideline itself offers a
> defensible way to handle that, or whether asking for duration is unavoidable.
>
> Constraints:
>
> - Thresholds and durations as numbers.
> - Cite section and table numbers.
> - State at the end whether you retrieved the guideline text.

---

## 5. Burn resuscitation — formula coefficients in children

> I need the published coefficients for burn fluid resuscitation formulas, and
> specifically how they differ for paediatric patients. Please give primary
> sources with citations.
>
> For each of these, give the exact formula, the coefficient, the fluid type, and
> the time-split (typically half in the first 8 hours from the time of injury):
>
> 1. **Parkland / Baxter** — the adult coefficient, and whether any published
>    paediatric variant uses a different one.
> 2. **Modified Brooke** — same.
> 3. Any formula specifically derived for children, such as
>    Galveston/Shriners, including whether it uses body surface area rather than
>    weight.
>
> Then, the questions I actually need settled:
>
> 4. **Maintenance fluid on top.** Which published protocols add maintenance
>    fluid to the resuscitation volume in children, and is there a stated **weight
>    or age threshold above which maintenance is no longer added**? I have seen
>    30 kg cited but cannot find a primary source. If no such threshold exists in
>    the literature, tell me that plainly — that is a useful answer.
> 5. **Infusion rate.** Do the source protocols express the order as a rate in
>    mL/h, and if so, how is the first-8-hour rate calculated, including whether
>    it runs from the time of injury rather than the time of presentation?
> 6. **Endpoints.** What urine-output targets do these protocols use in children,
>    and do they differ by weight?
> 7. Is there published guidance on an upper bound, given the "fluid creep"
>    literature on over-resuscitation?
>
> Constraints:
>
> - Coefficients, thresholds and rates as numbers, each with its citation.
> - Where sources genuinely disagree, show the disagreement rather than
>   reconciling it — I would rather present a real controversy than a false
>   consensus.
> - State at the end which full texts you actually accessed.

---

## 6. Holliday–Segar — ceilings and lower bounds

> I need the original Holliday–Segar maintenance fluid method: Holliday MA,
> Segar WE, "The maintenance need for water in parenteral fluid therapy",
> Pediatrics 1957;19(5):823–832. Confirm the citation.
>
> 1. State the method numerically — the mL/kg/day rates for each weight band.
> 2. **Does the original paper state an upper limit** on total daily maintenance
>    volume? A cap around 2400 mL/day is widely quoted; I need to know whether
>    that is in the original, was added later, or is folklore. If later, by whom
>    and where?
> 3. **What is the lower weight bound?** The method is usually said not to apply
>    to neonates in the first week or two of life. Does the original say so, and
>    what is the actual boundary?
> 4. Above what weight, if any, does the method stop being recommended in
>    children — and what replaces it?
> 5. Is there current guidance (NICE, AAP, or equivalent) that modifies the 1957
>    method — particularly the shift to isotonic maintenance fluid after the
>    hyponatraemia literature? Give the citation and what changed.
>
> Constraints:
>
> - Numbers with citations; say clearly which come from the 1957 original and
>   which from later guidance.
> - If the 2400 mL/day cap has no primary source, say so explicitly. "Widely
>   used but not in the original" is a perfectly good answer and is what I most
>   need to know.
> - State at the end what you actually accessed.

---

## 7. Phoenix sepsis criteria — neurologic scoring (confirmation)

> I need to confirm one detail of the Phoenix Sepsis Score, from the 2024
> international consensus criteria for paediatric sepsis: Schlapbach LJ, Watson
> RS, Sorce LR, et al., JAMA 2024;331(8):665–674, and the derivation paper by
> Sanchez-Pinto LN et al. in the same issue. Confirm both citations.
>
> The neurologic component of the Phoenix score is worth 0 to 2 points. My
> question is precisely how those points are assigned:
>
> 1. How many points for **bilaterally fixed pupils**?
> 2. How many points for a **Glasgow Coma Scale total of 10 or less**?
> 3. If a patient has bilaterally fixed pupils **and** a GCS of 15 — pupils
>    abnormal, coma score normal — what is the neurologic subscore? Is it 1, or 2?
> 4. Are the two criteria **additive** (summed, then capped at 2), or is fixed
>    pupils worth 2 outright on its own?
> 5. **What does the published algorithm do when GCS is missing?** Is it imputed,
>    and if so to what value?
>
> Question 4 is the crux, and question 5 is close behind. If the official
> reference implementation is available — I believe the task force published R
> and/or Python code — please quote the relevant lines, since that settles it
> better than the paper's table.
>
> Also give me: the other three organ-system components and their point rules,
> and the total threshold that defines sepsis and septic shock.
>
> Constraints:
>
> - Point values and thresholds as numbers. Do not reproduce the descriptor
>   wording from the criteria tables — I only need which condition earns how many
>   points.
> - Cite the table, and quote reference-implementation code if you can find it.
> - State at the end whether you accessed the papers and the code, or are
>   recalling. This determines a sepsis flag, so an honest "I could not verify
>   the missing-GCS rule" is more useful than an assumption.
