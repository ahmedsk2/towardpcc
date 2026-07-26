import type { MetadataRoute } from "next";

// PWA manifest (PRD §6.5): installable, calculator-first.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TowardPCC — pediatric critical care calculators",
    short_name: "TowardPCC",
    description:
      "Free, clinically referenced PICU calculators. Works offline. Nothing you enter is transmitted or stored.",
    id: "/",
    start_url: "/calculators",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Mirror --color-surface-page / --color-surface-hero (tokens.css); the
    // manifest is static JSON, so CSS variables cannot be used here.
    background_color: "#FFFAF7",
    theme_color: "#260E1A",
    categories: ["medical", "health", "productivity"],
    // SVG for crisp scaling in modern browsers, plus raster PNGs (192/512 +
    // maskable) for maximum Android / Lighthouse compatibility. PNGs are
    // generated from the SVGs by scripts/generate-icons.mjs.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
