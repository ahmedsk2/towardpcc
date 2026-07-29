# Runbook: availability monitoring (Uptime Kuma)

Closes the availability half of taskmanager 9.3. Self-hosted in me-riyadh-1, so
it adds no processor outside the Kingdom and needs no ADR-0004 carve-out.

**Deployed and running.** Two steps remain and both need you: a DNS record, and
one setting in the Coolify UI. Do them in the order below — the second must be
in place before the first takes effect.

## What exists now

|                   |                                                             |
| ----------------- | ----------------------------------------------------------- |
| Service           | `uptime-kuma`, Coolify project **admin-tools** / production |
| UUID              | `f20u98778pmpgcwkl97ihmgl`                                  |
| Image             | `louislam/uptime-kuma:2`                                    |
| Status            | running, healthy, container IP `10.0.5.2`                   |
| Intended hostname | `uptime.towardpcc.com` (configured, not yet resolving)      |

It is **not reachable from the internet today**, and not because of anything
clever: the OCI security list admits 80/443 only from Cloudflare's ranges, and
`uptime.towardpcc.com` does not resolve. Verified — a direct request to the
origin IP times out.

That accident of ordering is what makes the sequence below safe, and it is worth
understanding rather than relying on. **Uptime Kuma's first visit creates the
admin account, with no authentication.** Whoever loads that page first owns the
monitor. So the window between "the hostname resolves" and "basic auth is
active" is a window in which a stranger can claim it.

## Step 1 — basic auth: DONE, and verified

Already applied and tested end to end, 2026-07-29:

```
no credentials   -> 401
with credentials -> 302   (Uptime Kuma redirecting to its setup page)
```

The credential lives on the server, mode 600, and was never printed into a chat
log or a commit:

```bash
ssh ubuntu@145.241.105.239 'cat ~/uptime-kuma-basicauth.txt'
```

Two things went wrong getting here, both worth recording because both would
have produced a login that silently never worked:

- **Do not pre-escape the `$` in the bcrypt hash.** Coolify does not
  double-escape custom labels, so writing `$$2y$$05$$…` into the compose
  reaches Traefik literally as `$$2y$$05$$…` — a hash no password can match.
  Pass the raw hash with single dollars.
- **Do not guess the router name.** Coolify generates
  `http-0-<uuid>-uptime-kuma`, not `uptime-kuma`. You do not need to know it:
  defining the middleware alone is enough, because Coolify parses custom
  middleware labels and merges them into its own router — the applied label
  reads `middlewares=gzip,kuma-auth`.

## Step 2 — hostname: DONE 2026-07-29

`https://uptime.towardpcc.com:3001` is set on the sub-application, DNS resolves
(proxied), and the whole path is verified end to end:

```
no credentials   -> 401   www-authenticate: Basic realm="traefik"
with credentials -> 302
```

**Keep the `:3001` in the Coolify domain field.** Coolify warns that removing it
will break routing, and the warning is right: the suffix names the _container_
port to route to, not a public port. You browse to `https://uptime.towardpcc.com`
with no port. This is the same convention as the `SERVICE_FQDN_UPTIMEKUMA_3001`
environment variable.

The API cannot set this — Coolify 4.1.2 has no endpoint for a service
sub-application's FQDN. It is a UI field, and that is not a workaround waiting
to be found.

## Step 3 — create the Uptime Kuma admin account

Load `https://uptime.towardpcc.com`, pass basic auth, and create the account
**immediately**. Use a different password from the basic-auth one; they protect
different things and one is shared.

## Step 4 — the monitors worth having

Add these four. The first is the one that will actually page you; the rest catch
the failures that do not take the site down.

| Monitor            | URL                                      | Interval | Why                                                                                                                                                                                           |
| ------------------ | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site up            | `https://www.towardpcc.com/`             | 60s      | The obvious one.                                                                                                                                                                              |
| Readiness          | `https://www.towardpcc.com/api/v1/ready` | 60s      | Returns unhealthy when the **database** is unreachable, which `/` will not — Next serves static pages happily with a dead database, so the site looks fine while every form submission fails. |
| Certificate expiry | same as "Site up"                        | —        | Enable the TLS expiry notification. Cloudflare renews the edge certificate automatically, but a CAA mistake breaks renewal weeks later and silently. See `dns-hardening.md`.                  |
| Apex redirect      | `https://towardpcc.com/`                 | 5 min    | Should 308 to `www`. Catches a canonical-host regression, which is invisible to users and quietly damaging to search.                                                                         |

Set the retry count above 1. A single failed probe from one runner is not an
outage, and an alert that cries wolf gets muted, which is worse than no alert.

## Step 5 — alerting

Email, via the same `mail.towardpicu.com` relay as the submission notifications
(ADR-0004 decision 5). Settings → Notifications → SMTP, using the values from
`/admin/settings` on the main site.

**This only works once the SMTP password is entered**, which is still
outstanding. Until then Uptime Kuma will record outages but tell nobody — which
is exactly the failure mode the `/admin` mail banner exists to prevent, so do not
consider monitoring finished until a test notification has actually arrived.

## What this does not cover

Error tracking. GlitchTip was considered and deliberately skipped: it is five
containers including its own Postgres and Redis, on a host that also runs an
application holding real patient data. Application errors already go to
structured JSON logs with PII redaction and rotate at 10 MB × 3, and Uptime Kuma
covers the alert that actually matters. Revisit when reading logs by hand stops
being practical.

If it is ever added, it takes **server-side errors only**. A browser SDK would
transmit from pages whose central promise is that they transmit nothing, and it
would cost bundle against the 170 KB budget — ADR-0005 names precisely that
pressure.
