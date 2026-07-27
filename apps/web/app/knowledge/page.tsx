import { PillarPage } from "@/components/pillar/pillar-page";
import { PillarRequestForm } from "@/components/pillar/pillar-request-form";
import { site } from "@/content/site";
import { submitKnowledge } from "./actions";

export const metadata = {
  title: site.pillars.knowledge.title,
  description: site.pillars.knowledge.description,
};

const d = site.pillarDetail.knowledge;

export default function KnowledgePage() {
  return (
    <PillarPage
      crumb={site.nav.knowledge}
      badge={d.badge}
      heading={d.heading}
      lede={d.lede}
      stats={d.stats}
      capabilitiesHeading={d.capabilitiesHeading}
      capabilities={d.capabilities}
      topicsHeading={d.topicsHeading}
      topics={d.topics}
      faq={d.faq}
      imageLabel="Library screenshot"
      imageHint="save as public/images/library-screenshot.jpg"
      imageSrc="/images/library-screenshot.jpg"
      imageAlt="A PedsCC Library search result linking to an exact page inside a document."
      // 1400x1014. A screenshot is product evidence — cropping it destroys the
      // thing it exists to show, so it renders whole inside window chrome.
      imageAspect="aspect-[1400/1014]"
      imageFit="contain"
      imageFrame
    >
      <PillarRequestForm
        heading={site.pillarPages.knowledge.formHeading}
        action={submitKnowledge}
        form={site.forms.knowledge}
      />
    </PillarPage>
  );
}
