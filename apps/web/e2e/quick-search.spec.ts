import { expect, test } from "@playwright/test";

/**
 * The header search: reachable from any page, and it never fights the index's
 * own box for the "/" key.
 */
test.describe("header quick search", () => {
  test("slash focuses it on a calculator page, and a condition finds its calculators", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/calculators/prism", { waitUntil: "networkidle" });

    await page.keyboard.press("/");
    const box = page.getByRole("combobox", { name: /search calculators/i });
    await expect(box).toBeFocused();

    await box.fill("pards");
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(4);

    // Enter opens whatever is first, whichever that is by name order.
    const first = await options.first().locator("a").getAttribute("href");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${first}$`));
  });

  test("on the index page slash goes to the index's own box, not the header's", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/calculators", { waitUntil: "networkidle" });
    await page.keyboard.press("/");
    await expect(page.locator("#calc-search")).toBeFocused();
  });

  test("the index search now finds by alias too", async ({ page }) => {
    await page.goto("/calculators", { waitUntil: "networkidle" });
    await page.locator("#calc-search").fill("adrenaline");
    await expect(page.getByRole("link", { name: /Vasoactive-Inotropic Score/ })).toBeVisible();
  });

  test("escape closes the list, then clears the box", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/trust", { waitUntil: "networkidle" });
    const box = page.getByRole("combobox", { name: /search calculators/i });
    await box.fill("sepsis");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(box).toHaveValue("");
  });
});
