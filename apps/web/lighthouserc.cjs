/**
 * Lighthouse CI budgets for the calculator pages (PRD §10, "hard limits,
 * CI-checked"). Runs against the production build under Lighthouse's default
 * mid-tier-mobile + throttled profile.
 *
 * It cannot own the route-JS budget: Lighthouse's resource-summary reports the
 * over-the-wire transfer size, which depends on server compression, so it can't
 * enforce a budget stated in *gzipped* bytes. The hard JS-size gate is instead
 * the deterministic scripts/check-bundle-budget.mjs (run in CI's quality job),
 * which gzips exactly what a modern browser fetches.
 *
 * READ THE DOCUMENT NUMBERS WITH CARE: `next start` serves **gzip**, production
 * serves **brotli** (confirmed: `content-encoding: br` from the live origin).
 * On the home page that is 137,524 bytes here against 76,309 in production —
 * roughly 62 KB, or ~376 ms of the simulated-4G window, that exists only in
 * this harness. Home's production-equivalent LCP is about 3.28 s where this
 * config will report ~3.66 s. Font bytes are unaffected (woff2 is already
 * compressed), and the JS budget is measured elsewhere, so only the DOCUMENT
 * figures carry this distortion — but they are the ones the home page lives or
 * dies on, so do not quote them as production numbers.
 *
 * Everything here `warn`s: the first CI runs surface real runtime numbers on
 * consistent hardware (they're meaningless on this emulated ARM64 dev box), and
 * they can flip to `error` once calibrated. First observed CI values: CLS 0.128
 * (>0.1 — font-swap from @fontsource, not next/font's size-adjusted fallbacks;
 * a known follow-up), LCP/TTI ~3.5 s under simulated-4G (harsher than the PRD's
 * "4G"). Authority for these budgets stays PRD §10 (CLS ≤ 0.1, LCP ≤ 2.5 s,
 * interactive ≤ 2 s on 4G).
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 90000,
      // The nine routes the 2026-08-03 sweep measured. Two URLs could not have
      // caught the worst regression on the site: PRISM sat at CLS 0.405 while
      // /calculators and anion-gap, the only routes checked here, were at 0.056
      // and 0.004. Layout shift scales with how much content a reflow moves, so
      // the longest page has to be in the list or the gate is blind to it.
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/calculators",
        "http://localhost:3000/calculators/anion-gap",
        "http://localhost:3000/calculators/prism",
        "http://localhost:3000/calculators/phoenix",
        "http://localhost:3000/trust",
        "http://localhost:3000/validation",
        "http://localhost:3000/services",
        "http://localhost:3000/knowledge",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // The hard gzipped JS-size gate lives in scripts/check-bundle-budget.mjs;
        // this only reports transfer size.
        "resource-summary:script:size": ["warn", { maxNumericValue: 174080 }],

        // ERROR, as of 2026-08-03. Every one of the nine routes now measures
        // 0.000 after the move to next/font with metric-matched fallbacks and
        // display:"optional", so there is a full 0.1 of headroom. This is the
        // one budget the site currently earns, and the regression it guards
        // against — a font or a late-inserted element reflowing a long form —
        // is invisible in review and only shows on the longest page.
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],

        // Still warn. Measured 2545-3655ms across the nine routes; the budget is
        // 2500. It is network-bound, not main-thread bound (TBT is 23-60ms
        // everywhere), and the largest single item is that the home document
        // inlines the hero mesh geometry twice. Flip to error once that lands
        // and the numbers actually clear — a gate nobody can pass gets ignored,
        // and then it protects nothing.
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        interactive: ["warn", { maxNumericValue: 2000 }],
        "categories:performance": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      // Reports stay local — never published to Lighthouse's public storage.
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
