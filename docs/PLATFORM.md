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
  The "22 calculators" and "87 citations" figures are asserted by a test against
  the registry, so a score added without a citation breaks the build rather than
  quietly inflating a number.

  That sentence used to say **89**, and the site said 89 too, for as long as
  anyone had been reading it. The real count was 87. What makes this worth
  recording rather than quietly correcting is _why_ the guard did not catch it:
  the e2e test asserted that the rendered number matched the one in `site.ts`,
  so the figure only ever had to agree with itself. A number can be perfectly
  self-consistent and still be a lie. `apps/web/content/figures.test.ts` now
  compares the copy against the registry, which is the artifact being described.

  A second defect of the same family hid behind a correct number: the home page
  said "87 citations with PMID and DOI". The 87 was right; only 56 of them carry
  both identifiers and 16 carry neither. Every figure guard passed, because all
  of them were watching the numeral and none was watching the sentence. The copy
  now says "traceable to its source", which the registry gate actually enforces.

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
  rendered on canvas. Beside it, three figures: 22 calculators, 87 cited
  references, and **0 bytes transmitted**. That third number is the entire
  product philosophy compressed into one statistic, and it is the only figure on
  the page that carries a link to its own proof — a claim that strong with
  nothing behind it reads as bluster.
- **Feature strip** — four cards: Referenced, Private by design, Free, Open.
- **Mission split** — photography of real care beside the mission statement.
- **Counter band** — four animated figures, each one countable: 22 referenced
  calculators, 87 literature citations, 64,388 library pages indexed, 100%
  engine test coverage. There used to be a second row of four directly beneath
  it — among them years of experience, studies supported, and typical response
  time — which is how the home page came to show fourteen numbers expressing
  only nine distinct facts before a visitor reached the pillar cards, "22"
  repeating four times. The surviving figures were not wrong; they were moved,
  on 2026-07-28, to where someone is actually deciding whether to act on them:
  experience to the founder section, studies and response time to `/services`,
  beside the note about what the queue does and does not promise. "Typically" is
  load-bearing in that second one — Research Services promises no SLA.

  Count-up animation is permitted **only** in this band. It is banned on any
  computed clinical value, because rolling digits teach the eye that a number is
  decorative, and that is the precise opposite of what a score must communicate.

- **Pillar cards** — the four pillars with honest status.
- **Evidence carousel** — quotations from the literature the calculators rest on.
- **Founder section** — carried by the brand waveform, not a portrait. The
  founder declined a photograph; rather than leave a hole, the section is built
  around the motif that the About page then explains.

  This one contradicted another document, and the contradiction is worth
  recording rather than silently picking a side. `LAUNCH-BLOCKERS.md` still lists
  "a portrait photograph" among the assets **needed from the founder**, which
  would make the absence a gap rather than a decision. The code settles it: the
  About page carries the comment "Deliberately not a portrait — the founder chose
  not to publish", and that file was last touched 2026-07-28, after the
  2026-07-27 polish-pass note that produced the blockers line. So the decision is
  the current state and the blockers entry is the stale one — it should be struck
  there, not restated here. Flagged rather than edited because that file is being
  changed in another session.

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

### `/trust` and `/validation` — the two pages that answer "why should I believe you"

Both were added in the 2026-07-28 pass and are the direct expression of section 2. `/trust` states the data-handling claims and, where possible, points at what
enforces them rather than at a promise — its own rule is that every claim is
either enforced by a test or derived from something checkable. It names the mail
carve-out explicitly, in the plain terms ADR-0004 requires: a notification goes
to our own team through a relay outside the Kingdom, it says only which kind of
enquiry arrived, and it carries nothing about the person who wrote in. Naming an
exposure that small is a deliberate habit — "too small to mention" is the
reasoning behind every claim this site has had to correct.

`/validation` exists because "validation pending" on 22 calculators is an
unexplained hole otherwise. It says what the badge means, what would change it,
and how to volunteer, which turns an apparent gap into an open invitation.

