import { getScore, listScores } from "@towardpcc/scoring-engine";
import { PageHero } from "@/components/page-hero";
import { inputCountLabel } from "@/lib/input-count";
import { site } from "@/content/site";
import { CalculatorsIndex } from "./calculators-index";

export const metadata = {
  title: site.calculators.indexTitle,
  description: site.calculators.indexLede,
};

export default function CalculatorsPage() {
  const scores = listScores({ status: "published" });
  // Input counts come from each definition, so the index can never claim a
  // shape the calculator does not actually have. Where a score asks
  // conditionally the claim is a RANGE, because it has no single true count:
  // PRISM puts 26 fields on screen for the 4-hour window and 22 for the other
  // two, and either number alone is false in one direction.
  const inputCounts = Object.fromEntries(
    scores.flatMap((s) => {
      const def = getScore(s.slug);
      return def ? [[s.slug, inputCountLabel(def)] as const] : [];
    }),
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
