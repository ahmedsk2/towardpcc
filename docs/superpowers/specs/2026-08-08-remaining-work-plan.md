# Remaining work — triaged 2026-08-08

Built from a full read of `LAUNCH-BLOCKERS.md` (1352 lines) plus live checks
against the running system. Every item below carries a `file:line` and the line
that establishes its status.

What I reproduced myself: the apex resolves to `145.241.110.213` (the OCI load
balancer, not a Cloudflare edge); MX still returns
`mx10/mx20/mx30.antispam.mailspamprotection.com`; `apps/web/proxy.ts:110-112`
emits the `style-src-elem`/`style-src-attr` split; `apps/web/app/global-error.tsx:13`
renders an un-nonced `<style>` element; the SBOM steps are at
`.github/workflows/ci.yml:277-288`, not the `228-241` the file cites;
`scripts/` contains no CT-log script; `scripts/check-residency.mjs:167-183` and
`:221` still describe the load balancer as dormant and unrenewed. Everything
else is carried from the triage and verification passes and is labelled as such.

---

## A. DO NOW — agent can complete without the founder

Ordered by risk removed per unit of effort.

### A1. One markdown-only truth-restoration PR

**What it is.** The file currently misdirects the next reader on about a dozen
points, and two of those misdirections are actively dangerous.

**Why it is first.** `docs/go-live-checklist.md:249-251` still says the edge
migration is "**PLANNED, NOT DONE** … today's data path still runs through
Cloudflare". Acting on that means re-proxying the apex — the exact change
`CLAUDE.md` says would put requests back through an edge outside the Kingdom and
reinstate TM-013. `LAUNCH-BLOCKERS.md:310-315` separately instructs the reader to
create "an OCI API key with load-balancer write access sitting on a host that
also runs an application holding real patient data", work that is already done a
safer way (instance principals, no key on the host).

**Concrete first step.** `git checkout -b docs/launch-blockers-truth-pass`, then
apply the corrections listed in section D below.

**Production surface.** None. Keep every path in the diff markdown so `pnpm gate`
runs `format:check` alone; confirm with **two consecutive** `prettier --check`
runs, not one. The `docker-compose.prod.yml:14` comment is not markdown — leave
it out of this PR or accept a full gate run.

### A2. Correct the false on-call instruction in `scripts/check-residency.mjs`

- **What it is.** The doc comment at `:167-183` still calls the load balancer
  "not serving anyone yet" with "nothing renews it", and the FAIL branch at
  `:221` still ends "Nothing does this automatically."
- **Why it matters.** The PASS branch at `:220` already says the opposite
  ("Renewal AND delivery are automated since 2026-08-08"). The FAIL string is the
  one an on-call reader sees at 21 days out, and it tells them to do by hand what
  `lb-cert-push.sh` already does.
- **First step.** Own branch, strings only — never touch the `daysLeft > 21`
  predicate — then the full `pnpm gate`.
- **Production surface.** None; the script is read-only against the live site.
  `CLAUDE.md` puts `scripts/check-*.mjs` on the must-branch list because a
  mistake there fakes a green canary, so do not batch it with A1.

### A3. Fix the live CSP regression in `apps/web/app/global-error.tsx`

- **What it is.** SPC-WEB-002 shipped 2026-08-08 (`3ed7942`, `proxy.ts:110-112`)
  and `style-src-elem 'self' 'nonce-…'` now blocks the un-nonced `<style>` at
  `global-error.tsx:13` on the admin tier.
- **Scope, measured not assumed.** The rest of that file is `style={{…}}`
  attributes, which `style-src-attr 'unsafe-inline'` still permits — so the
  effect is the retry button losing its crimson focus outline on `/admin`, not a
  broken screen.
- **First step.** Authorise the constant `<style>` body by hash the way
  `FRAGMENT_LIFT_SHA256` is handled at `proxy.ts:69`, or convert the rule to a
  `style=` attribute. `apps/web/CLAUDE.md` names this file as a sanctioned
  inline-style exception because the bare boundary loads no stylesheet, so
  "move it to a stylesheet" is not available.
- **Do in the same PR.** Add a `style-src-elem`/`style-src-attr` assertion to
  `apps/web/e2e/security-headers.spec.ts` — it asserts only `script-src` today,
  so the new directives ship unguarded — and correct
  `docs/decisions/ADR-security-headers.md:41`, whose stated justification
  ("React sets a few inline style attributes") is false for the admin subtree and
  now also wrong that the directive set is constant across tiers.
