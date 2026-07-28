# Log retention, and why there is less to retain than expected

Closes **TM-009**, which read: "Retention policy omits proxy/app/error-tracker
logs. §8.4 covers submissions (24 months) and audit logs (12 months) but defines
no rotation for logs containing IPs, which are personal data under PDPL."

The premise turned out to be wrong in a useful way. **No raw client IP is
written to disk anywhere in this system**, so the retention question that item
was worried about mostly does not arise. What follows is the evidence, because
"we checked and it was fine" is worth exactly nothing to the next person.

## What is actually logged

**Application logs** — `apps/web/lib/logger.ts`, pino, JSON to stdout.

The only IP-adjacent value that reaches a log call is `ipHash`, at
`apps/web/lib/submissions.ts:113`, when a submission is rate-limited. That is
the salted, truncated hash already described in the schema as "abuse forensics
only, not identity" — not a reversible address. Every other log call carries
ids, types and outcomes: a submission id, an admin user id, an error object.

`pino` is additionally configured to redact `*.email`, `*.password`, `*.name`,
`*.message`, `payload` and `*.token`. That is a net rather than the control —
the control is not logging those things in the first place — but it means a
stray field added by someone in a hurry is scrubbed rather than published.

**Proxy logs** — Traefik, shared across every application on this host.

Access logging is **not enabled**. Traefik writes access logs only when
configured to, and no `accessLog` stanza exists in
`/data/coolify/proxy/docker-compose.yml` or the dynamic configuration.
Verified 2026-07-28. So the component that would normally hold a raw client
address per request holds nothing.

Note the corollary, which is not entirely comfortable: there is **no request
log to investigate with** if something goes wrong. That is a deliberate trade
worth revisiting if the site is ever attacked, and turning access logs on would
mean deciding a retention period for them at the same time — not afterwards.

**Container log rotation** — `json-file`, `max-size: 10m`, `max-file: 3`, set in
`/etc/docker/daemon.json`. So each container's logs are bounded at roughly 30 MB
and roll off oldest-first. That is a size bound, not a time bound: a quiet
service may retain months, a busy one days. Acceptable while the content is what
is described above; it would not be if raw addresses were ever logged.

**Error tracker** — none deployed. When one is (Sentry/GlitchTip is an open P8
item), it must be self-hosted in-region under ADR-0004, and its scrubbing has to
be verified with a deliberately triggered error rather than assumed from
configuration.

## What is NOT covered by any of this

**Cloudflare holds its own request logs**, including raw visitor IPs, at an edge
this project does not control and cannot configure. That is disclosed as a
sub-processor on `/legal/data-protection` and is one of the reasons ADR-0004
decides to move the edge in-region. No amount of local log hygiene reaches it.

**The mail relay** sees delivery metadata for the operator notification — that
a message was sent, when, and to whom. Also outside our retention control, and
carved out in writing (ADR-0004 decision 5).

## The rule

Application and proxy logs carry no raw client addresses, and none may be added.
If a future change needs one — a genuine abuse investigation is the only
plausible reason — it is a decision with a written retention period attached,
not a line added to a log call.

Enforced by `apps/web/lib/logger.test.ts`, which fails the build if a log call
passes a raw `ip` rather than a hash, and if the redaction list loses a field.
That guard is cheap and the alternative is this document slowly becoming untrue
without anyone noticing, which is the failure mode this repository keeps having
to correct.
