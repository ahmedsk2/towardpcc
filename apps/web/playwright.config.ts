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
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    env: { PORT: String(PORT) },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
