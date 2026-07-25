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
    background_color: "#F7F4F3",
    theme_color: "#231018",
    categories: ["medical", "health", "productivity"],
    // SVG icons install in modern Chrome/Edge/Safari. Raster PNG fallbacks
    // (192/512 + maskable) are a pre-launch polish item for maximum Android/
    // Lighthouse compatibility (tracked in LAUNCH-BLOCKERS.md).
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
