import { expect, test } from "@playwright/test";

/**
 * TM-001 (threat model) — the calculator privacy invariant, verified at runtime.
 * Calculator inputs must never leave the browser. The static guard
 * (content/privacy-invariant.test.ts) proves the SOURCE has no query-string or
 * server-action escape hatch; these tests prove the RUNNING app computes with
 * the network cut off and transmits nothing while the user types.
 */

const CALC = "/calculators/anion-gap";

/** Let the Serwist service worker activate and finish precaching before we
 *  measure, so its background fetches never pollute the request assertions. */
async function settleServiceWorker(page: import("@playwright/test").Page) {
  await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker?.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]),
  );
  await page.waitForLoadState("networkidle");
}

test.describe("TM-001 calculator privacy invariant (runtime)", () => {
  /**
   * The suite blocks service workers to kill a reload race (see
   * playwright.config.ts). This spec is the one place that must NOT, because
   * the worker is itself a network actor on calculator pages: it precaches
   * assets, and "nothing you type is transmitted" has to hold with it running,
   * not merely with it switched off. Blocking it here would quietly narrow the
   * site's central privacy claim to a configuration real visitors never get.
   */
  test.use({ serviceWorkers: "allow" });

  /**
   * TM-013 — entered values must never sit in `location.href`.
   *
   * This exists because the invariant was broken for weeks and every guard we
   * had said it was fine. Field state used to be mirrored into the fragment on
   * every keystroke, on the reasoning that browsers never transmit a fragment.
   * That is true of the BROWSER and irrelevant to a SCRIPT: Cloudflare's JS
   * Detections, injected into every page while the edge fronts the site, reads
   * `document.location.href` and POSTs it as `{"lhr": …}`. Confirmed 2026-08-05
   * by deobfuscating it and capturing the plaintext payload with the fragment's
   * values in it.
   *
   * Why this asserts on the URL rather than on requests. The existing test
   * below already inspects every request body, and it never caught this —
   * Cloudflare does not run against localhost, so no e2e can observe the actual
   * exfiltration. What CAN be asserted here is the property that makes the
   * exfiltration impossible for ANY script, present or future, ours or the
   * edge's: the values are not in the URL to be read. That is the durable
   * invariant, and unlike "no third-party scripts" it does not depend on
   * knowing who else is executing in the document.
   *
   * The fragment stays the SHARING format — a shared link must still restore a
   * form, which is why this asserts hydration works before asserting the URL is
   * clean. A fix that simply broke shared links would pass a weaker test.
   */
  test("TM-013: a shared fragment hydrates the form and is then gone from the URL", async ({
    page,
  }) => {
    await page.goto(`${CALC}#na=137~mEq%2FL;cl=101~mEq%2FL;hco3=22~mEq%2FL`, {
      waitUntil: "networkidle",
    });

    // Sharing still works: the values arrived in the form.
    await expect(page.locator("#field-na")).toHaveValue("137");
    await expect(page.locator("#field-cl")).toHaveValue("101");
    await expect(page.locator("#field-hco3")).toHaveValue("22");

    // ...and the URL that carried them is clean.
    const afterLoad = await page.evaluate(() => window.location.href);
    expect(afterLoad, "the fragment was left in the URL for any script to read").not.toContain(
      "137",
    );
    expect(afterLoad).not.toContain("101");
    expect(afterLoad).not.toContain("22");
    expect(await page.evaluate(() => window.location.hash)).toBe("");

    // Typing must not put them back. This is the regression that matters: the
    // old mirroring effect wrote the URL on every keystroke.
    await page.locator("#field-na").fill("155");
    await expect(page.locator("#field-na")).toHaveValue("155");
    const afterTyping = await page.evaluate(() => window.location.href);
    expect(afterTyping, "typing re-introduced values into the URL").not.toContain("155");
    expect(await page.evaluate(() => window.location.hash)).toBe("");
  });

  /**
   * The other half of the same change, and the half that fails silently.
   *
   * "Copy link with these values" used to copy `window.location.href`, which
   * worked only because the address bar already held the values. It now composes
   * the URL from state. If that composition is wrong, nothing else in the suite
   * notices — the form still works, the URL still looks like a URL, and the
   * clinician discovers it when the link they sent a colleague opens blank.
   */
  test("TM-013: copy link still produces a URL that carries the values", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(CALC, { waitUntil: "networkidle" });

    await page.locator("#field-na").fill("137");
    await page.locator("#field-cl").fill("101");
    await page.locator("#field-hco3").fill("22");

    await page.getByRole("button", { name: /copy link with these values/i }).click();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("/calculators/anion-gap#");
    expect(copied).toContain("na=137");
    expect(copied).toContain("cl=101");
    expect(copied).toContain("hco3=22");
    // Absolute, so it is pasteable somewhere other than this tab.
    expect(copied).toMatch(/^https?:\/\//);

    // Copying must not have put the values back into this page's own URL.
    expect(await page.evaluate(() => window.location.hash)).toBe("");
  });

  /**
   * An in-page anchor is not field state, and must not be treated as any.
   *
   * The fragment-lifting script listens for `hashchange`, and this site has a
   * skip-to-content link (`href="#content"`). Without the `=` test in that
   * script, activating it would stash `#content`, decode it to no known field,
   * and blank a form the clinician had already filled — and removing it from
   * the URL would also stop the browser jumping to the target, breaking the
   * accessibility affordance the link exists for.
   *
   * So this asserts both halves: the values survive, and the anchor still works.
   */
  test("TM-013: an in-page anchor neither clears the form nor gets swallowed", async ({ page }) => {
    await page.goto(CALC, { waitUntil: "networkidle" });
    await page.locator("#field-na").fill("137");
    await expect(page.locator("#field-na")).toHaveValue("137");

    await page.evaluate(() => {
      window.location.hash = "content";
    });
    await page.waitForFunction(() => window.location.hash === "#content");

    // The anchor is left in place for the browser to act on.
    expect(await page.evaluate(() => window.location.hash)).toBe("#content");
    // And the entered value is untouched.
    await expect(page.locator("#field-na")).toHaveValue("137");
  });

  test("anion gap computes in airplane mode (network cut, client-side only)", async ({
    page,
    context,
  }) => {
    await page.goto(CALC, { waitUntil: "networkidle" });
    await settleServiceWorker(page);

    // Airplane mode: cut the network entirely. A server-dependent calculator
    // could not produce a result past this line.
    await context.setOffline(true);

    await page.locator("#field-na").fill("140");
    await page.locator("#field-cl").fill("104");
    await page.locator("#field-hco3").fill("24");

    // Anion gap = 140 − (104 + 24) = 12, computed entirely in the browser.
    await expect(page.locator('[data-print="result"]')).toContainText("12");
  });

  test("no data-carrying request fires during entry, and input values never leave the browser", async ({
    page,
  }) => {
    // Everything a request could carry: URL and any POST body, tagged with the
    // resource type so we can tell a passive asset (a lazily-loaded font when
    // the result first paints) from a data-carrying request.
    const seen: string[] = [];
    const dataCarrying: string[] = [];
    const prefetches: string[] = [];
    // Only these resource types can exfiltrate input data. A font/image/script/
    // stylesheet fetch triggered by rendering the result is not a privacy leak.
    const EXFIL_TYPES = new Set(["document", "xhr", "fetch", "websocket", "eventsource"]);

    /**
     * Next.js prefetches the RSC payload of routes linked from the page (the
     * header nav and footer), as `GET /route?_rsc=<hash>`. These are
     * navigations to static routes: they carry no body and no input, and they
     * are scheduled on idle, so under load they can land inside the
     * measurement window below. They are counted separately rather than
     * ignored — the assertions afterwards prove they are inert.
     */
    const isRscPrefetch = (req: import("@playwright/test").Request) => {
      if (req.method() !== "GET" || req.postData()) return false;
      const u = new URL(req.url());
      return u.searchParams.has("_rsc");
    };

    page.on("request", (req) => {
      const url = req.url();
      const body = req.postData();
      seen.push(url);
      if (body) seen.push(body);
      if (!EXFIL_TYPES.has(req.resourceType())) return;
      if (isRscPrefetch(req)) prefetches.push(url);
      else dataCarrying.push(`${req.method()} ${url}`);
    });

    await page.goto(CALC, { waitUntil: "networkidle" });
    await settleServiceWorker(page);

    // Load a second time. The first visit installs the service worker and lets
    // it precache the app shell — which includes fetching this very document,
    // and that precache can finish *after* activation. Reloading with the
    // worker already in control moves every one of those fetches out of the
    // measurement window, so what we measure is genuinely the act of typing.
    await page.reload({ waitUntil: "networkidle" });
    await settleServiceWorker(page);

    // Everything up to here is page load / SW precache. Measure only what the
    // act of entering inputs causes.
    const beforeEntry = dataCarrying.length;

    // Distinctive sentinel values so any leak is unmistakable.
    await page.locator("#field-na").fill("137");
    await page.locator("#field-cl").fill("101");
    await page.locator("#field-hco3").fill("22");

    // Anion gap = 137 − (101 + 22) = 14. The generous timeout is for a loaded
    // machine running several workers, not for a slow calculation — the
    // computation itself is synchronous and client-side.
    await expect(page.locator('[data-print="result"]')).toContainText("14", { timeout: 15_000 });

    const duringEntry = dataCarrying.slice(beforeEntry);
    expect(
      duringEntry,
      `entering inputs must fire no data-carrying request; saw: ${duringEntry.join(", ")}`,
    ).toHaveLength(0);

    // Route prefetches are permitted, but must be provably inert: a GET to a
    // known app route whose ONLY query parameter is Next's `_rsc` cache key.
    // Anything else in the query string would be a channel for input data.
    for (const url of prefetches) {
      const u = new URL(url);
      expect([...u.searchParams.keys()], `prefetch carried extra params: ${url}`).toEqual(["_rsc"]);
      expect(u.origin, `prefetch left the origin: ${url}`).toBe(new URL(CALC, u.origin).origin);
    }

    /**
     * Belt and braces: the sentinel value must appear in no URL or body ever
     * requested (shareable state lives only in the fragment, never transmitted).
     *
     * BUILD ARTEFACTS ARE EXCLUDED, and not as a convenience. Webpack names its
     * chunks with a hex content hash, and hex is 0-9a-f — so a three-digit
     * clinical value collides with one sooner or later purely by chance. It did:
     * CI produced `page-0137dec412d04a79.js` and this assertion failed on the
     * `137` inside the hash, reporting a sodium leak that had not happened.
     *
     * A false alarm here is expensive out of proportion to its size. This is the
     * test behind the site's central claim, and one that cries wolf on a hash
     * lottery is one people learn to re-run rather than read. The sentinel could
     * not be changed to dodge it either — 137 is a real serum sodium, and a
     * value chosen to be hash-proof would be a value no clinician would type.
     *
     * Excluding these URLs costs nothing: their names are fixed by the bundler
     * at build time, so no runtime input can reach them. Every other request —
     * document, RSC payload, XHR, anything cross-origin — is still scanned whole.
     */
    const isBuildArtefact = (url: string) => /\/_next\/static\//.test(url);
    const scannable = seen.filter((s) => !isBuildArtefact(s));
    expect(scannable.length, "nothing was scanned — the filter is too broad").toBeGreaterThan(0);
    for (const s of scannable) {
      expect(s, `input value leaked into a request: ${s}`).not.toContain("137");
    }
  });
});
