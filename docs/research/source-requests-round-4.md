# Source requests, round 4 — 2026-08-04

Round 3 ran out of search budget at 18 queries and labelled several sections
WEAK. This round targets exactly what it could not reach, plus three new
questions its own findings raised.

**Two of these describe live discrepancies in what the calculators currently
emit**, so they matter more than the rest: section 1 (the burn coefficient) and
section 2 (what counts as respiratory support).

Paste it whole.

---

## The prompt

> I maintain a paediatric critical-care calculator platform. A previous review
> answered most of my open questions but ran out of search budget, and flagged
> several answers as weak or unretrieved. This round targets those, plus three
> questions the earlier answers raised.
>
> **Restrict to roughly 2016–2026** unless a question says otherwise. Grey
> literature is explicitly in scope this time — registry data dictionaries,
> course manuals and institutional protocols are the sources I most need for
> sections 3 and 4, and their absence is itself worth reporting.
>
> **The rules that matter, unchanged from before.** A confirmed "nothing
> published" is a real answer and I want it. Numbers and conditions only — no
> descriptive prose or scale-item wording reproduced. Declare per section what
> you actually read: full text, abstract, or secondary. Where sources disagree,
> show the disagreement rather than picking a winner.
>
> ---
>
> ### 1. The paediatric burn coefficient — a live discrepancy
>
> My calculator emits **3 mL/kg/%TBSA** for paediatric burn resuscitation, with
> maintenance fluid added on top. But a paediatric review states children
> require approximately **6 mL/kg/%TBSA**, and that single-figure adult formulas
> underestimate small children while overhydrating large ones.
>
> a) **Where does the ~6 figure come from**, and does it include or exclude
> maintenance? If it is a total requirement including maintenance, the
> apparent contradiction with 3-plus-maintenance may dissolve — I need to
> know which.
> b) What do **paediatric burn centres actually start at**? I have seen 2, 3 and
> 4 tabulated across five centres. Is there a modal value, or a defensible
> range?
> c) Is there evidence that a **weight-based coefficient is the wrong shape**
> for small children — i.e. that surface-area formulas perform better below
> some weight? I have seen 20 kg suggested but not tested.
> d) Given the fluid-creep literature argues for _less_, and this suggests
> children get _more_ than the formula predicts, **which direction is the
> error in paediatric practice**? An earlier review found North American
> cohorts over-resuscitated and a European registry under-resuscitated
> relative to prediction.
>
> ### 2. What counts as "respiratory support" in organ-dysfunction scoring
>
> This determines a real difference in a real patient and I currently resolve it
> by my own choice, which I disclose.
>
> Several paediatric organ-dysfunction scores gate their higher respiratory
> subscores on the patient being "on respiratory support" without defining the
> term.
>
> a) **Does any source define it?** Specifically: does non-invasive support
> alone — CPAP, BiPAP, high-flow nasal cannula — satisfy the gate, or is
> invasive mechanical ventilation required?
> b) Do **different scores in this family draw the line differently**? One I use
> appears to count any support; another appears to require invasive
> ventilation for its higher bands and scores zero for an unsupported patient.
> Is that divergence real and documented, or an artefact of how each is
> written up?
> c) Is **high-flow nasal cannula** treated as respiratory support in any of
> them? It postdates several of the derivations and I suspect it is simply
> unaddressed.
> d) Has anyone **quantified how much the choice changes a score** in a real
> cohort? A child on CPAP with a qualifying ratio scores 3 under one reading
> and 2 under the other, and that propagates to the total.
>
> ### 3. Registry data dictionaries — the grey literature I could not reach
>
> These are normative for how the scores are actually collected, and they are
> exactly what a previous search could not retrieve. Paediatric intensive-care
> registries and networks that publish data dictionaries or coding manuals are
> the target.
>
> a) **What plausibility or valid-range bounds do they specify** for the common
> inputs — arterial oxygen tension, platelets, bilirubin, mean arterial
> pressure, creatinine, base excess? The derivation papers give scoring
> cut-points but no accepted input range, so every implementation invents its
> own. If registries publish ranges, those are the closest thing to a
> standard that exists.
> b) **Do registries agree with each other** on whether a tracheostomy with
> unassisted spontaneous breathing counts as mechanical ventilation? I have
> found one registry stating it does not. Do others agree, disagree, or stay
> silent?
> c) How do they handle **high-flow nasal cannula** in the ventilation field?
> d) Do any publish **data-quality rules** — values that trigger a query or get
> rejected on submission? Those would be usable as plausibility bounds with a
> real citation behind them.
>
> ### 4. Interpretation bands for mortality models
>
> Three of my calculators either display "bands not yet authored" or show
> nothing at all, because their source papers publish continuous probabilities
> and no cut-points.
>
> a) **Has anyone published severity bands** for paediatric mortality
> probabilities that are actually used — deciles, risk tiers, anything with a
> citation behind it? Or is the continuous probability genuinely the only
> published form?
> b) Do any **institutions or registries publish banding for reporting** —
> low/medium/high risk strata used in benchmarking?
> c) Is there literature on **whether banding a validated continuous prediction
> is harmful** — i.e. an argument that bands should not be created?
>
> If the answer to (a) and (b) is no and (c) is yes, that is a complete answer
> and I will display nothing, permanently, with the reasoning.
>
> ### 5. Specific items an earlier search could not retrieve
>
> Each of these was reachable only at abstract or snippet level. I need the
> numbers, not the abstract.
>
> a) **Osmolar gap performance at a threshold of 10** — sensitivity,
> specificity, and for which clinical decision (identifying patients needing
> dialysis versus identifying those needing antidote). I have seen 1.0 and
> 0.90/0.85 quoted for different decisions and want them tied to the right one.
> b) **The exact wording on individual-patient use** in the source papers for
> the two main paediatric mortality models. My pages warn that these are
> group-level instruments; I want to know whether the authors say that
> themselves, and how strongly.
> c) **Per-8-hour-block delivered volumes** in the one burn study that analysed
> resuscitation by 8-hour interval. The abstract gives percentage changes in
> rate; I want the actual millilitre or mL/kg/%TBSA figures per block if the
> paper reports them.
> d) Any **Gulf or wider Middle East validation** of paediatric mortality models
> beyond the two I have (one from Dubai, one from Riyadh). Saudi, UAE, Qatar,
> Kuwait, Oman, Egypt, Jordan — single-centre studies are fine.
>
> ### 6. Threshold convergence — where I currently show a range
>
> For each of these I display a range because sources disagree. I want to know
> whether the field has since converged, or whether the disagreement is stable
> and I should keep showing it.
>
> a) The **vasoactive-inotropic score cut-point**. I have seen 10 to 30 across
> studies, with population-specific values. Is there a consensus statement,
> or a meta-analysis that pools a threshold?
> b) The **neonatal organ-dysfunction score cut-point** — I have seen >2, 3.5,
> ≥4, ≥5 and ≥6 all published with different areas under the curve. Any
> convergence, and is applicability defined by postnatal or postconceptional
> age?
> c) The **window for a surrogate baseline creatinine** — 3 days, 7 days, or the
> whole admission. Has anyone compared windows head-to-head in children?
> d) The **prognostic timepoint** for vasoactive scoring — maximum over a
> window, mean, or a value at a fixed hour. Different studies use different
> ones and I do not know which the field has settled on, if any.
>
> ### 7. One I expect to be empty
>
> Is there **any paediatric data on the osmolar gap** — reference range,
> performance, or age-specific behaviour? A previous search found none. If that
> is right, I will mark it settled and stop looking; a confirmed absence here is
> worth as much to me as a finding.
>
> ### 8. Finally
>
> If anything you find contradicts what you would have said from memory, flag it
> explicitly. On this project that has happened four times now — a widely
> repeated fluid cap that traced to a citation error, a published surface-area
> table transcribed wrongly in most circulating copies, a resuscitation split I
> had recorded as underived that turned out to be derived at a different ratio
> than the one in use, and a threshold I had described correctly and then
> "corrected" to a wrong value on a reviewer's say-so. Each surfaced only by
> checking a primary against the thing everybody repeats.

---

## Why these, and what each unblocks

| Section | Currently                                        | If answered                                             |
| ------- | ------------------------------------------------ | ------------------------------------------------------- |
| 1       | We emit 3 mL/kg while a review says 6            | Resolves a live discrepancy in a shipped number         |
| 2       | We pick the broad reading and disclose it        | Turns an implementation choice into a sourced rule      |
| 3       | Every input bound is our own invention           | Would close bounds markers across most of the catalogue |
| 4       | Three scores show no bands or "not yet authored" | Either authors them or settles the absence permanently  |
| 5       | Five numbers known only at abstract level        | Replaces approximations with figures                    |
| 6       | Four ranges displayed as controversies           | Confirms the disagreement is stable, or resolves it     |
| 7       | Assumed absent                                   | Marks it settled                                        |

Sections 1 and 2 are the ones where the current state affects a number a
clinician reads. Section 3 is the highest-volume — it would close more markers
than anything else on the list.
