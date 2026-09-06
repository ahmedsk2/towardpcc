import { expect, test } from "@playwright/test";

/**
 * The catalogue is the route into the live product, so its filtering has to
 * behave like a tool rather than a list that sometimes shows nothing.
 *
 * Asserted here: chips say how many scores they hold before you press them, a
 * filtered view says how much it is hiding, an empty result is a designed state
 * with a way out rather than a dead end, and "/" reaches the search box without
 * stealing the key from anyone typing — which matters on a site full of scores
 * named with a slash.
 */
test.describe("calculator catalogue", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/calculators");
    await page.waitForLoadState("load");
  });

  test("category chips carry their score counts", async ({ page }) => {
    const chips = page.getByRole("group").getByRole("button");
    const texts = await chips.allInnerTexts();
    // Every chip except the "all" and favourites controls ends in a number.
    const counted = texts.filter((t) => /\d+\s*$/.test(t.trim()));
    expect(counted.length, `chips: ${JSON.stringify(texts)}`).toBeGreaterThan(4);
  });

  test("a filtered view says how much it is hiding", async ({ page }) => {
    // Unfiltered, the tally is deliberately absent — "22 of 22" is noise.
    await expect(page.getByText(/showing \d+ of \d+/i)).toHaveCount(0);

    await page.locator("#calc-search").fill("ratio");
    await expect(page.getByText(/showing \d+ of \d+/i)).toBeVisible();

    const tally = await page.getByText(/showing \d+ of \d+/i).innerText();
    const [shown, total] = tally.match(/\d+/g)!.map(Number);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total!);
  });

  test("an empty result offers a way out instead of dead-ending", async ({ page }) => {
    await page.locator("#calc-search").fill("zzzzznotascore");

    const clear = page.getByRole("button", { name: /clear filters/i });
    await expect(clear).toBeVisible();
    // It should name what was searched, so the reader knows the query was the
    // problem rather than the catalogue.
    await expect(page.getByText(/zzzzznotascore/)).toBeVisible();

    await clear.click();
    await expect(page.locator("#calc-search")).toHaveValue("");
    await expect(clear).toHaveCount(0);
  });

  test("slash focuses search from anywhere on the page", async ({ page }) => {
    await page.locator("h1").first().click();
    await page.keyboard.press("/");
    await expect(page.locator("#calc-search")).toBeFocused();
  });

  test("slash does not hijack typing — 'P/F' can still be typed", async ({ page }) => {
    // The failure this guards: a score named with a slash becomes unsearchable
    // because the shortcut swallows the key mid-word.
    const search = page.locator("#calc-search");
    await search.click();
    await search.type("P/F");
    await expect(search).toHaveValue("P/F");
  });

  test("a card says what the score is for, and its star is its own control", async ({ page }) => {
    const card = page.locator("article").filter({ hasText: "PELOD-2" }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: /PELOD-2/ })).toBeVisible();
    // The tagline is the second line, and it is not the version number.
    await expect(card).toContainText(/organ dysfunction/i);
    await expect(card).not.toContainText(/v\d+\.\d+\.\d+/);

    const star = card.getByRole("button", { name: /favorites/i });
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    // Still on the catalogue: the star did not follow the stretched link.
    await expect(page).toHaveURL(/\/calculators$/);
  });
});
