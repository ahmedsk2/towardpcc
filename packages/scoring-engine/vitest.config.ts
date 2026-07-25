import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        // Dev-only test harness + its non-clinical fixture: infrastructure,
        // not shipped engine code (never in the package's public exports).
        // Its behavior is covered by src/testing/harness.test.ts. The 100%
        // line+branch gate (PRD §6.3.4) holds on all real compute code:
        // types, validation, define-score, interpretation, units, scores.
        "src/testing/**",
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
