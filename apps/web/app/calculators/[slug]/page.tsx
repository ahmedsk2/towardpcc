import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ValidationBadge } from "@/components/calculator/validation-badge";
import { Breadcrumbs } from "@/components/nav/breadcrumbs";

const c = site.calculators;

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
  return { title: score.name, description: `${score.name} — ${c.indexLede}` };
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

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      <Breadcrumbs
        trail={[{ href: "/calculators", label: site.nav.calculators }, { label: score.name }]}
      />

      <header className="mt-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl">
          {score.name}
        </h1>
      </header>

      <div className="mt-8">
        <CalculatorForm slug={score.slug} />
      </div>

      <div className="mt-8">
        <ValidationBadge validators={score.validators} />
      </div>

      {/* Formula transparency (PRD §6.4). */}
      <section className="mt-12 border-t border-surface-sunken pt-8">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.formulaHeading}</h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-body">
          {(score.formula ?? score.notes).en}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.limitationsHeading}</h2>
        {/* Clinical caveats live in notes; the input-range list follows. */}
        <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-body">{score.notes.en}</p>
        <h3 className="mt-6 text-sm font-medium text-ink-strong">{c.acceptedRangesHeading}</h3>
        <ul className="mt-2 max-w-[65ch] list-disc space-y-2 pl-5 leading-relaxed text-ink-body">
          {score.inputs.map((input) => (
            <li key={input.id}>
              <span className="font-medium">{input.label.en}</span>
              {input.type === "numeric" ? (
                <span className="numeric text-ink-muted">
                  {" "}
                  — {input.min}–{input.max}
                  {input.unit.canonical ? ` ${input.unit.canonical}` : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.referencesHeading}</h2>
        <ol className="mt-3 max-w-[65ch] list-decimal space-y-3 pl-5 leading-relaxed text-ink-body">
          {score.references.map((ref, i) => (
            <li key={i}>
              {ref.citation}
              <span className="mt-1 flex flex-wrap gap-3 font-numeric text-xs">
                {"pmid" in ref && ref.pmid ? (
                  <a
                    className="text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`}
                  >
                    PMID {ref.pmid}
                  </a>
                ) : null}
                {"doi" in ref && ref.doi ? (
                  <a
                    className="text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    href={`https://doi.org/${ref.doi}`}
                  >
                    DOI {ref.doi}
                  </a>
                ) : null}
                {"url" in ref && ref.url ? (
                  <a
                    className="text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    href={ref.url}
                  >
                    Source
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.versionHeading}</h2>
        <p className="mt-2 font-numeric text-sm text-ink-muted">
          v{score.version} · {c.categoryLabels[score.category]}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink-body">
          {score.changelog.map((entry) => (
            <li key={entry.version} className="numeric">
              <span className="text-ink-muted">{entry.date}</span> v{entry.version} —{" "}
              {entry.summary}
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 ? (
        <section className="mt-12 border-t border-surface-sunken pt-8" data-print="hide">
          <h2 className="font-display text-xl font-medium text-ink-strong">
            Other {c.categoryLabels[score.category].toLowerCase()} scores
          </h2>
          <ul className="mt-4 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/calculators/${r.slug}`}
                  className="group flex h-full flex-col justify-between gap-2 rounded-lg border border-surface-sunken bg-surface-raised px-5 py-4 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

      <section className="mt-12 border-t border-surface-sunken pt-8">
        <h2 className="font-display text-lg font-medium text-ink-strong">{c.disclaimerHeading}</h2>
        <Callout tone="note" className="mt-3 max-w-[65ch]">
          {c.disclaimer}
        </Callout>
      </section>
    </div>
  );
}
