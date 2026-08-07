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
3. **Processing is KSA-first but NOT yet wholly in-Kingdom — and the site says
   so on purpose.** Two things leave today, both disclosed: requests transit the
   Cloudflare edge (migration staged 2026-07-29, DNS not cut over), and the
   operator notification relays through a US host. ADR-0004 carries **four**
   written exceptions, not two. `apps/web/content/privacy-claims.test.ts` fails
   the build if site copy claims residency absolutely — those caveats are
   load-bearing, not clutter. The wording goes unqualified only in the same
   deploy as the cutover, never a day before.
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
- **Deploy once at the end of a session, then check the tag.** Merges accumulate;
  one hand-triggered deploy closes the session, and the tag check below runs
  once. **The carve-out:** a merge that closes something _actively wrong in
  production_ — a live incorrect clinical number, a false public claim, or a
  privacy leak — deploys immediately. On 2026-08-05 the fragment fix sat green
  and unmerged while production leaked and `/trust` told visitors something
  untrue; batching would have lengthened that window, not shortened it. Trigger
  the deploy and keep working rather than blocking on the poll.
- **Push-to-deploy does not work — the deployed tag is the only thing that
  proves a deploy landed.** Confirmed four times (2026-08-03, 08-04, 08-05,
  08-07). The last two failed on merges with no build in flight, which kills the
  mid-build race first blamed, so treat it as broken rather than flaky. Coolify's
  `status` is not a gate in either direction:
  it read `running:healthy` over a container three commits stale, and
  `running:unhealthy` over one that Docker and both probes called healthy. The
  image tag is the only signal that has been right every time —
  `sudo docker ps --filter name=gpsokvxzncr7ks1vzqz7wkr4 --format '{{.Image}}'`
  on the host, compared against `origin/main`. The deploy API call is in
  `docs/runbooks/deploy-production.md`.
- **Cloudflare proxying stays ON.** The OCI security list accepts 80/443 only
  from Cloudflare's edge ranges, so grey-clouding takes the site offline and
  breaks certificate renewal. That lock is also what makes trusting
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
- **Run the fixers before the gate**, not after it fails. `pnpm lint --fix` and
  `pnpm format` — or just commit and let husky's `lint-staged` do it. Three of
  eight gate runs in one session died on an unused `eslint-disable` and prettier
  on two markdown files, each costing a full build to discover a nit that
  auto-fixes.
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
