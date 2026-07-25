import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.pillars.calculators.title,
  description: site.pillars.calculators.description,
};

export default function CalculatorsPage() {
  return <PillarStub {...site.pillars.calculators} chipTone="accent" />;
}
