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
     * THE FIX FOR THE "UNIDENTIFIED FLAKE", identified 2026-08-01.
     *
     * `components/pwa/service-worker.tsx:54` is the ONLY `location.reload()` in
     * the entire application: when the Serwist worker takes control it fires
     * `controllerchange` and the page reloads itself. That reload detaches the
     * document, so any Playwright call in flight dies with "Element is not
     * attached to the DOM".
     *
     * Whether it lands harmlessly depends purely on machine speed. Measured on
     * the dev box across 8 fresh contexts: by the time `networkidle` resolves
     * the worker is ALREADY controlling (8/8) and the reload has been and gone,
     * which is why local runs pass. A busier CI runner activates it later — and
     * on 2026-08-01 `evidence-rail.spec.ts:49` failed all three CI attempts in
     * exactly that call, in a `beforeEach` that had waited for `networkidle`.
     *
     * Waiting harder cannot fix this: there is no event that means "the reload
     * is not coming". Blocking registration removes the reload outright, so the
     * race cannot exist at any speed. Same probe with `block`: worker controls
     * 0/8.
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
