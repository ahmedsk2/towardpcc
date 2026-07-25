import { Callout } from "@towardpcc/ui";
import { site } from "@/content/site";

const p = site.pwa;

export const metadata = {
  title: p.installTitle,
  description: p.installLede,
};

function Steps({ heading, steps }: { heading: string; steps: readonly string[] }) {
  return (
    <div>
      <h2 className="font-display text-xl font-medium text-ink-strong">{heading}</h2>
      <ol className="mt-3 max-w-[60ch] list-decimal space-y-2 pl-5 leading-relaxed text-ink-body">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong">
        {p.installHeading}
      </h1>
      <p className="mt-4 max-w-[58ch] text-lg leading-relaxed">{p.installLede}</p>

      <div className="mt-12 flex flex-col gap-10">
        <Steps heading={p.installIosHeading} steps={p.installIosSteps} />
        <Steps heading={p.installAndroidHeading} steps={p.installAndroidSteps} />
        <Steps heading={p.installDesktopHeading} steps={p.installDesktopSteps} />
      </div>

      <Callout tone="note" className="mt-10 max-w-[60ch]">
        {p.offlineNote}
      </Callout>
    </div>
  );
}