The honest weak point, recorded rather than glossed: `/trust`'s residency claim
is currently hand-maintained prose about infrastructure, which is the one
category on the site not backed by an automated check. Section 6 explains why
that matters and what is meant to fix it.

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

**The deployment is honest about where data lives — and the position changed on
2026-07-28.** This paragraph previously recorded the older decision (ADR-0003:
accept a global CDN, qualify the public wording) as though it were settled. It
is not. `ADR-0004` supersedes it, and the two facts a reader needs are these:
**the mandate is decided, and the implementation is not done.**

**The mandate.** All processing happens inside Saudi Arabia — not just plaintext
personal data but **metadata too**: visitor IPs, request URLs, vendor logs, for
everything the platform controls. The narrower scope, plaintext only, was
rejected specifically because it is the scope under which the expensive vendor
option would have qualified; a definition that conveniently licenses the thing
you were already tempted to buy deserves suspicion. The wider one — absolutely
everything, down to DNS resolution and certificate transparency logs — was
rejected because nobody can actually deliver it, and committing to it publicly
would itself be a false claim.

**Two carve-outs, written down rather than hidden.** Infrastructure that touches
no personal data (GitHub and CI, Let's Encrypt and CT logs, npm and container
registries, the registrar). And **outbound notification mail**, which needs
saying plainly: the relay is `mail.towardpicu.com`, a SiteGround host in the
United States. It is defensible only because of a narrow chain — the submitter
acknowledgement was removed, so the only message that relay ever carries is a
notification to the operator, whose body is a submission type and a link into
the admin inbox, sent to a mailbox that is already outside the Kingdom. What
leaves KSA is therefore _an enquiry of some kind arrived, at some time_. That is
metadata about the platform, not data about a person. Reinstate any
submitter-facing mail and the chain breaks — that has to be revisited before
such a feature ships, not after.

**What is actually true today.** The edge has not moved. Requests still transit
Cloudflare, TLS still terminates there, and the public copy still carries its
transit caveat and names the mail exception. Cloudflare Enterprise was ruled out
on the merits rather than on cost: its Customer Metadata Boundary, which governs
where Cloudflare's own logs including visitor IPs live, offers only EU or US.
There is no Saudi option, so the expensive answer does not work at any price.
The replacement is an OCI load balancer and regional WAF in `me-riyadh-1` —
chosen because it is confirmable by API rather than by a vendor's policy page —
and it is **planned, not built**. The public residency wording changes in the
same deploy as the DNS cutover and never one day before it.

**A correction worth keeping visible.** An earlier version of this document said
mail delivery had been "chosen in-region to avoid widening it further". That was
never operationally true — the tenancy held zero email domains, so nothing was
ever sent in-region, and mail is still not configured at all today. It survived
because it was plausible, sat in prose that no test reads, and described
infrastructure rather than code. That is the same failure shape as the citation
count above, and it is the reason ADR-0004's real deliverable is not a published
data-flow map but a **recurring check that fails loudly when any path drifts out
of region** — the TLS terminator, the MX, the tenancy's region subscriptions,
backup replication. A fact that was true when written, infrastructure that moved
underneath it, and nothing connecting the two, is how every false claim on this
project has happened.

One more piece of honesty about scope: the tenancy's single-region subscription
is **state, not a control**. An administrator can add a region in one click and
OCI never permits unsubscribing. Until an IAM policy or quota backs it, the
correct phrasing is "nothing is deployed outside KSA", not "nothing can be".

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

Live at **www.towardpcc.com** since 2026-07-26, deployed from `main` on every
push. **893 unit tests across 57 files, all green** — 628 on the scoring engine
at 100% coverage, 223 in the web app, 42 on the design tokens — plus **83
end-to-end tests across ten spec files, of which 82 pass**. Every route inside
the 170 KB budget, nightly backups with a rehearsed restore.

