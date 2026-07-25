import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.about.title,
  description: site.about.metaDescription,
};

export default function AboutPage() {
  return (
    <PillarStub
      title={site.about.heading}
      status={site.about.status}
      description={site.about.description}
    />
  );
}
