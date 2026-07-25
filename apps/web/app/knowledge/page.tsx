import { PillarFormPage } from "@/components/forms/pillar-form-page";
import { site } from "@/content/site";
import { submitKnowledge } from "./actions";

export const metadata = {
  title: site.pillars.knowledge.title,
  description: site.pillars.knowledge.description,
};

export default function KnowledgePage() {
  const page = site.pillarPages.knowledge;
  return (
    <PillarFormPage
      status={site.pillars.knowledge.status}
      title={site.pillars.knowledge.title}
      lede={site.pillars.knowledge.description}
      body={
        <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-ink-body">
          {page.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      }
      formHeading={page.formHeading}
      action={submitKnowledge}
      form={site.forms.knowledge}
    />
  );
}
