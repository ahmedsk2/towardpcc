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
      imageLabel="Registry"
      imageHint="save as public/images/care-teddy-oxygen.jpg"
      imageSrc="/images/care-teddy-oxygen.jpg"
      imageAlt="A teddy bear tucked into a hospital bed wearing an oxygen mask."
    >
      <PillarRequestForm
        heading={site.pillarPages.data.formHeading}
        action={submitData}
        form={site.forms.data}
      />
    </PillarPage>
  );
}
