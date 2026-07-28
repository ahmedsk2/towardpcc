import type { ScoreDefinition } from "@towardpcc/scoring-engine";
// Relative, not the `@/` alias: this module is unit-tested and vitest resolves
// only real paths (the alias is a Next build-time concern).
import { SITE_URL } from "./site-url";

/**
 * schema.org structured data.
 *
 * The site already emits complete Open Graph, Twitter and canonical metadata —
 * what was missing is rich-results eligibility, so a search engine can render a
 * calculator or an organisation rather than a plain blue link.
 *
 * Two rules, both inherited from the platform's core constraint:
 *
 * 1. Nothing here may claim more than the site claims. No aggregateRating (we
 *    have no ratings), no SearchAction (the calculator search is client-side
 *    with no URL endpoint, so advertising one would send crawlers to a route
 *    that does not exist), no sameAs until real profile URLs exist.
 * 2. Every value is derived from data the app already holds and already
 *    renders. If a figure appears here it appears on the page too.
 *
 * Emitted as an inline <script type="application/ld+json">, which has no `src`
 * and therefore costs nothing against the route JS budget — the gate counts
 * script tags with a src attribute.
 */

/** JSON-LD is a plain tree; this keeps it typed without pretending it is richer. */
export type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "TowardPCC",
    alternateName: "Toward Pediatric Critical Care",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      "Free, referenced clinical calculators for pediatric critical care, with knowledge and data systems for every unit and research support for every investigator.",
    // No sameAs: profile URLs have not been supplied, and an empty or guessed
    // one is worse than none.
  };
}

export function webSiteSchema(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: "TowardPCC",
    url: SITE_URL,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    // Deliberately no potentialAction/SearchAction — the catalogue search runs
    // in the browser and has no query-string endpoint to point a crawler at.
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/**
 * A calculator is described twice, because it is genuinely two things: a page
 * about a clinical instrument, and a tool you can run.
 *
 * `isAccessibleForFree` and `offers: 0` are both stated because different
 * consumers read different ones, and both are simply true.
 */
export function calculatorSchema(score: ScoreDefinition, description: string): JsonLd[] {
  const url = `${SITE_URL}/calculators/${score.slug}`;
  const latest = [...score.changelog].sort((a, b) => b.date.localeCompare(a.date))[0];

  const citations = score.references.map((ref) => {
    const cite: JsonLd = { "@type": "CreativeWork", name: ref.citation };
    if ("doi" in ref && ref.doi) cite.identifier = `https://doi.org/${ref.doi}`;
    else if ("pmid" in ref && ref.pmid)
      cite.identifier = `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`;
    else if ("url" in ref && ref.url) cite.identifier = ref.url;
    return cite;
  });

  const page: JsonLd = {
    "@type": "MedicalWebPage",
    "@id": `${url}#page`,
    url,
    name: score.name,
    description,
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
    citation: citations,
    // The review date is real: it comes from the changelog every score carries,
    // and the same value is rendered in the page's trust strip.
    ...(latest ? { lastReviewed: latest.date } : {}),
    // audience is the honest scope — this is an instrument for clinicians, not
    // patient-facing advice, and the disclaimer on every page says so.
    audience: { "@type": "MedicalAudience", audienceType: "Clinician" },
  };

  const app: JsonLd = {
    "@type": "SoftwareApplication",
    "@id": `${url}#app`,
    name: `${score.name} calculator`,
    url,
    applicationCategory: "HealthApplication",
    operatingSystem: "Any (runs in a web browser)",
    softwareVersion: score.version,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": ORG_ID },
  };

  return [page, app];
}

/** Wraps one or more nodes in a single @graph, so a page emits one script. */
export function graph(nodes: JsonLd[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
