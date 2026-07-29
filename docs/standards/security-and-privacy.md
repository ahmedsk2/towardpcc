# Security and data-privacy standard for projects on `hosting-1`

**Scope:** the OCI instance `hosting-1` (145.241.105.239, VM.Standard.A1.Flex,
4 vCPU / 23.4 GB / 200 GB boot, `me-riyadh-1`), running Coolify 4.1.2 + Traefik
v3.6, hosting 18 containers across 7 Coolify applications and 13 routed
hostnames — **including `endorse.towardpcc.com`, which holds real patient data.**
(19 containers at the start of the audit; `towardpcc-preview` was stopped during
it — §4.1.)

**Verified:** 2026-07-29, against the running system.
**Status:** reference standard. Re-verify before citing anything here as current.

---

## How to read this document

This document keeps three things separate, and always tells you which one you
are reading. Blurring them is how this project shipped false claims before.

| Register       | Marker         | What it means                                                                                           |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| **Verified**   | `[VERIFIED]`   | Measured against the running system on the stated date, with the command that produced it. Re-runnable. |
| **Accepted**   | `[ACCEPTED]`   | A real gap, consciously left open, with the reasoning recorded. Not an oversight.                       |
| **Absent**     | `[ABSENT]`     | Missing, with nothing compensating.                                                                     |
| **Unverified** | `[UNVERIFIED]` | Could not be established with the access available. Named rather than omitted.                          |
| **Rule**       | `[RULE]`       | What a new project must do. Prescriptive.                                                               |

Everything in Parts 1–5 is a statement about **what is**. Part 7 is the only
part that tells you what to **do**. If you are starting a new project and want
the short version, read Part 7 first, then come back for the evidence.

**A note on the regulatory content.** Where this document cites PDPL, GDPR,
NIST, CIS, OWASP or ISO, that is _engineering's reading of the control's
intent_. It is not a compliance determination and it is not legal advice. No
counsel has reviewed any of it; the project's own legal pages still carry
`TODO(counsel-review)` markers at `apps/web/content/site.ts:779` and `:812`, and
`ADR-0005` states plainly that its PDPL characterisation is "this project's own
reading, not settled law". Benchmark section numbers move between releases, so
treat any unpinned section number as indicative. That is the whole hedge; the
rest of the document does not repeat it.

---

## Part 1 — The estate you inherit

You are not deploying onto an empty machine. You are deploying onto a shared
host that already runs an application holding regulated health data. Every
resource in the table below is shared, and most of them cannot be narrowed by
one project without affecting all the others.

### 1.1 What is shared, and who it affects

| Shared resource                            | Detail                                                                                                             | Blast radius                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **One VCN, one subnet, one security list** | `hosting-vcn` 10.0.0.0/16 → `hosting-public` 10.0.1.0/24. Only security list is the Default one, 32 ingress rules. | Every rule applies to every app, including the patient-data app.                            |
| **One flat Docker bridge**                 | `coolify`, 10.0.2.0/24, `Internal=false`, `Options={}` (no `enable_icc=false`), **16 of 19 containers**.           | Any container on it reaches every other on any port, bypassing Traefik entirely.            |
| **One reverse proxy**                      | `coolify-proxy` / `traefik:v3.6`, owns 0.0.0.0:80, :443 tcp **and udp**. Routes purely on Host header.             | A change to its flags changes header-trust behaviour for every app.                         |
| **One control plane**                      | Coolify 4.1.2, registered server user `root`.                                                                      | Control-plane compromise is host root, therefore every app and every database.              |
| **One boot volume**                        | 200 GB, holds every Docker volume including the live patient MySQL data files.                                     | One snapshot policy, one encryption key, one failure domain.                                |
| **One CPU/memory pool**                    | 4 vCPU / 23.4 GB, **only one container has limits**.                                                               | Any uncapped app can starve the patient-data app.                                           |
| **Two public front doors**                 | Cloudflare → 145.241.105.239, **and** OCI LB 145.241.110.213 → the same Traefik.                                   | A new app gets the second entrance automatically the moment Traefik picks up its Host rule. |

### 1.2 The two front doors — the single most important topology fact

`[VERIFIED]` The OCI load balancer `towardpcc-edge` at **145.241.110.213** is
open to `0.0.0.0/0` (NSG `towardpcc-lb-public`) and its only backend is
`10.0.1.71:443` — which is `coolify-proxy`, the **shared** Traefik. Because
Traefik routes on Host header alone, the LB serves **thirteen** hostnames with
no Cloudflare in the path:

```
curl -k --resolve <host>:443:145.241.110.213 https://<host>/
```

| Hostname                      | Status via LB | Note                                   |
| ----------------------------- | ------------- | -------------------------------------- |
| `towardpcc.com`               | 308           |                                        |
| `www.towardpcc.com`           | 200           |                                        |
| `endorse.towardpcc.com`       | 302           | **patient-data app**                   |
| `deploy.towardpcc.com`        | 302           | **Coolify control plane**              |
| `db.towardpcc.com`            | 401           | Adminer                                |
| `uptime.towardpcc.com`        | 401           | Uptime Kuma                            |
| `mnm.towardpcc.com`           | 200           |                                        |
| `mylibrary.towardpcc.com`     | 401           |                                        |
| `next.towardpcc.com`          | 503           | preview — **stopped 2026-07-29**, §4.1 |
| `mnm-new.towardpcc.com`       | 200           | **no DNS record exists**               |
| `mylibrary-new.towardpcc.com` | 401           | **no DNS record exists**               |
| `dmc-new.towardpcc.com`       | 302           | **no DNS record exists**               |
| `demo.dmc-im.com`             | 302           | **third-party domain**                 |
| `nonexistent.towardpcc.com`   | 503           | catch-all router, priority −1000       |

Two qualifications that matter. First, the LB presents one certificate whose
SANs are **only** `towardpcc.com` and `www.towardpcc.com` (verified with
`openssl s_client`), so the other eleven hostnames require the client to ignore
a name mismatch — a browser will not, a scanner will. Second, application
authentication still applies, so this is not an auth bypass. What is absent on
this path is every Cloudflare-layer protection: DDoS, bot management, IP
reputation, and CF rate limiting.

`LAUNCH-BLOCKERS.md:193` describes the LB as "STAGED AND PROVEN … serves the
whole site correctly". That is accurate but understates it: "the whole site"
means all thirteen vhosts including endorsement and the control plane, and the
LB IP is discoverable by internet-wide scanners because it presents a CT-logged
Let's Encrypt certificate.

### 1.3 Network address allocation — a latent conflict

`[VERIFIED]` `/etc/docker/daemon.json` sets
`"default-address-pools": [{"base":"10.0.0.0/8","size":24}]`. Docker has
consequently allocated **inside the VCN's own 10.0.0.0/16**: `bridge` 10.0.0.0/24,
`coolify` 10.0.2.0/24, `oo7d7si62yhyi7fx10hrck6q` 10.0.3.0/24, `…_internal`
10.0.4.0/24, `f20u98778pmpgcwkl97ihmgl` 10.0.5.0/24. The real subnet is
10.0.1.0/24.

Nothing is broken today. But if a second VCN subnet is ever created in
10.0.2–5.0/24, this host's local Docker route wins and it will not reach that
subnet. The one-line host fix is to change that pool — which requires a Docker
restart, so it is not a drive-by change on a host running a patient-data app.

---

## Part 2 — What is verified true today

Each row was measured on 2026-07-29. The command is the point; a claim without
one is not a control.

### 2.1 Network boundary

| Control                                                                               | Evidence                                                                                                                                                                                                                                                                                        | Verdict      |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Origin ingress on 80/443 restricted to Cloudflare edge ranges, **genuinely enforced** | Security list has 32 ingress rules: 15×tcp/443 + 15×tcp/80 from CIDRs, 1×tcp/22 from 0.0.0.0/0, 1×ICMP from 0.0.0.0/0. From an arbitrary internet client, `Test-NetConnection 145.241.105.239 -Port 443` → False; `curl --resolve` → timeout. Same client reaches the site fine via Cloudflare. | `[VERIFIED]` |
| The Cloudflare allowlist is **exactly current**                                       | Diffed live `https://www.cloudflare.com/ips-v4` against the security list's :443 sources. published=15, in-list=15, `comm -23` (missing) empty, `comm -13` (stale) empty. VCN has no IPv6 CIDR, so CF's 7 IPv6 ranges are correctly absent.                                                     | `[VERIFIED]` |
| Two NSGs, correctly attached, NSG-to-NSG source                                       | `towardpcc-origin-from-lb`: one INGRESS rule, tcp/443, source-type `NETWORK_SECURITY_GROUP` = the LB NSG's OCID, description "only the LB may reach traefik". Attached to the instance VNIC.                                                                                                    | `[VERIFIED]` |
| The NSG change was **additive** — the shared security list was untouched              | Both NSGs created 2026-07-29T05:59Z; the security list still carries only the pre-existing SSH/ICMP/Cloudflare rules. Net effect: origin still reachable from Cloudflare AND newly reachable from the LB.                                                                                       | `[VERIFIED]` |
| No database port published to host or internet                                        | `docker ps` shows mysql:8.4, mysql:8, mariadb:11, postgres:16, postgres:15-alpine, redis:7 all with bare container ports. `ss -tulpn` shows no listener on 3306/5432/6379. External probe: both blocked.                                                                                        | `[VERIFIED]` |
| Outbound TCP/25 blocked (no spam relay)                                               | Port 25 to `gmail-smtp-in.l.google.com` and `aspmx.l.google.com` → timeout. 587/465 to smtp.gmail.com OPEN. **This is Oracle's platform-level block, inherited, not configured** — the security list's only egress rule is `all → 0.0.0.0/0`.                                                   | `[VERIFIED]` |
| HTTP→HTTPS at both front doors                                                        | LB listener `http`:80 carries rule set `redirect_to_https` (301). Cloudflare path: `curl -I http://www.towardpcc.com/` → 301.                                                                                                                                                                   | `[VERIFIED]` |

