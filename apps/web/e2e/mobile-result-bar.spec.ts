import { expect, test } from "@playwright/test";

/**
 * The answer, on a phone.
 *
 * The result rail is `lg:sticky`, so on a desktop the number is on screen the
 * whole time values are being entered. Below `lg` the grid collapses and the
 * same rail stacks BELOW the entire form — measured 2026-09-03 at 375x812, the
 * PRISM Result heading sits about 8.4 screens under the first field. A bedside
 * tool on a phone should not hide its own answer.
 *
 * The FAB assertions are not incidental. The back-to-top button is fixed to the
 * same corner, and its own source records it eating taps on the unit toggles at
 * 320-768px once already; this suite exists so the second collision cannot
 * return unnoticed.
 */

const PHONE = { width: 375, height: 812 };

async function fillAnionGap(page: import("@playwright/test").Page) {
  await page.goto("/calculators/anion-gap", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /not now/i })
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.locator("#field-na").fill("140");
  await page.locator("#field-cl").fill("100");
  await page.locator("#field-hco3").fill("24");
}

test.describe("the mobile result bar", () => {
  test("appears with the result, carries the number, and jumps to the panel", async ({ page }) => {
    await page.setViewportSize(PHONE);
    const bar = page.getByRole("button", { name: /go to the full result/i });

    await page.goto("/calculators/anion-gap", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /not now/i })
      .click({ timeout: 3000 })
      .catch(() => {});
    // Nothing entered yet: a bar that says nothing costs 56px and earns none.
    await expect(bar).toHaveCount(0);

    await fillAnionGap(page);
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("16.0");

    // It reaches the panel it summarises, and lands focus on its heading so a
    // keyboard or screen-reader user continues from there rather than the top.
    await bar.click();
    await expect(page.locator("#calc-result")).toBeInViewport();
    await expect(page.locator("#calc-result h2")).toBeFocused();
  });

  test("does not render on a desktop, where the rail is already sticky", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await fillAnionGap(page);
    await expect(page.getByRole("button", { name: /go to the full result/i })).toBeHidden();
    // And the back-to-top button is untouched at this width.
    await page.mouse.wheel(0, 900);
    await expect(page.locator("[data-back-to-top]")).toHaveCSS("display", "grid");
  });

  test("stands the back-to-top button down rather than overlapping it", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await fillAnionGap(page);
    await page.mouse.wheel(0, 900);

    const bar = page.getByRole("button", { name: /go to the full result/i });
    await expect(bar).toBeVisible();
    await expect(page.locator("[data-back-to-top]")).toHaveCSS("display", "none");
  });

  test("reserves its own clearance, so the last content is never underneath it", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await fillAnionGap(page);
    // NOT keyboard End: focus is still inside the last filled input, where End
    // moves the caret and scrolls nothing. That premise error made this assert
    // against an unscrolled page and "find" a field under the bar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    const bar = page.getByRole("button", { name: /go to the full result/i });
    const barBox = await bar.boundingBox();
    expect(barBox).not.toBeNull();

    // At the very bottom of the page, nothing interactive or readable may sit
    // in the band the bar occupies.
    const covered = await page.evaluate((top) => {
      // By its label, not "button.fixed" — the back-to-top FAB is also
      // position-fixed and comes first in DOM order.
      const bottomBar = [...document.querySelectorAll("button")].find((b) =>
        /go to the full result/i.test(b.textContent ?? ""),
      );
      return [...document.querySelectorAll("main a, main button, main input, main p")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.height > 0 &&
            r.top < window.innerHeight &&
            r.bottom > top &&
            el !== bottomBar &&
            !bottomBar?.contains(el)
          );
        })
        .map((el) => `${el.tagName}: ${(el.textContent ?? "").trim().slice(0, 40)}`);
    }, barBox!.y);
    expect(covered, "content is hidden under the bottom bar").toEqual([]);
  });

  test("adds no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await fillAnionGap(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
