import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers (PRD §9 / threat-model TM-005: CSP ships WITH P5).
 *
 * CSP script policy — the honest constraint: the public pages are statically
 * prerendered (SSG) for the perf budget, and every static Next page ships ~17
 * inline `__next_f` RSC-payload scripts whose content differs per page. A
 * per-request nonce can't be baked into prerendered HTML, and hashing per-page
 * inline payloads isn't maintainable — so static pages use `'unsafe-inline'`
 * for scripts. This is an acceptable, bounded trade-off because these pages
 * render NO user-controlled content (calculators compute client-side; the rest
 * is fixed marketing copy), so there is no injection surface here. Every OTHER
 * directive stays strict (object-src/base-uri/frame-ancestors locked down, no
 * eval in prod), and the high-risk surface — `/admin`, which renders submitted
 * content — will move to a strict nonce+`strict-dynamic` policy when it is built
 * (it is dynamically rendered, so the nonce works there). See
 * docs/decisions/ADR-security-headers.md.
 *
 * Documented carve-outs, minimal:
 *  - style-src 'unsafe-inline': React sets a few inline style attributes.
 *  - The R3F hero needs no extra CSP (three.js compiles GLSL on the GPU, not via
 *    eval; adds no host connections) — it runs under default-src 'self'.
 *  - dev only: 'unsafe-eval' + ws: keep Turbopack/React-Refresh HMR working.
 */
function buildCsp(): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = ["'self'", "'unsafe-inline'", dev ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", dev ? "ws:" : ""].filter(Boolean).join(" ");

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
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
  const response = NextResponse.next({ request });
  response.headers.set("Content-Security-Policy", buildCsp());
  return response;
}

export const config = {
  // Documents only — not static assets or the image optimizer.
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
