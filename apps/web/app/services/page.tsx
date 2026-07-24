import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = { title: site.pillars.services.title };

export default function ServicesPage() {
  return <PillarStub {...site.pillars.services} />;
}