**Read this carefully:** an OCI NSG can only **add** an allowance. It can never
take one away. Attaching `towardpcc-origin-from-lb` ("only the LB may reach
traefik") did **not** stop Cloudflare's ranges from reaching the origin — the
security list still permits them, and that is how the production site serves
every real visitor. The repo gets this right
(`docs/runbooks/edge-migration-ksa.md`: "Ingress was granted with two NSGs
instead, which are additive to it"). If a future project needs traffic actually
restricted, the rule must be **removed** from the shared security list, which is
a change affecting every app on the box.

### 2.2 Transport and domain trust

| Control                                                        | Evidence                                                                                                                                                                                                                                                                 | Verdict      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **DNSSEC fully deployed and validating**                       | DS at `.com` = `2371 13 2 237A6EA0…`; AD=true from 9.9.9.9, 8.8.8.8 and 1.1.1.1; `delv @9.9.9.9 towardpcc.com A` → `; fully validated`; whois `DNSSEC: signedDelegation`.                                                                                                | `[VERIFIED]` |
| **CAA published and DNSSEC-signed**                            | 13 records live (9 authored + 4 Cloudflare-injected for Universal SSL partners): issue/issuewild for letsencrypt.org, pki.goog, ssl.com, sectigo.com, comodoca.com, digicert.com, plus `0 iodef "mailto:…"`. Two carry `cansignhttpexchanges=yes`.                       | `[VERIFIED]` |
| Registrar locks                                                | whois: all four client-side EPP locks set (`clientDelete/Renew/Transfer/UpdateProhibited`), expiry 2028-07-20, NS = cosmin/susan.ns.cloudflare.com.                                                                                                                      | `[VERIFIED]` |
| **HSTS emitted by the application, not the CDN**               | `strict-transport-security: max-age=63072000; includeSubDomains; preload` is **byte-identical** on the Cloudflare path and the LB path — so it survived a whole new edge appearing in front of it. Present on 404s too.                                                  | `[VERIFIED]` |
| Both TLS terminators present valid LE certificates             | Cloudflare edge: CN=towardpcc.com, SAN `*.towardpcc.com`, issuer `CN=YE1`, Jul 10 → Oct 8 2026. OCI LB: CN=towardpcc.com, SANs `towardpcc.com` + `www.towardpcc.com` only, Jul 29 → **Oct 27 2026**.                                                                     | `[VERIFIED]` |
| `towardpcc.com` publishes a complete "sends no mail" assertion | Apex TXT `v=spf1 -all`; `*._domainkey` TXT `v=DKIM1; p=` (a wildcard revoked key — every selector an attacker invents answers revoked); `_dmarc` `p=reject; sp=reject; adkim=s; aspf=s`. This is the strongest available anti-spoofing posture and is the model to copy. | `[VERIFIED]` |

### 2.3 Application controls (TowardPCC)

`[VERIFIED]` **The deployed artifact is the audited source.** Local
`git rev-parse HEAD` = `062d0d95a91941804f223377ae09326a28787850`;
`docker exec <web> printenv SOURCE_COMMIT` = identical; image tag
`gpsokvxzncr7ks1vzqz7wkr4:062d0d95…`. Every code-level claim below therefore
describes what is actually serving.

| Control                                                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    | Verdict               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Two-tier CSP**                                                        | Public: `script-src 'self' 'unsafe-inline'`. `/admin`: `script-src 'self' 'nonce-…' 'strict-dynamic'` with **no** unsafe-inline, and the `link:` preload header carries the same nonce (proving Next consumed it). Both tiers: `object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; connect-src 'self'`.                                                                             | `[VERIFIED]`          |
| Cache/CORP scoped to sensitive tiers **in both directions**             | `/admin/login` and `/api/v1/health` → `cache-control: no-store…` + `cross-origin-resource-policy: same-origin`. Public `/` → `s-maxage=31536000` and **no** CORP header. Asserted both ways by `e2e/security-headers.spec.ts`.                                                                                                                                                                                                              | `[VERIFIED]`          |
| Cookie `Secure`/`__Host-` pinned to `NODE_ENV`, not `X-Forwarded-Proto` | `printenv NODE_ENV` → production; `GET /api/auth/csrf` → `__Host-authjs.csrf-token=…; Path=/; HttpOnly; Secure; SameSite=Lax`. `auth.ts:70-84`. Pinned deliberately _because a second proxy path appeared_ and header-derived would have failed silently.                                                                                                                                                                                   | `[VERIFIED]`          |
| **AuditLog is append-only at the database**                             | `information_schema.role_table_grants`: `towardpcc_app                                                                                                                                                                                                                                                                                                                                                                                      | AuditLog              | INSERT,SELECT`vs`towardpcc_app | Submission | DELETE,INSERT,SELECT,UPDATE`. And the grant genuinely binds: `towardpcc_app`has`rolsuper=f`, is not the table owner.                                                                                                                                                             | `[VERIFIED]` |
| Runtime DB role is least-privilege                                      | `pg_roles`: towardpcc_app rolsuper/rolcreatedb/rolcreaterole/rolbypassrls all `f`. `has_schema_privilege('towardpcc_app','public','CREATE')` → `f`.                                                                                                                                                                                                                                                                                         | `[VERIFIED]`          |
| TOTP mandatory, replay-blocked twice, secret app-encrypted              | `auth.ts`: `if (!email                                                                                                                                                                                                                                                                                                                                                                                                                      |                       | !password                      |            | !token) return null`before any credential work. Replay: compare against`lastTotpStep`**and** an atomic conditional`updateMany`requiring`res.count === 1`. Secret is AES-256-GCM under `TOTP_ENC_KEY` (verified set, 44 chars) — a DB read alone yields no working second factor. | `[VERIFIED]` |
| Constant-cost login (no user-enumeration oracle)                        | A real Argon2id verify against a memoised `dummyHash()` runs when no user exists; the failure branch is a single combined `if`; the Server Action collapses every error to `"Invalid email, password, or code."`                                                                                                                                                                                                                            | `[VERIFIED]` (source) |
| Client IPs never stored raw                                             | `hashClientIp()` = HMAC-SHA256 under `SUBMISSION_IP_SALT` truncated to 24 hex. Live `SUBMISSION_IP_SALT` length = 32. `logger.test.ts` walks every `.ts/.tsx` under `app/` and `lib/` and fails on a bare `ip` field in any `logger.*` call, with a guard-the-guard that >20 files were scanned.                                                                                                                                            | `[VERIFIED]`          |
| Health endpoint discloses nothing                                       | `/api/v1/health` → exactly `{"status":"ok"}`; `/api/v1/ready` → `{"status":"ready"}`. `/api/v1/score`, `/calculate`, `/submissions` → 404.                                                                                                                                                                                                                                                                                                  | `[VERIFIED]`          |
| **Calculators transmit nothing**                                        | Playwright `calculator-privacy.spec.ts`: cuts the network with `context.setOffline(true)` and asserts anion gap still computes to 12; records every request URL and POST body and asserts sentinel value 137 appears in none. Static half (`privacy-invariant.test.ts`) bans `useSearchParams`/`searchParams`/`"use server"` under the calculator tree. `connect-src 'self'` in the live CSP corroborates. Re-run 2026-07-29: **2 passed**. | `[VERIFIED]`          |
| Container hardening **as actually applied by the runner**               | `docker inspect`: `User=app`, `CapDrop=[ALL]`, `Privileged=false`, `Memory=1073741824`, `NanoCpus=2000000000`. Delivered by Coolify's `custom_docker_run_options = --cap-drop=ALL` and its limit fields — **not** by `docker-compose.prod.yml`, which production does not read.                                                                                                                                                             | `[VERIFIED]`          |

### 2.4 The one genuinely good isolation pattern — and its limit

`[VERIFIED]` The endorsement patient database is the best-segmented thing on the
box. `db-oo7d7si62yhyi7fx10hrck6q` (mysql:8.4, digest-pinned) sits only on
`oo7d7si62yhyi7fx10hrck6q` (10.0.3.3) and `…_internal` (10.0.4.2) — **not** on
the shared `coolify` bridge. A live TCP-connect test from a container on the
shared bridge reached all six shared datastores but timed out on
`db-oo7d7si62yhyi7fx10hrck6q:3306`. `iptables -S DOCKER` carries the
cross-bridge `DROP` rules that enforce it.

**But the isolation is one hop deep, not absolute.** `coolify-proxy` is
multi-homed:

```
docker inspect coolify-proxy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}'
→ coolify=10.0.2.6  f20u98778pmpgcwkl97ihmgl=10.0.5.3  oo7d7si62yhyi7fx10hrck6q=10.0.3.2
```

Traefik holds an interface on the shared bridge **and** on the endorsement
network, adjacent to the database at 10.0.3.3. The cross-bridge DROP rules block
_forwarded_ traffic; they do nothing about a container with interfaces on both.
So compromise of Traefik, of the Coolify control plane that owns it, or of host
root reaches the patient database. Note also that `…_internal` reports
`Internal=false` — "internal" is a naming convention here, not a Docker flag.

Copy the pattern. Do not overstate what it buys.

---

## Part 3 — Accepted risks, with the reasoning

These are real gaps that were consciously left open. Recording the reasoning is
what distinguishes an accepted risk from an unexamined one. The `no-new-privileges`
entry below is the house standard for how to write one.

### 3.1 SSH open to the entire internet

`[ACCEPTED]` Security list rule: tcp/22 from `0.0.0.0/0`, with the description
written **into the rule itself**: _"SSH - deliberately left open; restricting
this is a separate decision"_.

Compensating controls, verified: `sshd -T` → `permitrootlogin no`,
`passwordauthentication no`, `pubkeyauthentication yes`,
`permitemptypasswords no`. `fail2ban` active.

Honest scale of the compensation: over 7 days, `journalctl -u ssh` shows **1548**
`Failed password`/`Invalid user` events, while `fail2ban-client status sshd`
reports Total failed **76**, Total banned **4**, currently banned **1**. fail2ban
is running and is catching a small fraction. This is the widest ingress rule on a
host holding patient data.

Putting the reasoning inside the control is the practice worth copying — the
ICMP rule does it too ("path MTU discovery; removing this hangs large
responses"). One read tells you what was deliberate and what is drift.

### 3.2 `no-new-privileges` cannot be applied

`[ACCEPTED]` Not a configuration mistake — a parser limitation in Coolify 4.1.2,
found by reading its source at `bootstrap/helpers/docker.php:994`, where the
regex `[^\s-]+` excludes hyphens. Verified live: the TowardPCC container has
`SecurityOpt=<no value>`. The endorsement app _does_ have
`no-new-privileges:true` because it deploys via `dockercompose` build pack rather
than through the Coolify options field.

This is the model. Cause identified at source level, evidence from the running
container, not paraphrased as done.

### 3.3 Rate limiting is in-process and single-replica

`[ACCEPTED]` `lib/rate-limit.ts` keeps state in a `Map` in process memory. Both
`lib/submissions.ts` and `lib/auth/login-throttle.ts` document this and defer a
shared store to P8. Correct for one replica, and there is exactly one production
replica.

**But the invariant "one bucket per visitor" is already false site-wide**,
because the preview environment is a second app instance against the same
database (§4.1). Nothing automated detects a second replica appearing.

### 3.4 Per-account lockout is a targeted DoS on the admin

`[ACCEPTED]` Documented in `lib/auth/login-throttle.ts`: "someone who knows the
admin address can keep it armed by failing five times every fifteen minutes, and
this throttle does not change that". The admin address is the site's public
contact identity, so it is discoverable. Fixing it needs lockout scoped to
account+IP, or a challenge on the lockout path.

### 3.5 Public-tier `'unsafe-inline'`

`[ACCEPTED]` Reasoned in `docs/decisions/ADR-security-headers.md`: SSG pages ship
~17 per-page inline `__next_f` RSC scripts that cannot carry a per-request
nonce, and a strict policy was empirically shown to break hydration.

The argument rests on "these public pages render no user-controlled content",
which is true today. **Nothing fails if that stops being true.** That is a
standing invariant with no automated test behind it.

### 3.6 Submission payloads stored as cleartext JSONB

`[ACCEPTED]` `schema.prisma` `payload Json` — name, email, free text,
institution. `LAUNCH-BLOCKERS` SPC-DB-004 accepts this with reasoning: column
encryption would put the key in the application that must search and display the
data, on a disk that is already encrypted, behind a least-privilege role. The
named mitigation is the 24-month purge — **which is not scheduled** (§4.2).

### 3.7 App↔database traffic is unencrypted

`[ACCEPTED]` `SHOW ssl` on the Postgres container → `off`. The connection never
leaves the host and 5432 is not published. But the container sits on the flat
shared bridge with 15 neighbours, so the credential and every query — audit
inserts, the sealed SMTP row — cross a network reachable by any neighbouring
container. `site.ts` carries a careful comment about why the earlier public
wording (which bundled a claim about the _connection_ into a claim about
_storage_) was corrected. The readiness scorecard already carries this at red.

### 3.8 LB certificate is not auto-renewed

`[ACCEPTED]` `towardpcc-le` valid to 2026-10-27, monitored by the daily check
(fails 21 days out), deliberately not automated: doing so means an OCI API key
with load-balancer write access sitting on a host that also runs an application
holding real patient data. Sound reasoning, correctly recorded.

Unrecorded and important: the certificate's SANs are **only** `towardpcc.com`
and `www.towardpcc.com`. The other eleven vhosts the LB serves are not on it, so
a cutover on this certificate would break them.

### 3.9 Docs-only commits skip the expensive CI jobs

`[ACCEPTED]` `.github/workflows/ci.yml` `changes` job filters
`^(docs/|.*\.md$|LICENSE$|\.claude/)` out of e2e, lighthouse and container
(~8 of 11 minutes). The filter is inverted-safe — an unknown new path type runs
the full suite. Residual risk worth stating: the SBOM and the Trivy scan attach
only to code commits, so a base-image CVE disclosed during a docs-heavy week is
not re-scanned until the next code change.

Also part of the gate's real definition, and easy to miss: Trivy runs with
`ignore-unfixed: true`, so a HIGH/CRITICAL CVE with no upstream fix never fails
the job.

---

## Part 4 — What is absent

### 4.1 The preview environment was the highest-severity finding on this host

> **Closed 2026-07-29.** The Coolify application `towardpcc-preview`
> (`sgktmkspp6wkyo7t547skh14`) was stopped on discovery, during the audit that
> produced this document. `https://next.towardpcc.com/admin/login` now returns
> **503** and serves zero credential fields; production was unaffected
> (`/`, `/calculators`, `/admin/login` all 200). The finding is kept in full
> below because the shape of it is the lesson, not the instance — and because
> **stopping a container is not a fix.** Restarting the application restores
> every condition described here. The durable fixes are §7.3 _Environments and
> secrets_ — a preview gets its own database, its own role and its own
> `AUTH_SECRET` — and §7.6 rule 3, scoping the LB backend to intended hostnames.

`[ABSENT]` `next.towardpcc.com` was a **publicly reachable, unauthenticated
second instance of the production application, pointed at the production
database, running a 74-commit-old branch that is missing three security
controls.**

Verified, comparing SHA-256 of each value between the two containers without
disclosing any:

| Secret               | Production | Preview   | Result                              |
| -------------------- | ---------- | --------- | ----------------------------------- |
| `DATABASE_URL`       | len 115    | len 115   | **SAME**                            |
| `AUTH_SECRET`        | len 44     | len 44    | **SAME**                            |
| `TOTP_ENC_KEY`       | len 44     | len 44    | **SAME**                            |
| `SUBMISSION_IP_SALT` | len 32     | len 32    | **SAME**                            |
| `SMTP_PASSWORD`      | len 0      | len 0     | empty in both — not a shared secret |
| `EDGE_SHARED_SECRET` | len 64     | **len 0** | preview has none                    |

Four genuinely shared secrets. And the preview is running commit
`935565e602745b3006303b35b99ef2616ca0dbf4`, which is an ancestor of `main` by
**74 commits**. At that commit:

```
git cat-file -e 935565e:apps/web/lib/auth/login-throttle.ts   → path does not exist
git cat-file -e 935565e:apps/web/lib/client-ip.ts             → path does not exist
git show 935565e:apps/web/auth.ts | grep -c allowLoginAttempt → 0
git show 935565e:apps/web/auth.ts | grep -c useSecureCookies  → 0
```

And `https://next.towardpcc.com/admin/login` returns **HTTP 200**.

So: a second live admin authentication endpoint, against the same `AdminUser`
rows, with the same `AUTH_SECRET` and `TOTP_ENC_KEY`, **with no per-IP login
throttle at all**, publicly reachable both through Cloudflare and through the
world-open LB. The per-IP throttle listed as a control in §2.3 is bypassable
today by aiming the attempt at the preview host. `robots.txt: Disallow: /` is
indexing hygiene, not access control; Coolify reports
`is_http_basic_auth_enabled: False`.

Two further consequences: submissions made via preview write real PII into the
production `Submission` table, with a meaningless `ipHash` (that build uses the
superseded resolver); and the in-memory rate limiter gives preview an
independent bucket.

`[UNVERIFIED]` Both containers have `TOTP_ENC_KEY` set at the same length. I did
not compare the values, so whether TOTP decryption succeeds on preview is not
established.

### 4.2 The retention purge has no scheduler anywhere

`[ABSENT]` The site publishes "24 months, then deleted" on
`/legal/data-protection` and in all four form privacy lines.
`packages/db/scripts/purge-retention.mjs` is correct and parameterised
(`SUBMISSION_MONTHS=24`, `AUDIT_MONTHS=12`) and **has never been scheduled**:

```
crontab -l (ubuntu)   → no crontab
sudo crontab -l       → one entry: backup-mylibrary-sqlite.sh
ls /etc/cron.d/       → e2scrub_all, endorsement-backup-sync, endorsement-uptime, sysstat
systemctl list-timers → 0 matching purge|towardpcc
grep -rl purge-retention /etc/cron* /var/spool/cron → NOT SCHEDULED ANYWHERE
```

Currently harmless only because `Submission` count = **0** and the oldest
`AuditLog` row is days old. The obligation is prospective, not live exposure —
but a published period with no executor is a false claim the moment the first
row lands.

### 4.3 The append-only REVOKE exists nowhere durable

`[ABSENT]` The live grant is correct. The only artifact producing it is
`docker/sql/10-audit-append-only.sql`, which belongs to the compose stack
production does not read. No migration contains it:

```
grep -ril revoke packages/db/prisma/migrations/ → NO REVOKE in any migration
```

Worse, the default ACL is opt-out rather than opt-in:

```
select pg_get_userbyid(defaclrole), defaclobjtype, defaclacl from pg_default_acl;
→ towardpcc_owner | r | {towardpcc_app=arwd/towardpcc_owner}
```

Every **new** owner-created table automatically grants the app role all four DML
rights. A rebuild from migrations, or a second audit-style table, silently loses
append-only with nothing failing.

Related inconsistency: `AppSetting` — the table holding the sealed SMTP password
— is owned by `postgres`, while all seven other tables are owned by
`towardpcc_owner`, and `towardpcc_owner` holds **no grant at all** on it. The
documented "owner runs maintenance, app runs runtime" split does not hold
uniformly.

### 4.4 No ingress access logging, and no operational logging either

`[ABSENT]` `coolify-proxy` has no `--accesslog` flag (grep count 0 across its
`Cmd`), no access-log files exist under `/data/coolify/proxy`, and
`docker logs coolify-proxy` produces **nothing at all** — not one line, including
Traefik's own startup and router-error output.

`docs/security/log-retention.md:29` documents the absence of _request_ logs as a
deliberate privacy choice, and the argument is legitimate. Two things it does not
cover:

1. Combined with the LB bypass, **there is no way to detect or reconstruct
   direct-to-LB access to `endorse.towardpcc.com`.**
2. Operational/error logs are equally absent, so a silently-dropped router leaves
   no trace anywhere. The inert `api@internal` dashboard router is a live example.

### 4.5 The host firewall does not protect published container ports

`[ABSENT]` Docker publishes 8000 (Coolify UI, plain HTTP), 8080, 6001 and 6002
on `0.0.0.0`. The host INPUT chain allows only 22/80/443 then REJECTs — **but
that chain never sees this traffic.** `iptables -t nat -S DOCKER` shows DNAT
rules, so packets traverse FORWARD, not INPUT, and the DOCKER chain explicitly
ACCEPTs them. `DOCKER-USER` — the one admin-owned hook that could filter them —
is empty:

```
iptables -S DOCKER-USER → -N DOCKER-USER      (and nothing else)
```

Those ports are unreachable from the internet today **purely because the OCI
security list omits them.** One security-list edit exposes them, with no second
layer.

Full bound-port inventory (`ss -tulpn`), because a partial one is not an
inventory: tcp `0.0.0.0:22, :80, :111, :443, :6001, :6002, :8000, :8080` and the
`[::]` equivalents; udp `0.0.0.0:111, :443` and `[::]` equivalents.

Two qualifications. Port **8080 is inert** — `--api.insecure=false` means no
:8080 entrypoint exists, and the labelled `api@internal` router carries no rule
so Traefik drops it; nothing answers there. **rpcbind on 111** is a host service,
so it _does_ traverse INPUT and is REJECTed — unnecessary attack surface, and a
known UDP amplification reflector. **UDP/443** is Traefik HTTP/3
(`--entrypoints.https.http3`), bound but unreachable: all 32 security-list rules
are protocol 6 or 1, none is UDP. Record it so a future "why is h3 broken" is not
fixed by widening the security list.

### 4.6 IPv6 has no host firewall at all

`[ABSENT]` `ip6tables -S INPUT` → `-P INPUT ACCEPT`, and nothing else. No `lo`
rule, no ESTABLISHED rule, no allowlist, no terminal REJECT — in stark contrast
to the IPv4 chain. Every published port is also bound on `[::]`.

Not exploitable today: the VNIC has no global IPv6 address, and the VCN has no
IPv6 CIDR. Record it as latent. The moment an IPv6 address is assigned, the
Coolify panel on plaintext 8000 is exposed with nothing in front of it. The
claim "the host firewall denies by default" is **IPv4-scoped**.

### 4.7 Egress is completely unrestricted

`[ABSENT]` The security list's only egress rule is protocol `all` to
`0.0.0.0/0`. No egress filtering at the OCI layer, no DOCKER-USER egress rule
(empty), no proxy allowlist. On a host classified as holding regulated data, this
is the exfiltration path for every compromise scenario in this document.

### 4.8 A container holds a read-write Docker socket

`[ABSENT]` `coolify-sentinel`:

```
Mounts: /var/run/docker.sock:/var/run/docker.sock:rw=true
PidMode=host  NetworkMode=bridge  SecurityOpt=[label=disable]
```

A writable Docker socket is equivalent to root on the host. By contrast
`coolify-proxy` mounts it `rw=false`, which is the correct posture.

The containment that makes this survivable, and which is currently undocumented:
sentinel is the **only** container on the default `bridge` network (10.0.0.0/24),
so it is not reachable from the shared `coolify` bridge. That containment is
load-bearing.

### 4.9 The shared bridge reaches the control plane, not just the datastores

`[ABSENT]` Network `coolify`: `Internal=false`, `Options={}`, 16 containers.
Proven live by TCP connect from the www container: reachable to
`tjuvmq29ogsdoocz59qigcoc:5432` (postgres:16), `u8ha9zwdgekz9djnjt1ndisf:3306`
(mysql:8), `q3tcdkmz0wz0rf4j07r9sywg:3306` (mariadb:11),
`t522kmgsr0vg8it3vk4nfsn4:6379` (redis:7), `coolify-db:5432`,
`coolify-redis:6379`, **`coolify:8080`** and **`coolify-realtime:6001`**.

`coolify-db` holds deployment configuration and environment secrets for every
application on the host. So RCE in any one app container yields network reach to
every datastore _and_ the orchestrator's HTTP surface and websocket service.

Adminer sits on this bridge at 10.0.2.18, and **its authentication is a Traefik
middleware label only** — nothing in the container enforces it, so a peer on the
bridge reaches Adminer with no credential. It runs with no
`ADMINER_DEFAULT_SERVER`, so it can target every DB container on the host.

One correction worth carrying, because the repo already caught it and an earlier
review reproduced the error anyway: the Postgres cluster contains **only**
`postgres` and `towardpcc`. Other tenants run MySQL and MariaDB in separate
containers. `LAUNCH-BLOCKERS.md:432` says exactly this and calls the
"shared-services Postgres" wording an overstatement. It is.

### 4.10 A container-terminal websocket is routed to the public internet

`[ABSENT]` `/data/coolify/proxy/dynamic/coolify.yaml` defines routers
`coolify-terminal-ws` / `-wss` on ``Host(`deploy.towardpcc.com`) &&
PathPrefix(`/terminal/ws`)`` → `http://coolify-realtime:6002`, and
`coolify-realtime-ws/wss` on `PathPrefix(/app)` → `:6001`. A shell-into-container
endpoint on the control plane is publicly routed, is also reachable on the
Cloudflare-bypassing LB path, and whatever authenticates it is Coolify's own.

`[UNVERIFIED]` Whether Coolify enforces 2FA on that login. It lives in
`coolify-db` and no database rows were read.

### 4.11 No secrets management; the platform token is a deploy credential

`[ABSENT]` Every application secret is a plaintext container environment
variable, disclosed in full by a routine `docker inspect`. Enumerated by **name
only**: towardpcc holds `AUTH_SECRET`, `TOTP_ENC_KEY`, `SUBMISSION_IP_SALT`,
`SMTP_PASSWORD`, `EDGE_SHARED_SECRET`, `DATABASE_URL`; endorsement holds
`APP_KEY`, `BACKUP_PASSPHRASE`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`; dmc-new,
mnm-new and mylibrary-new hold their own.

Two aggravating facts:

- **Coolify's read-only API discloses deploy secrets.**
  `GET /api/v1/applications` returns, for each of the 7 applications, four
  `manual_webhook_secret_*` fields — **28 non-empty values in cleartext**. The
  token at `~/.coolify-token` is therefore a deploy-capable credential for every
  application on the host, including the patient-data one. Nothing in the threat
  model treats it that way.
- **`/data/coolify/source/.env` is mode 0644**, root-owned, containing
  `ROOT_USER_PASSWORD`, `APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD` (names read;
  no values). It is protected only because its parent directories are 0700. That
  `APP_KEY` decrypts every application's stored secrets — it is the estate's
  master key.

Credential files that **are** correctly permissioned: `~/.coolify-token` and
`~/.cloudflare-token` (0600 ubuntu), `/etc/mylibrary-backup.env` and
`/etc/endorsement/rclone.conf` (0600 root). Existence noted; no value read.

### 4.12 The CSP is absent on any request carrying `Purpose: prefetch`

`[ABSENT]` `apps/web/proxy.ts:114-117` excludes requests carrying
`next-router-prefetch` or `purpose: prefetch` from the middleware matcher, and
the middleware is the **only** thing that sets CSP (`next.config.ts` sets the
other six headers). Verified live:

```
curl -I -H 'purpose: prefetch' https://www.towardpcc.com/admin/login
→ HTTP/1.1 200 OK, content-type: text/html, NO content-security-policy
```

The strict nonce policy on the one surface that renders submitted content simply
does not ship. The modern `Sec-Purpose: prefetch;prerender` header is unaffected
(CSP present), and normal navigations are fine. A `<link rel=prefetch>` result
can be reused for the subsequent navigation, so this is a real bypass path.
`e2e/security-headers.spec.ts` cannot catch it — it exercises `page.goto()` and
`request.get()`, never a prefetch header.

### 4.13 No detection, no alerting, no forensic readiness

`[ABSENT]` There is no log shipping, no retention beyond Docker's 10 MB × 3
per-container rotation, no host auditd or file-integrity monitoring, no alert on
repeated lockouts or throttle trips or OWNER-role actions, and no CSP violation
reporting (the live CSP ends at `upgrade-insecure-requests`; no `report-uri`, no
`report-to`, no Report-Only tier).

For a standard covering a host with patient data, "what would tell you an attack
is in progress" is a required section. The honest answer today is **nothing**.

### 4.14 Absent process controls

| Gap                                  | Detail                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Branch protection is impossible**  | `gh api repos/…/branches/main/protection` → 403 "Upgrade to GitHub Pro or make this repository public". Same for rulesets. Private repo, User plan. Exactly **one** PR has ever merged (#1, Dependabot). `main` was built by 9 local branch merges plus direct pushes. So `/trust`'s claim "a pull request that drops below it does not merge" is unenforceable.                  |
| **No commit signing**                | `git log --format=%G?` → `N` for all recent commits; `commit.gpgsign` unset. Combined with webhook-triggered deploy, one unsigned push from a compromised credential reaches production.                                                                                                                                                                                          |
| **No human review**                  | `CONTRIBUTING.md` requires "review received and addressed"; `CLAUDE.md` defines review as AI subagents. No four-eyes control. `CONTRIBUTING.md` also requires "one reviewable slice per branch" against a history of direct pushes to `main`.                                                                                                                                     |
| **No SAST**                          | CI has gitleaks (secrets) and Trivy (image CVEs) but no CodeQL or equivalent static analysis of application source.                                                                                                                                                                                                                                                               |
| **No DSR procedure**                 | `/legal/data-protection` promises access, correction and deletion "at any time". There is no runbook, no identity-verification step, no response target, and the admin UI has no delete or redact control. `patient-data-in-a-submission.md` is an excellent adjacent template.                                                                                                   |
| **No breach-notification clock**     | `incident.md` defines SEV tiers and names SEV1 as suspected breach, which is a good start. There is no regulator timeline, no named recipient (SDAIA), no template. Compounded by bus-factor-1 (OPS-02: no secondary on-call).                                                                                                                                                    |
| **No DPAs**                          | Four processors: OCI (KSA), Cloudflare (edge), the outbound relay `mail.towardpicu.com` → 35.212.69.243 (Google Cloud, US — the recorded ADR-0004 carve-out), and — distinct and easiest to miss — **SiteGround/SpamExperts on the inbound path**, which sees whole message bodies rather than a type label, and is the channel the privacy page nominates for deletion requests. |
| **Restore drilled for one app only** | Drill evidence exists for TowardPCC alone. Nothing for endorsement (the patient-data app), mylibrary, mnm-new, dmc-new, or the Coolify control plane. Endorsement's archives are encrypted with a passphrase whose recoverability has never been exercised.                                                                                                                       |
| **Retired routes outlive DNS**       | `mnm-new`, `mylibrary-new` and `dmc-new` are NXDOMAIN authoritatively, yet answer 200/401/302 through the LB by Host header. Deleting a DNS record does not remove the Traefik router.                                                                                                                                                                                            |

### 4.15 What could not be verified

| Item                                  | Why                                                                                                                                                                                            | Impact                                                                                                                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare zone settings**          | The token at `~/.cloudflare-token` verifies active (and never expires) but is DNS-scoped. `GET /zones/{id}/settings/ssl` → code 9109; `/settings/min_tls_version` → 9109; `/rulesets` → 10000. | **SSL/TLS mode (Full vs Full-strict vs Flexible), Authenticated Origin Pulls, minimum TLS version, security level, and all CF WAF/rate-limiting rulesets are UNVERIFIED.** Cloudflare is the only thing in front of production today. |
| Coolify auto-deploy flag              | `GET /api/v1/applications/…` does not expose the `settings` object.                                                                                                                            | Deploy trigger established by inference (push 09:16:31Z → container created 09:17:49Z), not by configuration.                                                                                                                         |
| Coolify 2FA on `deploy.towardpcc.com` | Lives in `coolify-db`; no rows read.                                                                                                                                                           | The control plane is root-equivalent on this host.                                                                                                                                                                                    |
| Admin session cookie flags            | `GET /admin/login` sets no cookie; establishing HttpOnly/SameSite/idle-expiry would require authenticating, which is out of scope.                                                             | The only credentialed surface in the estate.                                                                                                                                                                                          |
| Origin-pull authentication            | No mTLS artefacts found (`grep -ril 'clientauth\|ClientCA' /data/coolify/proxy/` → nothing), but CF-side AOP status is unreadable with this token.                                             | See §5.3.                                                                                                                                                                                                                             |
| `/trust` restore-drill claim          | "dump restored into a scratch database, table and row counts matched, admin record intact" — a past event, not re-derivable.                                                                   | Flagged as an unverified positive claim on the trust page.                                                                                                                                                                            |

**Provision a read-only Cloudflare token with Zone Settings and Rulesets read
access so the next review can close the first row.** It is the largest single
blind spot in this document.

---

## Part 5 — Where documents contradicted the system

These are the most instructive findings in the whole exercise. In every case the
system won, and in every case the document was true when written and expired
without anyone noticing. This project's defining failure mode is not dishonesty;
it is latency between a change and the sentence describing it.

### 5.1 The scoreboard

| Document                                         | Claim                                                                                                                                                                           | Reality                                                                                                                                                                                                                                                                                                                                                                                | Winner       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `docs/runbooks/incident.md:22,47,49`             | First response is `docker compose -f docker-compose.prod.yml ps`; TLS section says `logs caddy`, "Caddy renews automatically".                                                  | The repo's compose file is not on the host. **No caddy container exists, running or stopped.** Production is Coolify + `traefik:v3.6`, containers named by UUID. **Every first-response command in the incident runbook fails.**                                                                                                                                                       | System       |
| `docs/runbooks/backup-restore.md:24,34`          | `pg_dump \| gpg --encrypt` so dumps are encrypted before leaving the host; "Retention: 30 daily + 12 monthly, enforced by a bucket lifecycle rule".                             | `file` on the newest dump → `PostgreSQL custom database dump - v1.15-0`, mode 0644. **No GPG script exists** (`/usr/local/bin/` holds three scripts, none of them this). Lifecycle policy returns **404 LifecyclePolicyNotFound on both buckets**; retention is 14+14 by Coolify's own count.                                                                                          | System       |
| `docs/security/security-audit-2026-07-25.md:224` | "Caddy terminates TLS and proxies plain HTTP, so Secure depends on Caddy forwarding the header."                                                                                | Traefik owns 0.0.0.0:443. The only Caddy artefact on the host is a one-line stub. The conclusion may still hold; it rests on the wrong component.                                                                                                                                                                                                                                      | System       |
| `docs/security/threat-model.md:143` (TM-006)     | Mitigation for container escape: "**no Docker socket mounts ever**" and "prod publishes nothing but 80/443".                                                                    | `coolify-proxy` mounts it `ro`, **`coolify-sentinel` mounts it `rw`**. 8000, 8080, 6001, 6002 are published on 0.0.0.0.                                                                                                                                                                                                                                                                | System       |
| `docs/security/threat-model.md:147` (TM-009)     | "Proxy access logs contain IPs … define 30–90 day rotation."                                                                                                                    | Traefik writes **no access log at all**. Superseded by `log-retention.md` but never reconciled in the threat model.                                                                                                                                                                                                                                                                    | System       |
| `docs/runbooks/edge-migration-ksa.md:5`          | "**Nothing here has been executed.**"                                                                                                                                           | The LB, both NSGs and the WAF all exist and are ACTIVE. The same document later tabulates the built state correctly — the un-struck bold line 5 is the misleading artifact, not the whole file.                                                                                                                                                                                        | System       |
| `docs/runbooks/edge-migration-ksa.md:41`         | "**So the architecture is to bypass Traefik for towardpcc.com**."                                                                                                               | LB backend is `10.0.1.71:443` = Traefik. The same document later explains _why_ the plan changed (Traefik's `trustedIPs` made bypassing unnecessary). A superseded plan paragraph in a partially-updated file — not undetected drift. The security substance stands: the shared Traefik, and therefore the co-tenant patient-data app, now sits behind a second world-open front door. | System       |
| `LAUNCH-BLOCKERS.md` (two blocks, same file)     | "there are **zero CAA records**" and "DNSSEC is off" appear above "CAA records applied 2026-07-29" and the DS-pending entry, with nothing marking the earlier block superseded. | 13 CAA records live; DS published and validating. A reader who skims the top gets the pre-change state presented as current.                                                                                                                                                                                                                                                           | System       |
| `LAUNCH-BLOCKERS.md` + `email-delivery.md`       | "towardpicu.com publishes no DKIM key, so SPF alone carries authentication."                                                                                                    | A DKIM key exists and resolves through `default._domainkey.towardpicu.com` → dnssmarthost. The stated gap does not exist; **the real, unstated gap is that the key is 1024-bit** (RFC 8301 recommends 2048).                                                                                                                                                                           | System       |
| `apps/web/lib/client-ip.ts` header docblock      | "Coolify's Traefik has no `forwardedHeaders.trustedIPs`, so it discards inbound `X-Forwarded-*`."                                                                               | `docker inspect coolify-proxy` shows `--entrypoints.{http,https}.forwardedHeaders.trustedIPs=10.0.1.0/24`. A **later comment in the same file** correctly says Traefik now trusts that subnet. Implementation is correct and current; only the header comment is stale — in the file that decides whose IP gets rate-limited.                                                          | System       |
| `scripts/check-residency.mjs`                    | `checkStagedEdgeCertificate` documents "a certificate on a dormant path … not serving anyone yet".                                                                              | The LB is not dormant; it is world-open and routes every hostname on the host. **The same doc-vs-reality failure, inside the artifact built as the antidote to hand-maintained prose.**                                                                                                                                                                                                | System       |
| `docker-compose.prod.yml`                        | Declares `no-new-privileges:true`, `cap_drop: [ALL]`, `pids_limit`, and per-service cpu/mem. Also declares a `umami` analytics service.                                         | Production reads none of it (`build_pack=dockerfile`). `cap_drop` and limits arrive via Coolify's own fields; `no-new-privileges` is **not applied**; no `PidsLimit`; no umami container exists.                                                                                                                                                                                       | System       |
| `docs/decisions/ADR-0004`                        | "Live checks return colo=DMM … For a visitor inside Saudi Arabia, TLS already terminates in-country."                                                                           | See §5.2 — subtler than it looks.                                                                                                                                                                                                                                                                                                                                                      | Both, partly |

### 5.2 The PoP claim — a lesson in vantage points

ADR-0004 asserts in-country TLS termination from a single `colo=DMM` reading.
Measured today from two vantage points:

```
From a Saudi client (loc=SA):  colo=DMM  DMM  DMM  DMM  DMM   (5/5)
From the origin host:          colo=MRS  MXP  MRS              (Marseille, Milan)
```

An earlier pass measured only from the origin host and concluded "form PII is
being decrypted in the European Union today". That is **not supported** — the
origin is an Oracle datacenter IP whose anycast path is not a proxy for the
audience, and submitters are visitors.

What is defensibly true: PoP selection is vendor-controlled and observed to vary
by network path; at least one SA-geolocated path currently exits the Kingdom; and
ADR-0004's single-observation phrasing should become a timestamped, multi-vantage
observation. The ADR's _decision_ is strengthened by this, not weakened — its own
argument is that an accidentally-true residency claim is not a residency claim.

### 5.3 Where the code is more careful than the reviews

Two cases where the source file hedges correctly and summaries of it did not.

**Chain-B client IP.** An earlier finding stated twice that chain B "uses the
rightmost XFF hop", including as a reusable rule. `apps/web/lib/client-ip.ts`
does the **opposite**: `resolveClientIp()` on chain B returns
`edgeClientIp(headers)`, which reads **`x-real-ip`**. `rightmostHop()` is
documented in-file as "used only on chain A". The file records that
rightmost-XFF _was_ the first implementation, was measured wrong on 2026-07-29,
and was replaced because Traefik now trusts 10.0.1.0/24 and appends the LB's
address — so there are two trusted proxies and the rightmost hop is 10.0.1.x for
every visitor on earth. A future project following the erroneous rule would
reintroduce the exact bug this project already found and fixed.

**Origin-pull trust.** `client-ip.ts` says of the Cloudflare IP allowlist: _"That
is a DEPENDENCY, not an invariant, and the migration removes it."_ Allowlisting
Cloudflare's **shared** ranges authenticates "arrived via Cloudflare", not
"arrived via this zone" — any Cloudflare customer can point a custom origin at
this IP. There is no Authenticated Origin Pull and no shared-secret on chain A.
The mechanism that _is_ real is the `x-via-edge` / `EDGE_SHARED_SECRET` marker:
the LB's `https` listener carries a rule set `edge_marker` injecting a 64-hex
value, the www container has `EDGE_SHARED_SECRET` set, and the two **match**
(verified without exposing either: sha256 of each, first 16 hex, both
`25d3cdd580c1c527`). That marker is chain-selection, not an origin lock.

### 5.4 The WAF asymmetry runs the opposite way from intuition

`[VERIFIED]` Same two payloads, both paths, today:

| Payload                         | via OCI LB (WAF) | via Cloudflare (production) |
| ------------------------------- | ---------------- | --------------------------- |
| `?q=<script>alert(1)</script>`  | **403**          | **200**                     |
| `?q=1 UNION SELECT NULL,NULL--` | **403**          | **200**                     |
| `?q=hello`                      | 200              | 200                         |

The path every real visitor uses has **less** filtering than the bypass path.
`LAUNCH-BLOCKERS.md:226` states this correctly ("it protects nothing until
cutover since DNS still points at Cloudflare") — a case where the document
matches reality. The 200s also demonstrate that no Cloudflare managed ruleset is
blocking these payloads on the Free plan.

And the WAF is thinner than "OWASP core" implies: exactly one rule with three
capabilities (941110 XSS, 942100 SQLi, 944100 Java RCE) → block403;
`is-body-inspection-enabled` **false**; `request-rate-limiting`,
`request-access-control` and `response-protection` all null. **POST bodies are
not inspected**, so the `/contact` and `/services` pipeline — the actual PII path
— would pass uninspected after cutover.

### 5.5 CI is switched off, and production shipped anyway

`[VERIFIED]` The deployed commit `062d0d9` produced CI run **30438958083**:

```
deps       failure  steps=0  09:16:31Z → 09:16:41Z
changes    failure  steps=0  09:16:31Z → 09:16:43Z
quality    failure  steps=0  09:16:31Z → 09:16:42Z
gitleaks   failure  steps=0  09:16:31Z → 09:16:36Z
e2e        skipped
lighthouse skipped
container  skipped
```

Annotation, verbatim: _"The job was not started because recent account payments
have failed or your spending limit needs to be increased."_

The container was created at 09:17:49Z — **78 seconds after the failed run
started.** So typecheck, lint, unit tests, the coverage gate, gitleaks,
`pnpm audit`, Trivy, the non-root assertion, the SBOM and the entire e2e suite
(including the airplane-mode privacy spec) **have not executed against what is
serving towardpcc.com right now.** The deployed image has never been CVE-scanned
and has no SBOM.

The repo is already honest about the structural point — `docs/PLATFORM.md:445`
and `readiness-scorecard.md:33` both state CI gates nothing. What is new is that
every document saying a control is "enforced in CI" is currently describing a
gate that is not merely bypassable but switched off. The newest structural guard
(`e2e/mega-menu.spec.ts`, added in this very commit) has **zero executions
anywhere**.

Coolify deploys on push to `main` via webhook, independently of GitHub Actions.
CI is **advisory**. Nothing in `CONTRIBUTING.md`,
`docs/runbooks/deploy-production.md` or `LAUNCH-BLOCKERS.md` says so. And the one
remaining deploy-time gate is off: `health_check_enabled = False` on the
production application, with `pre_deployment_command` and
`post_deployment_command` both null.

### 5.6 The canary that reports green for the wrong reason

`[VERIFIED]` Scheduled run 30435751504 (2026-07-29 08:30Z) failed because the
live edge returns **HTTP 403 to GitHub Actions runners**. In that same run:

```
[FAIL] content: /calculators/pim3           — HTTP 403
[FAIL] the trust page still makes its claims — HTTP 403
[FAIL] api: /api/v1/health                   — HTTP 403 (expected 200)
[PASS] no third-party scripts on a calculator page
[PASS] api: /api/v1/score does not exist     — HTTP 403
[PASS] api: /api/v1/calculate does not exist — HTTP 403
[PASS] api: /api/v1/submissions does not exist — HTTP 403
[FAIL] security headers present
```

**Four vacuous passes.** `check-integrity.mjs` asserts `status >= 400` for
absence, so a blanket block satisfies the ADR-0005 API-surface guarantee.
`checkNoForeignScripts` never reads the status code at all.

That fourth one is worse than vacuous-under-block — it is vacuous **always**. Its
regex is `/<script[^>]+src="(https?:\/\/[^/"]+)/g`, matching only absolute
origins. On the live page today every script src is a relative path, including
`/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js` — a Cloudflare
script that is same-origin by path and third-party in substance. The guard
inspects **zero scripts** and prints "all same-origin".

Scope note: this does not touch the load-bearing promise. Calculator inputs live
in React state and the URL fragment, and the airplane-mode e2e proves they never
leave. What is not literally true is the footer's "0 bytes transmitted" and
check-integrity's stated conclusion.

`[UNVERIFIED]` The 403's cause. It is real and IP-dependent (the identical script
returns 12/12 PASS from a normal client). An earlier pass attributed it to a
Cloudflare WAF policy attached that morning; both commits it cited describe an
**OCI** WAF on the OCI load balancer, and one says outright that it "protects
nobody until cutover because DNS still points at Cloudflare". Cloudflare bot
protection is suspected and **not confirmed** — the DNS-scoped token cannot read
`/rulesets` or `/bot_management`.

Also worth recording: `residency.yml` has exactly **one run in its entire
history** — the failed one. Both scripts are under 24 hours old, and
`LAUNCH-BLOCKERS` marks both canaries `[x] DONE`. The cron is `0 6 * * *` and the
run fired at 08:30Z, so the stated design goal ("a failure is waiting at the
start of the working day") already does not hold.

### 5.7 Claims on `/trust` that fail `/trust`'s own rule

The page's governing rule, from its own docblock: _"every claim is either
ENFORCED by something that runs on each release, or DERIVED from data in this
repository. Nothing is a snapshot."_ It is a good rule and most of the page
honours it. Two claims do not:

- **"a pull request that drops below it does not merge"** — unenforceable
  (§4.14). The first half ("the coverage gate is set to 100% … it runs in CI") is
  true and verified.
- **"Nightly encrypted dumps … and a restore drill that was actually
  performed"** — a one-time event is precisely what the rule forbids, and
  "encrypted" is wrong for the dump itself: the local file is plaintext
  `PostgreSQL custom database dump` at 0644. The encryption relied on is Oracle's
  at-rest encryption on the uploaded copy.

The accurate formulation already exists elsewhere in the repo.
`/legal/data-protection` says "the storage holding the database and its backups
is encrypted at rest" — precisely correct. Copy that sentence.

**The rule itself is enforced by nothing.** It lives in a source comment on the
page it governs. Every other invariant of comparable importance has a
source-scanning guard. The page whose entire subject is checkability is the one
page without one — which is why two of its claims currently fail its own rule and
nothing reported it.

---

## Part 6 — Failure patterns

Six shapes of defect, each drawn from a real incident on this project. A standard
that only lists controls teaches less than one that names the ways controls
quietly stop being controls.

### 6.1 Hardening written into a file production does not read is indistinguishable from no hardening

`docker-compose.prod.yml` declares `no-new-privileges`, `cap_drop: ALL`,
`pids_limit` and per-service resource caps. Coolify builds from
`apps/web/Dockerfile` and never reads that file. `cap_drop` and the limits are
live **only because someone separately typed them into Coolify's own fields**;
`no-new-privileges` and `pids_limit` are not applied at all.

The same shape recurred in `incident.md`, where it costs the most: the
first-response commands reference that same absent compose file and a caddy
container that has never existed here.

**Test:** run the command against production. If it fails, the document is
fiction. Paste the real output back into the document.

### 6.2 A guard that matches prose in its own comments passes vacuously

This has happened **four** times in this repo, and the fixes are already written
into the test files:

- `privacy-claims.test.ts` matched the bare word `plausible`; a form component
  says "The label is a plausible field name". One false positive made
  `analyticsIsWired` permanently true and the guard below it permanently vacuous.
- `mail-config.test.ts` counted `requireRole("OWNER")` occurrences including the
  docblocks explaining why it is there — "the third time a source-scanning guard
  in this repo has been tripped by English rather than by a defect".
- `border-usage.test.ts` asserted `--color-edge`, a token the UI was not using. A
  1.056:1 border shipped in 38 places.
- `metadata.test.ts` re-implemented the route's template and then tested the
  copy, so it could not surface a divergence.

**The rule that fixes all four:** strip comments before counting code; enumerate
token/config lists out of the real source file rather than hardcoding them; and
assert the guard's own preconditions — `expect(files.length).toBeGreaterThan(0)`,
`expect(SURFACES).toContain("sunken")`. Where the assertion is an implication,
assert the antecedent separately so a flipped antecedent fails loudly.

### 6.3 A check that cannot reach the system must fail, never pass

§5.6. Absence assertions of the form "status >= 400 means the endpoint does not
exist" pass under a WAF block, an outage or a DNS failure. And a check that
inspects zero items and reports "all clear" is worse — it is vacuous on a good
day too.

**Fix shape:** require a positive control in the same run (a known-good page
returns 200), make the absence assertions _depend_ on it, and abort if it fails.
Assert the item count is non-zero before concluding anything about the items.

### 6.4 A self-consistent lie

The site claimed 89 citations against a real 87, and the e2e guard written to
catch exactly that **passed** — because it compared the rendered number to
`site.ts`, so the figure only ever had to agree with itself. Similarly "87
citations with PMID and DOI" when 56 had both.

**Fix:** derive public figures from the registry, not from another copy of the
claim. `figures.test.ts` now compares hero and proof-band counts against
`listScores()`; `/trust` computes its own with the comment "Derived, not typed".

### 6.5 A document is not evidence; the system is

Every entry in §5.1 was a true statement that expired. The LB, both NSGs and the
WAF appeared at 06:00 UTC on a day when a runbook's "verified 2026-07-28" table
asserted zero of each.

Two derived rules. **A document stating what infrastructure exists must carry a
verification timestamp and the command to re-derive it.** And **a superseded
block is struck through, not left sitting above a newer one in the same file** —
`LAUNCH-BLOCKERS.md` currently contains both "zero CAA records" and "CAA records
applied", and it is the file most likely to be trusted as current.

Corollary: do not let one document be both the live checklist and the historical
record. Split current state from changelog.

### 6.6 Silent success is the most expensive failure

The honeypot and the time-trap both `return { ok: true }` and write nothing —
correct anti-bot design. But `lib/submissions.ts` discarded any submission whose
`t` field was missing, and `t` is stamped in a `useEffect`, so it is absent
whenever that effect has not run. **The user saw the success panel; the enquiry
did not exist.** Nothing logged or counted the drops.

This is the same shape as the silently-broken SMTP relay the mail-config module
was written to prevent, and the same shape as the unconfigured backup heartbeat
(§7.5). This project's most expensive defects have all looked exactly like
nothing happening.

> **Fixed 2026-07-29.** `lib/submission-guards.ts` now classifies every drop and
> `submissions.ts` logs it by reason, never with content. The load-bearing
> detail is that `no-timestamp` is a **separate reason** from `too-fast`: the
> first means the form is broken for a real visitor, the second means the
> anti-bot gate is working. Collapsing them would have buried a site-wide
> outage inside an expected-noise metric — the drop would have been counted and
> still invisible. Twelve tests, and the module is in the 100% coverage gate, so
> the distinction cannot be quietly removed.

**Rule:** count and log drops by reason, never with content — and make the
reasons distinguish "we refused this" from "we lost this". A single `dropped`
counter satisfies the letter of this rule and none of its purpose.

---

## Part 7 — Rules for a new project

Everything above is description. This part is prescription.

### 7.1 What you inherit whether you want it or not

- A host classified as holding **regulated patient data**. Inherit that
  classification. Host root, or the Coolify admin login, reaches both the patient
  database and the `BACKUP_PASSPHRASE` that decrypts its off-host archives — so
  the two are not separated against host-level compromise, whatever the backup
  script's comment says.
- **Two public front doors**, not one.
- **SSH open to 0.0.0.0/0**, unrestricted egress, and an empty IPv6 firewall.
- A **flat Docker bridge** reaching every datastore and the control plane.
- **No access logs, no alerting, no SIEM.** If your project needs forensics, you
  must bring them.
- **Advisory CI.** Nothing blocks a deploy.

### 7.2 What you must not break

`[RULE]` **Never narrow the shared Default Security List without scheduling and
announcing it.** It is the only security list on the only subnet, so every rule
applies to every current and future resource including the patient-data app. To
_grant_ ingress, create a dedicated NSG and attach it to your app's VNIC — NSG
rules are a union with the security list, so this adds access without touching
the shared control. The 2026-07-29 LB rollout did exactly this and it worked.

`[RULE]` **Never assume an NSG restricts anything.** It cannot subtract. If you
need traffic actually restricted, the rule must come out of the shared list —
which affects every app on the box.

`[RULE]` **Never publish a new container port to the host.** The OCI security
list is currently the _only_ thing keeping 8000/6001/6002 off the internet:
DNAT'ed ports traverse FORWARD, the host INPUT allowlist never sees them, and
`DOCKER-USER` is empty. Route through Traefik by label. If a host port is
genuinely unavoidable, bind it to `127.0.0.1` explicitly and add a DOCKER-USER
rule.

`[RULE]` **Never change shared Traefik configuration as a side effect.**
`docs/runbooks/deploy-production.md:57-60` states: "Never touch another project's
containers, databases, or the shared proxy config." The edge migration added
`forwardedHeaders.trustedIPs=10.0.1.0/24` to both entrypoints — a change to
X-Forwarded-* trust for **every** application on the box, the patient-data app
included. On the merits it is backward-compatible (Cloudflare addresses are
outside 10.0.1.0/24, so chain A is unaffected). But a written rule guarding a
co-tenant's patient data was overridden, and this document records that it was,
by what reasoning, and that it now needs an owner.

`[RULE]` **Never add a public DNS record resolving directly to
145.241.105.239.** Every `towardpcc.com` A/CNAME is Cloudflare-proxied.
`demo.dmc-im.com` is not — it publishes the origin address of the machine running
the patient-data application, from a SiteGround-hosted zone nobody here
administers, and it is dead anyway because the security list admits only
Cloudflare. Before relying on origin concealment, sweep CT logs and every
co-tenant domain.

`[RULE]` **Allocate Docker networks outside 10.0.0.0/16.** Pin new projects to
`172.20.0.0/16` or similar. The host-level fix is `default-address-pools` in
`/etc/docker/daemon.json`, which needs a Docker restart — not a drive-by change
here.

### 7.3 What you must implement

#### Network and isolation

`[RULE]` **Own network, datastore off the shared bridge.** Your app container
joins `coolify` only so Traefik can route to it; your datastore goes on dedicated
networks. The endorsement app is the working template — copy that, not the four
legacy databases sitting on the shared bridge. Understand its limit (§2.4):
Traefik is multi-homed, so this defends against a compromised neighbour, not
against a compromised proxy or host root.

`[RULE]` **Set `internal: true` if you mean internal.** On this host,
`…_internal` reports `Internal=false`. Naming is not a flag.

#### Resources

`[RULE]` **Declare `mem_limit` and `cpus` in Coolify's own fields** — the fields
Coolify actually applies, not a compose file it never reads — and set a
`PidsLimit`. Verify with `docker stats`: **if the denominator reads 23.41GiB, the
limit did not apply.** TowardPCC's 1G/2-CPU is currently the only cap on the box.

#### Runtime hardening

`[RULE]` `cap_drop: ALL` with named capabilities added back, non-root user,
read-only rootfs where possible. Confirm with
`docker inspect --format '{{.HostConfig.SecurityOpt}} {{.HostConfig.CapDrop}} {{.HostConfig.ReadonlyRootfs}}'`.
`no-new-privileges` cannot be set through Coolify's options field (§3.2) — if you
need it, use the `dockercompose` build pack as endorsement does.

`[RULE]` **Never mount `/var/run/docker.sock` read-write.** Mount `:ro` as
`coolify-proxy` does, or put a filtering socket proxy in front.

#### Environments and secrets

`[RULE]` **A preview or staging environment gets its own database, its own role
and its own secrets, or it does not exist.** §4.1 is what happens otherwise. If a
preview must be kept, put it behind auth or an IP allowlist — `robots.txt` is not
access control — and pin it to a branch someone is actually maintaining.

`[RULE]` **Rotate any secret that has ever been shared between two
environments.** `DATABASE_URL`, `AUTH_SECRET`, `TOTP_ENC_KEY` and
`SUBMISSION_IP_SALT` qualify today.

`[RULE]` **Assume every environment variable you set is readable by
`docker inspect` and stored in `coolify-db` under Coolify's `APP_KEY`**, and that
`GET /api/v1/applications` will disclose your webhook secrets in cleartext to
anyone holding the Coolify token. Scope, store and rotate that token as a
**deploy credential**.

#### Ingress and authentication

`[RULE]` **Give every admin, database or ops UI authentication before it gets a
public hostname — and prefer not giving it one.** Adminer and Uptime Kuma return
401 only because of Traefik basicauth labels; a missing label is the whole
difference between protected and open. **And that only covers the public
hostname** — Adminer's auth is proxy-side only, so a peer on the shared bridge
reaches it uncredentialed. For anything genuinely internal, prefer an SSH tunnel
or an IP-allowlist middleware. Distinguish proxy-enforced auth from app-enforced
auth when you write it down; `mylibrary.towardpcc.com` returns 401 from the
application, with no auth middleware at all.

`[RULE]` **Set your own security headers.** Traefik's entire global middleware
set is `redirect-to-https` and `gzip` — no HSTS, no CSP, no rate limiting, no
request caps. Emit HSTS **from the application, not the CDN**: because
TowardPCC's origin sets it, the header survived a whole new edge appearing in
front of it, byte-identical on both paths. A CDN-set HSTS would have silently
changed at cutover.

`[RULE]` **Set CSP from a source that cannot be skipped by a request header.**
§4.12. Either move the constant tier into `next.config.ts` `headers()`, or drop
the `missing` exclusion, or assert in the header test that the policy survives a
prefetch header. Security headers belong on the path that cannot be opted out of.

`[RULE]` **Never trust `cf-connecting-ip` unconditionally, and never count XFF
hops.** Identify the LB path by the `x-via-edge` secret; on that path read
`x-real-ip` (Traefik overwrites a client-supplied value once it trusts the
upstream). Hop count is topology-dependent and will break the next time a proxy
is inserted. Make the edge path unreachable by construction when the secret is
unset. Keep `forwardedHeaders.trustedIPs` scoped to 10.0.1.0/24.

#### Data

`[RULE]` **Put every security-relevant grant in a versioned migration**, and fix
the default ACL. `ALTER DEFAULT PRIVILEGES` currently grants the app role `arwd`
on every new owner-created table, so append-only is opt-out. Default-deny and
grant DML per table.

`[RULE]` **Run every migration as one named owner role and assert it.** Add a
post-migrate check that fails on an unexpected table owner and re-asserts the
grant matrix. `AppSetting` is owned by `postgres` today and the split does not
hold uniformly.

`[RULE]` **Design the audit trail so cleanup cannot poison it.** Revoke
UPDATE/DELETE from the application role _and_ mandate id-only vocabulary in audit
entries — writing "removed MRN 12345" into an uncorrectable table copies the
identifier you just deleted into every future backup.

`[RULE]` **Never log a raw client address.** HMAC it under a salt of at least 16
chars and truncate. Copy `logger.test.ts` verbatim: scan every source file, fail
on a bare `ip` field reaching a log call, and include the guard-the-guard.

### 7.4 What you must publish, and how to keep it true

`[RULE]` **Every published commitment with a time or a number in it must name the
thing that executes it, and that thing must be verified on the host.** "24
months, then deleted" has been public for weeks against a purge script no
scheduler has ever run. If copy states a period, the same change either lands the
scheduler or changes the copy.

`[RULE]` **State backup latency wherever deletion is promised.** Purged rows
survive in 14 daily dumps on disk and in Object Storage, and the buckets have no
lifecycle policy — retention exists only because Coolify prunes by count. A
deletion promise without a latency sentence is a promise the backups falsify.

`[RULE]` **Adopt "enforced or derived", and enforce the rule itself with a
test.** Forbid one-time events ("a drill was performed", "N tests pass") as
evidence for a standing claim. Where a fact is checked daily rather than per
release, say "checked daily" on the page.

`[RULE]` **Prefer wording that describes the mechanism you actually operate.**
This estate contains both versions of the same sentence — "the storage holding
the database and its backups is encrypted at rest" (true) and "nightly encrypted
dumps" (not true). Copy the accurate one, or encrypt the dumps.

`[RULE]` **Claim alignment, never compliance.** PRD §8.3 permits "PDPL-aligned
practices" and prohibits any "compliant with [law]" badge. The live pages follow
this and carry a visible `pendingNote`. Inherit that voice verbatim; it is what
makes the rest of the trust posture credible.

### 7.5 Backups, canaries and release

`[RULE]` **Own bucket, own credentials, encrypted before leaving the host,
retention rule LOCKED.** `endorsement-backups` is the reference design — dedicated
bucket, dedicated rclone credential, genuinely encrypted archives (`file` → "openssl
enc'd data with salted password"), and deliberately `rclone copy` not `sync`. Its one
defect: the 30-day rule has `time-rule-locked: null`, so it can simply be deleted —
**the patient-data bucket has weaker immutability than the shared one** (14 days,
lock pending 2026-08-03). Versioning is Disabled on both, so there is no second
line. Do **not** repeat mylibrary's arrangement, where one app's credential can
delete every other app's backups from the shared bucket — and where the prune runs
`docker run --rm amazon/aws-cli:latest` (an **unpinned** third-party image, pulled
fresh, as root, with live storage credentials in its environment).

`[RULE]` **Every backup gets a dead-man's switch that alarms when the job stops,
not merely when it fails.** endorsement's script has the switch built and
unconfigured; its log has been saying _"nothing is watching them"_ since
2026-07-28. Credit where due — the script detects and reports its own unmonitored
state rather than passing silently. Wire the heartbeat before the first backup
runs.

`[RULE]` **State the timezone of every element of a scheduled chain.** The
endorsement app runs `APP_TIMEZONE=Asia/Riyadh` so `backup:run` at 01:30 local is
22:30 UTC, while the host cron is `5 2 * * *` UTC. The script's comment claims a
35-minute margin; the real gap is 3h35m. It works — until someone "tightens" it
on the stated assumption.

`[RULE]` **A project is not live until a restore has been performed and its
wall-clock RTO recorded.** Re-run after every schema migration and re-derive the
expected assertions each time; `deploy-production.md`'s `# expect 7 tables` is
already stale for the app_settings migration and would pass without checking
anything.

`[RULE]` **Separate release-time checks from production checks, and never mix
them.** CI proves the artifact was correct when it left the build; a canary
proves the running system is still correct. `residency.yml` gets the design right
and says why: running these on push "would mean a red build on someone's
unrelated PR because a DNS record moved … which is the fastest way to train a
team to ignore a check". Keep the canary in its own scheduled workflow with no
import dependency on the repo it watches, declare every expected value plus the
reason it holds, make it a tripwire in both directions, and use `if: always()`
between independent checks.

`[RULE]` **Give production canaries an allowlisted egress path before you attach
a WAF or bot policy.** Enumerate the automated checkers that must still get
through. Otherwise the daily check fails every night while the site is healthy.

`[RULE]` **Verify that CI executed, not that the workflow file exists.** Jobs with
a zero-length `steps` array and a sub-15-second duration did not run. Better:
make the release refuse to start unless the commit's checks are green. On this
server the deploy trigger and the quality gate are two systems that have never
been connected — and Coolify's `pre_deployment_command` hook is the only place a
project here can make a check genuinely block a deploy.

`[RULE]` **Do not build a security argument on GitHub branch protection.** It
returns 403 on a private repo under a personal plan. Make the repo public, pay
for Pro, or move the gate somewhere it can run — and write down which you chose.

`[RULE]` **Retire routes and DNS together.** Deleting a DNS record does not
remove the Traefik router. Verify decommission with a Host-header probe, not a
lookup.

### 7.6 Before any cutover to the OCI edge

Five things must be true, and none of them is today:

1. A **multi-SAN certificate** covering every vhost the LB will serve. Today's
   covers `towardpcc.com` and `www` only, and expires 2026-10-27 with no
   automation. When renewal is automated, use a **dedicated OCI user with a
   load-balancer-only policy**, never the tenancy admin key — the key would live
   on a host running the patient-data app.
2. **WAF request-body inspection enabled and a rate-limiting rule added.** Today
   body inspection is off and there is no volumetric protection to replace
   Cloudflare's.
3. **The LB backend scoped to intended hostnames**, or the second front door
   accepted and documented per vhost.
4. **A real health check.** The backend set's checker is TCP-only with `url-path`
   null, so a backend returning 500 to every request stays "healthy". There is
   one backend, so there is nothing to fail over to in any case.
5. **A named owner for removing the 30 Cloudflare CIDR rules** from the shared
   security list. After cutover they are both useless and the widest remaining
   ingress — and removing a rule from that list is a change affecting every app on
   the box.

Also decide, in the same change: TLS 1.3 (the LB listener is `TLSv1.2` only),
whether the LB should verify the origin certificate (`verify-peer-certificate:
false` on both listener and backend set today), and the 10 Mbps fixed shape,
which is a hard ceiling for every app sharing the LB.

---

## Part 8 — Verification appendix

Commands to re-derive the load-bearing claims. Every one is read-only.

```bash
# --- deployed artifact matches source ---
git rev-parse HEAD
sudo docker exec <web-container> printenv SOURCE_COMMIT      # must match

# --- the second front door: enumerate what the LB serves ---
for h in <every hostname>; do
  curl -s -o /dev/null -w "$h -> %{http_code}\n" -k \
    --resolve "$h:443:145.241.110.213" "https://$h/"
done
echo | openssl s_client -connect 145.241.110.213:443 \
  -servername www.towardpcc.com 2>/dev/null | openssl x509 -noout -ext subjectAltName -dates

# --- Cloudflare allowlist currency (must be 15/15, both diffs empty) ---
curl -s https://www.cloudflare.com/ips-v4 | sort > /tmp/pub
oci network security-list list --compartment-id <tenancy>   # extract :443 sources
comm -23 /tmp/pub /tmp/seclist    # missing -> would break ingress
comm -13 /tmp/pub /tmp/seclist    # stale   -> over-broad

# --- WAF asymmetry: same payload, both paths ---
curl -s -o /dev/null -w "LB  %{http_code}\n" -k --resolve www.towardpcc.com:443:145.241.110.213 \
  "https://www.towardpcc.com/?q=<script>alert(1)</script>"     # expect 403
curl -s -o /dev/null -w "CF  %{http_code}\n" \
  "https://www.towardpcc.com/?q=<script>alert(1)</script>"     # expect 200

# --- CSP prefetch bypass ---
curl -sI -H 'purpose: prefetch' https://www.towardpcc.com/admin/login | grep -ci content-security-policy  # 0 = bypass live

# --- TLS floor at the production edge. NOTE: OpenSSL 3.x refuses to OFFER
#     tls1/tls1_1, so `openssl s_client -tls1` produces a FALSE NEGATIVE.
#     Drive it from Python with an explicit minimum_version instead.
python - <<'PY'
import socket, ssl
for v,n in [(ssl.TLSVersion.TLSv1,"1.0"),(ssl.TLSVersion.TLSv1_1,"1.1")]:
    ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT); ctx.check_hostname=False
    ctx.verify_mode=ssl.CERT_NONE; ctx.minimum_version=ctx.maximum_version=v
    ctx.set_ciphers("ALL:@SECLEVEL=0")
    try:
        s=ctx.wrap_socket(socket.create_connection(("www.towardpcc.com",443),10),
                          server_hostname="www.towardpcc.com")
        s.send(b"GET / HTTP/1.1\r\nHost: www.towardpcc.com\r\nConnection: close\r\n\r\n")
        print(n, s.version(), s.recv(20))
    except Exception as e: print(n,"refused",type(e).__name__)
PY

# --- network isolation, and its limit ---
sudo docker network inspect coolify --format 'internal={{.Internal}} opts={{.Options}} n={{len .Containers}}'
sudo docker inspect coolify-proxy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}'
sudo docker inspect <your-db> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# --- host firewall reality ---
sudo iptables -S DOCKER-USER      # empty = published ports have ONE layer
sudo ip6tables -S INPUT           # currently: -P INPUT ACCEPT, no rules
sudo ss -tulpn                    # full bound-port inventory, tcp AND udp

# --- container hardening, as applied ---
sudo docker inspect <c> --format 'User={{.Config.User}} CapDrop={{.HostConfig.CapDrop}} SecOpt={{.HostConfig.SecurityOpt}} RO={{.HostConfig.ReadonlyRootfs}} Mem={{.HostConfig.Memory}} Pids={{.HostConfig.PidsLimit}}'
sudo docker stats --no-stream     # denominator 23.41GiB == no limit

# --- database: grants, roles, owners, default ACL (schema only, NO rows) ---
psql -c "select grantee,table_name,string_agg(privilege_type,',') from information_schema.role_table_grants where table_schema='public' group by 1,2"
psql -c "select rolname,rolsuper,rolbypassrls from pg_roles"
psql -c "select tablename,tableowner from pg_tables where schemaname='public'"
psql -c "select pg_get_userbyid(defaclrole),defaclobjtype,defaclacl from pg_default_acl"
psql -Atc "show ssl"

# --- the scheduler that is not there ---
crontab -l; sudo crontab -l; ls /etc/cron.d/; systemctl list-timers --all
sudo grep -rl purge-retention /etc/cron* /var/spool/cron

# --- backups: encryption, retention, lifecycle ---
sudo file <newest .dmp>                                    # plaintext today
sudo file <newest .enc>                                    # "openssl enc'd data"
oci os retention-rule list --bucket-name <b> --namespace-name axgdyskpvhds   # check time-rule-locked
oci os object-lifecycle-policy get --bucket-name <b> --namespace-name axgdyskpvhds  # 404 today

# --- CI actually executed? ---
gh run view <id> --json jobs      # steps=[] and <15s == did not run
gh api repos/<o>/<r>/branches/main/protection    # 403 == no gate exists

# --- canaries (run from a non-blocked vantage point) ---
node scripts/check-residency.mjs   # 6/6
node scripts/check-integrity.mjs   # 12/12 — but see §5.6 on vacuous passes
```

---

## Provenance

Written 2026-07-29 from six live investigations of `hosting-1`, each
adversarially challenged, with the challengers' corrections taken over the
original findings. Where a correction and an original disagreed, the claim was
independently re-measured for this document before being included; several
original findings were dropped or rewritten as a result — notably the endorsement
DB isolation (Traefik is multi-homed), the chain-B client-IP mechanism
(`x-real-ip`, not rightmost XFF), the LB hostname count (13, not 6), the
Cloudflare PoP claim (vantage-dependent), the Postgres co-tenancy claim (the
cluster holds two databases, not many), and the shared-secret enumeration
(`SMTP_PASSWORD` is empty in both environments).

Nothing on the host was modified. No database rows were read — only schema,
grants, and aggregate counts. Credentials were noted as existing, with their
location and permissions; no value was read or recorded.
