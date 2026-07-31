import { expect, test } from "@playwright/test";

/**
 * The hero figure.
 *
 * Two scenes have now been retired here. First a canvas waveform, then six
 * organ-system planes stacked in depth. The figure is now a child's heart and
 * lungs in CSS 3D: 544 particles and six stroked pleural outlines, generated on
 * the server from the geometry in lib/hero-cardiopulm and asserted there.
 *
 * What each rewrite has kept, because none of it was ever really about the
 * scene that happened to be in the hero:
 *
 *  - No 3D library. The original pulled ~874 KB of three.js. The right number
 *    is zero, and a reintroduction should fail loudly rather than quietly cost
 *    every visitor most of a megabyte.
 *  - No canvas. Same reason.
 *  - Reduced motion holds a COMPOSED still, not a flat or empty one.
 *  - preserve-3d actually survives. It is easy to lose to a stray
 *    `overflow-hidden` or `filter` on an ancestor, and the failure is silent:
 *    the figure keeps rendering, just flat.
 *
 * What is new, because this scene can fail in ways the stack could not: the
 * geometry is server-rendered as depth-banded paths and only four custom
 * properties are animated, so both halves of that split need holding in place.
 */
test.describe("hero figure", () => {
  test("renders the cardiopulmonary mesh, shaded by depth", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const scene = await page.evaluate(() => {
      const frame = document.querySelector(".cps-frame");
      const world = document.querySelector(".cps-world");
      if (!frame || !world) return null;
      const paths = Array.from(frame.querySelectorAll<SVGPathElement>("path[class^=cps-]"));
      const opacities = new Set(paths.map((p) => getComputedStyle(p).strokeOpacity));
      const segments = paths.reduce(
        (a, p) => a + (p.getAttribute("d") ?? "").split("M").length - 1,
        0,
      );
      return {
        paths: paths.length,
        edges: segments,
        airwayBands: frame.querySelectorAll("path.cps-airway").length,
        heartBands: frame.querySelectorAll("path.cps-heart").length,
        pleuraBands: frame.querySelectorAll("path.cps-pleura").length,
        clusters: frame.querySelectorAll(".cps-clusters circle").length,
        distinctOpacities: opacities.size,
        worldTransformed: getComputedStyle(world).transform !== "none",
      };
    });

    expect(scene, "expected the scene in the DOM").not.toBeNull();

    // Thousands of edges, collapsed into a handful of depth-banded paths. That
    // collapse is the whole rendering argument: as individual lines this would
    // be six times the element budget for a figure that never changes shape.
    expect(scene!.edges, "the mesh is missing").toBeGreaterThan(1500);
    // Five bands per system for the edges and five more for the vertices,
    // which are zero-length subpaths with a round linecap rather than three
    // thousand circles.
    expect(scene!.paths, "edges were not bucketed into bands").toBeLessThanOrEqual(30);
    expect(scene!.airwayBands).toBeGreaterThan(2);
    expect(scene!.heartBands).toBeGreaterThan(2);
    expect(scene!.pleuraBands).toBeGreaterThan(2);
    expect(scene!.clusters, "no alveolar clusters").toBeGreaterThan(20);

    // The heart carries itself as a surface. It used to need a few hundred
    // vertex dots because it was a proximity web with no facets; the mesh
    // says it now, and the dots were most of the element budget restating it.
    expect(scene!.heartBands, "the heart is not meshed").toBeGreaterThan(2);

    // Depth is carried by brightness alone, so the bands must actually differ.
    // If they collapsed to one opacity the mesh would read as a flat doily.
    expect(scene!.distinctOpacities, "depth banding is not shading").toBeGreaterThan(4);
    expect(scene!.worldTransformed, "the sway is not applied").toBe(true);
  });

  test("lays the scene out proportionally, with nothing escaping the frame", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Positions are percentages and depths are container units, so the figure
    // must track its card at any width. An earlier build scaled the world with
    // calc(100cqw / 340), which resolves to a LENGTH where scale() needs a
    // number — the browser dropped the declaration and the scene rendered with
    // no transform and no perspective at all.
    for (const width of [320, 520, 760]) {
      const overflow = await page.evaluate((w) => {
        const frame = document.querySelector<HTMLElement>(".cps-frame")!;
        const card = frame.parentElement!;
        const previous = card.style.width;
        card.style.width = `${w}px`;
        const box = frame.getBoundingClientRect();
        const svg = frame.querySelector<SVGSVGElement>(".cps-svg")!.getBoundingClientRect();
        const aspect = box.width / box.height;
        card.style.width = previous;
        return {
          aspect,
          fills: Math.abs(svg.width - box.width) < 2 && Math.abs(svg.height - box.height) < 2,
        };
      }, width);

      expect(overflow.fills, `the scene did not fill its frame at ${width}px`).toBe(true);
      expect(overflow.aspect, `aspect drifted at ${width}px`).toBeCloseTo(340 / 440, 2);
    }
  });

  test("the figure carries an accessible description", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The 3D construction is aria-hidden on purpose: its reading order is a
    // stacking order, which means nothing out loud. The caption is the route.
    const caption = page.locator("figure figcaption");
    await expect(caption).toHaveCount(1);
    await expect(caption).not.toBeEmpty();
    await expect(page.locator(".cps-frame")).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion holds a composed still rather than freezing at zero", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await page.waitForLoadState("load");

      const before = await page.evaluate(() => {
        const f = document.querySelector<HTMLElement>(".cps-frame")!;
        const s = getComputedStyle(f);
        return {
          breath: Number(s.getPropertyValue("--breath")),
          beat: Number(s.getPropertyValue("--beat")),
          wave: Number(s.getPropertyValue("--wave")),
          running: document.getAnimations().filter((a) => a.playState === "running").length,
        };
      });

      // A composed pose, not frame zero: lungs full and a heart perfused, so a
      // reader who never sees this move still sees something alive.
      expect(before.breath).toBeGreaterThan(0.5);
      expect(before.beat).toBeGreaterThan(1);
      expect(before.wave).toBeGreaterThan(0);
      expect(before.running, "nothing may animate under reduced motion").toBe(0);

      // And it must STAY there — the driver must not have mounted at all.
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector<HTMLElement>(".cps-frame")!);
        return {
          breath: Number(s.getPropertyValue("--breath")),
          beat: Number(s.getPropertyValue("--beat")),
        };
      });
      expect(after.breath, "the scene moved under reduced motion").toBe(before.breath);
      expect(after.beat, "the scene moved under reduced motion").toBe(before.beat);
    } finally {
      await ctx.close();
    }
  });

  test("the geometry is server-rendered, not built in the browser", async ({ page }) => {
    // The mesh must arrive as HTML. If it ever starts being constructed
    // client-side, the route pays for the geometry twice and the scene pops in
    // after hydration instead of being there on first paint.
    const response = await page.request.get("/");
    const html = await response.text();
    const bands = (html.match(/class="cps-(airway|heart|pleura)"/g) ?? []).length;
    expect(bands, "the mesh is missing from the server HTML").toBeGreaterThan(8);
    expect(html).toContain("cps-clusters");
  });

  test("no 3D library and no canvas is downloaded for the hero", async ({ page }) => {
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
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
