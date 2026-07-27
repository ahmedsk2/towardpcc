# Runbook: production deployment (as actually deployed)

**This is the live production setup.** `deploy.md` describes the standalone
Caddy + compose stack that was designed first; it is **not** what production
runs. The OCI host is a shared multi-site server operated by **Coolify**, so
TowardPCC is deployed as a Coolify application behind Coolify's Traefik proxy.

- **Live:** https://towardpcc.com (+ `www`), first deployed 2026-07-26
- **Host:** OCI `hosting-1`, `145.241.105.239`, me-riyadh-1 (KSA — residency claim holds)
- **Platform:** Coolify v4.1.2, Traefik v3.6 (TLS via Let's Encrypt, HTTP-01)
- **Canonical host:** `www.towardpcc.com`. The apex 308s to it in `proxy.ts`
  (exact host match, so `next.` and `localhost` are unaffected). Coolify's
  `NEXT_PUBLIC_SITE_URL` is `https://www.towardpcc.com` for production and
  `https://next.towardpcc.com` for preview — the two must not be the same, or
  the preview advertises production's canonical.
- **DNS:** Cloudflare zone `towardpcc.com`, apex + `www` → the host.

  > ⚠️ **Proxying is ON (orange cloud) and the origin is LOCKED to Cloudflare.
  > Do not turn it off — doing so takes the site fully offline.**
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
  > **Open issue:** `clientIp()` in `apps/web/lib/submissions.ts` assumes a
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
  > page load.

> ⚠️ The host also runs other live applications, **including one with real
> patient data**. Every TowardPCC change must be additive and scoped to its own
> app/database. Never touch another project's containers, databases, or the
> shared proxy config.

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

Next's standalone output tracer omits Prisma's `query_compiler_bg.wasm` (driver
adapter, `engineType = "client"`), which makes every DB query fail with `ENOENT`
at runtime while `/api/v1/health` still returns 200. `apps/web/Dockerfile` copies
the file into the standalone tree explicitly. **`/api/v1/health` does not prove
the database works — always check `/api/v1/ready`**, which runs `SELECT 1`:

```bash
curl -s https://towardpcc.com/api/v1/ready   # {"status":"ready"} — 503 if the DB is unreachable
```

## Rollback

Coolify keeps previous deployments: the app → Deployments → pick the last good
one → Redeploy. Because the rolling update gates on the healthcheck, a bad build
never replaces a healthy container.

## Backups (configured + drill passed 2026-07-26)

`towardpcc` is in the shared-postgres nightly job (Coolify scheduled backup id 1,
`0 3 * * *`, `databases_to_backup = postgres,towardpcc`), with the offsite copy
going to OCI Object Storage bucket `coolify-backups` (me-riyadh-1 — in-region, so
the residency claim holds). Local dumps land in
`/data/coolify/backups/databases/root-team-0/shared-postgres-<uuid>/` (root-only).

**Restore drill (2026-07-26): PASSED.** All 7 tables restored into a scratch
database with row counts matching source and the admin row intact. Repeat it
after any schema change:

```bash
PGC=tjuvmq29ogsdoocz59qigcoc
DUMP=$(sudo sh -c "ls -t /data/coolify/backups/databases/root-team-0/shared-postgres-$PGC/pg-dump-towardpcc-*.dmp | head -1")
sudo docker exec $PGC psql -U postgres -tAc "CREATE DATABASE towardpcc_restore_test"
sudo cat "$DUMP" | sudo docker exec -i $PGC pg_restore -U postgres -d towardpcc_restore_test --no-owner --no-privileges
sudo docker exec $PGC psql -U postgres -d towardpcc_restore_test -tAc "\dt"      # expect 7 tables
sudo docker exec $PGC psql -U postgres -tAc "DROP DATABASE towardpcc_restore_test"
```

Note the glob must run **inside** `sudo` — the backup directory is not readable
by `ubuntu`, so `sudo ls $DIR/*.dmp` expands to nothing before sudo is applied.

## Still outstanding

- **SMTP relay not configured** — `SMTP_*` are empty, so form submissions are
  stored but no admin notification is sent. The zone's SPF is currently
  `v=spf1 -all`; update it when a relay is added (LAUNCH-BLOCKERS, TM-008).
- **Cloudflare proxying** is off; see the DNS note above before enabling.
- **Secondary on-call contact** still unnamed (bus-factor-1).
