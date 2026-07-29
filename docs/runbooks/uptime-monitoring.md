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

## Step 1 — add the basic-auth middleware (do this FIRST)

The credential is already generated and sitting on the server. It was never
printed into a chat log or a commit.

```bash
ssh ubuntu@145.241.105.239 'cat ~/uptime-kuma-basicauth.txt'
```

That file (mode 600) holds the username and password. The bcrypt hash Traefik
needs is separately at `~/.uptime-kuma-hash`.

In Coolify: **admin-tools → uptime-kuma → Advanced → Custom labels**, and add,
substituting the contents of `~/.uptime-kuma-hash` for `<HASH>`:

```
traefik.http.middlewares.kuma-auth.basicauth.users=<HASH>
traefik.http.routers.uptime-kuma.middlewares=kuma-auth
```

Coolify has container-label escaping enabled, so paste the hash exactly as the
file contains it — do not double the `$` signs yourself.

Then redeploy the service so the labels apply.

> This is a UI step rather than an API call because Coolify 4.1.2 does not expose
> a custom-labels field for **services** through its API — applications have one,
> services do not. Not worth working around by editing the compose behind
> Coolify's back; it would be silently overwritten on the next template update.

## Step 2 — add the DNS record

In Cloudflare, on the `towardpcc.com` zone:

| Type | Name     | Content           | Proxy         |
| ---- | -------- | ----------------- | ------------- |
| A    | `uptime` | `145.241.105.239` | **Proxied** ✓ |

Proxied, not DNS-only. The origin firewall admits only Cloudflare, so a
grey-clouded record would simply time out.

There is no wildcard on this zone — verified, a random subdomain returns
NXDOMAIN — so every new hostname needs its own record.

Traefik requests a Let's Encrypt certificate over HTTP-01 once the name
resolves, which takes a minute or two on first load.

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
