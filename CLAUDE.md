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
   "different runtime" is not an available argument (ADR-0005).
2. **No calculator input reaches a server store.** `packages/db` exists only for
   the submission and admin surfaces. Client-side persistence is deliberate,
   disclosed on `/legal/data-protection`, and allow-listed: sessionStorage
   carries `age`, `age_months`, `weight`, `weight_kg` and nothing else;
   localStorage holds favourites. Widening either needs the allow-list amended.
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

Three traps it exists to remove:

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
- One slice per branch. Branch before touching `main`.
- **Never put more than a sentence or two inside a `- [ ]` markdown item.**
  Prettier's markdown printer is not idempotent on multi-paragraph list items —
  each run indents the continuation further, so `pnpm format` succeeds while
  `pnpm format:check` fails and CI goes red on a file nobody meaningfully
  changed. Promote anything longer to a `###` subsection with a one-line
  checkbox and the prose beneath it.
- Filter command output — tail, grep, dot reporters. Don't dump full logs.
- Subagent review verifiers run `model=sonnet`, `effort=low`.
- An agent asked to produce a document writes the file itself and returns a
  short summary, never the document body.
- **Verify before you assert.** External audit reports handed to this project
  have been wrong roughly half the time, and so was this file — twice. Check the
  primary source (the code, the paper, the running system) before acting on a
  claim, and prefer running the command over reasoning about what it would do.
