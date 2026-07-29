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

Visit `https://uptime.towardpcc.com`. **The first prompt is the Traefik
basic-auth dialog, not Uptime Kuma.** Browsers render it as a bare
username/password box, so it reads as "log in" and invites the conclusion that
an account already exists. It does not — verified by checking the container:
`kuma.db` is absent and `/app/data` holds only empty directories until setup
completes.

Past basic auth, Uptime Kuma 2.x sends you to `/setup-database` first. Choose
**SQLite** — embedded, nothing else to run, and what the `uptime-kuma-data`
volume exists for. The admin account comes after that.

Use a different password from the basic-auth one. They protect different layers,
and the basic-auth credential is shared infrastructure rather than a personal
login.

### Credential handling, and a mistake worth not repeating

The basic-auth credential lives at `~/uptime-kuma-basicauth.txt` on the server,
mode 600:

```bash
ssh -i <key> ubuntu@145.241.105.239 "cat ~/uptime-kuma-basicauth.txt"
```

**It was rotated on 2026-07-29 because the previous one was exposed.** The cause
is worth recording because it is easy to repeat: `curl -u user:pass -w
"%{url_effective}"` prints the credentials back, because curl embeds them in the
effective URL. Diagnosing over HTTP with a password in it means never printing
the URL — only the status code.

## Step 4 — monitors: DONE 2026-07-29

Four monitors, all live and passing, all wired to the email notification.

| Monitor                           | Target                                   | Interval | Retries |
| --------------------------------- | ---------------------------------------- | -------- | ------- |
| TowardPCC — site                  | `https://www.towardpcc.com/`             | 60s      | 3       |
| TowardPCC — readiness (database)  | `https://www.towardpcc.com/api/v1/ready` | 60s      | 3       |
| TowardPCC — apex redirects to www | `https://towardpcc.com/`                 | 5 min    | 2       |
| TowardPCC — calculators           | `https://www.towardpcc.com/calculators`  | 5 min    | 2       |

First heartbeats confirmed: 200, 200, **308**, 200.

**The readiness one is the one that earns its keep.** It goes unhealthy when the
_database_ is unreachable, which `/` will not — Next serves static pages happily
with a dead database, so the site looks perfect while every form submission
fails silently. Watching only the homepage would miss exactly the outage that
matters most here.

The apex monitor accepts `300-399` as success, because a 308 to `www` is the
correct answer. Left at the default `200-299` it would page you for the system
working properly, which is how alerting gets muted.

Retries are above 1 on every monitor. A single failed probe from one runner is
not an outage, and an alert that cries wolf gets ignored — which is worse than
no alert.

Certificate expiry is a flag on the site monitor rather than a separate check,
so a Cloudflare renewal failure surfaces there.

### How these were added, and the caveat that comes with it

Uptime Kuma exposes no REST API for creating monitors — its API is socket.io and
needs a login. These were inserted directly into `kuma.db` and the container
restarted, after backing the database up to `kuma.db.bak-<timestamp>` in the
same volume.

That is a legitimate way in but not a durable habit: the schema is internal and
can change between releases. **Add future monitors through the UI.** If you ever
need to script them again, back up first and re-check `pragma table_info(monitor)`
rather than assuming these columns still apply.

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
