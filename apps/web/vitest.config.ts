import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node-environment unit tests for apps/web: the TM-001 privacy-invariant static
// guard, plus the security-critical crypto/rate-limit units (auth lockout, TOTP,
// Argon2id, recovery codes, submission rate limiter).
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    /**
     * `**` on the node_modules pattern, not a bare `node_modules/**`.
     *
     * The anchored form only excluded `apps/web/node_modules`, which was
     * everything there was to exclude until `purge-runtime/` arrived. That
     * directory gets its own isolated tree whenever its lockfile is
     * regenerated, and `pg-protocol` ships its own `*.test.ts` files — so
     * `pnpm test` picked up a vendored suite and died with
     * "ReferenceError: describe is not defined".
     *
     * It is gitignored, so this never reaches CI and never shows in a diff. It
     * breaks on the machine of whoever regenerates that lockfile next, which is
     * a worse failure than a red build: it looks like their change broke the
     * tests.
     */
    exclude: ["**/node_modules/**", ".next/**"],
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
        // The session allow-list is what makes an admin session revocable
        // (SPC-TM-002), so it belongs on the same floor as the auth crypto
        // beside it. `session-store.ts` earns its place specifically for the
        // `catch` that denies on a database failure — that one branch IS the
        // fail-closed guarantee, and an untested version of it would let an
        // unreachable database disable revocation with every page still
        // rendering.
        "lib/auth/session-rules.ts",
        "lib/auth/session-store.ts",
        "lib/rate-limit.ts",
        "lib/submission-guards.ts",
      ],
      thresholds: { lines: 100, functions: 100, branches: 90, statements: 100 },
    },
  },
});
