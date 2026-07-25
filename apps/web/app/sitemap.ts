import type { MetadataRoute } from "next";
import { listScores } from "@towardpcc/scoring-engine";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://towardpcc.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/calculators",
    "/knowledge",
    "/data",
    "/services",
    "/about",
    "/contact",
    "/install",
    "/legal/data-protection",
    "/legal/terms",
    "/legal/disclaimer",
  ];
  const calculatorRoutes = listScores({ status: "published" }).map((s) => `/calculators/${s.slug}`);

  // /admin is intentionally absent (and disallowed in robots.ts).
  return [...staticRoutes, ...calculatorRoutes].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.startsWith("/calculators/") ? 0.8 : 0.6,
  }));
}
