import { PillarPage } from "@/components/pillar/pillar-page";
import { PillarRequestForm } from "@/components/pillar/pillar-request-form";
import { StageTimeline } from "@/components/stage-timeline";
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
      {/* Sits before the interest form deliberately: someone about to register
          should see what stage they would be joining, and what has to be
          settled first, before they decide to. */}
      <section aria-labelledby="registry-stages" className="mt-16">
        <h2
          id="registry-stages"
          className="font-display text-2xl font-bold tracking-tight text-ink-strong md:text-3xl"
        >
          {d.stagesHeading}
        </h2>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-muted">{d.stagesLede}</p>
        <StageTimeline stages={d.stages} currentIndex={d.currentStage} className="mt-10" />
      </section>

      <PillarRequestForm
        heading={site.pillarPages.data.formHeading}
        action={submitData}
        form={site.forms.data}
      />
    </PillarPage>
  );
}