- **Second, un-nonced `<style>` found while checking.** `apps/web/app/layout.tsx:193`
  renders one inside `<noscript>`; with scripting on the browser never
  materialises the element, so CSP never evaluates it, but with JS off on an
  admin route it would be blocked.
- **Production surface.** Response headers and the error boundary on TowardPCC's
  own app after merge. Own branch — `proxy.ts` is on the must-branch list.

### A4. Re-run the backup restore drill and stop hard-coding the table count

- **What it is.** `LAUNCH-BLOCKERS.md:854` — "**Re-run the restore drill** at the
  next convenient point; the dump is taken by Coolify's own job, which does not
  use this credential." Still open at `docs/security/readiness-scorecard.md:38`
  and `docs/go-live-checklist.md:155`.
- **The number in the runbook is wrong twice over.** `docs/runbooks/deploy-production.md:280`
  says `# expect 7 tables`; production now has **9**. The newest dump is three
  hours older than the `AdminSession` migration, so a restore today yields 8 —
  any literal is wrong on one side or the other.
- **First step.** Restore the newest Coolify dump into a scratch database, then
  diff `pg_tables` and `_prisma_migrations` and compare per-table row counts
  against the source rather than asserting an integer. Drop the scratch. Replace
  the literal with the derived check.
- **Already settled without the drill.** Dumps exist for 2026-08-02 through
  2026-08-08, all after the 2026-08-01 `ALTER ROLE`, and the 2026-08-08 one grew
  to pick up the audit migration — so the rotation demonstrably did not break
  backups. The drill's remaining value is proving the dump is _restorable_.
- **Production surface.** The production Postgres container on the shared host.
  Scratch database only; never restore over `towardpcc`; SQL over stdin so
  credentials never reach a process list; keep `-d towardpcc` scoping on every
  `docker exec`. The other tenants run MySQL/MariaDB in separate containers, so
  the data-side blast radius is bounded — but the container list is opaque
  hashes, so pin the target by `docker inspect` first.

### A5. Move the `retention-purge` task off 03:00, then watch it run once

- **What it is.** `LAUNCH-BLOCKERS.md:1007-1008` records the task at 03:00 while
  `:1053-1054` in the same file says "Schedule at **03:30 UTC**, not 03:00" — and
  names 03:30 as the co-tenant's backup slot, so both suggestions are congested.
- **It has never actually run.** `scheduled_task_executions` is empty; the row
  was created 2026-08-08 07:11 and the first 03:00 has not arrived. The
  `--dry-run` in the entry was a manual `docker exec`, not a scheduled fire.
- **First step.** `PATCH /api/v1/applications/{app-uuid}/scheduled-tasks/{task-uuid}`
  with the full field set, `frequency = 45 4 * * *`, then re-GET to confirm.
  04:45 is clear of `acme-towardpcc.timer` (04:15 + up to 15 min jitter), the
  three 03:00 Coolify database backups, the co-tenant crontab job at 03:30 and
  the two `/etc/cron.d` endorsement jobs.
- **Production surface.** TowardPCC's own Coolify scheduled task. Use the API,
  never a raw `UPDATE scheduled_tasks` — `coolify-db` is the shared control plane
  holding rows for the patient-data co-tenant.

### A6. SPC-TM-003 — write down IP-hash salt custody and correct the false claim

- **What it is.** `LAUNCH-BLOCKERS.md:622-624` is the only mention of SPC-TM-003
  in the file; every other member of that bundle got a dedicated section, so this
  one has never been re-triaged.
- **Two thirds are already done.** The purge landed with SPC-DB-005 (`:614`), and
  the rotation mechanism exists and has been exercised once (`:804`,
  `docs/runbooks/deploy-production.md:181-212`). What is left is custody and a
  written cadence.
- **The load-bearing correction.** `docs/decisions/ADR-data-model.md:43` claims
  "truncation defeats reversal", which `LAUNCH-BLOCKERS.md:870` already records
  as false for a 32-bit preimage space; the same line says "salted + truncated
  SHA-256" where the code is HMAC-SHA256. Add a dated ADR addendum.
