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
});
