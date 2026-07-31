import { expect, test } from "@playwright/test";

/**
 * The hero figure.
 *
 * This file used to test a canvas waveform: that it painted distinct frames,
 * that it survived on touchscreens, that it paused off-screen and on tab-hide,
 * and that no three.js came with it. That scene is gone — the hero now shows
 * six organ systems as CSS planes stacked in depth, which is what the site's
 * scores are actually summed across.
 *
 * Most of those assertions died with the canvas. Two survive because they were
 * never really about the canvas:
 *
 *  - No three.js. The scene once pulled ~874 KB of it. Nothing should
 *    re-introduce a 3D library for a hero, and the new figure makes that
 *    stronger rather than weaker: it is pure CSS, so the correct cost is zero.
 *  - Reduced motion. The figure must still read as a stack in depth when
 *    animation is off, not collapse to a flat list.
 *
 * And one is new, because the old hero could not have failed this way: the
 * planes must genuinely be separated in Z. `preserve-3d` is easy to lose to a
 * stray `overflow-hidden` or `filter` on an ancestor, and the failure is silent
 * — the figure keeps rendering, just flat.
 */
test.describe("hero figure", () => {
  test("renders six organ-system planes, separated in depth", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const planes = page.locator("figure li");
    await expect(planes).toHaveCount(6);

    const depth = await page.evaluate(() => {
      const list = document.querySelector("figure ul");
      if (!list) return null;
      const items = Array.from(list.querySelectorAll("li"));
      return {
        preserve3d: getComputedStyle(list).transformStyle,
        // Distinct matrices mean the planes really are at different depths.
        distinctTransforms: new Set(items.map((el) => getComputedStyle(el).transform)).size,
        listIsTransformed: getComputedStyle(list).transform !== "none",
      };
    });

    expect(depth, "expected the stack to be in the DOM").not.toBeNull();
    expect(depth!.preserve3d, "preserve-3d is lost — the stack will render flat").toBe(
      "preserve-3d",
    );
    expect(depth!.distinctTransforms, "planes are not separated in depth").toBe(6);
    expect(depth!.listIsTransformed, "the stack is not rotated into perspective").toBe(true);
  });

  test("the figure carries an accessible description", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The 3D construction is aria-hidden on purpose: its reading order is a
    // stacking order, which means nothing out loud. The caption is the route.
    const caption = page.locator("figure figcaption");
    await expect(caption).toHaveCount(1);
    await expect(caption).toContainText(/organ systems/i);
  });

  test("reduced motion holds the stack at an angle rather than flattening it", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await page.waitForLoadState("load");

      const state = await page.evaluate(() => {
        const list = document.querySelector("figure ul");
        if (!list) return null;
        return {
          running: list.getAnimations().filter((a) => a.playState === "running").length,
          transform: getComputedStyle(list).transform,
        };
      });

      expect(state).not.toBeNull();
      expect(state!.running, "animation must not run under reduced motion").toBe(0);
      // Still angled: a composed still, not a flat elevation.
      expect(state!.transform, "the stack flattened under reduced motion").not.toBe("none");
    } finally {
      await ctx.close();
    }
  });

  test("no 3D library is downloaded for the hero", async ({ page }) => {
    // The scene once pulled ~874 KB of three.js. The figure is now pure CSS, so
    // the right number is zero and a re-introduction should fail loudly rather
    // than quietly cost every visitor most of a megabyte.
    const scripts: string[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") scripts.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bodies = await Promise.all(
      scripts.map(async (url) => {
        try {
          return await (await page.request.get(url)).text();
        } catch {
          return "";
        }
      }),
    );
    const offender = bodies.findIndex((b) => b.includes("WebGLRenderer") || b.includes("THREE."));
    expect(offender, `three.js found in ${scripts[offender] ?? ""}`).toBe(-1);
  });

  test("the hero mounts no canvas at all", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The figure replaced a dynamically imported canvas renderer. If a canvas
    // reappears here, something has been added back that the CSS figure was
    // meant to make unnecessary.
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
