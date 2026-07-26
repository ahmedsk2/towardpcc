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
      imageHint="a real search result, page-level"
    >
      <PillarRequestForm
        heading={site.pillarPages.knowledge.formHeading}
        action={submitKnowledge}
        form={site.forms.knowledge}
      />
    </PillarPage>
  );
}
