# Runbook: production deployment (as actually deployed)

**This is the live production setup.** `deploy.md` describes the standalone
Caddy + compose stack that was designed first; it is **not** what production
runs. The OCI host is a shared multi-site server operated by **Coolify**, so
TowardPCC is deployed as a Coolify application behind Coolify's Traefik proxy.

- **Live:** https://towardpcc.com (+ `www`), first deployed 2026-07-26
- **Host:** OCI `hosting-1`, `145.241.105.239`, me-riyadh-1 (KSA — the request
  path is in-Kingdom; mail is not, see invariant 3 in the root `CLAUDE.md`)
- **Edge:** OCI load balancer `towardpcc-edge`, `145.241.110.213`, same region.
  Terminates TLS and forwards to Traefik on the host. Fronts the apex and `www`
  only, since the 2026-08-08 cutover (`edge-migration-ksa.md` is the build
  record; the cutover itself is under "Before you touch production" below).
- **Platform:** Coolify v4.1.2, Traefik v3.6 (TLS via Let's Encrypt, HTTP-01)
- **Canonical host:** `www.towardpcc.com`. The apex 308s to it in `proxy.ts`
  (exact host match, so `next.` and `localhost` are unaffected). Coolify's
  `NEXT_PUBLIC_SITE_URL` is `https://www.towardpcc.com` for production and
  `https://next.towardpcc.com` for preview — the two must not be the same, or
  the preview advertises production's canonical.
- **DNS:** Cloudflare zone `towardpcc.com`, authoritative DNS only. The apex and
  `www` are **DNS-only (grey cloud)** and resolve to the load balancer; Cloudflare
  sees none of their request content. **Every other subdomain stays proxied**,
  and the warning below applies to those verbatim.

  > ⚠️ **For every subdomain EXCEPT the apex and `www`, proxying is ON (orange
  > cloud) and the origin is LOCKED to Cloudflare. Do not turn it off — doing so
  > takes that hostname fully offline.** This applied to the apex and `www` too
  > until 2026-08-08; the paragraphs that follow were written before the
  > cutover and are kept because the lock they describe is still live for
  > `next`, `db`, `deploy`, `endorse`, `mnm`, `mylibrary`, `stg-mylibrary` and
  > `uptime`.
  >
  > Verified 2026-07-27 against the OCI security list
  > (`Default Security List for hosting-vcn`): ports 80 and 443 accept traffic
  > **only** from Cloudflare's fifteen published edge ranges, each rule labelled
  > "Cloudflare edge". Port 22 is open to `0.0.0.0/0`; web traffic is not.
  > Confirmed from outside: 22 connects, 80 and 443 time out, while the host's
  > own iptables accepts all three and Traefik is listening.
  >
  > This supersedes the earlier note that proxying was "off deliberately".
  > Grey-clouding would resolve every visitor to an origin whose cloud firewall
  > drops them. ACME HTTP-01 also renews _through_ Cloudflare — port 80 is
  > reachable only via the edge — so turning proxying off would break
  > certificate renewal as well as serving.
  >
  > **Open issue — RESOLVED 2026-07-29, kept for the reasoning.** The fix is
  > `apps/web/lib/client-ip.ts` (`clientIp()` in `submissions.ts` now delegates
  > to it), and the measurement that caught the first, wrong implementation is
  > under "Client IP — SOLVED" in `edge-migration-ksa.md`. As written at the
  > time: `clientIp()` in `apps/web/lib/submissions.ts` assumes a
  > single reverse proxy setting `x-real-ip` to the connecting client. Traefik
  > has no `forwardedHeaders.trustedIPs` configured, so it overwrites incoming
  > forwarded headers with its own view — which is a Cloudflare edge node.
  > Submission rate limiting is therefore per-edge rather than per-visitor, and
  > the salted IP hash kept for abuse investigation records Cloudflare.
  >
  > The fix is to read `CF-Connecting-IP`. Normally that would be unsafe
  > (CWE-348, attacker-supplied header) — but the origin lock above means the
  > connecting peer is _guaranteed_ to be Cloudflare, because nothing else can
  > open a connection to 80/443 at all. The network layer already enforces the
  > property the application would otherwise have to check.
  >
  > **That safety is a dependency, not an invariant.** If the security list is
  > ever widened to `0.0.0.0/0` on 80/443, trusting the header silently becomes
  > a rate-limit bypass. Keep the two in step, and treat opening those ports as
  > a change that requires revisiting `clientIp()`.
  >
  > Cloudflare also injects its analytics beacon at the edge. It appears zero
  > times in origin HTML and the CSP blocks it, so no third-party script
  > executes and the privacy posture holds — but it logs a CSP violation per
  > page load. On the apex and `www` it no longer appears at all: Cloudflare has
  > been out of their request path since 2026-08-08.

> ⚠️ The host also runs other live applications, **including one with real
> patient data**. Every TowardPCC change must be additive and scoped to its own
> app/database. Never touch another project's containers, databases, or the
> shared proxy config.

## Before you touch production — read this first

Moved here from the root `CLAUDE.md` on 2026-09-03, unchanged in substance, so
that a session which never deploys does not pay for it on every turn. Each
paragraph records a mistake that cost real time and the measurement that
corrected it; the rules distilled from them are in the root file's "Production"
section. Do not shorten these — the dates and numbers are what make the rules
stick.

- **Push-to-deploy WORKS. Merging is enough — do not deploy by hand.** The root
  `CLAUDE.md` claimed the opposite until 2026-08-07 and the claim was false; the
  correction matters because acting on it wasted a redundant build on every
  single merge. Coolify's own queue shows every `main` push producing a
  `is_webhook=true` deployment that finished with the right commit. **Builds
  take 125–308 seconds** (measured across eight deploys), and Coolify does a
  rolling update, so the OLD container keeps serving until the new one is
  healthy. Checking the image tag thirty seconds after a merge shows the
  previous commit and means nothing. **Wait ~5 minutes, then check.** Every
  "dropped deploy" ever recorded was that mistake, followed by a manual deploy
  of the same commit that then took credit.
- **Merging N PRs back to back queues N builds, and every one of them checks out
  the CURRENT HEAD, not the commit that triggered it.** So a batch of merges is
  SAFE — production never serves an older commit partway through — but only the
  last build does any new work, and `~5 minutes` becomes
  `~5 minutes per queued build`. Measured twice on 2026-08-08: six merges
  queued four deployments, and
  the queue was observed rewriting a pending entry from `f63ce16` to the newer
  `da8cbbc` before building it; two merges later queued two, both already
  showing HEAD. **The wrong inference to draw is that a batch rolls production
  backward** — this was nearly recorded, on the strength of the queue listing
  alone, before the poll trace showed the rewrite. It does not.
  `check:integrity` will read STALE for the whole drain, which is correct rather
  than a failure; wait for the queue to empty before believing it.
  **Re-measured 2026-09-03: three merges in one minute took ~26 minutes to
  land, not ~15.** A 25-minute poll gave up, `check:integrity` was read as
  "a deploy failed silently", and `docker ps` a minute later showed the new
  container up 48 seconds. Budget ~10 minutes per queued build — the host
  builds other tenants' applications on the same queue — and read a STALE
  result inside that window as "not yet", never as "failed".
- **Prefer `pnpm check:integrity` over the tag check.** Since 2026-08-08 the
  canary asserts the DEPLOYED COMMIT, not only page content: `/api/v1/health`
  publishes `sha256(SOURCE_COMMIT)` truncated to 16 hex characters in its
  `x-build-fingerprint` header (`apps/web/lib/build-fingerprint.ts`), and the
  script compares it with the SHA it checked out. It is strictly better evidence
  than the image tag, and measurably so — on its first real run it reported
  production still serving the previous commit at a moment when `docker ps`
  already showed the new tag. **The tag flips before the serving container
  does**, which is the gap that produced every "dropped deploy" above. Run
  `EXPECTED_COMMIT=$(git rev-parse HEAD) node scripts/check-integrity.mjs`.
- **The tag check still works as a fallback — just not immediately.**
  `sudo docker ps --filter name=gpsokvxzncr7ks1vzqz7wkr4 --format '{{.Image}}'`
  against `origin/main`, once, after the build has had time. Coolify's `status`
  field remains useless in both directions: it read `running:healthy` over a
  stale container and `running:unhealthy` over one Docker and both probes called
  healthy. Deploy by hand only when a deployment genuinely **failed** — one has,
  on 2026-08-03, when a helper container vanished mid-build under two merges
  three minutes apart. The API call is under "Deploying a change" below.
- **THE APEX AND `www` ARE NO LONGER PROXIED — cut over 2026-08-08.** They
  resolve to the OCI load balancer at `145.241.110.213`, which terminates TLS in
  me-riyadh-1 and is publicly reachable on its own NSGs. Cloudflare is
  authoritative DNS only and sees no request content. Re-proxying them would put
  requests back through an edge outside the Kingdom while `/trust` says they
  arrive directly, and would reinstate the injected script that caused TM-013 —
  `scripts/check-residency.mjs` now alarms on exactly that, having been inverted
  in the same change.
- **Proxying stays ON for every OTHER subdomain**, and the orange-cloud warning
  at the top of this file applies to them verbatim. `next`, `db`, `deploy`,
  `endorse`, `mnm`, `mylibrary`, `stg-mylibrary` and `uptime` all point at the
  host `145.241.105.239`, whose OCI security list accepts 80/443 only from
  Cloudflare's edge ranges — so grey-clouding any of them takes it offline and
  breaks certificate renewal. Several are co-tenant applications. That lock is
  also what makes trusting `CF-Connecting-IP` safe — opening those ports means
  revisiting `apps/web/lib/client-ip.ts` in the same change.

## Access — what an agent can reach from the dev machine

**Check what you can reach before calling something the founder's job.** SSH is
`ssh -i ~/.ssh/oci_server ubuntu@145.241.105.239`, with passwordless sudo. The
Coolify API token is `~/.coolify-token` **on the host**. The OCI CLI is
`~/.local/bin/oci` **on this machine, not the server**, and the `oracle-oci`
MCP is usually disconnected. The Cloudflare token (`~/.cloudflare-token` on the
host) **can edit DNS** but is refused on zone settings and WAF — so DNS moves
are yours to make, while Bot Fight Mode, JS Detections, WAF rules and Turnstile
are genuinely founder-only. **The repository is PUBLIC and has been since it was
created on 2026-07-24** (GitHub's `PublicEvent`); the line that stood here —
"a private repo needs GitHub Pro" — was wrong, and branch protection is free.
Getting this wrong wastes the founder's time in both directions.

The host runs an application holding real patient data. Every command you run
there is scoped to TowardPCC's own containers and its own database — the
`-d towardpcc` flag on every `psql` below is load-bearing, not decorative.

## Coolify application

| Field                 | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| Project / environment | `clinical` / `production`                               |
| Application           | `towardpcc` — uuid `gpsokvxzncr7ks1vzqz7wkr4`           |
| Repository            | `git@github.com:ahmedsk2/towardpcc.git`, branch `main`  |
| Auth                  | read-only GitHub **deploy key** (`towardpcc-deploy`)    |
| Build pack            | Dockerfile — `/apps/web/Dockerfile`, base directory `/` |
| Port                  | 3000 (Traefik routes 80/443 → 3000)                     |
| Health                | Dockerfile `HEALTHCHECK` → `/api/v1/health`             |

## Database (shared Postgres 16, isolated per app)

Database `towardpcc` lives in the shared `shared-services` Postgres container
(`tjuvmq29ogsdoocz59qigcoc`) on the `coolify` Docker network. Two roles:

- `towardpcc_owner` — owns the schema; used **only** for `prisma migrate deploy`.
- `towardpcc_app` — the runtime role: CONNECT/USAGE + CRUD on tables, USAGE on
  sequences. **Not a superuser.** `UPDATE`/`DELETE` on `"AuditLog"` are revoked,
  so the audit trail is append-only at the database level (SPC-DB-001/003).

The owner connection string is deliberately **not** in the app's environment —
only `DATABASE_URL` (app role) is. Keep it that way.

### Verify the hardening

```bash
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -tAc \
  "SELECT has_table_privilege('towardpcc_app','\"AuditLog\"','DELETE')"   # → false
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -tAc \
  "SELECT rolsuper FROM pg_roles WHERE rolname='towardpcc_app'"           # → false
```

Run these too after `20260808120000_audit_nullable_actor`. The first is the one
that matters: a `REVOKE` on the table does **not** cover foreign-key referential
actions, because those run outside the invoking role's privileges. If this ever
returns `n` (`SET NULL`) instead of `r` (`RESTRICT`), deleting one admin blanks
`actorId` across the whole trail and the append-only control is bypassed without
a single denied statement.

```bash
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -tAc \
  "SELECT confdeltype FROM pg_constraint WHERE conname='AuditLog_actorId_fkey'"  # → r
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -tAc \
  "SELECT conname FROM pg_constraint
   WHERE conname='AuditLog_null_actor_is_auth_event'"                            # → 1 row
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -tAc \
  "SELECT has_table_privilege('towardpcc_app','\"AdminUser\"','DELETE')"         # → false
```

## Deploying a change

Coolify builds from `main` on the host. Trigger a deploy with the API token at
`~/.coolify-token` on the server:

```bash
TOKEN=$(cat ~/.coolify-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/deploy?uuid=gpsokvxzncr7ks1vzqz7wkr4&force=false"
```

Poll `GET /api/v1/deployments/<deployment_uuid>` until `status` is `finished`.
Coolify does a rolling update: the new container must pass its healthcheck
before the old one is removed, so a failed build leaves the current site up.

**Push-to-deploy is wired.** A GitHub webhook (repo → Settings → Webhooks, id
`657319469`) posts `push` events to
`https://deploy.towardpcc.com/webhooks/source/github/events/manual`, so merging
to `main` builds and deploys automatically. The rolling update gates on the
container healthcheck, so a failed build leaves the running site untouched.
Use the API call above when you need to force a redeploy without a push.

### After merging a schema change, CHECK FOR MIGRATION DRIFT

**Push-to-deploy does NOT run migrations.** The image runs `prisma generate` at
build time and nothing else; `prisma migrate deploy` is a separate manual step
under the owner role (next section). So merging a schema change ships code that
expects a column the database may not have, and the deploy will still go green —
the healthcheck does not touch the new column, and Coolify has no idea a
migration exists.

Nothing catches this automatically. The daily canaries assert the live site over
HTTP and have no database access; the deploy healthcheck only proves the process
started. **The only thing standing between a forgotten migration and a runtime
error in front of a user is somebody running this:**

```bash
ssh -i ~/.ssh/oci_server ubuntu@145.241.105.239   "sudo docker exec tjuvmq29ogsdoocz59qigcoc      psql -U postgres -d towardpcc -tAc      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY started_at'"
```

Compare that list against `ls packages/db/prisma/migrations/`. They must match,
in order. Note the `-d towardpcc` flag: this Postgres instance is **shared with
a co-tenant application holding real patient data**, and that flag is the only
thing keeping the query on our database. Do not drop it, and do not widen the
query to the instance.

Checked 2026-08-09: five migrations in the repo, the same five applied in
production, in order. No drift.

## Database migrations

Migrations run separately, as the **owner** role, from the build image:

```bash
sudo docker run --rm --network coolify --env-file /home/ubuntu/towardpcc-secrets.env \
  <build-image> sh -c 'cd /repo && DATABASE_URL="$DATABASE_URL_OWNER" \
  pnpm --filter @towardpcc/db exec prisma migrate deploy'
```

`/home/ubuntu/towardpcc-secrets.env` (mode 600) holds both connection strings and
is the source of truth used to seed Coolify's env vars. It is **not** in git.

## Gotcha: Prisma WASM in the standalone image

Under Prisma 6, Next's standalone output tracer omitted Prisma's
`query_compiler_bg.wasm`, which made every DB query fail with `ENOENT` at runtime
while `/api/v1/health` still returned 200. `apps/web/Dockerfile` copies the file
into the standalone tree explicitly, and CI asserts it shipped.

Two things changed with the Prisma 7 upgrade, both verified against a real
container and a real Postgres:

- **The file was renamed** — `query_compiler_bg.wasm` →
  `query_compiler_fast_bg.wasm`. The Dockerfile copy and the CI assertion now
  match `query_compiler*_bg.wasm` by glob so the next rename is not an outage.
- **The copy is no longer load-bearing.** Prisma 7 inlines the query compiler
  into the webpack server chunks, so the standalone output carries it already.
  An image with every `.wasm` deleted still serves `/api/v1/ready` fine. The copy
  is kept as cheap insurance and still fails the build loudly if the file
  vanishes, but it is no longer the thing standing between you and the outage.
  Retiring it (and its CI assertion) is a reasonable future cleanup.

**`/api/v1/health` does not prove the database works — always check
`/api/v1/ready`**, which runs `SELECT 1`:

```bash
curl -s https://towardpcc.com/api/v1/ready   # {"status":"ready"} — 503 if the DB is unreachable
```

## Rollback

Coolify keeps previous deployments: the app → Deployments → pick the last good
one → Redeploy. Because the rolling update gates on the healthcheck, a bad build
never replaces a healthy container.

## Rotating a secret

Coolify stores each variable **twice** — once for production (`is_preview=false`)
and once for its preview-deployments feature (`is_preview=true`). Rotating only
the first leaves a stale copy that a preview deployment would pick up, so rotate
both, and give them **different** values.

A container restart is not enough. Docker fixes the environment at container
_creation_, so `docker restart` leaves the old values in place — measured, and
the fingerprints did not move. Use a `restart_only` deployment, which recreates
the container from the existing image:

```bash
TOKEN=$(cat ~/.coolify-token)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/applications/gpsokvxzncr7ks1vzqz7wkr4/restart"
```

Prefer this over a full deploy when the goal is a secret change: a redeploy
rebuilds from `main`, which ships whatever code has landed since the running
image — an unrelated change riding along on a security fix.

Verify by fingerprint, never by reading the value back:

```bash
CID=$(sudo docker ps --format '{{.Names}}' | grep ^gpsokvxzncr7ks1vzqz7wkr4)
sudo docker exec "$CID" sh -c 'printenv AUTH_SECRET | sha256sum | cut -c1-8'
```

`AUTH_SECRET` and `SUBMISSION_IP_SALT` are safe to rotate this way —
respectively, everyone logs in again, and old abuse hashes stop correlating
with new ones.

### TOTP_ENC_KEY is not safe to rotate this way

It seals admin TOTP secrets **and** the stored SMTP settings, and
`apps/web/auth.ts` decrypts the TOTP secret _before_ it considers a recovery
code — so a swapped key throws inside `authorize()` and login dies before the
recovery branch runs. **Recovery codes do not get you back in.**

Re-encrypt first, then change the variable:

```bash
node packages/db/scripts/rotate-totp-enc-key.mjs --self-test   # no database
TOTP_ENC_KEY_OLD=<old> TOTP_ENC_KEY_NEW=<new> \
  node --env-file=.env.local packages/db/scripts/rotate-totp-enc-key.mjs
```

The second command is a dry run: it decrypts, re-encrypts and verifies every row
and writes nothing. Add `--commit` to apply (one transaction, re-runnable), then
set `TOTP_ENC_KEY` to the new value and restart as above. Between the commit and
the restart the running app still holds the old key, so keep that window short.

**On this host the Prisma path above does not work**, and that is not a bug to
fix in a hurry: `packages/db` is not in the production image (Next traces only
what the app imports), the host has no Node at all, and inside the container
Prisma sits in a pnpm store path with `pg` never traced in. Use `--filter`, which
moves values with `psql` and runs only the crypto in the container on Node's
built-in `crypto` — one tested implementation instead of a second copy written
against a live database. This is what the 2026-08-01 rotation used:

```bash
APP=$(sudo docker ps --format '{{.Names}}' | grep ^gpsokvxzncr7ks1vzqz7wkr4)
PG=tjuvmq29ogsdoocz59qigcoc
# Stage as the app user: cap_drop:ALL means even root in the container cannot
# chown, so a `docker cp`ed file stays unreadable to uid 100.
sudo docker exec -i "$APP" sh -c 'umask 077; cat > /tmp/nk' < new.key
sudo docker exec "$PG" psql -U postgres -d towardpcc -tAc \
  "SELECT id || E'\t' || \"totpSecret\" FROM \"AdminUser\"" > admin.in
sudo docker exec -i "$APP" sh -c \
  'TOTP_ENC_KEY_OLD="$TOTP_ENC_KEY" TOTP_ENC_KEY_NEW="$(cat /tmp/nk)" node /tmp/rotate.mjs --filter' \
  < admin.in > admin.out
```

Then generate `UPDATE` statements from `admin.out` and apply them inside one
`BEGIN`/`COMMIT`. Verify by reading the values back out of the database and
opening them with the key the running container holds — not by trusting the
restart. Shred the key files afterwards.

`DATABASE_URL` is a separate exercise: it means coordinating the app role and
`towardpcc_owner`, and re-running the restore drill afterwards.

## Backups (configured + drill passed 2026-07-26)

`towardpcc` is in the shared-postgres nightly job (Coolify scheduled backup id 1,
`0 3 * * *`, `databases_to_backup = postgres,towardpcc`), with the offsite copy
going to OCI Object Storage bucket `coolify-backups` (me-riyadh-1 — in-region, so
the residency claim holds). Local dumps land in
`/data/coolify/backups/databases/root-team-0/shared-postgres-<uuid>/` (root-only).

**Restore drill: PASSED 2026-07-26, re-run and PASSED again 2026-08-09.**

The 2026-07-26 entry said "all 7 tables". By 2026-08-09 there were **9** — the
`audit_nullable_actor` and `admin_session_allowlist` migrations had landed — so
the drill was checking a number that no longer described the database. A drill
whose success criterion is a stale literal will pass while proving nothing, and
that is worse than not running it.

**So the criterion below is DERIVED, not written down.** It compares the
restored database against the live one, table for table and row for row. It
cannot go stale, and it fails loudly on the case a fixed count silently misses:
a table that restores but comes back empty.

```bash
set -u
PGC=tjuvmq29ogsdoocz59qigcoc
DUMP=$(sudo sh -c "ls -t /data/coolify/backups/databases/root-team-0/shared-postgres-$PGC/pg-dump-towardpcc-*.dmp | head -1")
echo "dump: $(basename "$DUMP")"

sudo docker exec $PGC psql -U postgres -tAc "DROP DATABASE IF EXISTS towardpcc_restore_test"
sudo docker exec $PGC psql -U postgres -tAc "CREATE DATABASE towardpcc_restore_test"
sudo cat "$DUMP" | sudo docker exec -i $PGC pg_restore -U postgres   -d towardpcc_restore_test --no-owner --no-privileges

# Derived check: every table in the LIVE database must exist in the restore
# with an identical row count.
for T in $(sudo docker exec $PGC psql -U postgres -d towardpcc -tAc     "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"); do
  A=$(sudo docker exec $PGC psql -U postgres -d towardpcc            -tAc "SELECT count(*) FROM \"$T\"" | tr -d ' ')
  B=$(sudo docker exec $PGC psql -U postgres -d towardpcc_restore_test -tAc "SELECT count(*) FROM \"$T\"" | tr -d ' ')
  printf "  %-22s src=%-6s restored=%-6s %s
" "$T" "$A" "$B" "$([ "$A" = "$B" ] && echo OK || echo MISMATCH)"
done

sudo docker exec $PGC psql -U postgres -tAc "DROP DATABASE towardpcc_restore_test"
```

Result on 2026-08-09, from `pg-dump-towardpcc-1786244406.dmp` (that night's
03:00 dump): **9 tables source, 9 restored, every row count matching** —
`AdminUser` 1, `AppSetting` 8, `AuditLog` 3, `_prisma_migrations` 5, the rest
empty. Scratch database dropped.

Two things that were open and are now closed by that run. The newest dump had
previously predated the `AdminSession` migration by about three hours, so the
restore could not have proved that table; the next nightly closed the gap and
`AdminSession` restores. And `_prisma_migrations` restoring with all five rows
means a restored database knows its own schema version — a restore that lost it
would look healthy and then refuse the next `migrate deploy`.

**`-d towardpcc` is load-bearing throughout.** This Postgres instance is shared
with a co-tenant application holding real patient data. Every command above is
scoped to our database or to the scratch copy; none may be widened to the
instance.

Note the glob must run **inside** `sudo` — the backup directory is not readable
by `ubuntu`, so `sudo ls $DIR/*.dmp` expands to nothing before sudo is applied.

## Break-glass: locked out of /admin

**This is recoverable. It is not a lockout risk, whatever the go-live checklist
used to say.** Verified against production on 2026-08-07: exactly one AdminUser
(role `OWNER`), all ten recovery codes present and unconsumed, and a successful
TOTP login that morning.

**If the authenticator phone AND all ten recovery codes are lost**, mint a fresh
recovery code with `psql` alone — no `TOTP_ENC_KEY`, no Node, no repo checkout.
This works because `hashRecoveryCode()` is plain `sha256(code.trim().toLowerCase())`
in hex, and Postgres 16's `encode(sha256(...),'hex')` produces byte-identical
output; both sides were run on the live host and compared.

```bash
# 1. On your own machine. This is the ONLY copy — write it down before continuing.
CODE=$(openssl rand -hex 10 | sed 's/.\{5\}/&-/g; s/-$//'); echo "$CODE"
```

```bash
# 2. On the server. APPENDS to the array — it does not destroy existing codes.
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -c   "UPDATE \"AdminUser\" SET \"totpRecoveryCodes\" = \"totpRecoveryCodes\" || encode(sha256('PASTE-CODE'::bytea),'hex'), \"failedLoginCount\"=0, \"lockedUntil\"=NULL WHERE role='OWNER';"
```

Then sign in at `/admin/login` with email + password + that code. The code is
consumed on use. The statement above was dry-run on production inside
`BEGIN … ROLLBACK` — `UPDATE 1`, count 1 in-transaction, 10 again after
rollback. Production was not modified by that test.

### The real single point of failure is the PASSWORD

Not the TOTP codes. Argon2id cannot be recomputed on the box: neither
`hash-wasm` nor `otpauth` exists as a directory in the production image (Next
bundles them into the server chunks) and Node 24 ships no argon2.

If the password is lost too, recovery means running `create-admin.mjs` from the
repo against the database with a **new** email, over an SSH tunnel — Postgres
publishes no host port (the container is `10.0.2.7` on the `coolify` network)
and `DATABASE_URL_OWNER` lives in `/home/ubuntu/towardpcc-secrets.env`. Entirely
doable, but an hour rather than a minute. So the one thing genuinely worth
keeping in a password manager is the `/admin` password.

## Still outstanding

- **SMTP relay not configured** — `SMTP_*` are empty, so form submissions are
  stored but no admin notification is sent. The zone's SPF is `v=spf1 -all`.
  **Leave it that way.** Earlier guidance here said to widen it when a relay is
  added; that is wrong for the relay being adopted. SPF is evaluated against
  the envelope MAIL FROM, which for OCI Email Delivery's default return path is
  an Oracle-owned domain, so the apex record is never consulted — DKIM
  alignment is what earns the DMARC pass. See `email-delivery.md`.
- **Cloudflare proxying is ON for every subdomain except the apex and `www`**,
  and the origin's OCI security list admits 80/443 only from Cloudflare's edge
  ranges. The apex and `www` left the proxy on 2026-08-08 by design — they
  reach the load balancer on its own NSGs, not the host's security list, which
  is why they could — and must not be put back (see "Before you touch
  production"). For the rest, this line once read "proxying is off",
  contradicting the warning at the top of this same file and very nearly
  causing an outage when someone acted on it. A direct HTTPS request to the
  host IP times out; turning the orange cloud off on any of those hostnames
  without first widening the security list takes it fully offline and breaks
  ACME HTTP-01 renewal.
- **Secondary on-call contact** still unnamed (bus-factor-1).

## Container hardening: read-only rootfs

Not applied yet — Coolify does not set `read_only` by default and nothing in the
repo sets it for the live application. These are the exact mounts, measured
against the built image rather than copied from a hardening guide.

```yaml
read_only: true
tmpfs:
  - /tmp:size=64m
  - /app/apps/web/.next/cache:uid=100,gid=101,mode=0700,size=64m
```

`uid=100,gid=101` are `app`'s ids in this image and are **not** optional — a
tmpfs mounted root-owned is as unwritable as the read-only layer underneath it.

### Why a health check is not enough to verify this

The second mount is the one that is easy to miss, and the way it fails is the
reason to write it down.

`next.config.ts` declares no `images` block, so the built-in optimiser runs and
writes to `<distDir>/cache/images` — a directory the image does not contain.
Under `--read-only` with only `/tmp` mounted, `/api/v1/health` returns 200, the
container reports `healthy`, and `/_next/image` still returns 200. Nothing looks
wrong. But every optimised image request throws
`ENOENT: no such file or directory, mkdir '/app/apps/web/.next/cache'` as an
unhandled rejection, and the image cache is silently disabled.

That last part is the actual cost. `/_next/image` takes `w` and `q` from the
query string, so with no cache absorbing them every combination forces a fresh
re-encode — a cheap CPU-exhaustion lever on a host shared with other live
applications. With the mount in place: three widths requested, three cache
entries written, zero unhandled rejections.

A smoke test that only checks health cannot see any of this. Request an
optimised image and read the logs.

Two related notes. The service worker precaches in the BROWSER, so it needs no
container write and is not a factor here. `revalidatePath` in the admin server
actions targets the same `.next/cache` path and is covered by the same mount,
but the authenticated admin routes were not exercised under read-only — verify
that before assuming it.

## Coolify environment variables: two things that cost an hour

### A multi-line value breaks EVERY subsequent deployment

Coolify accepts a multi-line variable through the API without complaint and
returns it intact on read — all 1203 characters of a PEM came back. From that
moment on, every deployment of the application fails.

Measured on 2026-08-08 while enabling database TLS. After creating
`DATABASE_CA_CERT` as a raw PEM, four consecutive deployments failed at ~16s
(`App\Jobs\ApplicationDeploymentJob ... FAIL`), including a merge to `main`
that would otherwise have shipped normally. Deleting the variable and
redeploying the same commit succeeded immediately, which is what pins the cause.

**The failure mode is nasty because the site stays up.** The rolling update
never replaces the running container, so health stays 200, `/api/v1/ready`
stays `ready`, and nothing about the site looks wrong. What is actually broken
is the pipeline: pushes to `main` stop reaching production and the last good
image just keeps serving. The first symptom I noticed was the wrong thing
entirely — the variable missing from `docker inspect` — which reads as "Coolify
dropped it" when the truth is that no deployment carrying it ever completed.

So any value with embedded newlines must be base64-encoded to a single line
before it goes in. Verified afterwards: the same certificate as single-line
base64 deployed cleanly and the app's connections came up on TLSv1.3.
`packages/db/src/index.ts` accepts either form and sniffs which it was given.

```bash
base64 -w0 < cert.pem      # single line, safe to paste into Coolify
```

**If deployments start failing for no apparent reason, check for a multi-line
environment variable first.** The deployment list is where it shows:

```bash
TOKEN=$(cat ~/.coolify-token)
curl -s -H "Authorization: Bearer $TOKEN"   "http://localhost:8000/api/v1/deployments/applications/gpsokvxzncr7ks1vzqz7wkr4?take=6"
```

`e3b0c44298fc` as a `sha256sum` fingerprint means the variable is **empty or
absent** — that is the hash of the empty string, not of your value.

### The API's `restart` does not pick up an environment change

The rotation section above says to prefer `restart_only`. That holds for the
Coolify UI action, but `POST /api/v1/applications/<uuid>/restart` did **not**
regenerate the environment here — two consecutive restarts left the container
without the new variable. A deploy did recreate it.

When `main` is already the deployed commit, `GET /api/v1/deploy?...&force=true`
ships no extra code and is the reliable option.

## Running a migration: the `<build-image>` step is stale

The command earlier in this file passes `<build-image>`. **No build-stage image
survives on the host** — every retained `gpsokvxzncr7ks1vzqz7wkr4:*` tag is the
runtime image, and none of them contain `/repo`, the Prisma CLI, or the
migrations directory (checked across the last three).

What works, and what was used to apply `20260808120000_audit_nullable_actor`:
ship `packages/db` (schema, `prisma.config.ts`, `prisma/migrations/`) to the
host, then run the CLI in a throwaway Node container on the `coolify` network.

```bash
tar -czf /tmp/db.tgz -C packages/db prisma prisma.config.ts     # from a checkout
scp /tmp/db.tgz ubuntu@145.241.105.239:/tmp/
ssh ubuntu@145.241.105.239
mkdir -p /tmp/mig && tar -xzf /tmp/db.tgz -C /tmp/mig
printf '%s' '{"name":"mig","private":true,"type":"module"}' > /tmp/mig/package.json

sudo docker run --rm --network coolify --env-file /home/ubuntu/towardpcc-secrets.env \
  -v /tmp/mig:/mig -w /mig node:24-alpine sh -c \
  'npm install --no-audit --no-fund prisma@7.9.1 >/dev/null 2>&1; \
   DATABASE_URL="$DATABASE_URL_OWNER" ./node_modules/.bin/prisma migrate status'
```

Run `migrate status` first — it reports pending migrations **and** validates the
checksums of the applied ones, so it catches drift before you write anything.
Swap `status` for `deploy` to apply. `node` is not installed on the host itself,
only in containers; `python3` is.

## Revoking an admin session

Sessions are allow-listed server-side (SPC-TM-002): the JWT is only honoured
while its `AdminSession` row exists and has not passed `expiresAt`. Revoking is
deleting the row, and it takes effect on that session's next request — there is
no cache and no propagation delay.

```bash
node --env-file=.env.local packages/db/scripts/revoke-admin-sessions.mjs --email you@example.com --dry-run
node --env-file=.env.local packages/db/scripts/revoke-admin-sessions.mjs --email you@example.com
node --env-file=.env.local packages/db/scripts/revoke-admin-sessions.mjs --all
```

Against production, run it the same way migrations run — a throwaway Node
container on the `coolify` network, per the migration section above. Or straight
from psql when that is faster:

```bash
sudo docker exec tjuvmq29ogsdoocz59qigcoc psql -U postgres -d towardpcc -c \
  'DELETE FROM "AdminSession" WHERE "userId" = (SELECT id FROM "AdminUser" WHERE email = $$you@example.com$$);'
```

**This is not an account lock.** The password and TOTP secret are untouched, so
the same person signs straight back in. Use it for a stolen laptop, a suspected
token leak, or a departure where the account is being removed anyway. To lock an
account rather than its sessions, that is a separate change to `AdminUser`.

`AUTH_SECRET` rotation remains the blunt instrument — it invalidates every token
at once without needing the database, which matters if the database is the thing
you have lost confidence in.

### Everyone signs in once more after the allow-list deploy

Tokens minted before this shipped carry no session id, and the `jwt` callback
refuses them rather than treating absence as permission. That is deliberate:
accepting them would leave every pre-existing cookie unrevocable for its whole
life, which is the bug being closed. Expect one extra login, once. It is not a
fault.

### Expired rows

`isSessionValid` already refuses an expired row, so the scheduled purge
(`purge-retention.mjs`, which now sweeps `AdminSession` where `expiresAt` has
passed) is hygiene rather than a control. It runs under the app credential —
`DELETE` on `"AdminSession"` is granted, unlike `"AuditLog"` where it is revoked
by design — so it is covered by the ordinary `--skip-audit` job.

## Load-balancer certificate renewal — automated 2026-08-08

The staged edge certificate now renews and **delivers** without anyone touching
it. This was the blocker on the DNS cutover.

### What was actually broken

acme.sh had been renewing `towardpcc.com` on a daily systemd timer since
2026-07-29 and was working correctly — next renewal 2026-09-27, comfortably
before the certificate's 2026-10-27 expiry. **Nothing carried the result to the
load balancer.** The LB kept serving the bundle uploaded by hand at creation
while the file on disk stayed current. `Le_RenewHook` was empty.

So renewal was automated and _delivery_ was not, and that gap is invisible right
up until the certificate expires. Worth remembering as a shape: "the renewal job
is green" and "the thing serving traffic has a current certificate" are two
different claims.

### How it works now

`/usr/local/sbin/lb-cert-push.sh`, run by `ExecStartPost=` on the existing
`acme-towardpcc.service`. Three properties, each deliberate:

**No API key exists on this host.** Authentication is OCI **instance
principals** — the machine authenticates as itself. The dynamic group
`lb-cert-renewer` matches this instance id and nothing else, and the policy
`lb-cert-renewal` grants `read load-balancers` plus `use load-balancers … where
request.permission = 'LOAD_BALANCER_UPDATE'`. `use`, not `manage`: it can swap a
certificate and **cannot delete the load balancer**. This is what the earlier
note meant by not putting a tenancy credential on a host that also runs an
application holding real patient data — the credential simply does not exist.

**Idempotent by certificate fingerprint.** It compares the SHA-256 fingerprint
of `fullchain.cer` against what the load balancer actually serves over TLS, and
exits early when they match. Running daily therefore costs one handshake.

**Self-healing.** Because it is idempotent it runs every day rather than only on
renewal, so a failed push is retried the next day instead of leaving the LB
behind until the next renewal sixty days later. An acme.sh `--renew-hook` was
tried first and rejected: bare `--install-cert` no-ops without a file argument,
and acme.sh 3.x base64-encodes hook values in its conf, so setting it by hand is
fragile. Comparing live state needs no hook plumbing at all.

### Two traps if you touch it

OCI certificate bundles are **immutable** — you cannot overwrite one. Each push
creates a new date-stamped bundle and repoints the listener. Old bundles are
left in place deliberately: an unreferenced certificate serves nothing, and
deleting the one currently in use would take the site down.

The OCI CLI image runs as a non-root user, and acme.sh's private key is `0600`
root-owned, so the container needs `--user 0:0` or the create fails with
`Permission denied` on `--private-key-file`.

### Verifying it

```bash
sudo systemctl start acme-towardpcc.service
sudo journalctl -u acme-towardpcc.service -n 5 --no-pager
```

Expect either `nothing to do` or `OK: listener now serves towardpcc-le-<stamp>`.
To confirm what is actually being served:

```bash
echo | openssl s_client -connect 145.241.110.213:443 -servername www.towardpcc.com 2>/dev/null \
  | openssl x509 -noout -dates
```

Proven end to end on 2026-08-08: a forced push created
`towardpcc-le-20260808062516`, repointed the `https` listener, and the LB
continued serving HTTP 200 throughout.
