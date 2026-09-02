# TowardPCC — session guide

Clinical calculators for paediatric critical care. A wrong number here reaches a
bedside, so the standing rule is: **every claim the site makes is either enforced
by a check that runs on each release, or derived from data in this repo.** Hold
your own work to that — including what you write in a PR description.

Requirements live in PRD slices. `docs/prd/README.md` has the per-phase loading
map — load ONLY the slice the current phase needs, never the whole PRD.

Scoped guides carry the depth: `packages/scoring-engine/CLAUDE.md` for authoring
a score, `apps/web/CLAUDE.md` for UI, UX and the privacy invariants.

## Where truth lives

- **Open work, known gaps, parked items** — `LAUNCH-BLOCKERS.md`
- **Locked decisions** — `docs/decisions/` (10 ADRs). Several carry dated
  addenda and later numbered decisions that revise earlier ones; read to the END
  before citing one. `ADR-tier-b-ip.md` is the trap: its Findings table is stale
  and three addenda successively overturn each other.
- **History** — git.
- `.taskmanager/taskmanager.db` is **stale** (last written 2026-07-28, well over
  a hundred commits back). Do not trust its phase data or task tree.

## Invariants — never traded away

1. **Calculator inputs never cross the browser→server boundary.** Threat-model
   TB3 states this as a negative requirement, and `/trust` promises it publicly.
   It holds on every future runtime too — React Native, Electron, white-label —
   "different runtime" is not an available argument (ADR-0005). **This was broken
   for weeks while every guard reported fine** (found and fixed 2026-08-05): field
   state was mirrored into the URL fragment because browsers never transmit a
   fragment — true of the BROWSER, and silent about any SCRIPT in the same
   document. Cloudflare's JS Detections read `location.href` and POSTed it. The
   lesson generalises past this one bug: **assert a property, not an absence.**
   "No third-party scripts" requires knowing who else is executing; "entered
   values are not in `location.href`" does not, so it holds against code that
   does not exist yet. Reach for that shape whenever a guard is available in
   both.
2. **No calculator input reaches a server store.** `packages/db` exists only for
   the submission and admin surfaces. Client-side persistence is deliberate,
   disclosed on `/legal/data-protection`, and allow-listed: sessionStorage
   carries `age`, `age_months`, `weight`, `weight_kg` and nothing else;
   localStorage holds favourites. Widening either needs the allow-list amended.
   **Live open question:** since the fragment fix, a reload no longer restores a
   form. Persisting the remaining fields would fix that and is the obvious ask —
   it is exactly the amendment this invariant governs, so it is a decision to
   put to the founder, never a convenience to slip in alongside other work.
3. **Processing is KSA-first but NOT wholly in-Kingdom — and the site says so on
   purpose.** The request path came home on 2026-08-08: the apex and `www` now
   resolve to an OCI load balancer in me-riyadh-1 and Cloudflare is out of the
   request path entirely. **MAIL IS WHAT STILL LEAVES**, in both directions —
   inbound to the published address and the outbound operator notification, both
   through a provider whose servers geolocate to the US. The caveat MOVED, it did
   not disappear, and `apps/web/content/privacy-claims.test.ts` still fails the
   build on an absolute residency claim. Do not let the cutover tempt anyone into
   removing it. ADR-0004 carries **four** written exceptions, not two. Moving MX
   to a KSA-hosted provider is the single change that would make the claim
   unqualified.
4. **No clinical number ships without a citation and a cited worked example.**
5. **Crimson never means error**; no blue, teal or gold anywhere in the UI. This
   one is an internal design rule (ADR-design-direction), not a public promise.

## Before every PR: `pnpm gate`

Runs the CI `quality` job verbatim, in order — typecheck → lint → format:check →
test → build → web bundle budget.

Run it as `pnpm gate > "$TEMP/gate.log" 2>&1; echo $?` and read the log after.
**Piping it hides the failure**: `pnpm gate | tail` reports the exit status of
`tail`, so a run whose last line is `ELIFECYCLE Command failed with exit code 1`
still looks like a pass, and has been reported as one.

