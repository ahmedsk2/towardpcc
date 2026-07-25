import { listScores } from "@towardpcc/scoring-engine";
import { site } from "@/content/site";
import { CalculatorsIndex } from "./calculators-index";

export const metadata = {
  title: site.calculators.indexTitle,
  description: site.calculators.indexLede,
};

export default function CalculatorsPage() {
  const scores = listScores({ status: "published" });
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong">
        {site.calculators.indexHeading}
      </h1>
      <p className="mt-4 max-w-[58ch] text-lg leading-relaxed">{site.calculators.indexLede}</p>
      <CalculatorsIndex scores={scores} />
    </div>
  );
}
