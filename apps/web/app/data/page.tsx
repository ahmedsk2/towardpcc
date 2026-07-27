import { PillarPage } from "@/components/pillar/pillar-page";
import { PillarRequestForm } from "@/components/pillar/pillar-request-form";
import { site } from "@/content/site";
import { submitData } from "./actions";

export const metadata = {
  title: site.pillars.data.title,
  description: site.pillars.data.description,
};

const d = site.pillarDetail.data;

export default function DataPage() {
  return (
    <PillarPage
      crumb={site.nav.data}
      badge={d.badge}
      heading={d.heading}
      lede={d.lede}
      stats={d.stats}
      capabilitiesHeading={d.capabilitiesHeading}
      capabilities={d.capabilities}
      faq={d.faq}
      imageLabel="Registry dashboard"
      imageHint="save as public/images/registry-dashboard.jpg"
      imageSrc="/images/registry-dashboard.jpg"
      imageAlt="A PICU registry dashboard showing admissions, bed occupancy and length-of-stay charts."
    >
      <PillarRequestForm
        heading={site.pillarPages.data.formHeading}
        action={submitData}
        form={site.forms.data}
      />
    </PillarPage>
  );
}
