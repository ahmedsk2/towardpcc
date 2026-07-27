import { getScore, listScores } from "@towardpcc/scoring-engine";
import { PageHero } from "@/components/page-hero";
import { site } from "@/content/site";
import { CalculatorsIndex } from "./calculators-index";

export const metadata = {
  title: site.calculators.indexTitle,
  description: site.calculators.indexLede,
};

export default function CalculatorsPage() {
  const scores = listScores({ status: "published" });
  // Input counts come from each definition, so the index can never claim a
  // shape the calculator does not actually have.
  const inputCounts = Object.fromEntries(
    scores.map((s) => [s.slug, getScore(s.slug)?.inputs.length ?? 0]),
  );

  return (
    <>
      <PageHero
        crumb={site.nav.calculators}
        eyebrow={`${scores.length} live · every one referenced`}
        title={site.calculators.indexHeading}
        lede={site.calculators.indexLede}
      />
      <div className="mx-auto max-w-[1280px] px-6 pb-24">
        <CalculatorsIndex scores={scores} inputCounts={inputCounts} />
      </div>
    </>
  );
}
