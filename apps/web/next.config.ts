import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@towardpcc/ui", "@towardpcc/scoring-engine"],
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
