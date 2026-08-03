import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the TM-001 privacy invariant (threat model). The zero-network
 * assertions must run against the PRODUCTION build — `next dev` keeps an HMR
 * websocket and RSC dev traffic open that would drown out the signal. We build,
 * serve on a dedicated port (so a running `next dev` on 3000 is never reused),
 * and drive real Chromium.
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  /**
   * Single worker, deliberately.
   *
   * The privacy specs assert on *network timing* — that typing into a
   * calculator provokes no request. Running several Chromium instances against
   * one Next server starves the CPU and reorders those requests, so the suite
   * fails intermittently for reasons that have nothing to do with the invariant
   * it guards. A flaky privacy test is worse than a slow one: it trains people
   * to re-run until green. The whole suite is ~35s serially.
   */
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    /**
     * Kept for determinism. The flake it was introduced for is now fixed at
     * source, so read the history before assuming this is load-bearing.
     *
     * ORIGINALLY (2026-08-01) this was THE FIX FOR THE "UNIDENTIFIED FLAKE".
     * `service-worker.tsx` reloaded the page on `controllerchange`, which
     * detached the document and killed any Playwright call in flight with
     * "Element is not attached to the DOM". Whether it landed harmlessly
     * depended purely on machine speed: probed across 8 fresh contexts, the
     * worker was already controlling by the time `networkidle` resolved (8/8)
     * so local runs passed, while a busier CI runner activated it later and
     * `evidence-rail.spec.ts:49` failed all three attempts. No amount of
     * waiting could fix it — there is no event meaning "the reload is not
     * coming" — so registration was blocked instead (worker controls 0/8).
     *
     * SINCE 2026-08-03 that reload no longer exists: updates apply silently on
     * `pagehide`, and the `controllerchange` handler was removed outright. The
     * race is gone whatever this setting says.
     *
     * Blocking still earns its place: a worker precaching in the background
     * adds requests and timing the specs did not ask for, and several assert on
     * network behaviour. But if you ever need to unblock it, you are no longer
     * fighting the reload — check `service-worker.tsx` first rather than
     * trusting this paragraph.
     *
     * `calculator-privacy.spec.ts` opts back IN, because the service worker's
     * own network behaviour is exactly what that spec exists to police.
     */
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    // Dummy secrets so the auth-dependent pages (e.g. /admin/login) render — no
    // real login is exercised here; the header assertions are what matter.
    env: {
      PORT: String(PORT),
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-dummy-auth-secret-not-for-production-use-only",
      TOTP_ENC_KEY: process.env.TOTP_ENC_KEY ?? Buffer.alloc(32, 7).toString("base64"),
      SUBMISSION_IP_SALT: process.env.SUBMISSION_IP_SALT ?? "e2e-dummy-ip-salt-value",
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
