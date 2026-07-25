import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.pillars.services.title,
  description: site.pillars.services.description,
};

export default function ServicesPage() {
  return <PillarStub {...site.pillars.services} />;
}
