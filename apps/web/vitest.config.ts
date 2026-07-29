import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node-environment unit tests for apps/web: the TM-001 privacy-invariant static
// guard, plus the security-critical crypto/rate-limit units (auth lockout, TOTP,
// Argon2id, recovery codes, submission rate limiter).
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Server modules under test start with `import "server-only"`, which throws
    // outside an RSC boundary. Alias it to a no-op so the real modules can be
    // imported and exercised in Node. Build/runtime are unaffected.
    alias: {
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
    // Coverage gate for the security-critical paths (PRD §9). Scoped to the
    // modules with dedicated unit tests so a regression in auth crypto or
    // rate-limiting fails CI — the calculators' 100% gate lives in the engine
    // package and must not be the only thing gated.
    coverage: {
      provider: "v8",
      include: [
        "lib/auth/lockout.ts",
        "lib/auth/totp.ts",
        "lib/auth/password.ts",
        "lib/rate-limit.ts",
        "lib/submission-guards.ts",
      ],
      thresholds: { lines: 100, functions: 100, branches: 90, statements: 100 },
    },
  },
});
