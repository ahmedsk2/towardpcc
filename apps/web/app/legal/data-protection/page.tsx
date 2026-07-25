import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";

const dp = site.dataProtection;

export const metadata = {
  title: dp.title,
  description: dp.metaDescription,
};

export default function DataProtectionPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong">
        {dp.heading}
      </h1>
      <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-body">{dp.lede}</p>

      <div className="mt-12 flex flex-col gap-10">
        {dp.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-medium text-ink-strong">{section.heading}</h2>
            <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">{section.body}</p>
          </section>
        ))}
      </div>

      <Callout tone="note" className="mt-12 text-[13px]">
        {dp.pendingNote}
      </Callout>
    </div>
  );
}
