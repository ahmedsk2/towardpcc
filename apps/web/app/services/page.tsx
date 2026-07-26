import { PillarPage } from "@/components/pillar/pillar-page";
import { PillarRequestForm } from "@/components/pillar/pillar-request-form";
import { site } from "@/content/site";
import { submitService } from "./actions";

export const metadata = {
  title: site.pillars.services.title,
  description: site.pillars.services.description,
};

const d = site.pillarDetail.services;

export default function ServicesPage() {
  return (
    <PillarPage
      crumb={site.nav.services}
      badge={d.badge}
      heading={d.heading}
      lede={d.lede}
      stats={d.stats}
      capabilitiesHeading={d.capabilitiesHeading}
      capabilities={d.capabilities}
      faq={d.faq}
      imageLabel="Research support"
      imageHint="abstract data / analysis visual"
    >
      <PillarRequestForm
        heading={site.pillarPages.services.formHeading}
        action={submitService}
        form={site.forms.service}
      />
    </PillarPage>
  );
}