**When every changed path is markdown it runs `format:check` alone**, because
nothing else can observe a markdown change — verified 2026-08-07, not assumed:
no test reads a `.md` file at runtime (every `docs/` mention in a test is a
comment), ESLint has no markdown coverage, and typecheck, build and the budget
cannot see one. Any non-markdown path in the diff runs everything, so a mixed
batch is never scoped down. `pnpm gate --full` forces the lot, `pnpm gate
--explain` prints the decision without running it, and **any uncertainty — no
`origin/main`, a git error, an empty file list — runs the FULL gate.** Never
fast-path on doubt; the fast path is the shortcut this gate was written to
prevent, and it is only safe because it is bounded to a file type proven inert.

**The opposite waste is real too: reaching for `--full` by reflex.** On a
markdown-only change the full gate spends about three minutes — typecheck 48s,
lint 38s, tests 18s, build 55s, measured 2026-08-17 — to check something no
markdown file can affect. Plain `pnpm gate` decides for itself and is the
default; `--full` is for when you want to override that decision, not for
every run.

Four traps it exists to remove:

- **`pnpm test` does not typecheck.** Vitest never has. Running tests and lint
  while skipping typecheck is exactly how a type error reached `main` on
  2026-08-01. Run the whole gate, not the part that looks relevant.
- **`budget:check` measures nothing without a build.** It reads
  `.next/server/app/*.html` relative to cwd, so it is meaningful only after
  `next build` and only as `pnpm --filter @towardpcc/web budget:check`.
- **A `--filter` that matches nothing exits 0.** pnpm prints "No projects
  matched the filters" and succeeds. The path-shaped form is the one that bites:
  `--filter apps/web` matches nothing, while `--filter web` does resolve to
  `@towardpcc/web`. Use the exact package name and you never have to think about
  it — `@towardpcc/{web,scoring-engine,ui,db}`.

Coverage is not uniform and the gate does not pretend otherwise: `pnpm -r test`
reaches web, scoring-engine and ui only (db and config define no test script),
and root `lint` runs `eslint .` first precisely so those two are still linted.

Not in the gate, deliberately: `pnpm check:residency` and `pnpm check:integrity`
fetch the live site. They assert production against published claims and run on
a daily cron, never on a PR. CI additionally runs e2e, `pnpm audit`, gitleaks,
Lighthouse (warn-only) and the container build.

**To run e2e yourself — and while GitHub Actions billing is off, someone has
to — the command is `pnpm --filter @towardpcc/web test:e2e`.** A real run
prints `Running 134 tests using 1 worker`; five specs skip unless
`E2E_DATABASE_URL` points at a throwaway Postgres.

**`npx <anything>` from the repo root runs NOTHING, and can report success for
it.** Every test binary here belongs to a package rather than the root, so the
invocation dies with `'playwright' is not recognized` — or `'vitest'`, or any
other. That is not the interesting part. Run it as `npx playwright test > log
2>&1; echo $?; tail log` and the trailing `tail` supplies the exit status, so a
run that executed **nothing at all** reports **0**. Same shape as the
`pnpm gate | tail` trap above. Read the line count or the `N passed` line, never
the exit code alone.

**A bash heredoc mangles regexes and paths, and the error names the wrong
thing.** Writing a Python or Node script inline via `<<'PY'` collides with shell
and language parsing often enough to be a tax: an escaped `\.` arrives as a bare
`\.` and blows up the character class, a Windows `$TEMP` lands inside a string
as an invalid `\U` escape, and a backtick opens a subshell. Every one fails with
a syntax error pointing at a line you did not write. Five of them in one session
on 2026-08-17 — including, twice, while writing this very paragraph.

**Write the script to a file and run the file.** The scratchpad directory exists
for exactly this, costs one extra command, and makes escaping the language's
problem instead of the shell's.

Same discipline for editing source: derive line boundaries from CONTENT, never
from remembered line numbers. Hardcoded indices broke a JSX wrap twice on
2026-08-17 — searching for the opening tag and matching its indent worked first
try.

**`pkill` DOES NOT KILL A NODE SERVER ON THIS MACHINE, and says nothing.** It
exits cleanly and leaves the process listening, so the next thing you measure is
the OLD build. This cost three wrong readings on 2026-08-17: two dev-server
diagnoses against a stale process, and one FULL e2e run reporting 25 failures
including `/admin` returning 500 — none real, all a server on port 3000 serving
code from before the change. A stale server is worse than a crashed one, because
a crash is visible and this is not.

