import { expect, test } from "@playwright/test";

/**
 * P5 acceptance (PRD §9 / threat-model TM-005): the security headers ship with
 * every response. Runs against the production server, so it exercises the real
 * proxy.ts CSP + next.config headers().
 */
test.describe("security headers", () => {
  test("public pages carry the CSP and hardening headers", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const h = response!.headers();

    const csp = h["content-security-policy"];
    expect(csp, "CSP present").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");

    expect(h["strict-transport-security"], "HSTS").toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"], "Permissions-Policy").toContain("geolocation=()");
  });

  test("the admin area is served with a strict, nonce-based script policy", async ({ page }) => {
    const response = await page.goto("/admin/login");
    const csp = response!.headers()["content-security-policy"] ?? "";
    // The /admin tier must be strict: a per-request nonce and strict-dynamic,
    // and NO 'unsafe-inline' for scripts.
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});

/**
 * The headers that only the authenticated surfaces carry (SPC-WEB-006/007).
 *
 * Asserted because they are invisible: nothing about the admin area looks
 * different without them, and a `headers()` entry is easy to lose in a merge.
 * `dynamic = "force-dynamic"` governs Next's own cache and says nothing to a
 * corporate proxy or a browser's back-forward cache — on a shared ward machine
 * that is the difference between a colleague seeing a submission and not.
 */
test.describe("authenticated surfaces are not cacheable", () => {
  for (const path of ["/admin/login", "/api/v1/health"]) {
    test(`${path} is no-store and same-origin`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      const h = res.headers();
      expect(h["cache-control"], `${path} Cache-Control`).toContain("no-store");
      expect(h["cross-origin-resource-policy"], `${path} CORP`).toBe("same-origin");
    });
  }

  test("the public tier does NOT carry them, so they stay meaningful", async ({ request }) => {
    // Scoped deliberately: site-wide CORP would buy nothing on public pages and
    // could interfere with legitimate embedding of a calculator.
    const h = (await request.get("/")).headers();
    expect(h["cross-origin-resource-policy"]).toBeUndefined();
  });
});

/**
 * The health endpoint says as little as possible (SPC-API-005).
 *
 * It used to return the scoring engine's version to anyone who asked — a
 * precise string to match against a future advisory, consumed by nothing.
 */
test("the public health endpoint discloses no version", async ({ request }) => {
  const body = await (await request.get("/api/v1/health")).json();
  expect(body).toEqual({ status: "ok" });
});
