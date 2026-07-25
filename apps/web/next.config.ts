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
  // middleware.ts; these are the constant ones, applied to every response.
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
  reloadOnOnline: true,
});

export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);
