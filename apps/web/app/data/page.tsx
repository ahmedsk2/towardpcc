import { PillarFormPage } from "@/components/forms/pillar-form-page";
import { site } from "@/content/site";
import { submitData } from "./actions";

export const metadata = {
  title: site.pillars.data.title,
  description: site.pillars.data.description,
};

export default function DataPage() {
  const page = site.pillarPages.data;
  return (
    <PillarFormPage
      status={site.pillars.data.status}
      title={site.pillars.data.title}
      lede={site.pillars.data.description}
      body={
        <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-ink-body">
          {page.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      }
      formHeading={page.formHeading}
      action={submitData}
      form={site.forms.data}
    />
  );
}
