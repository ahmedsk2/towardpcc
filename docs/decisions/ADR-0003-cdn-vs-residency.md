# ADR-0003 — Cloudflare in front of the origin, and what that costs the residency claim

**Status:** accepted, 2026-07-27
**Supersedes:** the preference recorded in the threat model (§2.5, D-row) for
"origin-side rate limiting + KSA-provider DDoS protection"
**Related:** threat-model TM-006 / TM-006a, `docs/runbooks/deploy-production.md`

## Context

The threat model, written 2026-07-24, flagged this exact trade-off before it
happened:

> Note the tension: fronting with a global CDN/WAF would terminate TLS and see
> form PII **outside KSA** — contradicts §8.3. Prefer origin-side rate limiting
> (Caddy) and KSA-provider DDoS protection; write the tradeoff into an ADR
> (**TM-006**).

That ADR was never written. The infrastructure went the other way anyway:
Cloudflare proxies both hostnames, and the OCI security list for `hosting-vcn`
now admits ports 80 and 443 **only** from Cloudflare's published edge ranges.
The origin is locked to the CDN.

So the decision had already been made in practice, by configuration, without
being recorded or reasoned about. This ADR records it deliberately rather than
leaving it implicit.

## Decision

**Keep Cloudflare in front, and correct the public wording instead.**

## Why not the alternative

Removing Cloudflare is not a configuration toggle. Because the origin is
firewalled to Cloudflare's ranges, turning off the orange cloud points every
visitor at a host that drops them — a full outage — and breaks ACME HTTP-01
renewal, which reaches port 80 only through the edge. Reversing this means
re-opening the firewall first, then accepting a bare origin IP with no DDoS
layer in front of a single small VM.

The threat model's preferred alternative — "KSA-provider DDoS protection" —
does not currently exist in the stack, and standing one up is a larger project
than the exposure warrants for a mostly-static site.

## What it actually costs

Precision matters here, because the honest answer is narrower than "we lost
data residency":

- **Data at rest is still in Saudi Arabia.** The database is on OCI
  `me-riyadh-1`. That claim was true before and remains true.
- **Data in transit may be processed outside the Kingdom.** Cloudflare
  terminates TLS, so `/contact` and `/services` submissions — name, email,
  institution, free-text message — pass through an edge node before reaching
  the origin. Edge selection is by proximity, so a submitter outside the Gulf
  is served outside the Gulf. The zone is on the **Free** plan, which carries
  no data-localization guarantee.
- **Calculators are unaffected.** They compute client-side and transmit
  nothing (TM-001), so the flagship feature's privacy guarantee is untouched.
  This is the part of the promise that matters most clinically, and it does
  not depend on where anything is hosted.

## Consequences

1. `/legal/data-protection` now states plainly that requests travel through a
   global CDN and may be processed outside the Kingdom in transit, while
   storage remains in Saudi Arabia. Overstating residency would be worse than
   the exposure itself: the site's whole trust posture rests on not claiming
   more than is true.
2. Cloudflare is disclosed as a sub-processor alongside Oracle Cloud and the
   mail relay.
3. Mail delivery is deliberately kept in-region (OCI Email Delivery,
   `me-riyadh-1`) rather than a US/EU relay, so this does not widen further.
   See `docs/runbooks/email-delivery.md`.
4. The origin lock became a load-bearing security control: it is what makes
   trusting `CF-Connecting-IP` safe in `apps/web/lib/client-ip.ts`. Widening
   those ingress rules re-opens CWE-348.
5. Cloudflare injects an analytics beacon at the edge. Our CSP blocks it and
   it appears zero times in origin HTML, so no third-party script executes —
   but it logs a CSP violation per page load.

## Revisit if

- The registry moves beyond single-unit pilot into holding patient-adjacent
  data. That data must not traverse a global edge, and the registry may need a
  separate origin that is not CDN-fronted.
- A participating institution's governance requires in-country processing, not
  merely in-country storage. Cloudflare's Data Localization Suite is a paid
  add-on that can constrain this; it is not on the Free plan.
- The counsel review of the legal pages reaches a different conclusion about
  how PDPL treats transit-only processing. That review is still outstanding
  (`TODO:counsel-review`), and this ADR is an engineering judgement, not a
  legal opinion.
