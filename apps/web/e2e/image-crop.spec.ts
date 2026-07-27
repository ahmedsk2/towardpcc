import { expect, test, type Page } from "@playwright/test";

/**
 * Image framing guard.
 *
 * `aspect-4/3.4` is not a valid Tailwind class — the fraction shorthand takes
 * integers — so it compiled to nothing, `aspect-ratio` resolved to `auto`, and
 * the container collapsed onto its caption at 581x99. `object-fit: cover` then
 * discarded 74-80% of four photographs across four pages, including a registry
 * dashboard rendered through a 99px slit.
 *
 * Nothing caught it: the class was silently dropped at build time, the markup
 * looked correct, and no test compared a rendered image against its source.
 * This does, covering both failure modes — an invalid ratio class (collapsed
 * box) and a valid one that simply does not match the asset (excessive crop).
 *
 * A deliberate crop is still allowed; it just has to be declared, with
 * data-crop="intentional" on the image's container.
 */
const PAGES = ["/", "/about", "/knowledge", "/data", "/services"];

/** A photograph can lose a little to a container without harm. Past this it is
 *  no longer the picture that was chosen. */
const MAX_CROP = 0.12;

/** Below this a container has effectively collapsed rather than been sized. */
const MIN_RENDERED_HEIGHT = 80;

type Measured = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  boxWidth: number;
  boxHeight: number;
  objectFit: string;
  intentional: boolean;
};

async function measure(page: Page): Promise<Measured[]> {
  // next/image lazy-loads below the fold, so nothing off-screen has decoded
  // yet. Walk the page to trigger them, then return to the top.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  return page.evaluate(async () => {
    // next/image rewrites src to /_next/image?url=%2Fimages%2F… , so the asset
    // path is percent-encoded inside a query parameter and a plain
    // `img[src*="/images/"]` selector matches nothing at all.
    const assetPath = (img: HTMLImageElement): string | null => {
      const raw = img.currentSrc || img.src;
      if (!raw) return null;
      const url = new URL(raw, location.origin);
      const inner = url.searchParams.get("url");
      const path = inner ?? url.pathname;
      return path.startsWith("/images/") ? path : null;
    };

    const imgs = [...document.querySelectorAll<HTMLImageElement>("img")].filter(
      (i) => assetPath(i) !== null,
    );
    const out = [];
    for (const img of imgs) {
      // naturalWidth reads 0 when the page is not compositing frames, so fall
      // back to decoding the bytes rather than reporting a false 0x0 and
      // silently passing.
      let nw = img.naturalWidth;
      let nh = img.naturalHeight;
      if (!nw || !nh) {
        try {
          const blob = await (await fetch(img.currentSrc || img.src)).blob();
          const bmp = await createImageBitmap(blob);
          nw = bmp.width;
          nh = bmp.height;
          bmp.close();
        } catch {
          nw = 0;
          nh = 0;
        }
      }
      const rect = img.getBoundingClientRect();
      out.push({
        src: assetPath(img) ?? "(unknown)",
        naturalWidth: nw,
        naturalHeight: nh,
        boxWidth: Math.round(rect.width),
        boxHeight: Math.round(rect.height),
        objectFit: getComputedStyle(img).objectFit,
        intentional: !!img.closest('[data-crop="intentional"]'),
      });
    }
    return out;
  });
}

test.describe("image framing", () => {
  for (const path of PAGES) {
    test(`${path} renders every image without unintended cropping`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      // The PWA service worker can reload the page mid-evaluate and destroy the
      // execution context (layout.spec.ts documents the same hazard). Retry the
      // whole navigate-and-measure cycle rather than measuring once and hoping.
      let measured: Measured[] | null = null;
      for (let attempt = 0; attempt < 4 && measured === null; attempt++) {
        try {
          await page.goto(path);
          await page.waitForLoadState("load");
          measured = await measure(page);
        } catch {
          await page.waitForTimeout(600);
        }
      }

      expect(measured, `could not measure ${path} without a service-worker reload`).not.toBeNull();
      const images = measured ?? [];
      expect(images.length, `${path} should render at least one image`).toBeGreaterThan(0);

      for (const m of images) {
        expect(m.naturalWidth, `could not decode ${m.src}`).toBeGreaterThan(0);

        // Catches the collapsed-container failure directly: an image box only
        // as tall as its caption means the ratio class never applied.
        expect(
          m.boxHeight,
          `${m.src} on ${path} rendered ${m.boxWidth}x${m.boxHeight} — the container looks collapsed, which is exactly what an invalid aspect class produces`,
        ).toBeGreaterThan(MIN_RENDERED_HEIGHT);

        if (m.objectFit === "contain" || m.intentional) continue;

        const boxAR = m.boxWidth / m.boxHeight;
        const imgAR = m.naturalWidth / m.naturalHeight;
        // cover crops whichever axis overflows the box.
        const crop = imgAR > boxAR ? 1 - boxAR / imgAR : 1 - imgAR / boxAR;

        expect(
          crop,
          `${m.src} on ${path} loses ${(crop * 100).toFixed(1)}% — natural ${m.naturalWidth}x${m.naturalHeight} (AR ${imgAR.toFixed(3)}) in a ${m.boxWidth}x${m.boxHeight} box (AR ${boxAR.toFixed(3)}). Match the container to the asset, use fit="contain", or declare data-crop="intentional".`,
        ).toBeLessThanOrEqual(MAX_CROP);
      }
    });
  }
});