Kill by port, then confirm the port is dead before believing anything:

```bash
for pid in $(powershell.exe -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess" | tr -d '\r'); do taskkill //PID "$pid" //F; done
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 4 http://localhost:3000/
```

`000` means dead. Then check the new server bound the port it was ASKED for:
Next silently falls back to 3001 and Playwright falls back to a stale 3100 with
`EADDRINUSE`, and in both cases the run continues against the wrong thing.

This was written on 2026-08-08 as a fact about Playwright, and on 2026-08-09
the identical failure arrived from `npx vitest` while probing a score — so the
narrow version cost the second discovery. **It is a fact about the repo layout,
not about any one tool.** Reach for `pnpm --filter @towardpcc/<pkg> exec <bin>`
when you want a package's binary; `pnpm --filter` with a name that matches
nothing still exits 0, so use the exact package name.

## Production

- **The host is shared with other live applications, one of which holds real
  patient data.** Every change is additive and scoped to TowardPCC's own app and
  database. Never touch another project's containers, databases, or the shared
  proxy config.
- **Production is a Coolify application** on OCI (me-riyadh-1) behind Coolify's
  Traefik; Coolify builds its own image from `apps/web/Dockerfile`.
  `docker-compose.prod.yml` and `docs/runbooks/deploy.md` describe a stack that
  was designed first and **is not what runs** — editing them changes nothing in
  production. `docs/runbooks/deploy-production.md` is the live setup.
- **Push-to-deploy WORKS. Merging is enough — do not deploy by hand.** This file
  claimed the opposite until 2026-08-07 and the claim was false; the correction
  matters because acting on it wasted a redundant build on every single merge.
  Coolify's own queue shows every `main` push producing a `is_webhook=true`
  deployment that finished with the right commit. **Builds take 125–308 seconds**
  (measured across eight deploys), and Coolify does a rolling update, so the OLD
  container keeps serving until the new one is healthy. Checking the image tag
  thirty seconds after a merge shows the previous commit and means nothing.
  **Wait ~5 minutes, then check.** Every "dropped deploy" recorded here was that
  mistake, followed by a manual deploy of the same commit that then took credit.
- **Merging N PRs back to back queues N builds, and every one of them checks out
  the CURRENT HEAD, not the commit that triggered it.** So a batch of merges is
  SAFE — production never serves an older commit partway through — but only the
  last build does any new work, and `~5 minutes` becomes `~5 minutes per queued
build`. Measured twice on 2026-08-08: six merges queued four deployments, and
  the queue was observed rewriting a pending entry from `f63ce16` to the newer
  `da8cbbc` before building it; two merges later queued two, both already
  showing HEAD. **The wrong inference to draw is that a batch rolls production
  backward** — this file nearly recorded that, on the strength of the queue
  listing alone, before the poll trace showed the rewrite. It does not.
  `check:integrity` will read STALE for the whole drain, which is correct rather
  than a failure; wait for the queue to empty before believing it.
- **Prefer `pnpm check:integrity` over the tag check.** Since 2026-08-08 the
  canary asserts the DEPLOYED COMMIT, not only page content: `/api/v1/health`
  publishes a truncated `sha256(SOURCE_COMMIT)` and the script compares it with
  the SHA it checked out. It is strictly better evidence than the image tag, and
  measurably so — on its first real run it reported production still serving the
  previous commit at a moment when `docker ps` already showed the new tag. **The
  tag flips before the serving container does**, which is the gap that produced
  every "dropped deploy" in this file. Run
  `EXPECTED_COMMIT=$(git rev-parse HEAD) node scripts/check-integrity.mjs`.
- **The tag check still works as a fallback — just not immediately.**
  `sudo docker ps --filter name=gpsokvxzncr7ks1vzqz7wkr4 --format '{{.Image}}'`
  against `origin/main`, once, after the build has had time. Coolify's `status`
  field remains useless in both directions: it read `running:healthy` over a
  stale container and `running:unhealthy` over one Docker and both probes called
  healthy. Deploy by hand only when a deployment genuinely **failed** — one has,
  on 2026-08-03, when a helper container vanished mid-build under two merges
  three minutes apart. The API call is in `docs/runbooks/deploy-production.md`.
