import { site } from "@/content/site";

export const metadata = {
  title: site.about.title,
  description: site.about.metaDescription,
};

const a = site.about;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[760px] px-6 py-16 md:py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong md:text-5xl">
        {a.heading}
      </h1>
      <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-body">{a.description}</p>

      <section aria-labelledby="principles" className="mt-14">
        <h2
          id="principles"
          className="font-numeric text-xs tracking-[0.12em] text-ink-muted uppercase"
        >
          {a.principlesHeading}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {a.principles.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-surface-sunken bg-surface-raised p-6"
            >
              <h3 className="font-display text-lg font-medium text-ink-strong">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-roadmap" className="mt-14">
        <h2
          id="about-roadmap"
          className="font-numeric text-xs tracking-[0.12em] text-ink-muted uppercase"
        >
          {a.roadmapHeading}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {site.home.roadmap.columns.map((col) => (
            <div
              key={col.state}
              className="rounded-lg border border-surface-sunken bg-surface-raised p-6"
            >
              <p className="font-numeric text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                {col.state}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.items.map((item) => (
                  <li key={item} className="text-[15px] leading-relaxed text-ink-body">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
