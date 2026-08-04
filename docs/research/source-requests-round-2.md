# Source requests, round 2 — 2026-08-03

One prompt, covering every question still open after round 1. Paste it whole.

Round 1 closed PRISM, PIM3, Lund–Browder, KDIGO, burns, Holliday–Segar and
Phoenix. What remains is listed below, ordered by how much it matters. **pSOFA
has overtaken PIM3 as the score with the most unsourced claims (10).**

If the conversation runs long, the sections are independent — sections 1–4 are
worth more than 5–7 combined.

---

## The prompt

> I maintain a paediatric critical-care calculator platform. Every threshold we
> display must trace to a citable source; anything that cannot is marked
> `[NEEDS SOURCE]` publicly on the page rather than quietly asserted. I have a
> list of claims still carrying that marker, plus several questions raised by
> earlier research. I would like them resolved against primary sources.
>
> **Three rules for your answer, which matter more than completeness.**
>
> 1. **Numbers and conditions only.** I need thresholds, coefficients, bounds
>    and age ranges. Do NOT reproduce descriptive prose or scale-item wording
>    from any published table — a coefficient is a fact, a descriptor sentence
>    is copyrighted expression, and I paraphrase all option labels myself.
> 2. **Say when there is no source.** Several of these are probably folklore.
>    "In wide use, no primary derivation exists" is a complete and valuable
>    answer, and I would rather have it than a plausible citation that does not
>    survive checking. Do not manufacture a source to fill a gap.
> 3. **Declare what you actually read.** For every section, state whether you
>    retrieved the full text, saw only an abstract or secondary description, or
>    are recalling. A confidently wrong bound is worse than an admitted gap,
>    because it arrives looking sourced.
>
> ---
>
> ### 1. pSOFA — the largest gap (Matics & Sanchez-Pinto, JAMA Pediatr 2017)
>
> Citation to confirm: Matics TJ, Sanchez-Pinto LN. Adaptation and validation of
> a pediatric sequential organ failure assessment score. _JAMA Pediatr._
> 2017;171(10):e172352.
>
> a) The paper adapts adult SOFA. **Which elements are stated in the paper and
> which are conventions later implementers added?** Specifically: does the
> paper state a rule for scoring an organ system when its inputs are missing,
> or is "missing counts as normal" an implementation convention?
>
> b) **Does the paper specify physiologic plausibility bounds** — minimum and
> maximum accepted values — for PaO₂, platelets, bilirubin, MAP or
> creatinine? I suspect not, and that every implementation invents its own.
> Confirm either way.
>
> c) **What age range is pSOFA derived and validated for?** Our implementation
> accepts up to 250 months (~20.8 years), which I doubt is right. Give the
> paper's stated range, and say whether it excludes neonates.
>
> d) For term neonates specifically — is nSOFA (neonatal SOFA) the correct
> separate instrument, and what is its citation? Is there published guidance
> against extending pSOFA to that population?
>
> e) pSOFA uses S/F when PaO₂ is unavailable. **Is the SpO₂ ≤ 97% validity
> ceiling stated in the pSOFA paper**, or inherited from the S/F literature?
>
> ### 2. Cross-calculator bound inconsistencies
>
> These differ between our calculators, and I need to know which differences are
> justified by the sources and which are our own drift.
>
> a) **SpO₂ lower bound.** We accept 1–97% in the oxygen-saturation index (OSI)
> but 80–97% in the S/F ratio. The 80% floor comes from the Khemani
> derivation range. **Is there a published lower validity bound for SpO₂ in
> OSI?** If OSI has none, say so — then the difference is defensible.
>
> b) **Age ceilings.** Ours are Phoenix 215 months, PELOD-2 216 months, pSOFA
> 250 months, PRISM 18 years. For **each** of Phoenix, PELOD-2, pSOFA and
> PRISM III, what upper age limit does the source publication actually state,
> and is it inclusive or exclusive? I want to know which of our four numbers
> are wrong rather than merely inconsistent.
>
> ### 3. Osmolality and the osmolar gap
>
> a) **Which calculated-osmolality formula is best supported in children?**
> There are several (Bhagat, Dorwart & Chalmers, Worthley, the simple
> 2Na + glucose/18 + BUN/2.8). Give the formula, its citation, and any
> paediatric validation.
>
> b) **What is the normal serum osmolality range in children**, and is it
> genuinely the same as adults (280–295 mOsm/kg)? Primary source please.
>
> c) **What osmolar gap threshold indicates a clinically significant unmeasured
> osmole**, and what is its derivation? The commonly used ≥ 10 mOsm/kg — is
> that sourced or conventional?
>
> d) A specific problem: when the ethanol-adjusted residual gap is **negative**,
> our page still flags the raw gap as abnormal, which reads as a
> contradiction. **How does the literature handle a negative osmolar gap?**
> Is it a measurement-error signal, a formula-choice artefact, or meaningful?
>
> ### 4. Vasoactive-Inotropic Score (Gaies)
>
> Citation to confirm: Gaies MG, Gurney JG, Yen AH, et al. Vasoactive-inotropic
> score as a predictor of morbidity and mortality in infants after
> cardiopulmonary bypass. _Pediatr Crit Care Med._ 2010;11(2):234–238.
>
> a) **Give the complete coefficient set**, drug by drug, exactly as published.
> I need to confirm ours matches, including which drugs are in and out.
>
> b) **The phenylephrine ×10 coefficient** — is it in the original Gaies VIS, in
> a later modification, or neither? We currently exclude it and flag it
> unsourced.
>
> c) **The high-versus-low VIS dichotomisation value.** Gaies reports an
> adjusted OR of 8.1 (95% CI 3.4–19.2) for high versus low maximum VIS over
> the first 48 hours. **What cut-point defines "high"?** We report the odds
> ratio but cannot state the threshold it came from, which is unsatisfactory.
>
> d) Are there published **maximum plausible doses** per drug, or are dose
> ceilings purely local convention?
>
> ### 5. Oxygenation index — a unit trap worth confirming
>
> OI = (MAP × FiO₂) / PaO₂. FiO₂ can be a fraction (0.5) or a percentage (50),
> and the PALICC table renders it one way while other sources render it another.
> Applying both conventions, or neither, is a **100-fold error**.
>
> **State unambiguously:** in the canonical OI definition, is FiO₂ a fraction or
> a percentage, and what are the resulting numeric severity bands? Give the same
> for OSI (which substitutes SpO₂ for PaO₂). Cite PALICC-2 (2023) specifically.
>
> ### 6. Questions left over from earlier research
>
> a) **KDIGO 2012, the ≥ 4.0 mg/dL route to Stage 3.** The Chapter 2.1 rationale
> says the patient must first satisfy the AKI definition (≥ 0.3 mg/dL rise in
> 48 h, or ≥ 1.5× baseline). **How do published implementations handle this
> when no baseline creatinine is available?** Gating it strictly would
> under-stage every patient entered without a baseline. Is there guidance, or
> a documented convention?
>
> b) **Anuria.** KDIGO uses it in the Stage 3 criterion but never defines it
> numerically. **Is there a standard numeric definition** in the nephrology
> literature (0 mL/kg/h? < 0.1?), or is it deliberately clinical?
>
> c) **The creatinine conversion factor.** KDIGO prints mg/dL × 88.4 = µmol/L;
> our code uses 88.42 (from molar mass 113.12 g/mol). **Which is standard for
> clinical calculators**, and does the difference cross any published
> threshold at clinically encountered values?
>
> d) **Cochrane CD009457** (McNab et al., isotonic vs hypotonic maintenance
> fluids). I need its **rate/volume subgroup analysis** directly, not through
> secondary description: does fluid _restriction_ protect against
> hyponatraemia independently of tonicity? Two guidelines describe this
> review and reach different emphases, and I would like the primary finding.
>
> e) **Holliday & Segar 1957**, pages 823–832. Two narrow questions the
> secondary literature does not answer: does the paper state any **lower age
> or weight bound** (the "exceptions" passage the AAP summary mentions), and
> does its figure's third linear segment genuinely span **20–70 kg**?
>
> f) **The ABLS Provider Manual** (American Burn Association course material).
> It appears to be the origin of the "add maintenance fluid below 30 kg"
> threshold, but it has no DOI and is course-restricted. **Is the 30 kg
> figure stated in any citable, retrievable source?**
>
> ### 7. Items I believe have no source — please confirm the negative
>
> For each, I am looking for confirmation that no primary derivation exists, so
> I can mark it as settled-absent rather than merely unfound. If one does exist,
> that is obviously the more valuable answer.
>
> a) ~~The **8-hour / 16-hour split** in burn resuscitation. Absent from Baxter &
> Shires 1968 and from the 2024 ABA CPG. Universal in practice.~~
>
> **ANSWERED 2026-08-03, and the premise was wrong.** The founder supplied the
> 1968 PDF. The split IS in Baxter & Shires and IS derived there (p883): the
> optimum response came from 16–20% of body weight over the first eight hours
> and a further 8–10% over the next sixteen, in a 50%-flame-burn canine model.
> Two things follow. The derivation is animal, at one burn size, on
> plasma-volume and ECF endpoints — no human or paediatric re-derivation exists,
> and the 2024 ABA CPG still addresses the split in none of its ten PICO
> questions. And the derived ratio is **two-thirds in the first eight hours,
> not half** — which is not what practice or this calculator does.
> b) Any derivation for a burn **maintenance weight threshold** at 20, 30 or 40 kg.
> c) The **optimal hourly urine-output goal in children** during burn
> resuscitation.
> d) Any **paediatric equivalent of the ABA burn shock resuscitation CPG**.
> e) Any **head-to-head outcome comparison** of Cincinnati vs Galveston vs
> Parkland in children (as opposed to comparisons of predicted volume).
> f) For **PIM3**: whether a tracheostomy with unassisted spontaneous breathing
> counts as mechanical ventilation. Straney 2013 Appendix 1 lists only
> inclusions; the exclusion appears to trace solely to the ANZICS registry
> booklet.
>
> ### 8. Finally
>
> If any answer above contradicts something you would have said from memory,
> flag the contradiction explicitly. Several claims in my current
> implementation came from tertiary sources and turned out to be wrong when
> checked against primaries — in one case a widely repeated figure traced back
> to a citation error, and in another a published table had been transcribed
> incorrectly across most copies in circulation. I would rather find those now.

---

## Where each answer lands

| Section | Score files affected                                                                           | Markers closed                                   |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1       | `psofa.ts`                                                                                     | up to 10 — the largest single block              |
| 2       | `oxygen-saturation-index.ts`, `sf-ratio.ts`, `phoenix.ts`, `pelod2.ts`, `psofa.ts`, `prism.ts` | bounds, not markers — fixes real inconsistencies |
| 3       | `serum-osmolality.ts`                                                                          | 6                                                |
| 4       | `vis.ts`                                                                                       | 3                                                |
| 5       | `oxygenation-index.ts`, `oxygen-saturation-index.ts`                                           | 3 + 2                                            |
| 6       | `kdigo-aki.ts`, `holliday-segar.ts`, `burn-resuscitation.ts`                                   | open items from round 1                          |
| 7       | `burn-resuscitation.ts`, `pim3.ts`                                                             | converts `[NEEDS SOURCE]` to a settled negative  |

Sections 1 and 3 together account for roughly a third of every unsourced claim
still on the site.
