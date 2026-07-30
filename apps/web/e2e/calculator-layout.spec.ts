import { expect, test } from "@playwright/test";

/**
 * Calculator page structure.
 *
 * A sticky element can only travel within its parent. The result rail used to
 * live in a grid holding nothing but the inputs, so on /calculators/pf-ratio —
 * two inputs — the grid was 214px tall and the rail had ELEVEN pixels of travel
 * on a 2443px page. The answer scrolled out of view almost immediately and was
 * absent for most of the page. The same markup behaved perfectly on pim3, whose
 * fourteen inputs made the grid tall, which is exactly why it was never
 * noticed: it only broke on the shortest calculators.
 *
 * The reference content is now rendered inside that column, so the rail's
 * parent is page-length for every score regardless of input count.
 */

/** pf-ratio is the pathological case: the fewest inputs, so the shortest grid. */
const SHORT = "/calculators/pf-ratio";
/** pim3 has many inputs and always worked — asserted so a fix here cannot
 *  regress the case that was already fine. */
const LONG = "/calculators/pim3";

async function resultVisibleAfterScrolling(
  page: import("@playwright/test").Page,
  path: string,
): Promise<{ visible: boolean; scrolledTo: number; pageHeight: number }> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await page.waitForLoadState("load");

  const panel = page.locator('[data-print="result"]');
  await expect(panel).toBeVisible();

  // Let the LAYOUT settle before measuring it.
  //
  // This is the second race in this helper and it sits upstream of the first.
  // `scrollHeight` was sampled while lazy images and webfonts were still
  // arriving, so the scroll target was computed against a page that then grew
  // underneath it. On a fast machine everything had landed already; under full
  // suite load it had not, which is why this passed in isolation and failed
  // roughly one run in five inside the whole suite — the worst possible
  // signature, because "re-run it" appears to work.
  let lastHeight = -1;
  await expect
    .poll(
      async () => {
        const h = await page.evaluate(() => document.body.scrollHeight);
        const stable = h === lastHeight;
        lastHeight = h;
        return stable;
      },
      { timeout: 5000, message: "the page never stopped growing" },
    )
    .toBe(true);

  // Two thirds down the page — comfortably past where an 11px-travel rail
  // would have vanished.
  const target = await page.evaluate(() => {
    const y = Math.round(document.body.scrollHeight * 0.66);
    window.scrollTo(0, y);
    return { y, h: document.body.scrollHeight };
  });
  // Wait for the scroll to SETTLE rather than to reach a particular offset.
  //
  // Reaching the requested offset is the wrong condition and I got it wrong
  // once already: the page cannot scroll past `scrollHeight - innerHeight`, so
  // asking for 66% of scrollHeight lands at 901 when it was told 1202, and a
  // poll waiting for 1202 times out forever on a perfectly healthy page.
  //
  // Settling is what the measurement below actually needs — it is taken once,
  // so running it mid-scroll reports a position nobody asked about, and the
  // failure reads as "the sticky panel is broken" rather than "the test
  // measured too early".
  let previous = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY));
        const settled = y === previous;
        previous = y;
        return settled;
      },
      { timeout: 3000, message: "the page never stopped scrolling" },
    )
    .toBe(true);

  const visible = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    // Genuinely on screen, not merely intersecting by a pixel.
    return r.top < window.innerHeight - 80 && r.bottom > 80;
  });

  return { visible, scrolledTo: target.y, pageHeight: target.h };
}

test.describe("calculator layout", () => {
  test("the result stays on screen on a two-input score", async ({ page }) => {
    const r = await resultVisibleAfterScrolling(page, SHORT);
    expect(
      r.visible,
      `the result rail left the viewport at ${r.scrolledTo}px of ${r.pageHeight}px — its sticky parent is too short again`,
    ).toBe(true);
  });

  test("the result stays on screen on a fourteen-input score", async ({ page }) => {
    const r = await resultVisibleAfterScrolling(page, LONG);
    expect(r.visible, `the result rail left the viewport on ${LONG}`).toBe(true);
  });

  test("the reference panels are collapsed into one tabbed zone", async ({ page }) => {
    await page.goto(SHORT);
    await page.waitForLoadState("load");

    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(4);

    // Exactly one panel visible at a time is the whole point — four stacked
    // prose sections is what made the page read as a wall of text.
    await expect(page.getByRole("tabpanel")).toHaveCount(1);

    // Arrow keys move between tabs (roving tabindex), not just clicks.
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("every numeric field shows its accepted range", async ({ page }) => {
    await page.goto(SHORT);
    await page.waitForLoadState("load");

    const numerics = page.locator('input[type="number"]');
    const count = await numerics.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const placeholder = await numerics.nth(i).getAttribute("placeholder");
      expect(placeholder, "a numeric field should advertise its accepted range").toMatch(
        /\d+.*–.*\d+/,
      );
    }
  });

  /**
   * On one column the answer must follow the inputs directly.
   *
   * This shipped broken: the reference zone shared a column wrapper with the
   * form, so a phone showed inputs, then the entire formula/limitations/
   * evidence block, and only then the result. Nothing caught it, because every
   * layout assertion above runs at 1440x900 where the two-column grid hides the
   * source order entirely.
   *
   * Asserted on both a short and a long score: the short one is where a naive
   * fix is tempting, and the long one is where the sticky rail it must not
   * regress actually matters.
   */
  for (const slug of [SHORT, LONG]) {
    test(`the result precedes the reference zone on a phone (${slug})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(slug);
      await page.waitForLoadState("load");

      const geometry = await page.evaluate(() => {
        const result = document.querySelector('[data-print="result"]');
        const tablist = document.querySelector('[role="tablist"]');
        const form = document.querySelector("form[aria-label]");
        if (!result || !tablist || !form) return null;
        const y = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
        return {
          formBottom: form.getBoundingClientRect().bottom + window.scrollY,
          resultTop: y(result),
          tablistTop: y(tablist),
          singleColumn: result.getBoundingClientRect().left < 40,
        };
      });

      expect(geometry, "expected a result panel, a tablist and a form").not.toBeNull();
      const g = geometry!;

      expect(g.singleColumn, "375px should not be rendering the two-column grid").toBe(true);
      expect(g.resultTop, "the result must come after the inputs, not above them").toBeGreaterThan(
        g.formBottom - 1,
      );
      expect(
        g.tablistTop,
        "the reference zone must come AFTER the result — it used to sit between the last input and the answer",
      ).toBeGreaterThan(g.resultTop);

      // And directly after: a row gap stacked on a component margin once left an
      // 80px dead band here, which reads as the end of the page on a phone.
      expect(g.resultTop - g.formBottom, "gap between the last input and the result").toBeLessThan(
        72,
      );
    });
  }
});
