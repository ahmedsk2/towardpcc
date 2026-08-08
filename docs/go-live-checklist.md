# Go-live checklist

Run top-to-bottom. Nothing ships without a `[x]` or a consciously accepted
`[~]`. Cross-reference: `LAUNCH-BLOCKERS.md` and
`docs/security/readiness-scorecard.md`.

**Reconciled 2026-07-28.** The site went live on 2026-07-26 and this file was
still describing the world as it stood before the deploy — eighteen unticked
boxes, several of them work that was finished days earlier. That is not a
harmless lag. A checklist that understates what is done sends the founder back
over completed ground and, worse, teaches the reader that the boxes are
decorative; the moment that happens the document stops being a gate. Every state
below was re-derived from the repo, the runbooks and git history before it was
changed. **Anything that could not be verified from the repo was left unticked
rather than guessed at** — a wrongly ticked box on a launch checklist is exactly
the class of false claim this project keeps having to correct in public.

Several lines also conflated two facts under one box ("DNS points at the VM;
`sec-web` A-grade"), which is how a half-true item ends up ticked. Those are now
split, because a box has to be answerable with one yes.

**Adversarially re-checked 2026-07-28, and the sentence above did not survive
intact.** "Every state below was re-derived" was itself a claim that had not
been fully earned: three boxes were still wrong afterwards. **CI green** was
ticked while the last five completed runs on `main` had failed — nobody had
opened GitHub Actions. **Migrations applied** was ticked `[x]` while the note
beneath it said one of the three was unconfirmed. **P5 + P7, all findings
fixed** was rounded up from the reports' own "all fixed _or tracked_". All three
are corrected below with the evidence named.

The pattern is worth more than the three fixes. None of them was invented; each
was a true statement that had drifted, or a true statement standing next to its
own contradiction. So the failure mode this file has to defend against is not
dishonesty, it is **a box and its caveat being read separately** — which is why
the legend below now matters more than it looks.

**Legend:** `[x]` done and verified, with the evidence named · `[~]` partly
done, with the remainder named on the same line · `[ ]` not done, or not
verifiable from this repo.

## Built & verified (P0–P7) — done

- [x] 22 calculators, 100% engine coverage, clinically red-teamed
- [x] Client-side privacy invariant (static guard + airplane-mode e2e in CI)
- [x] Home + hero, all pillar pages + working forms, admin (auth/TOTP/inbox/audit)
- [x] Security headers + two-tier CSP; P5 + P7 audits, every finding fixed **or
      explicitly tracked** — which is what the reports themselves say, and is weaker
      than the "all findings fixed" this line used to claim.
      `docs/security/p5-security-report.md` marks all 7 findings Fixed but carries a
      residual (the public-form limiter is in-memory, so a multi-replica deploy needs
      a shared store); `docs/security/p7-audit-report.md` is headed "all fixed **or
      tracked**" and its finding #9 (info) is tracked, not fixed. Neither is
      alarming; both are worth not rounding up.
- [x] Dependency audit gate (prod: zero high/critical); SHA-pinned CI, gitleaks
- [x] Data model + migrations + retention purge; legal pages; runbooks written
- [ ] **CI green** — **it is not, and this box was ticked while `main` was red.**
      Checked against GitHub Actions on 2026-07-28: the last **five** completed CI
      runs on `main` all failed. `quality` failed on every one of them (`4ca5ea5`,
      `bef72e9`, `69e0762`, `d22c730`, `d948462`); `e2e` on the most recent two.
      `deps`, `lighthouse`, `gitleaks` and `container` pass.

  Neither failure is a product defect, which is exactly why this went unnoticed.
  `quality` dies on `pnpm format:check`, and in CI the **only** unformatted file
  is `LAUNCH-BLOCKERS.md`. `e2e` fails one assertion in
  `e2e/evidence-rail.spec.ts:42` ("marks exactly one indicator current, and it
  moves when you scroll") — 82 of 83 tests pass, and the TM-001 airplane-mode
  privacy spec is **not** the failure.

  **The Prettier failure is worse than it looks, and it is the thing to act on.**
  `quality` runs its steps in order — typecheck → lint → `format:check` → test →
  build → budget:check — and a failed step skips the rest. Confirmed from the
  run's step list: on those commits `pnpm test`, `pnpm build` and the route-JS
  budget gate all report `skipped`. So for five consecutive commits, **CI has not
  run the unit tests, has not built the app, and has not checked the 170 KB
  budget**. One unformatted markdown file switched off every gate behind it. The
  suites are fine — `pnpm -r test` locally is 893/893 green — which is precisely
  why nothing looked wrong. Move `format:check` after the tests, or give it its
  own job, so a cosmetic failure cannot mask a real one.

  Two smaller points. This line also omitted the `container` job, so the
  enumeration was incomplete as well as wrong. And **a red CI does not stop a
  deploy here**: push-to-deploy is a Coolify webhook gated on the container
  healthcheck, GitHub Actions is not in that path, and `main` has no branch
  protection (OPS item, still open). The suite reports; it does not gate — and a
  suite nobody must keep green stops being evidence of anything.

## Shipped after P7 — live, and previously unrecorded here

This section did not exist. Three passes landed on `main` and deployed after
P7 closed, and none of them appeared on this list, which is most of why it read
as further from launch than it is. Detail in `LAUNCH-BLOCKERS.md`.

- [x] **Redesign (2026-07-27)** — chrome, home, pillar pages, `/about`; stale
      "in development / launching soon" copy corrected.
- [x] **Polish pass (2026-07-27)** — the depth system, image ratios, the Canvas
      2D hero, the calculator page restructure, canonical host.
- [x] **Optimization pass phases 0–2 (2026-07-28)** — `/trust` and `/validation`
      added, structured data, figure guards that compare copy against the
      registry rather than against itself.
- [x] **Two false public figures found and corrected** — "89 citations" against a
      real 87, and "87 citations with PMID and DOI" when only 56 carry both.
      Both are now guarded by `apps/web/content/figures.test.ts`, which asserts
      the copy against the registry. Worth keeping on this list as a standing
      reminder of what the guards are for.

## Infrastructure (P8) — deployed 2026-07-26

- [x] **OCI VM in a verified KSA region** — `hosting-1`, `145.241.105.239`,
      `me-riyadh-1`, deployed as a Coolify application behind Traefik and live
      at https://towardpcc.com since 2026-07-26. The region is confirmed from
      the deployed resource, not from the local OCI config default, which is
      what the residency claim actually depends on
      (`docs/runbooks/deploy-production.md`).
- [ ] **Encrypted block volume for the DB** — unverified, and deliberately left
      unticked. The region is confirmed; nothing in this repo records the
      volume's encryption state, and "OCI encrypts by default" is a vendor
      statement, not a check. At-rest volume encryption and OCI Vault are both
      still open in `LAUNCH-BLOCKERS.md`.
- [~] **Production secrets generated and placed** — `AUTH_SECRET`,
  `TOTP_ENC_KEY`, `SUBMISSION_IP_SALT` and both DB connection strings live
  in `/home/ubuntu/towardpcc-secrets.env` (mode 600) and seed Coolify's env
  vars. The owner connection string is deliberately kept out of the app's
  environment; keep it that way. **Remaining:** `SMTP_*` is empty (see mail,
  below); Umami has no secret because it is not integrated into the app at
  all; and a root-owned file is not a secret store — OCI Vault is still open.
- [x] **Image built for the host's architecture and running** — though not by
      the route this line used to describe. Production builds
      `apps/web/Dockerfile` **on the host** as a Coolify application, so the
      cross-architecture problem the old wording worried about (ARM64 dev
      machine, KSA host) does not arise. `docker compose -f
docker-compose.prod.yml up -d` per `docs/runbooks/deploy.md` is **not**
      what runs: `deploy.md` documents the standalone Caddy + compose stack that
      was designed first and never shipped. `deploy-production.md` is production.
- [x] **Push-to-deploy** — GitHub webhook → Coolify, so merging to `main` builds
      and deploys. The rolling update gates on the container healthcheck, which
      is why a failed build leaves the running site untouched rather than
      replacing it with a broken one.
- [~] **Migrations applied; the first admin exists** — **two of the three**
  migrations under `packages/db/prisma/migrations` are confirmed applied as
  the owner role (`20260725121624_init` and
  `20260725133814_admin_last_totp_step`); the restore drill found the expected
  tables with row counts matching source and the admin row intact, which is
  stronger evidence than a migration log.

  This line previously read `[x]` and "three migrations … applied" while the
  note directly beneath it said the third was **not** confirmed. That is the
  same defect this file's preamble names — a box has to be answerable with one
  yes, and this one was answering both ways at once. Ticked boxes that quietly
  contain an unticked half are how the boxes become decorative.

  **Remaining:** `20260728170000_app_settings` is the third migration. It landed
  on `main` after the drill (commit `69e0762`, 2026-07-28) and migrations run as
  a **separate manual step** under the owner role — they are **not** part of the
  Coolify build, so merging it did not apply it. Confirm it was applied, then
  re-run the drill.

  **Do not reuse the drill's "7 tables" as the expectation after that.** At
  drill time the schema had **six** model tables; the seventh was Prisma's own
  `_prisma_migrations`. `AppSetting` is a seventh model, so once the migration
  applies the correct count is **8**. `deploy-production.md`'s drill snippet
  still says `# expect 7 tables` and will be wrong the moment the migration
  lands — a check whose expected value silently went stale passes without
  checking anything, which is worse than no check.

- [x] **TOTP URI + recovery codes** — closed 2026-08-07, and the alarm was
      misplaced. This entry called the failure "unrecoverable"; it is not.
      Verified against production: one `OWNER` admin, all ten recovery codes present
      and unconsumed, and a successful TOTP login on the morning of 2026-08-07. If the
      phone and every code were lost, a fresh recovery code can be minted with `psql`
      alone — no encryption key, no Node, no checkout — because the code hash is plain
      `sha256(lowercased)` and Postgres produces a byte-identical digest. The exact
      two-command procedure is in `docs/runbooks/deploy-production.md` under
      "Break-glass: locked out of /admin", and the statement was dry-run on production
      inside a rolled-back transaction.

The genuinely unrecoverable credential is the **`/admin` password**, because
Argon2id cannot be recomputed on the host. Losing it costs about an hour of
re-seeding over an SSH tunnel, not the account. That is the one worth confirming
is in a password manager.

- [x] **Backup running + a restore drill actually rehearsed** — nightly
      `0 3 * * *` in the shared-postgres job, offsite copy in OCI Object Storage
      bucket `coolify-backups` in `me-riyadh-1`, so the backup is in-region too
      and does not quietly break the residency position. **Drill PASSED
      2026-07-26**: dump restored into a scratch database, 7 tables, row counts
      matching, scratch dropped. Procedure in `deploy-production.md`.
- [ ] **Monitoring live + error tracking configured** — neither exists. No
      Uptime Kuma monitor, no Sentry/GlitchTip DSN. `/api/v1/ready` is the
      correct probe target and already runs `SELECT 1`. **Do not point a monitor
      at `/api/v1/health`**: it returns 200 with a dead database — that is how
      the Prisma WASM bug survived a deploy — so a monitor on `health` would be
      worse than no monitor, because it would report green through an outage.

## Domain, email, trust (P8)

- [~] **Domain registered; registrar lock; renewal runway** — verified against
  RDAP on 2026-07-27: registrar GoDaddy, the full client-side lock set
  (`clientDelete`, `clientRenew`, `clientTransfer`, `clientUpdate`
  prohibited), expiry 2028-07-20. That covers the lapsed-domain-gets-squatted
  scenario — the one with a live example, a sibling society's expired domain
  now serving a gambling site — for roughly two years.
  **Remaining:** registry lock proper (no `server*` status codes present),
  org-owned auto-renew payment, and a renewal calendar with two owners.
  Bus-factor-1 on a renewal is the same failure as bus-factor-1 on-call.
- [ ] **DNSSEC and CAA** — both genuinely missing, confirmed against live DNS
      2026-07-27: `delegationSigned: false` with no DS record at `com`, and
      **zero CAA records**, meaning any CA in the world may issue for this
      domain. CAA is the cheaper of the two and should pin Let's Encrypt.
- [ ] **CT-log and lookalike monitoring; defensive sibling/typo domains** — not
      done. Note the old wording said to 301 them "(Caddyfile)"; that file is
      part of the never-shipped standalone stack, so any redirect now belongs in
      Traefik/Coolify or at the DNS provider.
- [~] **Email authentication** — the target state for `towardpcc.com` is already
  in place and is the strongest available: `v=spf1 -all` with DMARC
  `p=reject`, because this domain sends nothing at all. **Earlier guidance in
  this file and in the runbook said to widen the SPF record when a relay was
  added. That guidance was wrong** under both candidate relays — `From:` is
  on `towardpicu.com`, whose SPF already authorises the relay, and OCI would
  be evaluated against an Oracle-owned envelope return path. Leave
  `v=spf1 -all` exactly as it is.
  **Remaining:** nothing has been sent yet, so nothing has authenticated —
  see the mail item below. MTA-STS is unconfigured. Residual and
  non-blocking: `towardpicu.com` publishes no DKIM key and its DMARC is
  `p=none` with no `rua=`.
- [ ] **SMTP relay configured and a test send authenticates** — the engineering
      is done: settings are editable at `/admin/settings`, stored encrypted,
      override the environment, and a **Send a test email** button proves the
      relay end to end without a redeploy. **Founder-only, because it is a
      credential:** enter the `mail.towardpicu.com` mailbox password with the
      host, user and `MAIL_FROM`. Nothing sends while `SMTP_HOST` is blank, so
      the other fields are safe to stage first. Until this is done, submissions
      are stored but no one is told they arrived.
- [x] **Published contact mailbox verified** — the address moved to
      `info@towardpicu.com` on 2026-08-07 and the founder confirms it
      receives. `towardpcc.com`'s SPF is `v=spf1 -all`, so an address there
      could receive but never legitimately reply; `towardpicu.com` is the
      domain actually authorised to send.
- [x] **DNS resolves and the site serves** — with a precision the old wording
      lost. DNS does **not** point at the VM: the Cloudflare zone is proxied
      (orange cloud) and the OCI security list admits 80/443 from Cloudflare's
      published edge ranges **only**. Verified live: valid Let's Encrypt cert,
      all pages 200, HTTP→HTTPS redirect, apex 308s to `www`, `/api/v1/ready`
      green. **Do not grey-cloud to "simplify" this** — the origin is locked to
      Cloudflare, so turning proxying off takes the site fully offline and
      breaks ACME HTTP-01 renewal (ADR-0003).
- [ ] **`sec-web` A-grade recorded against the live URL** — not run since the
      deploy. The headers themselves are in place and the `/admin` nonce tier is
      verified live; what is missing is only the graded run and its record.
- [x] **Cloudflare → OCI load balancer edge migration (ADR-0004) — DONE
      2026-08-08.** See "The edge migration is done" below.

### The edge migration is done, and this entry used to say the opposite

This box read **"PLANNED, NOT DONE — today's data path still runs through
Cloudflare"** until 2026-08-08. By then it was false, and following it was
**dangerous**: putting the apex back behind Cloudflare reinstates TM-013 — the
edge script that read `location.href` and POSTed it — and contradicts what
`/trust` now tells the public. Corrected in place rather than deleted, so the
old instruction cannot be acted on from a stale copy.

Verified rather than assumed: `towardpcc.com` and `www.towardpcc.com` both
resolve to **145.241.110.213**, the OCI load balancer in me-riyadh-1. Cloudflare
is authoritative DNS only and sees no request content.
`scripts/check-residency.mjs` was inverted in the same change and now alarms if
a Cloudflare edge reappears in front of the apex.

**Proxying stays ON for every other subdomain** — `next`, `db`, `deploy`,
`endorse`, `mnm`, `mylibrary`, `stg-mylibrary`, `uptime`. Their OCI security
list accepts 80/443 only from Cloudflare ranges, so grey-clouding any of them
takes it offline and breaks certificate renewal. Several are co-tenant
applications.

## Content & compliance — before public launch

- [ ] **Legal pages counsel-reviewed** (remove `TODO:counsel-review` markers) —
      still outstanding. The text is honest but has not had a lawyer's pass, and
      ADR-0003's own "revisit if" clause flags that counsel may read PDPL's
      treatment of transit-only processing differently than engineering did.
- [x] **PWA raster PNG icons** — 192/512 plus maskable, generated with
      Playwright/Chromium because `sharp` has no ARM64 dev binary, committed to
      `apps/web/public/` and wired into `manifest.ts`. Regenerate with
      `node apps/web/scripts/generate-icons.mjs`.
- [~] **Validator names, or the badge stays "pending"** — the fallback branch of
  this item is satisfied and then some: `/validation` now exists to explain
  what the pending badge means and how to answer it, rather than leaving an
  unexplained hole. Still unsatisfied in the sense that matters — no real
  reviewer names, so the slots stay empty by design.
- [~] **WCAG 2.2 AA pass** — the contrast half is genuinely done and mechanised:
  `packages/ui/src/tokens.test.ts` reads the shipped `tokens.css` and asserts
  every `--color-border*` token against its tier band, so a bad pairing fails
  the suite instead of reaching a bedside screen (re-measured 2026-07-28:
  3.71 / 1.78 / 1.43 against the page, all in band).

  **Downgraded from `[x]` for two reasons, neither of them a new defect.**
  The rest of the old claim — "an audit plus a whole-app adversarial sweep
  found zero genuine failures, and 7 findings + 5 consistency nits were fixed" —
  has no report in `docs/` and no commit recording those counts. The work very
  likely happened; the numbers just cannot be re-derived by the next reader,
  only repeated, and repeating unverifiable counts is the specific habit that
  produced "89 citations". Second, the PRD's locked principle §5 asks for
  **axe-clean in CI**, and `axe` appears in no `package.json`, no workflow and
  no spec — so contrast aside, nothing automated checks accessibility.

  Note also that the token guard runs under `pnpm test`, which is one of the
  steps currently being **skipped** in CI (see the CI item above). It passes
  locally; it is not presently gating anything.

- [ ] **Lighthouse timing budgets confirmed on production hardware** — not done.
      Route JS is enforced deterministically at ≤170 KB gzipped and passes; the
      timing metrics still only warn, because they have never been calibrated
      against the real host.

## Final

- [ ] Founder walkthrough of the live site — not verifiable from this repo.
      Note the old wording said "live staging site"; there is no staging
      environment. `next.towardpcc.com` is a preview deployment, and production
      went first.
- [ ] `LAUNCH-BLOCKERS.md` cleared, or every remaining item consciously accepted
- [ ] Announce.

## The short version

What is actually left before an announcement is not a long list, and it is worth
seeing it separated from everything already done: **the SMTP credential**, a
**secondary on-call contact**, **counsel review** of the legal pages, a
**monitor that watches `/api/v1/ready`**, and **getting `main`'s CI green
again** — a Prettier run and one evidence-rail assertion, half an hour of work,
listed here only because a red suite is what let this file claim a green one.
Everything else on this page is either finished, a deliberate acceptance, or the
KSA edge migration — which is a project in its own right and gated on a
co-tenant's agreement, not on us.

One note on how to read the rest of this page, learned from the corrections
above. Three of the boxes that turned out to be wrong were wrong in the same
way: a claim that was true when written, sitting next to a note that already
contradicted it. If a line carries both a `[x]` and a "remaining", the `[x]` is
the part to distrust.
