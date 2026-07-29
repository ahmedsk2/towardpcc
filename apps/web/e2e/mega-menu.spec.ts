import { expect, test } from "@playwright/test";

/**
 * The calculators mega-menu must stay inside the viewport.
 *
 * It shipped anchored to its own `<li>` — an element only as wide as the
 * "Calculators" button, sitting in the middle of the nav. The panel is 860px
 * and right-aligned, so it extended off the LEFT edge of the screen and the
 * entire first column was unreadable: score names cut to "ty 3 (PIM3)" and
 * "erglycemia".
 *
 * Nothing caught it. Every existing check looked at the page body, and the
 * panel only exists once opened, so a menu that rendered its content off-screen
 * passed the layout suite, the accessibility pass and the e2e suite alike.
 *
 * Measured at the narrow end of the desktop range as well as the wide end,
 * because the failure got WORSE as the viewport got smaller — the nav's right
 * edge moves left faster than the panel shrinks, and an early fix that looked
 * correct at 1280 still overflowed by 84px at 1024.
 */
const DESKTOP_WIDTHS = [1024, 1280, 1440, 1920];

test.describe("calculators mega-menu stays on screen", () => {
  for (const width of DESKTOP_WIDTHS) {
    test(`fits the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      await page.getByRole("button", { name: /calculators/i }).click();
      const panel = page.locator("#mega-calculators");
      await expect(panel).toBeVisible();

      const box = await panel.boundingBox();
      expect(box, "the panel should have a box once open").not.toBeNull();
      expect(
        box!.x,
        `panel starts ${Math.round(box!.x)}px from the left — negative means off-screen`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box!.x + box!.width,
        `panel ends past the right edge at ${width}px`,
      ).toBeLessThanOrEqual(width);
    });
  }

  test("does not make the page scroll sideways", async ({ page }) => {
    // The other half of the failure: a panel escaping the viewport can either
    // be clipped, or push the document wider. Both are wrong and only one is
    // visible in a screenshot.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: /calculators/i }).click();
    await expect(page.locator("#mega-calculators")).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows, "opening the menu widened the document").toBe(false);
  });

  test("every score link is actually reachable", async ({ page }) => {
    // The real user harm was not geometry — it was that half the catalogue
    // could not be clicked. Asserted directly rather than inferred from the box.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: /calculators/i }).click();
    await expect(page.locator("#mega-calculators")).toBeVisible();

    // Measured in ONE evaluation rather than a boundingBox() call per link.
    // The first version made 22 round trips and blew the 30s timeout, which
    // read as a layout failure when it was only slow instrumentation.
    const result = await page.evaluate(() => {
      const links = [...document.querySelectorAll('#mega-calculators a[href^="/calculators/"]')];
      return {
        count: links.length,
        offScreen: links
          .map((a) => ({
            text: (a.textContent ?? "").trim().slice(0, 40),
            x: a.getBoundingClientRect().left,
          }))
          .filter((l) => l.x < 0),
      };
    });

    expect(result.count, "the menu should list the catalogue").toBeGreaterThan(10);
    expect(
      result.offScreen,
      `${result.offScreen.length} of ${result.count} links start off the left edge`,
    ).toEqual([]);
  });
});
