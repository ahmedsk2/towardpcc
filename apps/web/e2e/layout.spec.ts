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
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES = ["/", "/calculators", "/calculators/pf-ratio"];

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

test("home counters animate to their real values", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  // The counter band is well below the fold; scroll it into view to trigger
  // the one-shot IntersectionObserver.
  const band = page.locator("#counters-heading").locator("..");
  await band.scrollIntoViewIfNeeded();

  // 22 calculators / 89 citations / 64,388 pages / 100% coverage — the four
  // verified figures. If any of these changes, the copy is wrong, not the test.
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
