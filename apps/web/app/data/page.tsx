import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = { title: site.pillars.data.title };

export default function DataPage() {
  return <PillarStub {...site.pillars.data} />;
}
