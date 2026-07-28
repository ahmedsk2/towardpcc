# ADR-0005 — Score computation stays in the client, on every platform

**Status:** accepted, 2026-07-28
**Resolves:** threat-model **TM-010** (`docs/security/threat-model.md` §2.6 and
mitigation 18 under P7), which asked for this ADR and never got one.
**Related:** ADR-0002 (scoring-engine architecture), ADR-0004 (KSA-only
processing), PRD §6.4 (`docs/prd/30-modules.md`), PRD §12
(`docs/prd/50-ops-future.md`), taskmanager MEM-009, MEM-012 and MEM-021.

## Context

Two sentences in the PRD contradict each other, and until now the contradiction
had been resolved only by one-line assertions in places a code reviewer does not
read — plus, decisively, by what the code happened to do.

PRD §12, planning for React Native, says to _"keep all business logic behind the
API rather than in page components."_ Read literally — and it will be read
literally, by someone new, at speed, in a code review — that instruction covers
score computation, because a PIM3 calculation is unambiguously business logic.
Following it would move scoring to the server.

PRD §6.4 says the opposite about this one thing, and stakes the product on it:
_"Calculations run entirely in your browser. Nothing you enter is transmitted or
stored."_ — _"and make that architecturally true."_ The threat model flagged the
collision (TM-010) and proposed the answer.

