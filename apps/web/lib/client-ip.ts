/**
 * Resolving the real client IP behind the production proxy chain.
 *
 * There are TWO chains during the KSA migration (ADR-0004), and this file has
 * to be correct on both simultaneously — not switched between them — because
 * they run in parallel for as long as the cutover takes, and because
 * `next.towardpcc.com` stays behind Cloudflare after `www` has moved.
 *
 *   A. visitor → Cloudflare edge → Traefik → app        (today, and preview)
 *   B. visitor → OCI load balancer → app                (after the cutover)
 *
 * WHY A HEADER IS TRUSTED AT ALL
 *
 * Coolify's Traefik has no `forwardedHeaders.trustedIPs`, so it discards
 * inbound `X-Forwarded-*` and rewrites them from the connecting peer. With
 * Cloudflare in front that peer is a Cloudflare edge node, so `x-real-ip` is a
 * Cloudflare address for *every* visitor. Relying on it collapsed the whole
 * internet onto a handful of buckets: rate limiting became per-edge rather than
 * per-visitor, and the salted hash kept for abuse investigation recorded
 * Cloudflare instead of the submitter.
 *
 * CHAIN A — `cf-connecting-ip`, safe because of the network, not the header
 *
 * Trusting a client-supplied header is normally CWE-348. What makes this one
 * different is the firewall: the OCI security list admits 80/443 ONLY from
 * Cloudflare's published edge ranges, so a request arriving here provably came
 * through Cloudflare, which overwrites `cf-connecting-ip` on every request.
 *
 * That is a DEPENDENCY, not an invariant, and the migration removes it.
 *
 * CHAIN B — rightmost XFF, and why `cf-connecting-ip` must NOT be consulted
 *
 * The OCI load balancer does not strip `cf-connecting-ip`. So the moment it has
 * a live backend, any client on the internet can set that header and be
 * believed — the exact rate-limit bypass and poisoned forensic hash the
 * firewall was preventing. It is not enough to demote it below XFF; on chain B
 * it must not be read at all.
 *
 * Oracle documents that the LB APPENDS the peer address to any client-supplied
 * `X-Forwarded-For`, and that its injected headers cannot be removed or altered
 * by a rule set. With exactly one trusted proxy, the trustworthy value is
 * therefore the RIGHTMOST hop. Everything to its left is caller-controlled.
 *
 * TELLING THE CHAINS APART
 *
 * By a secret the load balancer injects via a rule set, never by anything a
 * client can assert. A request is on chain B only if it presents
 * `x-via-edge` matching `EDGE_SHARED_SECRET`. Absent or wrong, it falls through
 * to chain A unchanged — so preview keeps working, and an attacker who guesses
 * the header name but not its value gains nothing.
 *
 * If `EDGE_SHARED_SECRET` is unset, chain B is unreachable by construction.
 * That is deliberate: this ships before the load balancer exists, and an
 * unconfigured secret must never mean "trust everyone".
 */

/**
 * How many proxies at the right-hand end of `x-forwarded-for` are ours on
 * chain B. Exactly one: the OCI load balancer. Named rather than inlined
 * because if a second in-region hop is ever added, this is the number that has
 * to change, and a bare `- 1` in an index expression does not announce itself.
 */
const TRUSTED_PROXY_HOPS = 1;

/**
 * Rejects anything that is not an IP literal.
 *
 * The rightmost XFF hop is only trustworthy if the load balancer actually
 * appended it. If it did not — a misconfigured listener, a rule set that
 * silently did not apply — the rightmost value is whatever the caller sent,
 * and it will usually not be a valid address. This does not make forgery
 * impossible, but it stops a malformed or injected value from being stored as
 * though it were an address.
 */
function isIpLiteral(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((o) => Number(o) <= 255);
  }
  // Deliberately loose on IPv6: hex groups and colons, optional zone/port-free.
  return /^[0-9a-fA-F:]+$/.test(value) && value.includes(":");
}

function rightmostHop(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return undefined;
  const hops = xff
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hop = hops[hops.length - TRUSTED_PROXY_HOPS];
  return hop && isIpLiteral(hop) ? hop : undefined;
}

/**
 * True only when the request carries the load balancer's injected secret.
 *
 * The header is compared against every comma-separated value rather than the
 * whole string: the Fetch API joins duplicate headers with ", ", so a client
 * that also sends `x-via-edge` would otherwise turn the LB's value into
 * `forged, real` and defeat a naive equality check.
 */
function isFromRegionalEdge(headers: Headers): boolean {
  const secret = process.env.EDGE_SHARED_SECRET?.trim();
  if (!secret) return false;
  const header = headers.get("x-via-edge");
  if (!header) return false;
  return header.split(",").some((v) => v.trim() === secret);
}

export function resolveClientIp(headers: Headers): string {
  if (isFromRegionalEdge(headers)) {
    // Chain B. `cf-connecting-ip` and `x-real-ip` are NOT consulted here — both
    // are forgeable once the origin is reachable without passing Cloudflare.
    return rightmostHop(headers) ?? "unknown";
  }

  // Chain A, unchanged. Cloudflare sets this on every proxied request,
  // overwriting anything the client sent. Absent locally and on direct origin
  // access, which is why the fallbacks below still matter.
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  // Set by our own reverse proxy to the address it observed.
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  // RIGHTMOST, never the leftmost: the last hop is the address our own proxy
  // saw, while the first is whatever the caller chose to send (CWE-348).
  const hop = rightmostHop(headers);
  if (hop) return hop;

  // Better a single shared bucket than a crash — a request we cannot attribute
  // is still rate limited, just not individually.
  return "unknown";
}
