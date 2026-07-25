import { defineConfig } from "vitest/config";

// Node-environment unit tests for apps/web (currently the TM-001 privacy-
// invariant static guard). Component/e2e tests are added in P3.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
