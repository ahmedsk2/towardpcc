import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";
import { scoreDescription } from "@/content/score-description";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ValidationBadge } from "@/components/calculator/validation-badge";
import { ScoreTabs, type ScoreTab } from "@/components/calculator/score-tabs";
import { InterpretationTable, TrustStrip } from "@/components/calculator/score-meta";
import { Breadcrumbs } from "@/components/nav/breadcrumbs";
import { breadcrumbSchema, calculatorSchema, graph } from "@/lib/structured-data";

const c = site.calculators;

const REASON_LABELS: Record<string, string> = {
  "initial-release": "Initial release",
  "formula-correction": "Formula correction",
  "new-reference": "New reference",
  clarification: "Clarification",
};

const linkClass =
  "text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent";

export function generateStaticParams() {
  return listScores({ status: "published" }).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const score = getScore(slug);
  if (!score) return { title: "Calculator not found" };

  // Built from each score's own data rather than appending its name to the
  // shared catalogue lede, which put 17 of 22 past the ~160 characters a search
  // result displays and left all 22 sharing an identical tail.
  const description = scoreDescription(score);

  return {
    title: score.name,
    description,
    // Without these all 22 calculators shared one social preview inherited from
    // the site defaults, so every shared link looked like the same page.
    openGraph: { title: `${score.name} · TowardPCC`, description },
    twitter: { title: `${score.name} · TowardPCC`, description },
  };
}

export default async function CalculatorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const score = getScore(slug);
  if (!score || score.status !== "published") notFound();

  // Same-category siblings, so a clinician who opened the wrong score can step
  // sideways instead of going back to the index.
  const related = listScores({ status: "published" })
    .filter((s) => s.category === score.category && s.slug !== score.slug)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 6);

  /**
   * These four used to stack as full-width prose sections below the form,
   * which is most of why the page read as a wall of text. As panels they cost
   * the height of the tallest one rather than the sum of all four.
   *
   * The measure is 58ch, not the 68ch it was, because `ch` is the width of the
   * "0" glyph and this body face is narrower than that in ordinary lowercase
   * text. 68ch measured 686px, which renders 82 characters per line — well past
   * the 45-75 that stays comfortable to read, and a real part of why this zone
   * felt heavy. 58ch lands near 70. The unit reads as though it means
   * characters and does not.
   *
   * They are server components passed into the client form as children, so the
   * score definition never crosses the RSC boundary as data.
   */
  const tabs: ScoreTab[] = [
    {
      id: "formula",
      label: c.formulaHeading,
      content: <p className="max-w-[58ch] leading-relaxed text-ink-body">{score.formula?.en}</p>,
    },
    {
      id: "limitations",
      label: c.limitationsHeading,
      content: (
        // The accepted-range list that used to live here is gone: every range
        // now sits in its own field, where a rejected value is actually being
        // corrected, rather than in a list at the bottom of the page.
        <p className="max-w-[58ch] leading-relaxed text-ink-body">{score.notes.en}</p>
      ),
    },
    {
      id: "evidence",
      label: c.evidenceHeading,
      content: (
        <div className="flex flex-col gap-8">
          <InterpretationTable score={score} />
          <div>
            <h3 className="font-display text-lg font-medium text-ink-strong">
              {c.referencesHeading}
            </h3>
            <ol className="mt-3 max-w-[58ch] list-decimal space-y-3 pl-5 leading-relaxed text-ink-body">
              {score.references.map((ref, i) => (
                <li key={i}>
                  {ref.citation}
                  {/* Stored on every citation and previously never rendered —
                      it is the editorial note on why this source matters. */}
                  {ref.note ? (
                    <span className="mt-1 block text-[13px] text-ink-muted">{ref.note}</span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap gap-3 font-numeric text-xs">
                    {"pmid" in ref && ref.pmid ? (
                      <a
                        className={linkClass}
                        href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`}
                      >
                        PMID {ref.pmid}
                      </a>
                    ) : null}
                    {"doi" in ref && ref.doi ? (
                      <a className={linkClass} href={`https://doi.org/${ref.doi}`}>
                        DOI {ref.doi}
                      </a>
                    ) : null}
                    {"url" in ref && ref.url ? (
                      <a className={linkClass} href={ref.url}>
                        Source
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "version",
      label: c.versionHeading,
      content: (
        <div className="max-w-[58ch]">
          <ValidationBadge validators={score.validators} />
          <ul className="mt-6 list-none space-y-3 text-sm text-ink-body">
            {score.changelog.map((entry) => (
              <li key={entry.version} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="numeric text-ink-muted tabular-nums">{entry.date}</span>
                <span className="numeric font-medium text-ink-strong">v{entry.version}</span>
                {/* Also stored on every entry and never previously shown. */}
                {entry.reason ? (
                  <span className="rounded-full border border-border bg-surface-sunken px-2.5 py-0.5 font-numeric text-[11px] text-ink-muted">
                    {REASON_LABELS[entry.reason] ?? entry.reason}
                  </span>
                ) : null}
                <span className="w-full leading-relaxed">{entry.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      {/* Per-calculator graph: the page as a clinical reference, the calculator
          as a free tool, and the trail back to the catalogue. Every value is
          drawn from data this page already renders — citations, version, and
          the review date shown in the trust strip. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            ...calculatorSchema(score, scoreDescription(score)),
            breadcrumbSchema([
              { name: site.nav.calculators, path: "/calculators" },
              { name: score.name, path: `/calculators/${score.slug}` },
            ]),
          ]),
        }}
      />
      <Breadcrumbs
        trail={[{ href: "/calculators", label: site.nav.calculators }, { label: score.name }]}
      />

      <header className="mt-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl">
          {score.name}
        </h1>
        <TrustStrip score={score} />
      </header>

      <div className="mt-8">
        {/* Everything below the inputs is passed in as children so it renders
            in the grid's left column. A sticky element only travels within its
            parent: when the grid held nothing but the inputs, a two-input score
            gave the result rail 11px of travel on a 2443px page. */}
        <CalculatorForm slug={score.slug}>
          <ScoreTabs items={tabs} />

          {related.length > 0 ? (
            <section className="mt-12 border-t border-border pt-8" data-print="hide">
              <h2 className="font-display text-xl font-medium text-ink-strong">
                Other {c.categoryLabels[score.category].toLowerCase()} scores
              </h2>
              <ul className="mt-4 grid list-none gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/calculators/${r.slug}`}
                      className="group flex h-full flex-col justify-between gap-2 rounded-lg border border-border bg-surface-raised px-5 py-4 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="font-display text-[15px] font-medium text-ink-strong">
                        {r.name}
                      </span>
                      <span className="font-numeric text-[11px] text-ink-muted">
                        v{r.version}
                        <span className="ml-3 text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          Open →
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-lg font-medium text-ink-strong">
              {c.disclaimerHeading}
            </h2>
            <Callout tone="note" className="mt-3 max-w-[58ch]">
              {c.disclaimer}
            </Callout>
          </section>
        </CalculatorForm>
      </div>
    </div>
  );
}
