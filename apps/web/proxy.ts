import { NextResponse, type NextRequest } from "next/server";
import { APEX_HOST, CANONICAL_HOST } from "@/lib/site-url";

/**
 * Canonical host. The apex and www both answered 200 with no redirect and no
 * canonical tag — the same content on two origins, with nothing telling a
 * crawler which one counts.
 *
 * It happens here rather than at the edge because a Traefik middleware would
 * have blast radius across a host shared with an unrelated production service,
 * whereas this is isolated, version-controlled and covered by a test.
 *
 * An earlier version of this comment gave a second reason — "Cloudflare is
 * DNS-only for this zone, so a Cloudflare redirect rule never fires". That is
 * false: the zone is proxied and always has been. A Cloudflare redirect rule
 * WOULD fire, so the choice to handle it here is a preference for blast radius
 * and testability, not a constraint. Recorded rather than quietly deleted
 * because the same wrong belief is what put "proxying is off" into the deploy
 * runbook.
 *
 * The host is matched EXACTLY, never as a suffix. A suffix match would also
 * catch `next.towardpcc.com` — the noindexed preview — and redirect the
 * preview environment onto production, which is precisely the accident this
 * kind of rule usually causes.
 */
function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host");
  if (host !== APEX_HOST) return null;

  const url = request.nextUrl.clone();
  url.host = CANONICAL_HOST;
  url.protocol = "https";
  url.port = "";
  // 308 rather than 301: it forbids a client from rewriting the method, so a
  // POST to the apex stays a POST instead of silently becoming a GET.
  return NextResponse.redirect(url, 308);
}

/**
 * Security headers (PRD §9 / threat-model TM-005). Two-tier CSP, documented in
 * docs/decisions/ADR-security-headers.md:
 *
 *  - Public pages are statically prerendered (SSG) for the perf budget and ship
 *    per-page inline __next_f scripts that can't carry a per-request nonce, so
 *    they use `script-src 'self' 'unsafe-inline'` — acceptable because they
 *    render no user-controlled content (no injection surface).
 *  - `/admin` is dynamically rendered and renders submitted content, so it gets
 *    the strict `script-src 'self' 'nonce-…' 'strict-dynamic'` policy (no
 *    unsafe-inline) — Next injects the nonce into its scripts on dynamic pages.
 *
 * All other directives are locked down in both tiers. dev only adds
 * 'unsafe-eval' + ws: for HMR; production gets neither.
 */
function buildCsp(nonce?: string): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = (
    nonce
      ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", dev ? "'unsafe-eval'" : ""]
      : ["'self'", "'unsafe-inline'", dev ? "'unsafe-eval'" : ""]
  )
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", dev ? "ws:" : ""].filter(Boolean).join(" ");

  /**
   * SPC-WEB-002 — styles, tightened on the admin tier only, and only as far as
   * the framework allows.
   *
   * `style-src` STAYS as it was, deliberately. It is the fallback any browser
   * without `style-src-elem`/`-attr` support uses, so leaving it permissive
   * keeps those browsers exactly where they were rather than breaking them.
   * Browsers that DO support the split ignore `style-src` entirely and take the
   * two below.
   *
   * The split matters because the two halves are not equally fixable. A
   * `<style>` ELEMENT can carry a nonce; a `style="…"` ATTRIBUTE cannot — there
   * is no way to nonce an attribute — so `'unsafe-inline'` is the only thing
   * that permits one.
   *
   * Measured on the built admin pages rather than assumed: login, inbox,
   * submission detail and settings emit ONE `<style>` element each and, between
   * them, exactly ONE style attribute (`position: absolute;` on the inbox,
   * injected by Next, not by this codebase — there is no `style={{ }}` anywhere
   * under `app/admin`). The public home page, for contrast, carries 46 of them.
   *
   * So the admin tier gets a nonce on elements and keeps `'unsafe-inline'` on
   * attributes. That closes the half that actually matters here: the admin is
   * the only tier that renders submitted content, and an injected `<style>`
   * block is the shape with real reach — attribute injection needs control of a
   * tag this codebase never builds from user input.
   *
   * The public tier is left alone. Its 46 attributes are ours (staggered
   * animation delays), it renders no user content, and the reasoning for its
   * script policy applies here too — see ADR-csp-public-tier.
   */
  const styleDirectives = nonce
    ? [`style-src-elem 'self' 'nonce-${nonce}'`, `style-src-attr 'unsafe-inline'`]
    : [];

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    ...styleDirectives,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `media-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // Before anything else: a request on the wrong host should not be served at
  // all, only pointed at the right one.
  const redirect = canonicalHostRedirect(request);
  if (redirect) return redirect;

  const isAdmin = request.nextUrl.pathname.startsWith("/admin");

  if (isAdmin) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const nonce = btoa(String.fromCharCode(...bytes));
    const csp = buildCsp(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp); // Next reads the nonce from here
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const response = NextResponse.next({ request });
  response.headers.set("Content-Security-Policy", buildCsp());
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|sw.js|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
