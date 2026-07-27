# TowardPCC — what it is, what every page does, and why

**towardpcc.com** — the digital home of pediatric critical care.

This document explains the platform as it actually exists: every page, what is
on it, and the reasoning behind it. It is written for someone who needs to
understand the whole thing — a collaborator, a reviewer, or the founder in six
months when the reasons have faded but the consequences have not.

Where a decision was contested, this records the losing option too. A decision
you cannot reconstruct is one you will re-litigate.

---

## 1. The thing itself

Pediatric intensive care is a small specialty carrying enormous stakes. A PICU
physician calculates a P/F ratio at the bedside, looks up a Phoenix sepsis
criterion mid-resuscitation, estimates an ETT size for a child they have known
for ninety seconds. The tools for this are scattered: a paper card in a coat
pocket, a calculator built for adults, a PDF someone photographed, an app that
wants an account.

TowardPCC exists to be the place that work lives. Four pillars, in the order
they become real:

| Pillar          | What it is                                                        | Status                             |
| --------------- | ----------------------------------------------------------------- | ---------------------------------- |
| **Calculators** | 22 referenced clinical scores, computed in the browser            | **Live**                           |
| **Knowledge**   | PedsCC Library — searchable guidelines, answers to the exact page | In production, piloted in the Gulf |
| **Data**        | PICU registry and unit dashboards                                 | Piloting in one Gulf-region PICU   |
| **Services**    | Free research support for investigators                           | Open                               |

The four are not equal in maturity and the site never pretends otherwise. Each
carries an honest status chip. A visitor can tell, in one glance, what they can
use today and what they are being invited to help build.

## 2. The constraint everything else obeys

**Never claim more than is true.**

That sounds like a value statement. In practice it is an engineering
constraint, and it has shaped more of this codebase than any technical
preference:

- No invented metrics. Every counter on the site maps to something countable.
  The "22 calculators" and "89 citations" figures are asserted by a test, so a
  score added without a citation breaks the build rather than quietly inflating
  a number.
- No fabricated social proof. No logos, no testimonials, no "trusted by".
- No hospital names in the registry copy, and no current employer on the About
  page. Those were explicit founder constraints and they are load-bearing:
  naming a pilot institution before governance is agreed would be a breach of
  trust, not a marketing win.
- **Validation status is shown even though it is empty.** Every calculator
  carries two validator slots, and today both read "validation pending". It
  would be trivial to hide that. Showing it is the point — a clinician can see
  exactly how much human review stands behind the number.

The most expensive expression of this: the calculators are **not allowed to
transmit what you type**. Not "we don't store it" — cannot send it. That
promise is enforced by architecture and by tests, and section 4 explains how.

## 3. Every page

### `/` — Home

**Job:** in one screen, establish what this is, that it works, and that it is
honest.

- **Hero** — the headline promise, two CTAs, and a live respiratory waveform
  rendered on canvas. Beside it, three figures: 22 calculators, 89 citations,
  and **0 bytes transmitted**. That third number is the entire product
  philosophy compressed into one statistic.
- **Feature strip** — four cards: Referenced, Private by design, Free, Open.
- **Mission split** — photography of real care beside the mission statement.
- **Counter band** — four animated figures: online solutions and growing, years
  of team experience in the field, studies with ongoing support, and typical
  response time in working days. Count-up animation is permitted **only** here.
  It is banned on any computed clinical value, because rolling digits teach the
  eye that a number is decorative, and that is the precise opposite of what a
  score must communicate.
- **Pillar cards** — the four pillars with honest status.
- **Evidence carousel** — quotations from the literature the calculators rest on.
- **Founder section** — carried by the brand waveform, not a portrait. The
  founder declined a photograph; rather than leave a hole, the section is built
  around the motif that the About page then explains.
- **CTA band** — into the calculators.

**Why the waveform is respiratory and never cardiac.** It is the brand mark, it
animates continuously, and it is the first thing a clinician sees. A cardiac
trace on a PICU site reads as a monitor — it implies a diagnostic instrument
this is not, and it can flatline, which is an unacceptable thing to put on a
children's intensive care site. The animation carries a travelling highlight
rather than a QRS complex for exactly this reason.

### `/calculators` — The catalogue

22 scores across 8 categories, searchable, filterable, with favourites in
`localStorage`. Favourites are deliberately local: knowing which scores a
clinician reaches for is exactly the kind of data that would be interesting to
collect and wrong to.

