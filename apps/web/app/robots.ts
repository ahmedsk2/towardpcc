import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/site-url";

/**
 * Preview/staging deployments set NOINDEX=1. Without it a preview on a public
 * subdomain serves the same pages as production and competes with the real
 * domain for the same content — the classic duplicate-content own-goal.
 */
const noindex = process.env.NOINDEX === "1";

export default function robots(): MetadataRoute.Robots {
  if (noindex) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
