import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = { title: site.pillars.knowledge.title };

export default function KnowledgePage() {
  return <PillarStub {...site.pillars.knowledge} />;
}
