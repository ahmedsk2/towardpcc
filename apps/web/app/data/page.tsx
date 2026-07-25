import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.pillars.data.title,
  description: site.pillars.data.description,
};

export default function DataPage() {
  return <PillarStub {...site.pillars.data} />;
}
