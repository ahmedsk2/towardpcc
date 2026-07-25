/* global console */
/**
 * Rasterize the brand SVG icons to PNG at PWA sizes, via Playwright's Chromium
 * (sharp has no Windows-ARM64 native binary on the dev box). Run after changing
 * an icon:  node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icons = [
  { src: "public/icon.svg", base: "public/icon" },
  { src: "public/icon-maskable.svg", base: "public/icon-maskable" },
];
const sizes = [192, 512];

const browser = await chromium.launch();
for (const { src, base } of icons) {
  const svg = readFileSync(src, "utf8");
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const sized = svg.replace('width="512" height="512"', `width="${size}" height="${size}"`);
    await page.setContent(`<!doctype html><html><body style="margin:0">${sized}</body></html>`);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
    writeFileSync(`${base}-${size}.png`, buf);
    await page.close();
    console.log(`wrote ${base}-${size}.png`);
  }
}
await browser.close();