- **THE APEX AND `www` ARE NO LONGER PROXIED — cut over 2026-08-08.** They
  resolve to the OCI load balancer at `145.241.110.213`, which terminates TLS in
  me-riyadh-1 and is publicly reachable on its own NSGs. Cloudflare is
  authoritative DNS only and sees no request content. Re-proxying them would put
  requests back through an edge outside the Kingdom while `/trust` says they
  arrive directly, and would reinstate the injected script that caused TM-013 —
  `check-residency.mjs` now alarms on exactly that, having been inverted in the
  same change.
- **Proxying stays ON for every OTHER subdomain**, and the old warning still
  applies to them verbatim. `next`, `db`, `deploy`, `endorse`, `mnm`,
  `mylibrary`, `stg-mylibrary` and `uptime` all point at the host
  `145.241.105.239`, whose OCI security list accepts 80/443 only from
  Cloudflare's edge ranges — so grey-clouding any of them takes it offline and
  breaks certificate renewal. Several are co-tenant applications. That lock is
  also what makes trusting
  `CF-Connecting-IP` safe — opening those ports means revisiting
  `apps/web/lib/client-ip.ts` in the same change.

## Reach for these

| About to…                         | Use                                                                         |
| --------------------------------- | --------------------------------------------------------------------------- |
| add or change any UI component    | `ui-ux-pro-max:ui-ux-pro-max`                                               |
| build a net-new page              | `frontend-design`, then `ui-ux-pro-max` to review                           |
| add or change a score             | `packages/scoring-engine/CLAUDE.md` + `superpowers:test-driven-development` |
| edit a Dockerfile or compose file | agent `security-pan-check:container-security-scanner`                       |
| edit the Prisma schema            | agent `security-pan-check:database-security-scanner`                        |
| edit a CI workflow                | agent `security-pan-check:supplychain-cicd-scanner`                         |
| chase a bug                       | `superpowers:systematic-debugging` — measure, don't infer                   |
| shape a non-trivial change        | `superpowers:brainstorming` → `superpowers:writing-plans`                   |
| execute a written plan            | `superpowers:subagent-driven-development`                                   |
| open a PR                         | `/code-review`, then `superpowers:requesting-code-review`                   |

## Environment

- **Check what you can reach before calling something the founder's job.** SSH is
  `ssh -i ~/.ssh/oci_server ubuntu@145.241.105.239`, with passwordless sudo. The
  Coolify API token is `~/.coolify-token` **on the host**. The OCI CLI is
  `~/.local/bin/oci` **on this machine, not the server**, and the `oracle-oci`
  MCP is usually disconnected. The Cloudflare token (`~/.cloudflare-token` on the
  host) **can edit DNS** but is refused on zone settings and WAF — so DNS moves
  are yours to make, while Bot Fight Mode, JS Detections, WAF rules and Turnstile
  are genuinely founder-only. Branch protection 403s: a private repo needs GitHub
  Pro. Getting this wrong wastes the founder's time in both directions.
- **Docker 29.6.2 is installed.** This file previously claimed otherwise and the
  error cost two agents real work — verify before asserting an absence.
- **The Browser pane's tab is usually HIDDEN, and a hidden document freezes CSS
  transitions.** `getAnimations()` shows them `running` at `currentTime` 0 for
  as long as the tab stays hidden, so `getComputedStyle` reports the START value
  of any transitioning property. On 2026-09-03 that read the glass header as
  fully opaque on production while a fresh div with the same class read alpha
  0.85, and it cost most of a session before `document.visibilityState` was
  checked. Front the tab with `tabs_select` before sampling a computed style,
  or set `transition: none` on the element first — and treat a screenshot from
  a hidden tab with the same suspicion.
- `corepack enable` fails with EPERM; pnpm comes from `npm -g`, pinned 10.34.5.
- No `sqlite3` CLI — use `node:sqlite`.
- TypeScript `^5.9.3` and ESLint `^9.39.5` are **deliberate pins**. The
  Dependabot PR that moves both to majors stays open on purpose.
