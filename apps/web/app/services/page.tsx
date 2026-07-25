import { PillarFormPage } from "@/components/forms/pillar-form-page";
import { site } from "@/content/site";
import { submitService } from "./actions";

export const metadata = {
  title: site.pillars.services.title,
  description: site.pillars.services.description,
};

export default function ServicesPage() {
  const page = site.pillarPages.services;
  return (
    <PillarFormPage
      status={site.pillars.services.status}
      title={site.pillars.services.title}
      lede={site.pillars.services.description}
      body={
        <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-ink-body">
          {page.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      }
      formHeading={page.formHeading}
      action={submitService}
      form={site.forms.service}
    />
  );
}
