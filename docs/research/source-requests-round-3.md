# Source requests, round 3 — 2026-08-03

A single prompt, framed as **clinical questions rather than citation fetches**, and
scoped to the last ten years. Round 1 and round 2 closed the questions that had a
specific paper behind them; what is left are questions where I do not know whether
an answer exists at all.

Paste it whole. The sections are independent if it runs long — 1, 2 and 3 are
worth more than the rest combined.

---

## The prompt

> I maintain a paediatric critical-care calculator platform. Every number we
> display has to trace to something citable; anything that cannot is marked
> publicly on the page rather than quietly asserted. Below are the questions I
> still cannot answer. I do not know, for most of them, whether the literature
> answers them at all.
>
> **Please restrict yourself to roughly the last ten years (2016–2026)**, except
> where I explicitly ask whether something older has ever been revisited. I am
> interested in what the current evidence says, not in tracing origins — I have
> already done that work.
>
> **Four rules for the answer, in order of importance.**
>
> 1. **A confirmed "no" is a real answer and I want it.** Several of these are
>    probably unstudied. "Searched, nothing published in this window" lets me
>    mark a gap as settled rather than leaving it looking unfinished. Do not
>    manufacture a citation to fill a hole.
> 2. **Numbers and conditions only.** Thresholds, coefficients, ranges, effect
>    sizes. Do not reproduce descriptive prose or scale-item wording from any
>    published table — I paraphrase all of that myself for licensing reasons.
> 3. **Declare what you actually read** per section: full text, abstract only,
>    or secondary description. A confidently wrong threshold is worse than an
>    admitted gap because it arrives looking sourced.
> 4. **Where sources disagree, show me the disagreement** rather than picking a
>    winner. I would rather display a real controversy than a false consensus.
>
> ---
>
> ### 1. Burn resuscitation — a discrepancy I cannot resolve
>
> This is the question I most want answered.
>
> The classic teaching is to give **half** the calculated 24-hour crystalloid
> volume in the first eight hours from injury and the other half over the next
> sixteen. But the original animal derivation that established the two-phase
> schedule actually produced roughly **two-thirds in the first eight hours**, not
> half — the published optimum was 16–20% of body weight over the first eight
> hours and a further 8–10% over the next sixteen, and the hourly rates agree.
>
> a) **Has anyone in the last decade examined the fraction itself?** Any study,
> audit, model or review comparing a 1:1 split against 2:1 or any other
> division, on any outcome?
> b) Is there **any modern justification** offered for "half", or is it simply
> inherited? If a physiologic rationale is given (capillary-leak kinetics,
> peak oedema timing), what is it and what supports it?
> c) Do current protocols actually deliver the first-phase volume as calculated,
> or is it routinely adjusted? What does observational data show about the
> **shape** of delivery over the first 24 hours, as opposed to the total?
> d) Does anything support a **different split in children** specifically?
>
> ### 2. Paediatric burn resuscitation — the gaps I have already confirmed
>
> I have established that no primary derivation exists for the following. I want
> to know whether the last ten years changed that, or whether these remain
> consensus-only. A confirmed "still unstudied" is a useful answer for each.
>
> a) The **starting coefficient in children** (mL/kg/%TBSA). Is there now any
> graded paediatric guideline, as opposed to adult guidance being extrapolated?
> b) The **weight threshold below which maintenance fluid is added** on top of
> resuscitation volume. Practice ranges roughly 20–40 kg, one approach uses
> age instead, and at least one national guideline uses no threshold at all.
> Has anyone tested any of these?
> c) The **optimal hourly urine-output target in children**. Sources give
> ranges that differ roughly threefold above 30 kg, and disagree on whether
> to band by weight or by developmental stage. Is there evidence for any of it?
> d) Any **head-to-head comparison on patient outcomes** — not predicted volume —
> between the weight-based and surface-area-based paediatric formulas?
> e) Is there an established **upper safety bound** on total volume, or is
> current practice purely to monitor for compartment syndrome?
>
> ### 3. Maintenance fluids in children
>
> a) **Where does the classic 100/50/20 mL/kg/day scheme stop applying at the
> bottom?** Guideline scopes disagree — term neonates, 28 days, one month.
> What does the current evidence support, and is there a defensible **weight**
> floor as opposed to an age one? I need to reject input rather than compute
> silently for a patient the method was never meant for.
> b) **Is there any evidence-based daily maximum?** Current guidance spans
> 2000–2500 mL/day with no agreement, and at least one widely cited figure
> turns out to be arithmetic (100 mL/h × 24) rather than a finding. Has
> anything in the last decade actually studied a ceiling?
> c) **Does fluid restriction independently protect against hyponatraemia**, or
> is tonicity doing all the work? Guidelines describe the same evidence and
> reach different emphases. I need the primary finding on the rate/volume
> question specifically, separated from the tonicity question.
> d) For infants roughly **1–3 months**, is there evidence supporting different
> fluid composition or closer electrolyte monitoring than older children?
>
> ### 4. AKI staging without a baseline
>
> a) When no baseline creatinine is available, what **surrogate** performs best
> in **children**? I am aware of adult work on back-calculating from an
> assumed GFR, and that the commonly suggested assumption performs poorly, but
> I have found no paediatric validation. Does one exist?
> b) Is the **lowest creatinine measured during the admission** a validated
> surrogate in children, and if so with what sensitivity and specificity?
> c) Is there a numeric definition of **anuria** in use for staging, or is it
> left clinical everywhere?
> d) How do published implementations handle a creatinine that is **high but
> with no evidence of acute rise** — chronic kidney disease presenting to
> intensive care? Staging it as acute injury seems wrong; ignoring it seems
> worse.
>
> ### 5. Organ-dysfunction scores — the conventions nobody writes down
>
> a) Several scores assign points for oxygenation only when the patient is on
> respiratory support. **What should happen when the ratio qualifies for a
> high subscore but the patient is not supported?** Cap at the highest
> unsupported band, score zero, or something else? I have found no source
> stating a rule, and the choice changes the total.
> b) These scores generally treat an **unmeasured variable as normal**. Is there
> any published work on how much that biases a partially entered score in
> practice, or guidance on a minimum dataset below which a total should not
> be reported at all?
> c) What **physiologic plausibility bounds** do published implementations use
> for the common inputs — arterial oxygen tension, platelets, bilirubin, mean
> arterial pressure, creatinine? The derivation papers give scoring cut-points
> but no accepted input range, so every implementation seems to invent its own.
> d) For the neonatal period specifically, is there consensus on **which score
> applies** and from what postnatal or postconceptional age?
>
> ### 6. Vasoactive support scoring
>
> a) The original derivation used a **multi-group classification across two
> 24-hour periods** before dichotomising into high and low. What were the
> numeric group boundaries? More usefully — **what single threshold do
> current studies use**, and is there convergence?
> b) Do published cut-points **transfer between populations** — post-cardiac
> surgery, sepsis, ECMO, general intensive care — or is each cohort-specific?
> If they do not transfer, is that stated anywhere I can cite?
> c) Is the prognostic quantity the **maximum over a window**, a **mean**, or a
> value at a fixed timepoint? Different studies seem to use different ones.
> d) Have **newer agents** been assigned coefficients in any widely adopted
> modification, and is there agreement on those coefficients?
>
> ### 7. Mortality prediction models — calibration where it matters to me
>
> a) How do the current paediatric mortality models calibrate in **Middle
> Eastern and Gulf populations** specifically? I have found validations from
> several regions with very different results, and discrimination seems to
> travel while calibration frequently does not. Anything from this region?
> b) Is there published guidance on **when a unit should recalibrate** a model
> to its own population rather than using published coefficients?
> c) For models validated for **group-level benchmarking**, is there any
> literature on the harms of individual-patient use — or is the warning purely
> conventional?
> d) Do any of these models now publish **severity bands** for individual
> interpretation, or do they remain continuous probabilities only?
>
> ### 8. Two narrow ones
>
> a) In scoring mechanical ventilation for severity models, is a **tracheostomy
> with unassisted spontaneous breathing** counted as ventilated? I have found
> this addressed only in a registry data dictionary, never in a peer-reviewed
> source.
> b) Is there a standard convention for a **negative osmolar gap** — treat as
> normal variation, as a measurement problem, or as meaningful? And does a
> normal gap reliably exclude toxic alcohol ingestion, or not?
>
> ### 9. Finally
>
> If any answer contradicts what you would have said from memory, **say so
> explicitly**. On this project that has now happened three times: a widely
> repeated fluid cap turned out to be a citation error, a published surface-area
> table turned out to be transcribed wrongly in most circulating copies, and a
> split I had recorded as "derived nowhere" turned out to be derived — at a
> different ratio from the one everyone uses. Each was found only by checking a
> primary against the thing everybody repeats. I would rather find the next one
> now.

---

## Where the answers land

| Section | Closes                                                                 |
| ------- | ---------------------------------------------------------------------- |
| 1       | The sharpest open question on the site — the 2:1 vs 1:1 split          |
| 2       | Five burn gaps currently marked settled-absent — reconfirm or overturn |
| 3       | Holliday–Segar lower bound, daily cap, restriction-vs-tonicity         |
| 4       | KDIGO surrogate baseline in children; the chronic-elevation case       |
| 5       | pSOFA's last marker, plus plausibility bounds across several scores    |
| 6       | VIS group boundaries and threshold transferability                     |
| 7       | Calibration for a Gulf deployment; individual-use warnings             |
| 8       | PIM3 tracheostomy; the osmolar-gap convention                          |

Sections 1 and 5 are the ones where a confirmed negative is nearly as valuable as
a positive finding — both currently force an implementation choice we have to
make and disclose without support.
