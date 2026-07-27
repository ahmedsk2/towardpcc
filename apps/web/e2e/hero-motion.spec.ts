import { expect, test, devices, type Page } from "@playwright/test";

/**
 * Hero motion guard.
 *
 * The animated hero shipped and then silently stopped running. The scene was
 * enabled only when `prefers-reduced-motion` was false AND the viewport was
 * wider than 768px AND `pointer: coarse` was false AND WebGL was available.
 * On a touchscreen laptop the pointer check fails, so no canvas was ever
 * created: production had zero canvas elements and exactly one running
 * animation on the whole page — an 8px pulsing dot.
 *
 * Nothing caught it, because "the hero animates" was never asserted. It is now,
 * including on the device class it actually failed on.
 */

/** Reduces the canvas to one number, so frames can be compared without
 *  shipping pixel buffers across the wire. */
const SAMPLE = `(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, lit = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    sum += d[i] + d[i + 1] + d[i + 2];
    if (d[i + 3] > 8) lit++;
  }
  return { sum, lit };
})()`;

type Sample = { sum: number; lit: number } | null;

/**
 * Collects N distinct frame signatures.
 *
 * Retried as a whole because the PWA service worker can reload the page
 * mid-evaluate and destroy the execution context — the same hazard
 * layout.spec.ts and image-crop.spec.ts document.
 *
 * Scrolls the canvas into view first: the loop is deliberately paused while
 * off-screen, and on a phone the hero scene stacks below the heading and CTAs.
 * Measuring without scrolling would measure the pause, not the animation.
 */
async function sampleFrames(page: Page, count: number, gapMs: number): Promise<number[]> {
  let lastError = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.locator("canvas").scrollIntoViewIfNeeded();
      // The chunk is lazy, so the element exists before it has drawn anything.
      await expect
        .poll(async () => ((await page.evaluate(SAMPLE)) as Sample)?.lit ?? 0, { timeout: 10_000 })
        .toBeGreaterThan(100);

      const sums: number[] = [];
      for (let i = 0; i < count; i++) {
        const s = (await page.evaluate(SAMPLE)) as Sample;
        if (!s || s.lit <= 100) throw new Error("canvas went blank mid-measurement");
        sums.push(s.sum);
        await page.waitForTimeout(gapMs);
      }
      return sums;
    } catch (e) {
      lastError = String(e);
      await page.waitForTimeout(600);
    }
  }
  throw new Error(`could not sample the hero canvas after 4 attempts: ${lastError}`);
}

test.describe("hero motion", () => {
  test("the hero canvas animates continuously", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.locator("canvas"), "the hero should mount an animated canvas").toHaveCount(1);

    const sums = await sampleFrames(page, 4, 250);
    // Every frame distinct: a static render repeats. This is the assertion
    // that would have failed for the hero as shipped.
    expect(new Set(sums).size, `expected 4 distinct frames, got ${JSON.stringify(sums)}`).toBe(4);
  });

  test("it still animates on a touchscreen, the device class it failed on", async ({ browser }) => {
    // `pointer: coarse` is exactly what disabled the old scene.
    const context = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForLoadState("load");

      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
        "this context should report a coarse pointer, or the test proves nothing",
      ).toBe(true);

      await expect(page.locator("canvas")).toHaveCount(1);

      const sums = await sampleFrames(page, 3, 300);
      expect(
        new Set(sums).size,
        `the hero is static on a touch device: ${JSON.stringify(sums)}`,
      ).toBe(3);
    } finally {
      await context.close();
    }
  });

  test("reduced motion shows the poster and never mounts the canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForLoadState("load");
      // motion.md rule 1: the hero is poster-only under reduced motion.
      await expect(page.locator("canvas")).toHaveCount(0);
      // The poster is still there, so the hero is never empty.
      await expect(page.locator('svg[role="img"]').first()).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("no three.js is downloaded for the hero", async ({ page }) => {
    // The scene used to pull ~874 KB of three.js. Canvas 2D needs none of it,
    // and a stray re-introduction should fail loudly rather than quietly cost
    // every visitor most of a megabyte.
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
});
