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
      // 1000x850. This was the worst of the four crops — 80% of a dashboard
      // showing through a 99px slit, which made the charts unreadable.
      imageAspect="aspect-[1000/850]"
      imageFit="contain"
      imageFrame
    >
      <PillarRequestForm
        heading={site.pillarPages.data.formHeading}
        action={submitData}
        form={site.forms.data}
      />
    </PillarPage>
  );
}