- **First step.** Read `apps/web/lib/salted-hash.ts:42-44` and
  `apps/web/lib/submissions.ts:87` (the audit's `submissions.ts:126` pin is
  stale), then document custody, cadence and the `AuditLog` carve-out — the
  nightly purge runs `--skip-audit`, so salted email hashes have a 12-month
  written retention with no automated deletion.
- **Do NOT wire per-window rotation.** `apps/web/auth.ts:214-237` records that a
  mis-provisioned salt already became 100% admin login failure once; any scheme
  adding a second salt variable is that shape again, and belongs in its own
  decision.
- **Production surface.** None — in-repo only. Two custody findings that are
  _not_ the agent's to fix are handed over in section C.

### A7. Record the manual migration step where someone will read it

- **What it is.** Both 2026-08-08 migrations are applied in production
  (`_prisma_migrations` shows `20260808120000_audit_nullable_actor` at 2026-08-07
  22:00 and `20260808180000_admin_session_allowlist` at 2026-08-08 05:56), so
  nothing is broken. The gap is that nothing enforces the step.
- **Why it matters.** Coolify does not run migrations —
  `apps/web/Dockerfile:146-147` has no migrate step and the only production path
  is the manual owner-credential command at
  `docs/runbooks/deploy-production.md:142`. No gate, canary or healthcheck fails
  when one is forgotten, and `/api/v1/health` would still return 200.
- **First step.** Add the migration check to the post-merge section of
  `docs/runbooks/deploy-production.md` with the one-line `_prisma_migrations`
  verification query. Whether to automate the detection is a larger design
  question — the health route deliberately says almost nothing (SPC-API-005).
- **Production surface.** None for the doc change.

### A8. Build the CT-log check — reshaped, and not wired to a cron that is dead

- **What it is.** `LAUNCH-BLOCKERS.md:259-260` still lists "CT-log and lookalike
  monitoring" as missing, corroborated at `docs/go-live-checklist.md:209` and
  `docs/security/threat-model.md:213`. No such script exists in `scripts/`.
- **Three corrections to the obvious design.** crt.sh returned HTTP 502 on four
  consecutive attempts — use Cert Spotter as the primary source and treat an
  unreachable source as skip-not-fail. A committed baseline of known-good
  certificates rots by design (23 of 27 issuances are Let's Encrypt on ~60-day
  cycles), so assert a property — issuer ∈ CAA allow-list, SANs ⊆ expected names
  — instead. Two pre-CAA GoDaddy certificates are valid until 2026-08-10 and
  2026-09-10 and are legitimate history, so list them as dated exceptions that
  expire themselves out or the check is red on day one.
- **Scope it to `towardpcc.com`, `www.` and `next.` explicitly.** CT for this
  domain is mostly co-tenant hostnames including `endorse`; an
  `include_subdomains` query would commit a co-tenant inventory into this repo
  and go red on every neighbour's renewal.
- **First step.** Own branch and PR — `scripts/check-*.mjs` assert production
  against published claims. Make it fail on purpose once before trusting it.
- **Where it runs depends on B2.** `residency.yml` has not executed since
  2026-08-07, so adding a third script to it produces a guard that never runs.
- **Lookalike monitoring stays open.** A lookalike is someone else's domain with
  its own legitimate certificate, so the CAA allow-list is useless for it; it
  needs a confusable-name generator and a substring search.

### A9. Capture the e2e flake instead of guessing at it

- **What it is.** `LAUNCH-BLOCKERS.md:463-481` — deliberately left open for
  evidence, explicitly not a launch blocker.
- **First step.** Next local suite run, use
  `pnpm --filter @towardpcc/web test:e2e` with a JSON reporter and traces on, and
  attach the output. Read the `N passed` line, never the exit code.
- **Do not "fix" it.** A speculative `waitFor` would mask a genuine race.

---

## B. DECISIONS NEEDED — blocked on a founder answer, not on access

### B1. Where should incoming email for the site be handled?

Right now every message sent to `info@towardpicu.com` — the address printed on
`/contact`, named in `/legal/data-protection` as the deletion contact, and
published in `security.txt` — is filtered by SiteGround's servers in the US.
Verified still true today: MX = `mx10/mx20/mx30.antispam.mailspamprotection.com`.