That list used to end "WCAG 2.2 AA" as a flat statement of fact. The honest
version is narrower: **contrast** is machine-asserted against the shipped
stylesheet, and the rest of AA rests on a manual sweep whose findings were never
written down. `axe` is in no `package.json` and no workflow, so nothing
automated checks the other success criteria — which also means the PRD's locked
"axe-clean in CI" principle is unmet rather than met. The sweep almost certainly
happened and probably found what it says it found; the point is that a reader
cannot confirm it, and this document's job is to say which claims they can.

(That unit-test figure read 712 until 2026-07-28. It was true when written and
three passes of work had landed since. It is recounted here by running the
suite, not by adding up what previous documents claimed — which is the whole
discipline this file is about.)

The e2e figure has the same history and is worth spelling out. It read "59
assertions" from the polish pass, then was reduced to "ten spec files" because
nobody had re-run Playwright. The number above comes from the CI log of run
`d948462` (2026-07-28): `Running 83 tests`, `82 passed`. Note the unit is
**tests**, not assertions — the old 59 was counting something else, so the two
figures were never comparable and replacing one with the other would have been
a third wrong number.

**One of those 83 is currently failing, and `main`'s CI is red.** The failure is
`e2e/evidence-rail.spec.ts:42`, a scroll-position assertion about which carousel
indicator is marked current — not a clinical, privacy or security path, and
specifically **not** the TM-001 airplane-mode privacy spec, which passes. The
`quality` job is red too, on `pnpm format:check`.

Both failures are small; their consequence is not. `quality` runs typecheck →
lint → format:check → test → build → budget:check, and a failed step skips
everything after it. So on the last five commits to `main`, **CI did not run the
unit tests, did not build the app, and did not check the 170 KB route budget** —
all three show `skipped`. The 893/893 above is a real number, but it comes from
running the suite locally today, not from CI, because CI has not run it since
`4ca5ea5`. A formatting nit quietly switched off every gate behind it, and
nothing looked broken, which is the only reason it lasted five commits.

That is worth sitting with, because it is this document's own recurring failure
shape wearing different clothes: not a false statement, but a true one whose
supporting machinery had stopped running underneath it. "Enforced in CI" is a
claim about something that has to actually execute — a gate that is skipped is
indistinguishable, in every document that cites it, from a gate that passed.
Deployment does not depend on any of it either: Coolify deploys from `main` on
the container healthcheck alone, GitHub Actions is not in that path, and `main`
carries no branch protection.

Two things are worth naming, because they were the hardest to prove and they are
the ones a sceptical reader should ask about: the runtime database role holds no
`CREATE` on schema `public`, and the audit log is append-only **at the database
level** — that role has only `INSERT` and `SELECT` on `AuditLog`, against full
DML on `Submission`.

Both were checked against the live database at bring-up rather than inferred
from a migration file, and that is the right way round. But this paragraph used
to end "the verification commands are in the deploy runbook so the next person
can re-check rather than trust this sentence", and that promise was larger than
the runbook keeps. `deploy-production.md` §Verify the hardening runs two
commands: the app role cannot `DELETE` from `AuditLog`, and it is not a
superuser. There is no command there for the no-`CREATE`-on-`public` claim, for
the `UPDATE` revocation, or for the `Submission` contrast. Nor can this
repository settle them — the SQL under `docker/` belongs to the compose stack
that never shipped, so it records what was intended, not what production has.

So the honest form is: one of these is re-checkable from the runbook today, and
the rest rest on a bring-up report. Extending those two commands to cover all
four assertions is small work and is the thing that would let this paragraph
make its original claim.

Honestly outstanding:

- **SMTP relay** — submissions are stored safely, but nothing emails you when
  one arrives. The admin inbox says so, deliberately, because a broken relay is
  otherwise indistinguishable from nobody writing to you. Everything on the
  engineering side is finished; what is missing is a mailbox password, which is
  a credential and therefore the founder's to enter.
