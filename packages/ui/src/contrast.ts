/**
 * WCAG 2.2 relative luminance and contrast ratio, per
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance.
 * Pure sRGB math — no DOM, no dependencies — so the palette can be asserted
 * in unit tests (tokens.test.ts) rather than eyeballed in a browser.
 */
function channels(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
  }
  const parts = clean.match(/../g) as RegExpMatchArray;
  return parts.map((p) => parseInt(p, 16) / 255) as [number, number, number];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
