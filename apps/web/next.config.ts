import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Standalone output is only for the Docker production image (it copies
  // .next/standalone and runs server.js). Everywhere else — CI build checks,
  // Playwright e2e, local `next start` — a normal build is used so `next start`
  // works without the standalone warning. The Docker build opts in via the env.
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  transpilePackages: ["@towardpcc/ui", "@towardpcc/scoring-engine"],
  // Static security headers (PRD §9). The per-request nonce CSP lives in
  // proxy.ts; these are the constant ones, applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=(), payment=(), usb=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        /**
         * The authenticated surfaces get two headers the public pages do not
         * (SPC-WEB-006, SPC-WEB-007).
         *
         * `no-store` because these responses render submission PII — a
         * clinician's name, address and message. The pages are already
         * `dynamic = "force-dynamic"`, so Next does not cache them, but that
         * governs Next's own cache and says nothing to a corporate proxy or a
         * browser's back-forward cache. On a shared ward machine that is the
         * difference between a colleague seeing an enquiry and not.
         *
         * `Cross-Origin-Resource-Policy: same-origin` blocks another origin
         * from embedding these responses as a subresource, which is the
         * Spectre-class leak COOP alone does not close. Scoped here rather than
         * site-wide deliberately: on the public pages it would buy nothing and
         * could interfere with legitimate embedding of a calculator page.
         */
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

// PWA (PRD §6.5): the calculator catalog is precached and works fully offline.
// Serwist requires webpack (`next build --webpack`). In dev we run Turbopack,
// which errors on a stray webpack config — so the wrapper is applied only for
// the production build and dev stays a pure Turbopack config (no SW needed
// there; HMR is unaffected).
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Deliberately OFF. Serwist would reload the page on every `online` event,
  // and hospital wifi bounces constantly — that reload can land mid-entry and
  // throw away a clinician's half-typed values. This app is built to work
  // offline, so regaining connectivity should change nothing on screen.
  reloadOnOnline: false,
});

export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);
