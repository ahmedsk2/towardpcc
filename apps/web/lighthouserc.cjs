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
        /*
         * THE NUMBER HERE IS BORROWED FROM A DIFFERENT MEASUREMENT, and cannot
         * be met. 174080 is 170 KB — the GZIPPED per-route budget enforced by
         * scripts/check-bundle-budget.mjs, which every route currently passes.
         * This assertion counts UNCOMPRESSED transfer bytes of ALL scripts on
         * the page: measured 180,740 on `/` and 310,566 on every calculator
         * route, 2026-08-07. The two were never the same quantity, so this has
         * warned since the day it was written and will warn forever.
         *
         * Left in place rather than deleted because the trend is worth watching,
         * but do NOT flip it to error against this number, and do not "fix" the
         * routes to satisfy it — they already satisfy the budget that matters.
         * Re-set it against what Lighthouse actually reports, or drop it and let
         * check-bundle-budget.mjs be the single JS-size authority.
         */
        "resource-summary:script:size": ["warn", { maxNumericValue: 174080 }],

        // ERROR, as of 2026-08-03. Every one of the nine routes now measures
        // 0.000 after the move to next/font with metric-matched fallbacks and
        // display:"optional", so there is a full 0.1 of headroom. This is the
        // one budget the site currently earns, and the regression it guards
        // against — a font or a late-inserted element reflowing a long form —
        // is invisible in review and only shows on the longest page.
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],

        /*
         * MEASURED ACROSS ALL NINE ROUTES, 2026-08-07 (CI run 92842902929).
         * Recorded here so the next person argues with numbers rather than
         * with the budget:
         *
         *   route                   perf    LCP    TTI   script bytes
         *   /                       0.88   2888   4027        180,740
         *   /calculators            0.86   3061   4479        310,566
         *   /calculators/anion-gap    ok   2913   3666        310,566
         *   /calculators/prism        ok     ok   3680        310,566
         *   /calculators/phoenix      ok   2941   3629        310,566
         *   /trust                    ok   3053   3061             ok
         *   /validation               ok   2653   3062             ok
         *   /services                 ok   3154   3347             ok
         *   /knowledge                ok   2579   3187             ok
         *
         * LCP misses by 3-26%; it is network-bound, not main-thread bound (TBT
         * is 23-60ms everywhere), and the largest single item is that the home
         * document inlines the hero mesh geometry twice.
         *
         * TTI is the outlier: 1.5-2.2x over on EVERY route, including static
         * content pages with almost no interactivity. A target nothing can
         * approach is not calibration, it is decoration — and this one has never
         * been within reach on any route since it was written. Either it moves
         * to something a React app on Lighthouse's throttled 4G can actually
         * hit, or it goes.
         *
         * These stay `warn` deliberately. A gate nobody can pass gets ignored,
         * and then it protects nothing — which is precisely the failure this
         * project spent 2026-08-07 fixing in the integrity canary.
         */
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
