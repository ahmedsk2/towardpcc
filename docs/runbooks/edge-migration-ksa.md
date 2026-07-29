# Runbook: moving the edge into KSA (Cloudflare → OCI LB + WAF)

Implements decision 2 of [ADR-0004](../decisions/ADR-0004-ksa-only-processing.md).

**Nothing here has been executed.** It is blocked on step 1, which is a
conversation, not a command.

> ⚠️ **The single most dangerous mistake is flipping DNS first.** The
> replacement is stood up and proven **while Cloudflare is still serving**, then
> DNS moves, then the old ingress is narrowed **last**. Every step below is
> individually reversible; that ordering is what makes them so.

## Verified tenancy facts (read-only, 2026-07-28)

| Thing                | Value                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Region subscriptions | **one** — me-riyadh-1 (home). Nothing can leave by accident.                                                 |
| VCN / subnet         | `hosting-vcn` 10.0.0.0/16; **one** subnet `hosting-public` 10.0.1.0/24                                       |
| Security list        | **one**, 32 ingress rules: 22/tcp from 0.0.0.0/0, ICMP 3/4, and 15 Cloudflare CIDRs × 80 + the same 15 × 443 |
| NSGs                 | **zero**                                                                                                     |
| Instance             | `hosting-1`, VM.Standard.A1.Flex, private 10.0.1.71, single VNIC, `nsg_ids` empty                            |
| Load balancers       | **zero**. Only `flexible` shape offered here. Quota 36, 0 used                                               |
| WAF policies         | **zero**. Quota 100. Request-body inspection capped at 8192 bytes                                            |
| Certificates         | OCI Certificates available (150), but its CA is **private** — cannot issue publicly-trusted certs            |

## The design trap that shapes everything

The obvious topology — OCI LB → shared Traefik → app — **silently destroys
client IP**.

Traefik has no `forwardedHeaders.trustedIPs`, so it discards inbound
`X-Forwarded-*` and rewrites them from the connecting peer. After the move that
peer is the load balancer, so every visitor on earth collapses onto one private
address: the per-edge rate-limiting bug fixed on 2026-07-27, reintroduced with
no error and no failing test.

Fixing it the obvious way means editing shared Traefik config, which
`deploy-production.md` forbids and which changes header handling for the
co-tenant's patient-data app.

**So the architecture is to bypass Traefik for towardpcc.com**: the LB forwards
straight to the app's port on 10.0.1.71, reachable only from the LB via a new
NSG. This is also the minimum-blast-radius option — Traefik, the shared security
list and the co-tenant are never modified during stand-up.

**Do not simply publish host port 3000 to get there.** Two containers cannot
bind it simultaneously, so Coolify falls back to stop-then-start and the
zero-downtime gate is lost — the property `deploy-production.md` states twice,
that "a bad build never replaces a healthy container". Every rollback below
depends on it. Prefer a small **towardpcc-owned** reverse proxy inside the
towardpcc Coolify stack (app config, not the forbidden shared proxy) bound to
the host port and forwarding by service name. If you accept the host port
anyway, document the loss and run `ss -ltnp | grep :3000` on hosting-1 first.

## TLS

The LB **must terminate TLS**: OCI's regional WAF attaches only to an HTTP/HTTPS
listener, so a TCP passthrough listener cannot be inspected — passthrough means
no WAF at all.

OCI Certificates cannot issue a publicly-trusted certificate, so obtain from
Let's Encrypt and **import** it (`configType: IMPORTED`), referencing the OCID
from the listener.

**Use DNS-01, not HTTP-01.** DNS-01 works before any DNS change, which is
precisely what makes "never flip DNS first" achievable: you can hold a real,
valid production certificate on the LB and test it end-to-end while Cloudflare
is still serving. Port 80 does not need to be open to the world for towardpcc's
certificate — but it must stay open **from Cloudflare's ranges** for the
co-tenant, which still renews via HTTP-01 through Traefik.

**A port-80 listener is still required**, with an OCI redirect rule to https.
Today the HTTP→HTTPS redirect is done _by Cloudflare_ — verified:
`curl -sI http://towardpcc.com/` returns 301 with `Server: cloudflare`. Without
that listener, a visitor typing the bare domain after cutover gets a connection
refused. HSTS does not save you: the domain is **not** on the preload list yet.

## Client IP

Done, shipped ahead of the migration: [`lib/client-ip.ts`](../../apps/web/lib/client-ip.ts)
is a dual-path resolver. Requests carrying `x-via-edge` matching
`EDGE_SHARED_SECRET` resolve from the **rightmost** `x-forwarded-for` hop (the
LB appends, and Oracle documents that its injected headers cannot be removed or
altered by a rule set). Everything else falls through to the unchanged
Cloudflare path.

`cf-connecting-ip` is **not read** on the edge path. The LB does not strip it,
so it becomes attacker-settable the instant the LB has a live backend —
demoting it below XFF is not enough.