- **Pay for Zoho (real Saudi datacentre).** A subscription you buy. This is the
  single change that would let the site drop its "mail still leaves the Kingdom"
  caveat entirely.
- **Self-host inbound on the existing server.** No purchase, but it puts a mail
  listener on the same machine that runs the application holding real patient
  data.
- **Leave it as it is.** Costs nothing, and the site keeps its written caveat —
  which is honest, just not the strongest claim available.

Either move is a DNS edit the agent can make. Cutting over needs both MX sets
live and a lowered TTL, with receipt verified before the old records go, because
the failure mode is silence — dropped deletion requests nobody sees.

### B2. The two daily production checks stopped running — fix billing, or move them?

GitHub Actions has been failing to start since 2026-08-07 ("recent account
payments have failed or your spending limit needs to be increased", already
recorded as blocking item 1 at `docs/founder-checklist.md:175`). Both canaries
pass when run by hand and zero times on schedule. Push-to-deploy runs through a
Coolify webhook, so `main` still ships to production with the safety net down.

- **Turn Actions billing back on.** Restores the canaries _and_ the tests, e2e,
  container scan and secret scan that are also dead — the broadest fix.
- **Move just the two checks onto the server on a timer.** Free and agent-doable
  (they use only `fetch` and DNS-over-HTTPS, nothing to install), but CI stays
  dead and the checks stop being visible in GitHub.
- **Both.** Belt and braces; the server timer keeps working if billing lapses
  again.

If the server-timer option is chosen, follow the `acme-towardpcc.timer`
precedent exactly: root's crontab holds the co-tenant's 03:30 patient-data
backup, so capture a SHA-256 of it before and after, and schedule clear of 03:00
and 03:30.

### B3. Three container hardening controls are blocked by one platform limit — convert, or accept?

Read-only filesystem, a process-count limit and `no-new-privileges` are all
unreachable for the same reason: Coolify's simple deployment mode silently
discards them. This was measured, not assumed — the app was proven to run fine
read-only (`docs/founder-checklist.md:343-360`), and Coolify's own source shows
an allow-list that omits the flags entirely.

- **Convert TowardPCC to Coolify's compose deployment mode.** Closes all three at
  once, but it changes how production is built and served on a shared clinical
  host, and push-to-deploy is currently the one thing that reliably ships.
- **Accept and record the residual.** All Linux capabilities are already dropped,
  the container runs as non-root, the image has no setuid binaries, and memory
  and CPU are capped — so the remaining exposure is genuinely small.
- **Revisit after launch.** Record it as deferred with a date rather than as an
  open box.

Not on the table: the host-wide `/etc/docker/daemon.json` route. It would apply
to every container on the box including the patient-data application.

### B4. Is a maintenance window worth isolating the database's network?

The database sits on one flat Docker network shared with every other application
on the host. The eavesdropping half of this is already fixed — verified live,
the connection is TLSv1.3 and `ssl` is `on`, which two documents still say is
`off`. What remains is that a compromised neighbour container could reach the
database port, behind password auth and a least-privilege role.

- **Do it in a scheduled window.** Removes the reachability path, but it would
  also take `db.towardpcc.com` (Adminer) offline unless it moves too, invalidate
  the documented migration and break-glass commands, and revert on the next
  redeploy unless it goes through Coolify's persisted settings.
- **Accept it, now that encryption has landed.** The severity both documents
  record was written when traffic was in the clear; it is lower now.
- **Bundle it with B3.** One planned window instead of two.

### B5. Should the production image be built by GitHub, or keep being built on the server?

Tamper-evident signing of the deployed image is the last third of the supply-chain
item (`LAUNCH-BLOCKERS.md:1268`). It cannot be added as-is: CI builds an image it
throws away, while the server builds the one that actually runs.

- **Move the builder to CI and have the server pull it.** Makes signing
  meaningful, but it is a change to the whole production delivery path, needs a
  container registry (a purchase or a plan), and cannot run at all until B2.
- **Keep the server building and drop signing, with a written waiver.** Zero
  risk to a pipeline that works; the SBOM and vulnerability scan already exist.

Signing without moving the builder is worse than doing nothing — it produces a
green supply-chain check over an image whose digest never ran in production.

### B6. If a lawyer has not answered by hour 60 of a suspected data breach, do we notify the regulator anyway?

