import { PageHero } from "@/components/page-hero";

type Section = { heading: string; body: string };

/** Shared layout for the plain-English legal pages (terms, disclaimer). */
export function LegalPage({
  crumb,
  heading,
  lede,
  sections,
}: {
  crumb: string;
  heading: string;
  lede: string;
  sections: readonly Section[];
}) {
  return (
    <>
      <PageHero crumb={crumb} eyebrow="Legal" title={heading} lede={lede} />

      <div className="mx-auto max-w-[760px] px-6 pt-8 pb-24">
        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-xl font-semibold text-ink-strong">{s.heading}</h2>
              <p className="mt-3 max-w-[64ch] leading-relaxed text-ink-body">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
