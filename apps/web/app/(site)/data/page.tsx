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
      // NO `imageSrc` UNTIL THE PILOT UNIT HAS APPROVED ONE IN WRITING.
      //
      // It carried `/images/registry-dashboard.jpg` until 2026-08-07, and that
      // was a live screenshot of the pilot unit's own Command Center: a real
      // 30-day admissions and discharges curve with real dates, and one real
      // consultant caseload. No patient names and no hospital named, but real
      // operating figures belonging to someone else.
      //
      // `content/site.ts` said all along that dashboard imagery "cannot be
      // published until the pilot unit approves it", and commit 9682cfd — "show
      // the registry's stage instead of imagery it cannot publish" — added the
      // StageTimeline below but never removed the image. So the repository
      // asserted the thing was unpublished while the site served it, which is
      // the exact failure mode this project keeps finding: a claim nobody
      // re-checked against what was actually running.
      //
      // The ImageSlot degrades to its designed placeholder and the StageTimeline
      // stands on its own, so the page reads correctly without it. Restore only
      // with either written permission on file, or a screenshot of a demo or
      // seeded instance that shows no real unit's figures.
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