Saudi law gives 72 hours from becoming aware. The incident runbook currently says
to get counsel and not to notify on your own initiative, which is incomplete —
silence from counsel at hour 60 is itself a decision.

- **Notify anyway.** The repo's own recommendation: the notice carries no
  admission, and late notice is the sanctionable failure.
- **Wait for counsel regardless.** Defensible only if counsel is contractually
  bound to a response time.
- **Delegate the default to counsel once engaged.** Defers the question rather
  than answering it.

This needs no access and no purchase — only your answer, which then gets
recorded in `LAUNCH-BLOCKERS.md` and `docs/runbooks/incident.md`. Writing a
default in without your sign-off would be an agent taking a legal position on
your behalf.

---

## C. FOUNDER-ONLY — needs a person, a lawyer, a purchase, or a zone setting

- **GitHub Actions billing** — Settings → Billing & plans; check the payment
  method and the Actions spending limit (`docs/founder-checklist.md:175`). Gates
  A8's runner, the SAST job and all of CI.
- **Prove the contact mailbox receives** — send a message to
  `info@towardpicu.com` from an outside address and confirm it lands in a mailbox
  you can open (`LAUNCH-BLOCKERS.md:102-103`). Do this after B1, so it is
  verified once on its final home.
- **Publish a DKIM key for `towardpicu.com`** in SiteGround's mail panel
  (`LAUNCH-BLOCKERS.md:284-286`). SPF alone breaks on forwarding. Do **not**
  widen `towardpcc.com`'s SPF while doing it — `:278-282` records that as wrong
  under both candidate relays.
- **One GoDaddy session, in this order** (`LAUNCH-BLOCKERS.md:258-260`): request
  registry lock proper (RDAP shows only the client-side set, no `server*` codes);
  move auto-renew onto an organisation-owned payment method rather than a
  personal card; put two people on a renewal calendar; decide whether defensive
  registrations are worth buying. Expiry is 2028-07-20, so there is runway — but
  registry lock slows later DNS moves by design, so land any MX change first.
- **Engage a KSA-qualified privacy lawyer** to review the legal pages
  (`LAUNCH-BLOCKERS.md:485`; markers live at `docs/PLATFORM.md:250`,
  `ADR-0003-cdn-vs-residency.md:100`, `ADR-0005-client-side-scoring.md:174`,
  `docs/go-live-checklist.md:260`) and to be the named contact who answers inside
  72 hours (`:732`).
- **Register TowardPCC on SDAIA's National Data Governance Platform**
  (`LAUNCH-BLOCKERS.md:731`). Registration cannot be completed inside the 72-hour
  window, so doing it reactively is doing it too late.
- **Supply two independent clinical validators per score**, with names and
  credentials (`LAUNCH-BLOCKERS.md:486`). No code work remains — the admin editor
  and the honest 0-of-2 badge both exist. Only you may supply names; an agent
  populating these would fabricate a clinical endorsement.
- **Decide the shared backup-directory permissions.** The nightly Postgres dumps
  are world-readable (`-rw-r--r--`) in a Coolify-managed directory shared with the
  co-tenant instance. Reported, deliberately not touched — it is not
  TowardPCC-only, so it is not an agent's `chmod` to run.
- **Retire or relocate `/home/ubuntu/towardpcc-secrets.env`.** It still holds
  `SUBMISSION_IP_SALT` beside `DATABASE_URL_OWNER` despite its own first line
  saying to remove it after importing to Coolify — which contradicts the
  "separate custody" control SPC-TM-003 asks for.
- **One admin login smoke test** — `AdminSession` has 0 rows and `AuditLog`
  carries no `admin.login` row, so the session allow-list that shipped 2026-08-08
  is unexercised in production. Needs your TOTP.
- **Ten seconds: confirm the `/admin` password is in a password manager**
  (`LAUNCH-BLOCKERS.md:770-773`). Argon2id cannot be recomputed on the host.

---

## D. ALREADY DONE OR WAIVED — corrections for A1

Each line is a stale entry with the evidence that closes it.

### Edge and certificates

- `:290` "**STAGED AND PROVEN 2026-07-29, not cut over**" — cut over 2026-08-08;
  the apex resolves to `145.241.110.213`, and `:325` in the same section already
  records the paired copy rewrite as done.
