/**
 * Resolving the real client IP behind the production proxy chain.
 *
 * The chain is: visitor → Cloudflare edge → Traefik → app.
 *
 * Coolify's Traefik has no `forwardedHeaders.trustedIPs` configured, so it
 * discards inbound `X-Forwarded-*` headers and rewrites them from the
 * connecting peer. With Cloudflare in front, that peer is a Cloudflare edge
 * node — so `x-real-ip` is a Cloudflare address for *every* visitor. Relying on
 * it collapsed the whole internet onto a handful of buckets: submission rate
 * limiting became per-edge rather than per-visitor (one abuser could exhaust
 * the allowance for everyone routed through that node), and the salted hash
 * kept for abuse investigation recorded Cloudflare instead of the submitter.
 *
 * `cf-connecting-ip` is the only header carrying the actual visitor.
 *
 * WHY TRUSTING IT IS SAFE HERE — AND WHAT THAT DEPENDS ON.
 *
 * Trusting a client-supplied header is normally CWE-348, which is exactly why
 * the fallback below refuses the leftmost `x-forwarded-for` hop. The reason
 * this one is different is not the header, it is the network:
 *
 *   The OCI security list for `hosting-vcn` admits ports 80 and 443 ONLY from
 *   Cloudflare's published edge ranges (each rule labelled "Cloudflare edge").
 *   Nothing else can open a web connection to the origin at all, so a request
 *   arriving here provably came through Cloudflare, which overwrites
 *   `cf-connecting-ip` on every request it forwards.
 *
 * That makes this a DEPENDENCY, not an invariant. If those ingress rules are
 * ever widened to 0.0.0.0/0, an attacker could reach the origin directly and
 * set this header freely, turning it into a trivial rate-limit bypass. Opening
 * those ports means revisiting this file. See
 * docs/runbooks/deploy-production.md, which documents the same coupling from
 * the infrastructure side.
 *
 * Deliberately NOT validating the peer against Cloudflare's IP ranges in
 * application code: those ranges change, a stale hardcoded copy would start
 * rejecting legitimate traffic, and the firewall is the authoritative
 * enforcement point. Duplicating it here would add a second thing to keep in
 * step without adding protection.
 */
export function resolveClientIp(headers: Headers): string {
  // Cloudflare sets this on every proxied request, overwriting anything the
  // client sent. Present in production; absent locally and on direct origin
  // access, which is why the fallbacks below still matter.
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  // Set by our own reverse proxy to the address it observed.
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // RIGHTMOST, never the leftmost: the last hop is the address our own proxy
    // saw, while the first is whatever the caller chose to send (CWE-348).
    if (hops.length) return hops[hops.length - 1]!;
  }

  // Better a single shared bucket than a crash — a request we cannot attribute
  // is still rate limited, just not individually.
  return "unknown";
}
