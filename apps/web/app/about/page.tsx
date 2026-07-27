import { Breadcrumbs } from "@/components/nav/breadcrumbs";
import { ImageSlot } from "@/components/image-slot";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";

export const metadata = {
  title: site.about.title,
  description: site.about.metaDescription,
};

const a = site.about;
const f = site.home.founder;

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_20%_20%,rgba(255,122,107,0.28),transparent_70%),radial-gradient(600px_400px_at_85%_80%,rgba(234,58,87,0.3),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 pt-8 pb-24">
          <div className="[&_a]:text-ink-on-dark/70 [&_[aria-current]]:text-white">
            <Breadcrumbs trail={[{ label: site.nav.about }]} />
          </div>
          <p className="mt-8 mb-4 font-numeric text-[12px] tracking-[0.14em] text-coral uppercase">
            {a.visionHeading}
          </p>
          <h1 className="max-w-[22ch] font-display text-4xl leading-[1.05] font-bold tracking-tight text-white md:text-5xl">
            {site.footer.vision}
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-on-dark/90">
            {a.description}
          </p>
        </div>
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-10 block h-16 w-full md:h-24"
        >
          <path
            d="M0,58 C130,96 220,16 360,44 C500,72 580,14 720,46 C860,78 940,20 1080,48 C1200,72 1320,84 1440,64 L1440,110 L0,110 Z"
            fill="var(--color-surface-page)"
          />
        </svg>
      </section>

      {/* Founder */}
      <section aria-labelledby="founder" className="mx-auto max-w-[1280px] px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-[280px_1fr]">
          <Reveal>
            <ImageSlot
              label="Portrait"
              hint="save as public/images/founder-portrait.jpg"
              src="/images/founder-portrait.jpg"
              alt="Dr. Ahmed Alkhalifah"
              className="aspect-square max-w-[280px]"
            />
          </Reveal>
          <Reveal>
            <div>
              <p className="mb-4 inline-flex rounded-full bg-accent-tint px-4 py-1.5 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">
                {f.eyebrow}
              </p>
              <h2
                id="founder"
                className="font-display text-3xl font-bold tracking-tight text-ink-strong"
              >
                {f.name}
              </h2>
              <p className="mt-1 font-numeric text-sm text-accent">{f.role}</p>
              <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-ink-body">
                {f.body}
              </p>
              <ul className="mt-6 flex list-none flex-wrap gap-2.5">
                {f.credentials.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-peach bg-accent-tint px-3.5 py-1.5 font-numeric text-[11.5px] text-accent-deep"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[62ch] text-sm text-ink-muted">{f.publications}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles" className="bg-surface-raised">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <h2
            id="principles"
            className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-strong"
          >
            {a.principlesHeading}
          </h2>
          <ul className="grid list-none gap-6 sm:grid-cols-2">
            {a.principles.map((p) => (
              <li key={p.title}>
                <Reveal>
                  <div className="h-full rounded-lg border border-surface-sunken bg-surface-page p-7">
                    <h3 className="font-display text-lg font-semibold text-ink-strong">
                      {p.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{p.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Brand story */}
      <section aria-labelledby="story" className="bg-gradient-soft">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <h2
            id="story"
            className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-strong"
          >
            {a.storyHeading}
          </h2>
          <ul className="grid list-none gap-6 md:grid-cols-3">
            {a.story.map((s) => (
              <li key={s.title}>
                <Reveal>
                  <div className="h-full rounded-lg border border-surface-sunken bg-surface-raised p-7">
                    <h3 className="font-display text-lg font-semibold text-ink-strong">
                      {s.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{s.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Honest roadmap */}
      <section aria-labelledby="about-roadmap" className="bg-surface-raised">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <h2
            id="about-roadmap"
            className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-strong"
          >
            {a.roadmapHeading}
          </h2>
          <ul className="grid list-none gap-6 md:grid-cols-3">
            {site.home.roadmap.columns.map((col) => (
              <li
                key={col.state}
                className="rounded-lg border border-surface-sunken bg-surface-page p-7"
              >
                <p className="font-numeric text-[11px] tracking-[0.1em] text-accent uppercase">
                  {col.state}
                </p>
                <ul className="mt-4 flex list-none flex-col gap-2.5">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="relative pl-5 text-[15px] leading-relaxed text-ink-body before:absolute before:top-2.5 before:left-0 before:size-1.5 before:rounded-full before:bg-accent"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