- `:322-323` "it protects nothing until cutover since DNS still points at
  Cloudflare" — the WAF is live in front of real traffic.
- `:304-315` "**Certificate renewal — deadline now monitored, not automated**" —
  superseded by `:955-962`. `acme-towardpcc.timer` is enabled and fired
  2026-08-08 04:29; the drop-in adds `ExecStartPost=/usr/local/sbin/lb-cert-push.sh`,
  which logged "load balancer already serves the current certificate"; the live
  cert expires 2026-10-27 with acme.sh renewing 2026-09-27. Delete the
  "Deliberately NOT automated yet" paragraph — its trade has been taken, and by
  instance principals, so no API key sits on the patient-data host.
- `:993-996` "**What is still manual: the upload to the load balancer**" —
  contradicted by the `[x]` at `:959` directly above it. Same correction at
  `docs/runbooks/edge-migration-ksa.md:190-193`.
- `:124-126` "**Still unverified:** the OCI load balancer" — confirmed:
  `towardpcc-edge`, `145.241.110.213`, flexible, ACTIVE, in `me-riyadh-1`. That
  closes the last residency gap under `[HOSTING_TARGET]`.
- `:356` "narrow the old ingress **last**" — record it as a permanent no-op
  while any subdomain stays proxied, not as a pending task. The shared list still
  carries its original 32 ingress rules, and all eight co-tenant subdomains still
  resolve to Cloudflare, so no removable subset exists. Also fix `:345` "two of
  the four are done" — three and a half are.
- `docs/go-live-checklist.md:249-251` "**PLANNED, NOT DONE** … today's data path
  still runs through Cloudflare" — false, and the most dangerous stale line in
  the set.

### DNS and domain

- `:255-257` "DNSSEC is off … there are **zero CAA records**" — 13 CAA records
  exist (already recorded as done at `:420`), a DS is published at `com`
  (`2371 ECDSAP256SHA256`) and a validating resolver returns `AD=true`.
- `:426-430` "registrar side outstanding … needs registrar access I do not have"
  — the DS landed. Keep the warning that this is the one DNS change that can take
  the domain offline; it is currently healthy.
- `:417` and `:438` are the same HSTS-preload fact twice — collapse.

### Deploy and monitoring

- `:173` push-to-deploy — closed, and the entry is the correction of a wrong
  diagnosis. Do not deploy by hand after a merge; prefer
  `EXPECTED_COMMIT=$(git rev-parse HEAD) node scripts/check-integrity.mjs` after
  ~5 minutes.
- `:897` "**Still to verify:** whether the named User-Agent is allowed through" —
  structurally moot since the cutover removed Cloudflare from the request path;
  `check-integrity.mjs` passes 14/14 against production.
- `:403` and `:413` assert the canaries run daily by `residency.yml`. They do not
  — amend both to "when Actions billing is live" (see B2).
- `:375-390` uptime monitoring — fully closed, all six sub-items. Worth noting
  Uptime Kuma is currently the only automated production watch still executing.
- `:395-399` GlitchTip — deliberately waived; a browser SDK would breach
  invariant 1 on the pages that promise silence.

### Security audit bundle

- `:622-624` reads as six open items; four are closed elsewhere — SPC-API-002 at
  `:1279`, SPC-TM-001 both halves at `:1182-1185`, SPC-TM-002 at `:1099`,
  SPC-CON-009 at `:1242`. Only SPC-WEB-002 (code done, see A3), SPC-TM-003 (A6)
  and SPC-SUP-002 (B5) remain.
- `:938-953` SPC-WEB-002 "the one that looked easy, and is not" — shipped
  2026-08-08 in `3ed7942`/`9a40ad3`; verified live, `/admin/login` returns
  `style-src-elem 'self' 'nonce-…'`. Its cited locators are stale too
  (`proxy.ts:68` → `:117`, nonce `:92-94` → `:142-144`).
- `:450` "**Remaining:** only re-run `sec-web` … and record the grade" — recorded
  at `:901-905`: A− public, A+ admin, measured 2026-08-07. Point `:450`,
  `docs/go-live-checklist.md:246`, `docs/security/readiness-scorecard.md:31`
  and `:73`, and `ADR-security-headers.md:69` at that record. State it as A−/A+
  with the SPC-WEB-001 waiver named — writing "A-grade" is exactly the half-true
  tick `docs/go-live-checklist.md:19` warns about. Add that the headers were
  re-verified byte-identical after the cutover.
