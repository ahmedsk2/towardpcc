import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ValidationBadge } from "@/components/calculator/validation-badge";

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

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      <Link
        href="/calculators"
        className="font-numeric text-xs tracking-[0.06em] text-ink-muted uppercase hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← {c.backToIndex}
      </Link>

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

      {/* Formula transparency (PRD §6.4): plain-text derivation from references. */}
      <section className="mt-12 border-t border-surface-sunken pt-8">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.formulaHeading}</h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-body">{score.notes.en}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium text-ink-strong">{c.limitationsHeading}</h2>
        <ul className="mt-3 max-w-[65ch] list-disc space-y-2 pl-5 leading-relaxed text-ink-body">
          {score.inputs.map((input) => (
            <li key={input.id}>
              <span className="font-medium">{input.label.en}</span>
              {input.type === "numeric" ? (
                <span className="numeric text-ink-muted">
                  {" "}
                  — plausible range {input.min}–{input.max}
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

      <section className="mt-12 border-t border-surface-sunken pt-8">
        <h2 className="font-display text-lg font-medium text-ink-strong">{c.disclaimerHeading}</h2>
        <Callout tone="note" className="mt-3 max-w-[65ch]">
          {c.disclaimer}
        </Callout>
      </section>
    </div>
  );
}
