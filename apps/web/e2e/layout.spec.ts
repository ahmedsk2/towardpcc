import { expect, test } from "@playwright/test";

/**
 * Layout regression guard for the redesign (R3).
 *
 * The new home page leans on absolute positioning, negative margins, an
 * overlapping feature strip and full-bleed gradient bands — all of which are
 * easy to get subtly wrong at a width nobody checked. A page that scrolls
 * sideways on a phone is a real defect for a bedside tool, so it is asserted
 * rather than eyeballed.
 */
const WIDTHS = [
  // 320 is the real floor and the one that actually catches things: it is the
  // narrowest viewport still in use (iPhone SE first generation, and any phone
  // at 200% zoom, which WCAG 1.4.10 requires to reflow without a second
  // scrollbar). 375 passes for plenty of layouts that break 55px earlier.
  { name: "small phone", width: 320, height: 568 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES = [
  "/",
  "/calculators",
  "/calculators/pf-ratio",
  "/knowledge",
  "/data",
  "/services",
  "/about",
  "/contact",
  "/legal/terms",
  "/legal/disclaimer",
  "/legal/data-protection",
];

for (const vp of WIDTHS) {
  test.describe(`layout at ${vp.name} (${vp.width}px)`, () => {
    for (const path of PAGES) {
      test(`${path} does not scroll horizontally`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(path);
        await page.waitForLoadState("load");

        // The PWA service worker can reload the page out from under an
        // in-flight evaluate, so poll rather than measure once.
        await expect
          .poll(
            async () => {
              try {
                return await page.evaluate(
                  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
                );
              } catch {
                return null; // context destroyed mid-navigation — retry
              }
            },
            { timeout: 15_000, message: `${path} at ${vp.width}px scrolls sideways` },
          )
          .toBeLessThanOrEqual(1);

        // Diagnostic: elements past the right edge that are NOT clipped by an
        // ancestor. Oversized decorative gradients inside `overflow-hidden`
        // bands are intentional and must not be reported.
        const offenders = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth;
          const clipped = (el: Element) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const o = getComputedStyle(p);
              if (["hidden", "clip", "auto", "scroll"].includes(o.overflowX)) return true;
            }
            return false;
          };
          const bad: string[] = [];
          document.querySelectorAll("*").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            if (r.right > docW + 1 && !clipped(el)) {
              bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
            }
          });
          return bad.slice(0, 5);
        });
        expect(offenders, `elements past the right edge: ${offenders.join(" | ")}`).toHaveLength(0);
      });
    }
  });
}

/**
 * Static assets must actually be served.
 *
 * `public/` is not part of Next's standalone output, so it has to be copied
 * into the Docker image explicitly. When that COPY was missing, the service
 * worker and every PWA icon 404'd in production — offline support was silently
 * dead while the site otherwise looked perfectly healthy. Nothing in the build
 * or the health check catches that, so it is asserted here.
 */
test("public assets are served (service worker, icons, images)", async ({ request }) => {
  const assets = [
    "/sw.js",
    "/icon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/.well-known/security.txt",
    "/images/og-waveform.jpg",
    "/images/brand-waveform.jpg",
    "/images/care-nurse-smiling.jpg",
  ];
  for (const path of assets) {
    const res = await request.get(path);
    expect(res.status(), `${path} must be served, got ${res.status()}`).toBe(200);
  }
});

test("home counters animate to their real values", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  // Wait for hydration before touching the DOM. Without this the scroll raced
  // React and failed with "element is not attached to the DOM": the locator
  // resolved against the server HTML and the node was replaced underneath it.
  // Latent for as long as the hero was small, and real once the hero became a
  // 544-particle scene, which widened the window the reconciler walks.
  await page.waitForLoadState("networkidle");

  // The counter band is well below the fold; scroll it into view to trigger
  // the one-shot IntersectionObserver.
  const band = page.locator("#counters-heading").locator("..");
  await band.scrollIntoViewIfNeeded();

  // 64,388 pages / 100% coverage — two of the four verified figures. If either
  // changes, the copy is wrong, not the test. (The calculator and citation
  // counts are 23 and 91, pinned separately in figures.test.ts; this comment
  // said 22 and 89 for as long as that gap existed.)
  await expect(page.getByText("64,388", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});

test("reduced motion still shows the final counter values", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#counters-heading").locator("..").scrollIntoViewIfNeeded();
  // Under reduced motion the value must appear immediately, not animate.
  await expect(page.getByText("64,388", { exact: true })).toBeVisible({ timeout: 3000 });
  await context.close();
});