- `:560-571` — an orphaned fragment, "tradeoff; fix needs hydration testing.",
  dangles after the closing `[x]`. Delete.
- `:901` SPC-WEB-001 — waived by recorded decision; `ADR-csp-public-tier.md:3`
  says "investigated 2026-08-08, **not changed**". The only follow-up is
  `ADR-security-headers.md:16`, which still says "~17 inline scripts" where `/`
  has 101.
- `:547` "`ssl = off`" — false; production reports `SHOW ssl` → `on` and the live
  app connection is TLSv1.3. Same correction at
  `docs/security/readiness-scorecard.md:37`, which also still rates it red.

### Container hardening

- `:688` read-only rootfs "Needs testing" — tested and closed 2026-08-08 by
  `5d56f14` / PR #69, recorded at `docs/founder-checklist.md:343`: the app runs
  fine read-only, and Coolify's `convertDockerRunToCompose` allow-list contains
  neither `--read-only` nor `--tmpfs`. Same correction at
  `docs/security/threat-model.md:206` and the stale "Not applied yet" opener at
  `docs/runbooks/deploy-production.md:348`.
- `:686-694` "**Still not applied**" undercounts — `PidsLimit` is unset and
  appears in neither the "Applied 2026-07-28" notes nor this list. Add it, with
  the reason not to retry the flag: `--pids-limit` is absent from Coolify's
  allow-list, and the allow-listed alternative `--ulimit nproc` is enforced
  per-UID host-wide with no user-namespace remapping, so it would reach the
  co-tenant's containers.
- `:663-676` `no-new-privileges` — correctly parked; `SecurityOpt` is still
  unset, and the residual is small with `cap_drop: ALL` already applied.
- `:694` Docker secrets `_FILE` — genuinely open, but note the two blockers found:
  an entrypoint-materialised environment is **not** inherited by `docker exec`,
  which would silently break the nightly `retention-purge` job, and Coolify's
  option allow-list contains no `--volume`/`--mount` at all. Folds into B3/B5
  rather than standing alone.

### Everything else

- `:228` TM-013 — closed, fixed, deployed, no notification owed; do not re-add
  the `/trust` retraction.
- `:609` SPC-DB-004 — accepted with a written rationale, and its stated
  mitigation landed at `:614`.
- `:758` admin lockout — closed, and the original alarm was wrong. Do not reopen
  on the strength of `docs/go-live-checklist.md`, which still calls it
  "unrecoverable".
- `:1001-1009` SPC-DB-005 — shipped and running; `:1058` is a second, superseded
  heading describing a state closed at `:1005`. Merge or mark superseded. Also
  `docs/standards/security-and-privacy.md:384` and `:396` still say it is "NOT
  SCHEDULED ANYWHERE".
- `:1097` SPC-TM-002, `:1180` SPC-TM-001, `:1240` SPC-CON-009, `:1277`
  SPC-API-002, `:1320` gitleaks pre-commit, `:1077` PIM3 round-4 — all closed and
  verified in the repo.
- `:1352` "Only the CI half exists" — false since 2026-08-07 and contradicts its
  own `:1324` checkbox; the hook runs and gitleaks 8.24.3 is installed. Consider
  also updating `SECURITY.md:22`, whose "In place today" list understates the
  current posture.
- `:1304-1318` is a **verbatim duplicate** of `:1288-1302`. Delete.
- `:1270` cites `ci.yml:228-241` for the SBOM; it is at
  `.github/workflows/ci.yml:277-288`.
- `:723-725` P8 umbrella — split it. Build, Trivy scan and SBOM are done
  (`ci.yml:233`, `:237`, `:277`); provenance is parked by SPC-SUP-002 (B5); a
  SAST job and branch protection are both plan- and billing-gated; OCI Vault and
  volume encryption need their own re-scope (there is no separate block volume at
  all, and no compartment to scope a Vault grant to, so a customer-managed key
  would re-key the shared host's boot volume).
- `:458` Umami query/hash stripping — parked with no subject; when analytics
  lands it ships in the same PR, never as a follow-up.
- `:1093` PIM3 999-sentinel — deliberately a note, not code; writing the guard now
  would be dead code around a clinical score.
