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
 * Rejects anything that is not an IP literal.
 *
 * A value is only trustworthy if a proxy we trust actually wrote it. If one did
 * not — a misconfigured listener, a rule set that silently failed to apply —
 * what arrives is whatever the caller sent, and it will usually not be a valid
 * address. This does not make forgery impossible; it stops a malformed or
 * injected value from being stored as though it were an address.
 */
function isIpLiteral(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((o) => Number(o) <= 255);
  }
  // Deliberately loose on IPv6: hex groups and colons, optional zone/port-free.
  return /^[0-9a-fA-F:]+$/.test(value) && value.includes(":");
}

/**
 * The client address on chain B, taken from `x-real-ip`.
 *
 * THIS WAS WRONG BEFORE, AND THE WAY IT WAS WRONG IS WORTH KEEPING.
 *
 * The first version counted one trusted hop from the right-hand end of
 * `x-forwarded-for`, reasoning that the load balancer appends the client and is
 * therefore last. Measured against the real chain on 2026-07-29, that is not
 * what arrives:
 *
 *     X-Forwarded-For: 203.0.113.99, 128.234.116.155, 10.0.1.45
 *                      ^client-forged ^the real client  ^the load balancer,
 *                                                        appended by Traefik
 *
 * There are TWO trusted proxies, not one — Traefik appends the load balancer's
 * address because it now trusts that subnet. So the old code would have
 * resolved every visitor on earth to `10.0.1.45`, which is precisely the
 * collapse the whole exercise existed to prevent, and it would have done so
 * silently.
 *
 * `x-real-ip` avoids counting hops at all. Traefik sets it to the address the
 * immediately-upstream trusted proxy vouched for, and — verified by sending a
 * forged one — **overwrites** any value the client supplies. The load balancer
 * likewise overwrites a forged `x-via-edge`. Both were tested against the
 * running system rather than reasoned about, because reasoning about it is what
 * produced the bug above.
 *
 * This is topology-dependent either way. The advantage of `x-real-ip` is that
 * inserting another in-region hop (an OCI WAF, say) changes the hop count but
 * not this.
 */
function edgeClientIp(headers: Headers): string | undefined {
  const value = headers.get("x-real-ip")?.trim();
  return value && isIpLiteral(value) ? value : undefined;
}

/**
 * The last hop in `x-forwarded-for`, used only on chain A.
 *
 * There the rightmost entry is what our own proxy observed, and the leftmost is
 * whatever the caller chose to send (CWE-348). Note this is the OPPOSITE
 * situation from chain B, where the rightmost is a proxy of ours rather than a
 * client — the two chains have different shapes and the same rule cannot serve
 * both. That difference is exactly what the earlier bug got wrong.
 */
function rightmostHop(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return undefined;
  const hops = xff
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return hops[hops.length - 1];
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
    // Chain B. `cf-connecting-ip` is NOT consulted here: the load balancer does
    // not strip it, so it is attacker-settable the moment the origin is
    // reachable without passing Cloudflare.
    //
    // `x-real-ip` IS consulted, which reverses an earlier comment saying it was
    // equally forgeable. On this path it is not — Traefik overwrites a
    // client-supplied value once it trusts the upstream, which was verified by
    // sending one. See edgeClientIp.
    return edgeClientIp(headers) ?? "unknown";
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
