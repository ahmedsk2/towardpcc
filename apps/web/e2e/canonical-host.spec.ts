import { expect, test } from "@playwright/test";

/**
 * Canonical host guard.
 *
 * Before this, `towardpcc.com` and `www.towardpcc.com` both answered 200 with
 * no redirect and no `rel="canonical"` — identical content on two origins with
 * nothing telling a crawler which is authoritative.
 *
 * The redirect lives in proxy.ts rather than at the edge: Cloudflare is
 * DNS-only for this zone so a CF rule never fires, and a Traefik middleware
 * would reach beyond this app on a shared host.
 */
test.describe("canonical host", () => {
  test("the apex 308s to www, preserving path and query", async ({ request }) => {
    const res = await request.get("/calculators/pf-ratio?unit=kpa", {
      headers: { host: "towardpcc.com" },
      maxRedirects: 0,
    });

    expect(res.status()).toBe(308);
    expect(res.headers()["location"]).toBe(
      "https://www.towardpcc.com/calculators/pf-ratio?unit=kpa",
    );
  });

  test("a POST to the apex keeps its method (308, not 301)", async ({ request }) => {
    // 301/302 permit a client to rewrite POST to GET; 308 forbids it. A form
    // posted to the apex must not silently lose its body.
    const res = await request.post("/contact", {
      headers: { host: "towardpcc.com" },
      maxRedirects: 0,
      data: {},
    });
    expect(res.status()).toBe(308);
  });

  test("www is served directly and never redirects", async ({ request }) => {
    const res = await request.get("/", {
      headers: { host: "www.towardpcc.com" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
  });

  test("the preview subdomain is left alone", async ({ request }) => {
    // The single most likely way to get this wrong is a suffix match, which
    // would catch next.towardpcc.com and redirect the noindexed preview onto
    // production. The match is exact precisely to prevent that.
    const res = await request.get("/", {
      headers: { host: "next.towardpcc.com" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
  });

  test("localhost is unaffected, so local dev and health checks still work", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/health", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });

  test("every page carries a self-referencing canonical", async ({ page }) => {
    for (const path of ["/", "/calculators", "/about"]) {
      await page.goto(path);
      const href = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(href, `${path} should declare a canonical URL`).toBeTruthy();
      // Resolved against metadataBase, which is the env origin in test.
      expect(new URL(href!).pathname.replace(/\/$/, "")).toBe(path.replace(/\/$/, ""));
    }
  });
});