If `EDGE_SHARED_SECRET` is unset, the edge path is unreachable by construction.

> **Gate before anything depends on this:** Oracle's documentation says "rule
> sets apply only to HTTP listeners." If the listener is HTTP2 and the rule set
> silently does not apply, `x-via-edge` is never injected, the resolver falls
> through to the Cloudflare branch, and `cf-connecting-ip` becomes forgeable —
> no error, no alert, no failing test. **Either set the listener protocol to
> HTTP, or empirically prove rule-set injection works on HTTP2 first.** Treat
> this as a hard gate on the DNS cutover, not a soft check.

## Steps

1. **Establish the co-tenant's and our own subdomains' dependencies.** FOUNDER.
   Which hostnames resolve to 145.241.105.239, which are proxied, and which
   renew via Traefik ACME HTTP-01 on port 80. **This governs whether the 30
   Cloudflare rules may ever be removed** — if the co-tenant depends on them,
   removing them takes a patient-data application offline. Note that
   `next.towardpcc.com` and `deploy.towardpcc.com` are ours and are also
   proxied.
2. **Snapshot everything.** AGENT. ✅ **Done 2026-07-29.** VCN, subnets, the
   security list with all 32 ingress rules, instances and (empty) load-balancer
   list, captured to the session scratchpad — deliberately outside the repo,
   since it is infrastructure state rather than source.

   Recorded here so the numbers can be checked without opening the files: **32
   ingress rules — 15 × port 80 and 15 × port 443 from Cloudflare's ranges, one
   SSH, one ICMP.** Zero load balancers exist today. Every rollback below is
   "restore the recorded prior value", and without a byte-exact baseline that
   becomes a guess, under pressure, on a host that also runs a clinical
   application.

3. **Client-IP trust boundary.** AGENT. ✅ Done — see above.
4. **NSG** admitting the app port from the LB subnet only, attached to
   hosting-1's VNIC. Additive to the shared security list, so the co-tenant is
   untouched.
5. **Obtain the Let's Encrypt certificate via DNS-01** and import it. No DNS
   change to the A records; no impact on live traffic.

   **This is the current blocker for staging.** DNS-01 proves control of the
   domain by writing a `_acme-challenge` TXT record, which needs a Cloudflare
   API token with `Zone:DNS:Edit` on this zone. None exists yet. Everything from
   step 4 onward waits on it — the load balancer cannot terminate TLS without a
   certificate, and without terminating TLS it cannot carry the WAF, because an
   OCI regional WAF attaches only to an HTTP/HTTPS listener.

6. **Create the LB** (flexible, 10 Mbps), **an HTTPS/443 listener** and **an
   HTTP/80 listener with a redirect rule**, backend set pointing at
   10.0.1.71, health check against the app's health endpoint.
7. **Attach the WAF policy** and the `x-via-edge` rule set. Prove injection
   works before proceeding (see the gate above).
8. **Test end-to-end against the LB's IP while Cloudflare still serves**, with
   `curl --resolve`. Confirm, at minimum: 200 on every public route; `308` apex
   → www (`proxy.ts` matches on exact `Host`, so this proves the Host header
   survives); the admin session cookie is still `__Secure-authjs.session-token`
   with `Secure` set (`auth.ts` sets `trustHost: true` with no explicit cookie
   config, so it derives this from `X-Forwarded-Proto`); a rate-limit test from
   two source addresses lands in two buckets, not one; and
   `curl -sI http://<LB>/` returns 301.
9. **Cut DNS over in a single edit**: grey-cloud + repoint + TTL 60, together.
   **Do not try to lower the TTL in advance** — proxied Cloudflare records are
   pinned to Auto (300s) and the field is not editable while the orange cloud is
   on. So expect **up to ~5 minutes** during which resolvers still hand out
   Cloudflare anycast for a hostname Cloudflare no longer proxies. Low-traffic
   window; verify from several public resolvers.
10. **Narrow the old ingress last** — and only if step 1 established that
    nothing else depends on it. The 30 Cloudflare rules stay until then.

## Rollback

Up to step 8, nothing user-visible has changed: delete the LB and the NSG. After
step 9, revert the DNS edit — bounded by the 60s TTL you set in that same edit.

One asymmetry to plan for: removing the domains from the Coolify app deletes
Traefik's routers for them, so Traefik stops renewing that certificate, and
after cutover it could not renew anyway (the ACME HTTP-01 challenge would be
answered by the LB). **The Traefik-side rollback window is bounded by the
existing certificate's expiry**, not by choice. Leave the Coolify domains in
place until you are confident, and note the expiry date before you remove them.

## Cost

Flexible LB: $0.0113/hour per instance + $0.0001 per Mbps-hour → **~$9/month at
10 Mbps, or $0** if the first-load-balancer allowance applies. There is **no
per-GB data-processing charge** in Oracle's model. WAF: first instance and 10M
requests/month free; then $5/month per instance and $0.60 per million requests.