Be precise about what was and was not missing, because an earlier draft of this
file overstated it. The answer **was** recorded, in three places: threat-model
mitigation 18 states it in one line; taskmanager MEM-012 ("Calculators are
client-side, always") is an active constraint; and MEM-021 says outright
_"Scoring stays client-side on every platform — /api/v1 never receives calculator
inputs (resolves PRD §12 vs §6.4)."_ Per CLAUDE.md those memories are locked
decisions, so it is not true that nothing in writing held the line.

What was missing is narrower and still worth fixing. Each of those records is a
single asserted sentence with no reasoning attached, and none of them is where a
reader looks: mitigation 18 sits in a `[GAP]` list that reads as unfinished work,
and the memories live in `.taskmanager/taskmanager.db`, invisible to anyone
reviewing a pull request or reading `docs/decisions/`. A rule you cannot argue
for is a rule that loses to the first plausible convenience — and this project's
strongest privacy claim, printed on every calculator page, on the homepage, in
the footer and on `/trust`, deserves an argument rather than an assertion. That
is what this ADR adds: the reasoning, the boundary, the named pressures, and an
honest account of what the guards do and do not cover. Mitigation 18 asked for
exactly this file and it did not exist until now.

### What is true today (verified 2026-07-28, not assumed)

_Scope of that verification, so nobody over-reads it: everything below was
checked by reading the working tree on branch `polish/pre-launch`. Nothing here
was checked against `towardpcc.com` — no page was fetched — so every statement
about what the live site says or does is really a statement about the repo, and
holds only insofar as what is deployed matches this branch. The guards described
under "How it is enforced today" were verified to exist, to be wired into
`.github/workflows/ci.yml`, and to assert what is claimed **by reading their
source**; the suites were not executed while writing this, so "they assert X" is
verified and "they currently pass" is not._

- **The engine is pure and dependency-free.** `packages/scoring-engine/package.json`
  has no `dependencies` key at all — only `vitest`, `typescript` and the coverage
  provider under `devDependencies`. It is published as TypeScript source
  (`"exports": { ".": "./src/index.ts" }`) and compiled by the consumer;
  `apps/web/next.config.ts` lists it in `transpilePackages`. A grep for `fetch(`,
  `XMLHttpRequest`, `WebSocket`, `navigator.`, `window.`, `document.`, `require(`
  and dynamic `import(` across `packages/scoring-engine/src` (excluding tests)
  returns exactly one hit, and it is the phrase "collection window" inside a
  KDIGO help string. There is no network primitive in the engine.
- **Computation happens in a client component.**
  `apps/web/components/calculator/calculator-form.tsx` is `"use client"` and calls
  `definition.compute(...)` (line 145) inside a `useMemo`. The detail route
  `apps/web/app/calculators/[slug]/page.tsx` is statically prerendered
  (`generateStaticParams`, line 27) and passes only a slug.
- **Shareable state is in the fragment, never the query string.** The form
  encodes inputs as `id=value~unit` joined by `;` and writes them with
  `window.history.replaceState`. Browsers do not send the fragment to the server,
  so a shared link cannot land in an access log.
- **`/api/v1` has exactly two endpoints and neither takes an input.**
  `apps/web/app/api/v1/health/route.ts` and `apps/web/app/api/v1/ready/route.ts`
  are both parameterless `GET`s returning a fixed JSON shape. The only other
  route handler in `app/api` is the Auth.js catch-all at
  `app/api/auth/[...nextauth]` — it does take input, but it is admin
  authentication, outside `/api/v1`, and nothing on a calculator page reaches it.
  Every server action in the repo lives under `app/contact`, `app/data`,
  `app/knowledge`, `app/services` or `app/admin` — none under `app/calculators`.

The site makes the promise in these words, and they are load-bearing:

> "Calculations run entirely in your browser. Nothing you enter is transmitted or
> stored." — `apps/web/content/site.ts` (`calculators.privacyLine`), rendered on
> every calculator page.

> "0 bytes transmitted — calculators compute in your browser" —
> `site.footer.privacyBadge`, on every page.

> "Every calculation runs entirely in your browser. The values you type — a
> weight, a blood gas, a score — are computed on your own device and are never
> transmitted to us or stored on any server. You can confirm this: the
> calculators keep working with the network switched off." —
> `site.dataProtection`, rendered at `/legal/data-protection`.

> "This is the one guarantee the whole platform is built around, so it is
> enforced by architecture and not by policy." — `apps/web/app/trust/page.tsx`.

The homepage counter reading `0` / "Bytes transmitted" links to `/trust` with the
label "proven by test", and the collection table at `/legal/data-protection`
lists the calculators' row as `Nothing · They compute in your browser · —`. Those
are not marketing adjectives; they are falsifiable statements, which is the point.

## Decision

**1. Score computation is excluded from PRD §12's "business logic behind the API"
rule.** The engine ships inside the client and executes there. `/api/v1` never
receives calculator inputs, never returns a computed score, and gains no scoring
endpoint. §12's rule continues to govern everything else it was written for.

**2. The exclusion applies on every platform, including any future mobile or
native build.** React Native, Expo, a Capacitor wrapper, an Electron build, a
partner white-label — all of them import `@towardpcc/scoring-engine` and compute
locally. This is stated as a platform-independent rule specifically so that
"we're on a different runtime now" is not available as an argument later. The
promise is made to a clinician; it is not scoped to a rendering target.

**3. This ADR is the authority when §12 and §6.4 appear to conflict.** §6.4 wins
for computation. If a future reader finds a third reading, the answer is the same
and they should extend this file rather than resolve it in a pull request.

## Why the exception exists

Not "for privacy" in the abstract. Concretely: because of what would be in the
request body.

A clinician using **ETT size & depth** or **APLS weight estimation** enters a
child's age and weight. On its own that looks trivial. Attached to it, for free,
would be a timestamp and a source IP — and PICU traffic does not come from
anywhere; it comes from a hospital, on that hospital's egress address. What we
would actually be receiving is: _a child of this age and this weight was being
sized for an endotracheal tube at this hospital at 03:14._ That is a clinical
event, at a place, at a minute.

**PIM3** is worse, and it is the score this platform is proudest of. Its inputs
are exactly nine, and they are a physiology set (verified against
`packages/scoring-engine/src/scores/pim3.ts`): pupils fixed to bright light,
mechanical ventilation in the first hour, elective admission, recovery category,
main-reason risk tier, systolic blood pressure, base excess, FiO₂ and PaO₂. That
is not a number — it is a de-identified-in-name-only admission record.

The re-identification worry that follows is **reasoning, not a cited finding, and
no source is claimed for it**. It is stated because it is the honest basis of the
decision, not because it has been measured: re-identification risk scales
inversely with the size of the population you are picking from, and a PICU is a
small denominator by definition. A single submission would carry a blood
pressure, a base excess, an oxygenation ratio, a pupil finding, a ventilation
state and a diagnosis tier — plus, for free, a timestamp and the hospital's
egress IP. Someone with access to that hospital's admission list on that day
would not need many of those fields to know which child it was. (Note that PIM3
does not collect age or weight; an earlier draft borrowed those from the ETT/APLS
example above, which was sloppy. The argument does not need them. A separate
earlier draft asserted a typical regional PICU bed count, which had no source and
has been removed rather than softened.)

Under the Saudi PDPL this looks like health data — the most sensitive category —
and if it arrived at our server we would acquire a lawful-basis question, a
retention obligation, a breach clock, subject-rights machinery and a cross-border
analysis. **State that as this project's own reading, not as settled law:** it is
our characterization, extrapolated from the compliance framing in PRD §8.3, and
it has not been reviewed by counsel. PRD §8.3 explicitly permits "PDPL-aligned
practices" while prohibiting any blanket "compliant with [law]" claim, and the
legal pages still carry `TODO:counsel-review` markers (tracked in
`LAUNCH-BLOCKERS.md` under Content / legal). Nothing in this ADR should be cited
as a legal conclusion, and if counsel reads the classification differently the
decision below does not change — the argument survives on the privacy promise,
the offline requirement and the blast-radius point alone. What is uncontroversial
either way is the practical part: today we have no lawful-basis question, no
retention obligation and no breach clock for calculator inputs, because there are
no calculator inputs to have them for. Not being in possession of patient
physiology is by an enormous margin the cheapest way to handle it correctly.

And the aggregate is worse than any single record. A steady feed of PIM3 inputs
from one hospital is that hospital's case mix and severity distribution — exactly
the data that institutions negotiate governance agreements and data-sharing
committees over, and that this project promises the future registry will only
touch inside the participating unit. Collecting it as an incidental side effect
of a free calculator, without anyone ever agreeing to it, would be a betrayal of
the registry story before the registry exists.

Set against that, what does the network hop buy? Nothing the user needs. The
computation is arithmetic — tens of lines of pure TypeScript with no external
data, no model, no secret, no licensed table. PIM3, the heaviest of them, is a
thirteen-coefficient logistic regression whose `calculate` body is about fifty
lines. And the "no licensed table" part is checkable, not asserted: all twenty-two
published scores carry `ipStatus.kind: "freely-reproducible"` in their
definitions — none is `permission-required`, so nothing in the catalog needs a
server to hold something we may not ship. If a future score changes that, this
sentence has to change with it. There is no server capability involved. A round trip would exist purely for _our_ convenience — analytics,
debugging, telemetry — paid for with the clinician's data. A platform whose users
are typing a child's physiology into a box cannot ask them to trust a hop it does
not need. Asking would also be self-defeating: the whole reason a stranger
believes this claim is that they can check it in ten seconds by turning off wifi.
A checkable guarantee is worth more than a stated one, and it stops being
checkable the instant there is a legitimate request in the trace.

Two further reasons make the decision robust even to someone who does not weigh
privacy the way we do:

- **It is a functional requirement.** PRD §6.5 requires "the entire calculator
  catalog precached and fully functional offline", and gives the reason in four
  words: _"bedside dead-zones are real"_. The specific places one imagines —
  a basement imaging suite, a transport ambulance, a ward with one bar of signal
  — are illustration, not PRD text. A server-side calculator is a calculator that
  fails precisely where it is needed most.
- **It is a blast-radius limiter.** A compromise of the web tier today cannot
  yield a single calculator input, because none has ever been stored. That
  property is free right now and unrecoverable once given up — you cannot
  un-collect data retroactively.

## What this does NOT excuse

The exception is narrow and must not become a general licence. Everything else
§12 was written for still holds, and specifically:

- **Form submissions stay server-side.** Contact, pilot-interest, data and
  services requests are validated with Zod on the server (`lib/submissions.ts`),
  rate-limited per IP and globally, and stored. They are a different thing
  entirely: the submitter chose to send them, to a named recipient, for a stated
  purpose. On retention, be careful how this is repeated: the 24-month figure the
  site publishes is implemented as `SUBMISSION_MONTHS = 24` in
  `packages/db/scripts/purge-retention.mjs`, but nothing in this repo schedules
  that script — no compose service, no CI job, no cron unit — so the runbooks'
  phrase "the scheduled retention purge" describes an intended operation, not a
  verified running one. That is a deployment question outside this ADR's scope,
  flagged here only because "kept for 24 months, then deleted" is a public
  commitment on `/legal/data-protection` and someone should confirm it runs.
- **Admin actions stay server-side and audited.** Authorization is enforced
  inside each handler rather than only in the layout: `requireAdmin()` is called
  at the top of every data-touching server action and page under
  `app/admin/(protected)` — `submissions/actions.ts`, `calculators/actions.ts`,
  `mail-actions.ts` and each protected page. Two exceptions, both correct and
  both stated so the rule is not repeated as absolute: `signOutAction` in
  `(protected)/actions.ts` only calls `signOut()` and touches no data, and
  `loginAction` under `app/admin/login` is pre-authentication by nature. The
  `AuditLog` append-only control is **verified live, 2026-07-28**:
  `towardpcc_app` holds only INSERT and SELECT on that table, against full DML
  on `Submission`. So a compromised application cannot erase its own trail.

  Worth recording how this paragraph got written, because it is the ADR's own
  subject in miniature. It first said "prepared but not confirmed live", on the
  authority of a `[~]` entry in `LAUNCH-BLOCKERS.md` — a document, not the
  system. The control had in fact been applied. Reading the database settled in
  one query what two documents had disagreed about for three days.

- **The registry stays server-side and audited.** When it ships it will be a
  governed deployment inside a participating unit, with real authentication,
  authorization and an audit trail. A saved score inside that deployment is
  normal and correct. This ADR does not license the registry to compute in the
  browser and skip its audit log; it licenses the _public calculators_ to
  transmit nothing.
- **Nothing here excuses a general "compute it on the client" habit.** The
  reason this exception is defensible is that the computation needs no server
  capability and the inputs are unusually sensitive. Where either half of that is
  false — anything involving authorization, uniqueness, pricing, or a shared
  source of truth — the client is the wrong place and §12 applies unchanged.

## The pressures that will erode this, and what an acceptable version looks like

These are predictable. Naming them now costs nothing and makes the argument
already available to whoever has to have it.

**1. "We need server-side analytics on which scores get used."** Legitimate
question — it decides what to build next. No analytics collector is loaded by the
application today: `apps/web/content/privacy-claims.test.ts` scans every
non-test `.ts`/`.tsx` under `apps/web/app` and `apps/web/components` for
collector signals and fails if the privacy copy declares collection that is not
wired. Two honest limits on that: the scan matches a fixed list of signals
(Umami, Plausible, GTM/gtag, Matomo, PostHog, `NEXT_PUBLIC_*` analytics vars), so
an unlisted collector or one added under `packages/ui` would not trip it; and a
`umami` service still exists in `docker-compose.prod.yml`, unreferenced by any
application code. If a collector is added: **page views only, and no more** —
which is not a new rule invented here, it is PRD §6.4's own wording, _"analytics
may log page views only, never input values."_ A route is not an input. Never an
event payload keyed to a field,
never a value, never a range bucket, and above all **never the interpretation
band** — a band is the clinical finding, so "high mortality risk observed at
hospital X, 03:14" is the same disclosure as the raw physiology with extra steps.
The URL fragment must be stripped before anything is recorded (already tracked as
the remaining half of TM-001 in `LAUNCH-BLOCKERS.md`), because the fragment is
exactly where the inputs live. A `/calculators/pim3` page view is fine. A PIM3
result is not.

**2. "Just log the inputs when compute fails, so we can debug it."** The most
sympathetic pressure on this list — a rejection you cannot reproduce is genuinely
hard to fix. Acceptable version: log the machine rejection `code` and the input
`id` that produced it, with no value attached, and only if that log is
client-side or explicitly user-initiated. `ComputeResult` already carries a
structured `{ code, inputId }` for exactly this. If a value really is needed, ask
the user to paste the shareable link into a bug report: the fragment already
round-trips the full state, and a person choosing to send it is consent, whereas
a beacon is not. Automatic transmission of a value is not acceptable in any form,
including "only on error", including "only 1% sampled", including behind a flag
that defaults off.

**3. "The mobile app will just call the API — it's simpler in React Native."**
This is the one most likely to actually happen, because it will arrive as a
sprint-level convenience rather than as a policy proposal. There is no acceptable
version. The engine has zero runtime dependencies and no DOM references
specifically so that a React Native build can import it unchanged: that is
ADR-0002's stated intent ("consumed as TS source by Next.js today and by React
Native later") and PRD §12's, and it is the reason for the tsconfig `lib`/`types`
restriction and the ESLint global ban.

Say the weak part out loud, because it is exactly where this argument will be
attacked: **that portability has never been demonstrated.** There is no native
code in this repo and no build has ever imported the engine outside Next.js. What
is verified is the preconditions — no `dependencies` key, no DOM or network
primitive in `src`, compiled from source by the consumer — not the conclusion. So
if someone reports that the import genuinely does not work, that is new
information and deserves a real answer rather than this paragraph quoted back at
them. The answer is still not an API call: a build-configuration problem gets a
build-configuration fix, and the fallback of last resort is shipping a
precompiled JS build of the same pure module, not transmitting a child's
physiology. The privacy line ships in the mobile UI too, so an API call there
does not weaken a promise — it falsifies one.

**4. "The registry wants to save a computed score against a patient."** Entirely
reasonable, and inside the registry deployment it is the normal thing to do:
authenticated, authorized, audited, inside the unit, under that unit's
governance. The prohibition is narrower and sharper — **the public calculator at
`towardpcc.com/calculators/*` may not write to anything.** If a registry user
wants to save a score, they must be in the registry application, and the UI has
to make that boundary visible, because the public page renders "Nothing you enter
is transmitted or stored" and that sentence would become false for that user
while remaining on screen. A shared component that silently posts when a session
exists is the exact failure to avoid. The public site already tells people the
registry "is a separate deployment that runs inside a participating unit"
(`site.ts`); this keeps that true.

**5. "Shareable links would be easier as query strings."** No. Query strings
reach access logs, referer headers and any proxy in the path. The fragment is the
mechanism precisely because it does not, and the static guard already fails the
build on `useSearchParams` or `searchParams` under the calculator routes.

**6. "Server-render the result so link previews and SEO look better."** The
prerendered page has no inputs by construction, and a filled result is inherently
per-user. There is no acceptable version; the SEO story is the score's
documentation, which is already static.

### Rejected alternatives

- **Follow §12 literally and move scoring server-side.** Rejected: it falsifies
  four separate public claims, breaks the §6.5 offline requirement, and would
  start server-side processing of what we read as PDPL health data where today
  there is none. It also misreads §12, which in the same sentence says the mobile
  plan is "importing `packages/scoring-engine` unchanged" — the literal reading
  contradicts its own clause.
- **Compute client-side but POST the inputs for telemetry.** Rejected. From the
  user's side this is indistinguishable from the previous option — the promise is
  "nothing you enter is transmitted", not "we also compute it locally".
- **Server-side compute over "anonymized" or hashed inputs.** Rejected: a
  physiology set is not anonymized by removing a name, and it still breaks
  offline use.
- **Client-side on web, API on mobile.** Rejected in decision 2. It is also
  probably unnecessary on the merits — the engine is dependency-free and DOM-free
  precisely so it can be imported unchanged — though as noted under pressure 3
  that has not actually been demonstrated, so "unnecessary" is an expectation
  here and not a verified fact.
- **Leave it at the one-line assertions in MEM-012, MEM-021 and mitigation 18,
  since the code is already correct.** Rejected. Those are real records and this
  ADR does not pretend otherwise, but a bare assertion cannot be weighed against
  a concrete convenience by someone who has not seen the reasoning, and none of
  the three surfaces during code review. The point of writing this out is that
  the next person can lose the argument on the merits rather than on not knowing
  there was one.

## How it is enforced today

Four mechanisms, all running in CI (`.github/workflows/ci.yml`), but not by the
same command — worth being exact, because "it's covered by the tests" is how a
gap hides. Mechanisms 1 and 3 are vitest suites picked up by `pnpm test` in the
`quality` job. Mechanism 2 is Playwright in the separate `e2e` job, which builds
and serves the production bundle on port 3100 before driving Chromium. Mechanism
4 is not a test at all: it runs in the `quality` job under `pnpm typecheck` and
`pnpm lint`, so deleting it would show up as a lint or compile failure, never as
a red test. Each of the four was verified by reading its source — see the scope
note in Context: none was executed while writing this ADR, so what follows is
"these guards assert X", not "these guards are green today".

1. **`apps/web/content/privacy-invariant.test.ts`** — static source scan. Walks
   every `.ts`/`.tsx` under `apps/web/app/calculators` and
   `apps/web/components/calculator` and fails on `useSearchParams`, a bare
   `searchParams`, or a `"use server"` directive. Proves the shipped source has no
   query-string or server-action escape hatch.
2. **`apps/web/e2e/calculator-privacy.spec.ts`** — runtime proof. Loads
   `/calculators/anion-gap`, lets the service worker settle, cuts the network with
   `context.setOffline(true)`, and asserts the result still computes. A second
   test records every request and body, asserts that entering values fires no
   data-carrying request, permits only inert Next.js `_rsc` route prefetches, and
   asserts a sentinel input value appears in no URL or body ever requested.
3. **`packages/scoring-engine/src/no-runtime-deps.test.ts`** — asserts the
   package's `dependencies` map is empty. A transitive dependency is the realistic
   route by which a beacon enters the crown jewel (threat-model AC-4), and this
   makes adding one a deliberate, visible act.
4. **Compile- and lint-time DOM/network ban** — `packages/scoring-engine/tsconfig.json`
   sets `lib: ["ES2022"]` and `types: []`, so `window`, `document` and `fetch` do
   not typecheck inside the engine; the root `eslint.config.mjs` adds a scoped
   `no-restricted-globals` rule over `packages/scoring-engine/src/**/*.ts` banning
   `window`, `document`, `navigator`, `localStorage` and `fetch` by name. Note the
   lint rule deliberately exempts `src/**/*.test.ts` (tests use Node/vitest
   globals), so the ban covers shipped engine code only — which is the code that
   matters, but it is a scope, not a blanket.

Supporting, but not enforcement: the production CSP in `apps/web/proxy.ts` sets
`default-src 'self'` and `connect-src 'self'`, which blocks a third-party beacon.

## What those guards do NOT cover

Stated plainly, because a guard people over-trust is worse than one they know the
limits of.

- **The e2e exercises exactly one calculator.** `anion-gap`, three fields. A leak
  introduced in a score-specific code path — a custom PIM3 field, a unit toggle,
  the copy-summary handler on a different score — would pass. Twenty-one of the
  twenty-two scores are covered only by the static scan.
- **The static scan looks for three patterns, and `fetch(` is not one of them.**
  It bans the query string and server actions. A plain
  `fetch("/api/v1/telemetry", { method: "POST", body })` inside
  `calculator-form.tsx` would not trip it. The e2e would catch that on `anion-gap`
  only.
- **It also only scans two directories.** A beacon added to
  `apps/web/app/layout.tsx`, to a shared component outside `components/calculator`,
  or to `packages/ui` is outside its walk, even though such code runs on every
  calculator page.
- **`connect-src 'self'` does not stop same-origin exfiltration.** A POST to our
  own `/api/v1/...` is CSP-legal. What actually prevents it today is that no such
  endpoint exists — and **nothing asserts that**. There is no test over the
  `/api/v1` route inventory, so adding a scoring endpoint would break no build.
- **Nothing covers a future mobile app.** There is no native code in this repo and
  no CI job that could run against one. Decision 2 is, for now, enforced by this
  document and by review — which is exactly the weak spot this ADR was written
  about, so it must become a real check in the same pull request that introduces
  a native build.
- **The engine's `fetch` ban is scoped to the engine.** `apps/web` has its own
  flat ESLint config without that rule. The engine cannot phone home; the form
  wrapped around it is guarded only by items 1 and 2 above.
- **The runtime `window`/`document` assertion in `no-runtime-deps.test.ts` is a
  weak backstop.** It proves the Node test environment has no DOM globals, not
  that the engine avoids them; the tsconfig and ESLint rules are the real
  enforcement. Related and worth correcting: ADR-0002 decision 8 refers to a
  `no-dom.test.ts`, which does not exist as a separate file — that check is folded
  into `no-runtime-deps.test.ts`.

The three cheapest ways to close the largest of these gaps. **These are
proposals, not decisions — they have not been agreed by the founder and nothing
below is committed work; do not read them as scheduled.** Parameterize the
airplane-mode e2e over `listScores()` so every score is exercised. Widen the
static scan to the full `apps/web/app` and `apps/web/components` trees looking
for network sinks reachable from a calculator route — `privacy-claims.test.ts`
already walks exactly those two trees for a different purpose, so the traversal
code exists and only the pattern set would be new. Add a test that asserts the
exact `/api/v1` route inventory, so a new endpoint becomes a deliberate act
reviewed against this file.

## Consequences

1. **PRD §12 now has a written, permanent carve-out.** Anyone reading "keep all
   business logic behind the API" should be pointed here. The carve-out is one
   thing — score computation — and its boundary is explicit.
2. **Some product questions are simply unanswerable, and that is accepted.** We
   cannot know which inputs clinicians actually enter, what distribution of PIM3
   scores the site produces, or where a rejection message confuses people. That
   cost is real and is paid deliberately: page-level usage plus direct
   conversation with pilot units is the substitute.
3. **The engine's zero-dependency, DOM-free constraint is now a privacy control,
   not only a portability one.** ADR-0002 justified it by React Native. It has a
   second job now, and relaxing it — a date library, an i18n runtime, a validation
   package — costs more than that ADR accounts for. Treat those guards as
   security-relevant.
4. **Any native build must ship a privacy-invariant test of its own**, in the pull
   request that introduces it, or decision 2 is enforced by nothing on that
   platform.
5. **The public copy is safe to keep as written, on the evidence available
   here** — the `/trust` claim, the `0 bytes transmitted` badge, the
   per-calculator privacy line and the `/legal/data-protection` collection row
   were each located in `apps/web/content/site.ts` and `app/trust/page.tsx` on
   2026-07-28 and match what the code does, with the coverage limits named in the
   previous section. The honest caveat is the one in the Context scope note: this
   was checked against the repo on `polish/pre-launch`, not against
   towardpcc.com, so it is a statement that the _source_ is accurate. Before
   anyone cites this ADR as clearance for the live wording, someone should
   confirm the deployed build is this branch. If any of those guards is removed,
   the corresponding sentence comes off the site in the same commit.

## Revisit if

A score is proposed that genuinely cannot compute client-side — one needing a
licensed lookup table that cannot be shipped, a trained model too large for a
bundle, or a cross-patient comparison. That would be a real conflict rather than a
convenience, and it deserves its own ADR: the likely answer is that such a score
ships as a registry feature inside the unit's deployment, not as a public
calculator, so that the public promise stays absolute rather than acquiring its
first asterisk.