### `/calculators/[slug]` — A single score

The most important page on the site, and the one restructured most carefully.

**Layout.** Inputs on the left, a **result rail that stays on screen** on the
right. The result renders in every state, including incomplete — the page is
never blank where the answer belongs.

Below the inputs, four tabbed panels rather than four stacked prose sections:

1. **How it is calculated** — the formula in plain words. Every score has one.
2. **Limitations and notes** — the clinical caveats, including any
   `[NEEDS SOURCE]` gaps, stated rather than hidden.
3. **Evidence** — the full result→meaning lookup table, plus every reference
   with PMID/DOI links and the editorial note on why that source matters.
4. **Version and changelog** — validation status, version, and what changed
   when, including whether a change was a formula correction or a clarification.

**Design reasoning, item by item:**

- **The interpretation table publishes every band, not just the one that
  applies.** A clinician wants to know where the cutpoints are, not only which
  side of one this patient fell. Band ranges print with their real inclusivity
  — `4 to <8`, not `4–8` — because ascending and descending scores invert it,
  and the boundary is the value most likely to be looked up.
- **Accepted ranges live in the fields**, not in a list at the bottom, because
  that is where a rejected value is actually being corrected.
- **Out-of-range input is rejected, never computed.** The obvious reference
  implementation treats ranges as advisory; it will happily compute a
  creatinine clearance from a 900 kg weight. For a pediatric tool where a
  mistyped weight changes a drug dose, refusing is correct.
- **Ten of the 22 scores show an interpretation table; twelve do not.** The
  twelve are estimators — ideal body weight, ETT size, maintenance fluids —
  where a severity band would be meaningless. They render nothing rather than
  an empty table, because an absence presented as a gap reads as missing work.
- **A partial-result warning** appears on additive composites (pSOFA, Phoenix,
  VIS) where a blank component scores as normal, so a half-entered form can
  read falsely low. PELOD-2 deliberately does not carry this flag: it requires
  every input and rejects blanks outright, which is a stronger guarantee.

### `/knowledge` — PedsCC Library

The library is real, in production, and piloted with a small group of PICU
physicians across the Gulf. The page describes what it does — search that
returns the exact page inside a document, not a document to go hunting in — and
invites units to pilot it. The screenshot renders **uncropped, inside window
chrome**: a screenshot is product evidence, and cropping one destroys the thing
it exists to show.

### `/data` — The registry

The vision for a Gulf/MENA PICU registry and unit dashboards. Honest status:
piloting in one PICU in the Gulf region, **deliberately unnamed**. Carries the
privacy and residency commitments prominently, because for a registry those
commitments are the product, not the footnote. A pilot-interest form collects
institution, role, unit size, country and email.

No patient-data features exist in v1. The organisational data model is designed
now so the registry lands on a spine that already exists.

### `/services` — Research support

Free methodological and analytical support for investigators. The form asks for
the question, not the patient — and says so, because the fastest way to receive
data you must not hold is to leave a free-text box unqualified.

### `/about` — The founder and the reasoning

Vision, founder, brand story. The founder is described as a pediatric
intensivist — MBBS/MD, Saudi Board in Pediatric Medicine, fellowships in
pediatric critical care and pediatric neurocritical care. Current employer is
deliberately omitted. No portrait.

Also carries the brand story, including why the site is crimson: an audit of
reachable critical-care and paediatric institutions found every one anchored on
blue, and pediatric intensive care had no awareness colour of its own. Crimson
is close kin to the Saudi Critical Care Society's red and unmistakably not
another hospital blue.

### `/contact`, `/install`, `/legal/*`

Contact routes into the same submission pipeline. `/install` explains the PWA —
the calculators work fully offline, which matters in a hospital basement.

The legal pages state what is collected per feature and why, what is
deliberately not collected, retention per data type, and the sub-processors.
They carry `TODO:counsel-review` markers: the text is honest but has not yet had
a lawyer's pass.

### `/admin/*` — The private side

Login (password + mandatory TOTP), a submissions inbox, submission detail with
triage, and calculator metadata. The audit log is **append-only at the database
level** — the application role has `UPDATE` and `DELETE` revoked on it, so even
a full application compromise cannot rewrite history.

The inbox also carries an operational warning: if outbound email is not
configured, it says so plainly, because a broken mail relay is otherwise
indistinguishable from nobody having written to you.

