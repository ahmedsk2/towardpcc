# ADR-0004 — All processing inside Saudi Arabia, and what that costs

**Status:** accepted, 2026-07-28
**Supersedes:** ADR-0003's core decision (accept Cloudflare and qualify the
residency claim). ADR-0003's _analysis_ stands and is worth reading; its
conclusion is reversed.
**Related:** threat-model TM-006 / TM-006a / TM-008, `docs/runbooks/email-delivery.md`,
`docs/runbooks/deploy-production.md`

## Context

ADR-0003 accepted, one day earlier, that TLS terminates at a Cloudflare edge
and softened the public wording to "may be processed outside KSA". Its own
"Revisit if" clause named this trigger: a founder decision that residency must
be unqualified. That decision has now been made.

A 13-agent audit re-derived the whole picture from live infrastructure rather
than from documents. Three of its findings changed the answer:

**Cloudflare cannot satisfy the requirement at any price.** This is the load-
bearing fact and it was not known when ADR-0003 was written. Cloudflare does
sell Regional Services with a Saudi Arabia region and exactly the right
guarantee for TLS termination. But **Customer Metadata Boundary — which governs
Cloudflare's own logs, including visitor IP addresses — supports only EU or US.
There is no Saudi option**, and it is configured separately from Regional
Services. So even on an Enterprise contract, visitor IPs, which are personal
data under PDPL, land outside the Kingdom. The expensive option does not work.

**Where the traffic goes today is better than ADR-0003 assumed, and that is not
the point.** Live checks return `colo=DMM` — Cloudflare's Dammam PoP. For a
visitor inside Saudi Arabia, which is most of the audience, TLS already
terminates in-country. But edge selection is by proximity, so a submitter in
Europe is served in Europe, and the Free plan offers no control or attestation.
It fails _confirmable_ even where it happens to be in-country. A residency claim
that is accidentally true is not a residency claim.

**Outbound mail to a recipient-chosen mailbox leaves KSA by construction.**
Changing the relay controls where a message is submitted, never where it is
delivered. No architecture fixes this; only not sending it does.

## Decision

**1. Scope.** "Inside KSA" means no plaintext personal data **and no metadata**
— visitor IPs, request URLs, vendor logs — processed outside the Kingdom, for
everything the platform controls. Two carve-outs, written down rather than
hidden:

- outbound mail delivered to a mailbox the recipient chose;
- infrastructure that handles no personal data: GitHub and CI, Let's Encrypt
  and CT logs, npm and container registries, the domain registrar.

The rejected alternatives are recorded because both are tempting. _Plaintext
only_ would have let Cloudflare Enterprise qualify — it is the scope that makes
the expensive option viable, which is a reason to be suspicious of it.
_Absolutely everything_, including DNS resolution and CT logs, is not achievable
by anyone; committing to it publicly would itself be a false claim, which is the
failure this project cares most about avoiding.

**2. The edge.** Replace Cloudflare's data path with an **OCI Flexible Load
Balancer + OCI regional WAF in me-riyadh-1**. Same tenancy, same region, and —
the deciding property — confirmable by API rather than by a vendor's policy
page. Roughly $18/month for the LB; the first WAF instance and 10M requests a
month are free. Cloudflare may remain the authoritative DNS (it handles no
personal data) or move; that is a separate, later question.

**3. The submitter acknowledgement is removed.** It was the single path that
made an unqualified claim impossible. The admin inbox becomes the only
notification channel. This is a real loss — a clinician who writes in gets no
automated confirmation — and it is accepted because the acknowledgement was a
courtesy rather than a function, and because a caveat on the privacy page costs
more trust than a missing auto-reply.

**4. `ADMIN_EMAIL` stays `ahmedsk2@gmail.com` for now**, as a written, accepted
exception. The notification body carries no submitter data — only a type label
and a link into the admin inbox — so what reaches Google is the fact that a
submission of some type arrived, and when. Revisit alongside the inbound-MX
question.

## Consequences

1. **The public residency claim can become unqualified once the edge moves —
   and not one day before.** The wording changes in the same deploy as the DNS
   cutover, never ahead of it.
2. **The origin lock stops being a security control, so `client-ip.ts` must
   change first.** It trusts `cf-connecting-ip` first and unconditionally, which
   is safe only because the OCI security list admits Cloudflare's ranges alone.
   Widen ingress before that code changes and the header becomes attacker-
   settable: rate-limit bypass and poisoned abuse-investigation hashes
   (CWE-348). **The code change lands before or with the firewall change.**
3. **A co-tenant is affected and this is not solely our decision.** The VCN has
   one subnet using one security list, and the host runs another live
   application holding real patient data. Any ingress change touches their
   exposure. Their owner agrees before anything moves.
4. **DDoS and bot mitigation change hands.** OCI provides always-on L3/L4
   protection and a regional WAF; Cloudflare's L7 protection and bot management
   are lost. Static-asset edge caching is lost too — but less than feared, since
   HTML is already `cf-cache-status: DYNAMIC` and served from origin on every
   request.
5. **Outbound mail moves to OCI Email Delivery in me-riyadh-1.** The brief
   towardpicu.com decision (2026-07-28, same day) is reversed before it ever
   sent a message — that relay is Google Cloud and dnssmarthost, outside KSA.
   **Do not widen towardpcc.com's SPF to accommodate it.** SPF is evaluated
   against the envelope MAIL FROM, which for OCI's default return path is an
   Oracle-owned domain, so the apex record is never consulted; DKIM alignment is
   what earns the DMARC pass under `adkim=s`. `v=spf1 -all` stays exactly as it
   is, which is strictly safer than widening it.
6. **Inbound mail is now the sharpest open contradiction.** `towardpcc.com`'s MX
   points at SiteGround's SpamExperts filter on Google Cloud, which reads every
   message sent to `info@towardpcc.com` — the address the privacy page names for
   deletion requests. Fixing it needs a KSA mail host that does not yet exist in
   the stack. Tracked, not yet solved.
7. **"Confirmable" must mean checked, not asserted.** A published data-flow map
   alone reproduces the exact pattern that produced every false claim this audit
   found: a fact true when written, infrastructure that changed underneath it,
   and nothing connecting the two. The deliverable is a recurring automated
   check that fails loudly when any path drifts out of region — the TLS
   terminator, the MX, the tenancy's region subscriptions, backup replication.
8. **The tenancy's single-region subscription is state, not a control.** An
   administrator can subscribe to a second region in one click, and OCI never
   permits unsubscribing. Until an IAM policy or quota backs it, the honest
   phrasing is "nothing is deployed outside KSA", not "nothing can be".

## Revisit if

The co-tenant's owner declines the ingress change; OCI WAF proves inadequate
against a real L7 attack; Cloudflare ships a Saudi Customer Metadata Boundary
region (which would reopen option (c) on its merits); or a KSA-hosted mail
provider is adopted, which would let consequences 4 and 6 close together.
