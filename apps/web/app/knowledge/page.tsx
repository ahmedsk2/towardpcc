import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.pillars.knowledge.title,
  description: site.pillars.knowledge.description,
};

export default function KnowledgePage() {
  return <PillarStub {...site.pillars.knowledge} />;
}
