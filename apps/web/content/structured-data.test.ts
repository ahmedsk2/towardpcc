import { describe, expect, it } from "vitest";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import {
  breadcrumbSchema,
  calculatorSchema,
  graph,
  organizationSchema,
  webSiteSchema,
} from "../lib/structured-data";

/**
 * Structured data has a specific failure mode: it is invisible to the people
 * who would notice it being wrong. Nobody reads the JSON-LD, so a claim that
 * drifts from the page — a rating that does not exist, a search endpoint that
 * is not there, a review date nothing renders — survives indefinitely and is
 * believed by machines.
 *
 * On a site whose whole posture is "never claim more than is true", that is the
 * one place an untrue claim could hide. These assertions are mostly negative
 * for that reason.
 */
const parse = (json: string) => JSON.parse(json) as { "@graph": Record<string, unknown>[] };

describe("structured data — honesty", () => {
  it("claims no ratings, because there are none", () => {
    const all = graph([organizationSchema(), webSiteSchema()]);
    expect(all).not.toMatch(/aggregateRating|reviewCount|ratingValue/i);
  });

  it("advertises no search endpoint, because the catalogue search is client-side", () => {
    // A SearchAction would point a crawler at a query-string URL that does not
    // exist — and the calculator routes are forbidden from reading one at all.
    expect(JSON.stringify(webSiteSchema())).not.toMatch(/SearchAction|potentialAction/);
  });

  it("lists no sameAs profiles until real ones are supplied", () => {
    expect(JSON.stringify(organizationSchema())).not.toMatch(/sameAs/);
  });

  it("emits one well-formed graph, not a pile of loose nodes", () => {
    const parsed = parse(graph([organizationSchema(), webSiteSchema()]));
    expect(parsed["@graph"]).toHaveLength(2);
    expect(JSON.parse(graph([]))["@context"]).toBe("https://schema.org");
  });
});

describe("structured data — calculators", () => {
  const slugs = listScores({ status: "published" }).map((s) => s.slug);

  it("covers every published score", () => {
    expect(slugs.length).toBe(25);
  });

  it.each(slugs)("%s describes both the page and the tool", (slug) => {
    const score = getScore(slug)!;
    const [page, app] = calculatorSchema(score, "a description");
    expect(page!["@type"]).toBe("MedicalWebPage");
    expect(app!["@type"]).toBe("SoftwareApplication");
  });

  it.each(slugs)("%s cites every reference it renders", (slug) => {
    const score = getScore(slug)!;
    const [page] = calculatorSchema(score, "a description");
    // The citation count must match what the Evidence tab shows. A mismatch
    // means the machine-readable version and the human one disagree.
    expect((page!.citation as unknown[]).length).toBe(score.references.length);
  });

  it.each(slugs)("%s states a review date that comes from its changelog", (slug) => {
    const score = getScore(slug)!;
    const [page] = calculatorSchema(score, "a description");
    const dates = score.changelog.map((e) => e.date);
    expect(dates).toContain(page!.lastReviewed);
  });

  it.each(slugs)("%s is offered free, matching the page", (slug) => {
    const score = getScore(slug)!;
    const [, app] = calculatorSchema(score, "a description");
    expect(app!.isAccessibleForFree).toBe(true);
    expect((app!.offers as { price: string }).price).toBe("0");
  });
});

describe("structured data — breadcrumbs", () => {
  it("numbers positions from 1 and resolves absolute URLs", () => {
    const crumbs = breadcrumbSchema([
      { name: "Calculators", path: "/calculators" },
      { name: "P/F ratio", path: "/calculators/pf-ratio" },
    ]);
    const items = crumbs.itemListElement as { position: number; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    for (const i of items) expect(i.item).toMatch(/^https?:\/\//);
  });
});
