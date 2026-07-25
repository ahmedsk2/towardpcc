import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.contactPage.title,
  description: site.contactPage.metaDescription,
};

export default function ContactPage() {
  return (
    <PillarStub
      title={site.contactPage.heading}
      status={site.contactPage.status}
      description={site.contactPage.description}
    />
  );
}