- **KSA-only processing (ADR-0004)** — decided, not implemented. The data path
  still runs through Cloudflare. See section 6.
- **Inbound mail** — the sharpest open contradiction. `towardpcc.com`'s MX
  points at a filter outside the Kingdom that reads every message sent to
  `info@towardpcc.com` — the address on `/contact`, named in the legal pages as
  the deletion contact, and published in `security.txt`. Fixing it needs a KSA
  mail host that does not yet exist in the stack.
- **Counsel review** of the legal pages.
- **Clinical validators** — two named reviewers per score, so the badges can
  stop saying "pending". `/validation` explains the gap in the meantime.
- **Monitoring** — nothing watches the site. No uptime monitor, no error
  tracker. `/api/v1/ready` is the right thing to watch; `/api/v1/health` is not,
  because it returns 200 with a dead database.
- **A second pair of hands** — one operator, no secondary on-call contact.
- **Domain trust program** — partly done, and the part that is done is the part
  that matters most for the failure mode being guarded against: the registrar
  carries the full client-side lock set and the registration runs to 2028. A
  sibling society's lapsed domain is currently squatted by a gambling site.
  Still missing: DNSSEC, and **CAA records — there are none, so any CA in the
  world may issue for this domain**.
- **Database network segmentation** — the database is reachable from other
  tenants' containers on a shared Docker network. Narrower than it sounds: that
  Postgres container holds only this application's database, and the co-tenant
  with real patient data runs MySQL/MariaDB elsewhere on the host.
- **Real counter figures and imagery** from the founder. Placeholders ship
  until then, and no figure is invented.
- **`main`'s CI is red, and has been for five commits** — a Prettier failure on
  one markdown file, plus one evidence-rail assertion. Small in itself; it
  matters because the failing step sits ahead of the unit tests, the build and
  the route-JS budget check, so all three are being skipped. Fix the two, then
  reorder the job so a cosmetic failure cannot switch off the real gates.
- **Accessibility beyond contrast is unautomated** — `axe` is in no
  `package.json` and no workflow, so the PRD's locked "axe-clean in CI"
  principle is unmet.

---

_Reconciled 2026-07-28. Every claim in this document was checked against the
code, the runbooks or a command actually run — not recalled. Where something is
aspirational, or could not be verified from this repository, it says so on the
line rather than in a caveat at the bottom._

_That sentence used to end at "not recalled", and it was not true: this file
shipped a citation count that was wrong by two, a mail-delivery claim that was
never operationally true, a residency position that a later ADR had reversed,
and a description of the home counter band listing four figures it no longer
shows. All four are corrected above and the reasoning for each is
left in place, because the corrections are more instructive than a clean
document would be. If you are the next person to edit this file: the failure is
never a lie, it is a fact that was true when written, sitting in prose that no
test reads, describing something that has since moved._

_An adversarial re-check on 2026-07-28 caught three more, and they rhyme. A flat
"WCAG 2.2 AA" that turned out to mean "contrast is machine-checked, the rest was
a manual sweep with no artifact". A promise that "the verification commands are
in the deploy runbook" when the runbook covers one of the four things claimed.
And a test count presented as current while CI had not run the suite for five
commits. Note what none of these were: invented. Each was a true sentence whose
supporting machinery had quietly stopped covering it. So the next reader's
sharpest question is not "is this false?" but **"what still checks this, and did
it run?"** — a gate that is skipped and a gate that passed look identical from
inside a document._

_The counts here that were re-derived rather than repeated, so you can tell them
apart: 22 scores, 87 references, 56 with both PMID and DOI, 16 with neither, 8
categories, 10 of 22 carrying interpretation bands; 893 unit tests over 57 files
(628 / 223 / 42); 83 e2e tests over 10 spec files; border tiers at 3.71, 1.78
and 1.43 against the page. Everything else about live infrastructure — the
volume's encryption state, the production grants, DNS and RDAP, MTA-STS — is
attributed to a dated check or marked unverified, and none of it was re-run
today._