- `.npmrc` sets `minimum-release-age=4320` — a three-day supply-chain quarantine
  on freshly published versions. When it blocks something you genuinely need,
  add that one package to `minimumReleaseAgeExclude`, install, then remove the
  exclusion. Never delete the setting to unblock a package.

## Conventions

- Conventional Commits; commitlint (`@commitlint/config-conventional`) rejects
  capitalised subjects. Husky runs `commit-msg` and `pre-commit`.
- **Branch before touching `main`. What gets its own branch depends on risk.** A
  change stands alone when it can alter _a number a clinician reads, a claim the
  site makes, or how production is built and served_ — that means
  `packages/scoring-engine/**`, `components/calculator/**`, `app/calculators/**`,
  anything touching a privacy invariant, `content/site.ts` where a public claim
  moves, `proxy.ts`, `Dockerfile`, `.github/workflows/**`, the Prisma schema, and
  `scripts/check-*.mjs` (they assert production against published claims, so a
  mistake there fakes a green canary). **Markdown anywhere and comment-only edits
  batch into one PR per session.** Four markdown-only PRs landed between
  2026-08-04 and 2026-08-07 that should have been one.
- **Scale the verification to the change, and say what you skipped.** The
  expensive habits here earn their keep and should not be dropped by default: a
  before/after diff of generated CSS caught three classes silently lost to a
  narrowed Tailwind glob, a mutation test proved a re-pointed TM-001 was still
  scanning something rather than passing on an empty directory, and a guard
  caught the PRISM calibration figures being moved away from where the founder
  had put them. None of that was free. On 2026-08-17 one session ran the full
  gate about twelve times and the full e2e six, roughly an hour of wall clock,
  and a measurable slice bought nothing — four gate runs died on `format:check`
  alone and three readings came off stale servers. **When a change plainly does
  not warrant a full adversarial pass, do the cheap checks, say plainly which
  ones you ran and which you skipped, and let the founder ask for more.** State
  the omission; never let a light pass read as a thorough one.
- **Run the fixers before the gate**, not after it fails. `pnpm lint --fix` and
  `pnpm format` — or just commit and let husky's `lint-staged` do it. Three of
  eight gate runs in one session died on an unused `eslint-disable` and prettier
  on two markdown files, each costing a full build to discover a nit that
  auto-fixes. **Re-measured 2026-08-17 and it had got worse, not better: at
  least four of roughly twelve gate runs in one session failed on
  `format:check` ALONE.** This rule was already written here and was read and
  not followed, so treat it as mechanical rather than advisory — the two fixers
  take about fifty seconds together and a failed gate costs three minutes to
  learn nothing.
- **Never put more than a sentence or two inside a `- [ ]` markdown item.**
  Prettier's markdown printer is not idempotent on multi-paragraph list items —
  each run indents the continuation further, so `pnpm format` succeeds while
  `pnpm format:check` fails and CI goes red on a file nobody meaningfully
  changed. Promote anything longer to a `###` subsection with a one-line
  checkbox and the prose beneath it. Broken three times now, most recently
  2026-08-04 — the pull is real, because the detail genuinely belongs with the
  item. **Confirm with two consecutive `prettier --check` runs, not one:** the
  first can pass on output the next run reformats again, which is the whole
  non-idempotency and exactly what a single check misses.
- Filter command output — tail, grep, dot reporters. Don't dump full logs.
- Subagent review verifiers run `model=sonnet`, `effort=low`.
- An agent asked to produce a document writes the file itself and returns a
  short summary, never the document body.
- **Verify before you assert.** External audit reports handed to this project
  have been wrong roughly half the time, and so was this file — twice. Check the
  primary source (the code, the paper, the running system) before acting on a
  claim, and prefer running the command over reasoning about what it would do.
  It cuts both ways: on 2026-08-05 an external note reporting a privacy breach
  was **right**, against a reassuring conclusion reached here from a test that
  had not covered the failing case. Check reports rather than believing or
  dismissing them, and say plainly which parts you reproduced and which you took
  on trust.
- **A guard that has never failed deserves suspicion, not confidence.** Two
  found on 2026-08-05: an edge-script check whose regex could not match the
  markup it was written for, and a `- [ ]` inventory where seven entries had
  been done for weeks. When a check has been green forever, make it fail on
  purpose once before trusting it.