## 4. The privacy invariant

The single most important technical property:

> Calculator inputs never reach the server.

Not a policy — a structural fact. The scoring engine is a dependency-free
TypeScript package that ships to the browser. Shareable state lives in the
**URL fragment**, which browsers never transmit. Nothing under the calculator
routes may read the query string or declare a server action.

That last constraint is enforced by a test that scans source and fails the
build on violation, and by a Playwright test that fills a calculator **with the
network disabled** and asserts a correct result plus zero data-carrying
requests.

It is the crown jewel and it is guarded like one.

## 5. The design system

**Pulse Crimson.** Crimson is the single accent and never means error — alerts
are amber with an icon, because a site whose brand colour is red cannot also
use red to mean danger. No blue, no teal, anywhere.

Two lessons from building it are worth recording:

**Contrast is asserted, not eyeballed.** The token guard reads the shipped CSS
and fails CI on a bad pairing. It still missed a real defect: a surface _fill_
token was used as a border in 38 places at 1.056:1 — invisible — while the
guard passed, because it was asserting a token the UI was not using. The guard
now enumerates every border token rather than checking a hand-written list, and
a second guard scans source for fills used as boundaries.

**Borders are tiered by intent, not by one threshold.** WCAG's 3:1 governs
boundaries that identify a _control_. A decorative card edge is not one, and
forcing every hairline to 3:1 produces a visibly heavy page. Three tiers:
control boundaries at 3.7:1, card edges at 1.8:1, inner rules at 1.4:1 — with
ceilings as well as floors, so the hierarchy cannot silently invert.

**Motion is restrained and pauses.** One easing voice, durations from tokens,
150ms on interactions. Reduced motion is absolute — the hero drops to a static
poster. Continuous ambient motion is permitted on decorative hero elements
only, and must pause off-screen and on tab hide.

## 6. Engineering decisions that shaped the product

**Performance is a budget, not an aspiration.** 170 KB gzipped route JS,
enforced in CI. This is why the hero runs on Canvas 2D rather than WebGL: the
3D version cost ~874 KB of three.js and, because it was gated behind a
fine-pointer check, never ran on a touchscreen at all.

**Offline is real.** A service worker precaches the calculator catalogue.
Deliberately, regaining connectivity does **not** reload the page — hospital
wifi bounces constantly, and a reload can land mid-entry and discard a
clinician's half-typed values.

**Every score carries its own worked examples**, reproduced from the source
publication as test fixtures. 100% coverage on the scoring engine is a gate,
not a goal. 628 tests protect 22 scores.

**The deployment is honest about where data lives.** Storage is in Saudi
Arabia. Requests transit a global CDN, so processing in transit may occur
outside the Kingdom — and the privacy page says exactly that, because
overstating residency would cost more trust than the exposure does. Mail
delivery was chosen in-region to avoid widening it further.

## 7. What is deliberately absent

- **No accounts for calculators.** Nothing to sign up for, nothing to abandon.
- **No tracking cookies, no advertising, no profiling third parties.**
- **No "copy results" behind a login.** A well-known competitor gates this; it
  is a growth mechanic, not a usability feature.
- **No per-option point values on scores.** Showing them would mean changing
  clinical code under a 100% coverage gate with cited worked examples. Deferred
  deliberately rather than bolted onto a layout change.
- **No patient data anywhere in v1.**
- **No dark mode yet.** The palette is built for it; nobody has asked.

## 8. Where it stands

Live at **www.towardpcc.com**. 712 unit tests, 59 end-to-end assertions, every
route inside budget, WCAG 2.2 AA, nightly backups with a rehearsed restore.

Honestly outstanding:

- **SMTP relay** — submissions are stored safely, but nothing emails you when
  one arrives. The admin inbox says so.
- **Counsel review** of the legal pages.
- **Clinical validators** — two named reviewers per score, so the badges can
  stop saying "pending".
- **Domain trust program** — registrar lock and auto-renew. A sibling society's
  lapsed domain is currently squatted by a gambling site; that is the failure
  mode being guarded against.
- **Database network segmentation** — the database is reachable from other
  tenants' containers on a shared Docker network.
- **Real counter figures and imagery** from the founder. Placeholders ship
  until then, and no figure is invented.

---

_Every claim in this document was verified against the running system or the
code, not recalled. Where something is aspirational it is marked as such._
