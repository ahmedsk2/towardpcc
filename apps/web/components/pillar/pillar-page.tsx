import { Accordion, type AccordionItem } from "@towardpcc/ui";
import { Breadcrumbs } from "@/components/nav/breadcrumbs";
import { Counter } from "@/components/home/counter";
import { ImageSlot } from "@/components/image-slot";
import { Reveal } from "@/components/reveal";

export type PillarStat = { value: number; label: string; suffix?: string };
export type PillarCapability = { title: string; body: string };

/**
 * The shared layout for the three pillar pages. Before the redesign each of
 * these was a heading, two paragraphs and a form; this gives them the same
 * shape as the home page — gradient hero, real figures, capabilities, an
 * optional topic list, an FAQ, and the request form last.
 */
export function PillarPage({
  crumb,
  badge,
  heading,
  lede,
  stats,
  capabilitiesHeading,
  capabilities,
  topicsHeading,
  topics,
  faq,
  imageLabel,
  imageHint,
  children,
}: {
  crumb: string;
  badge: string;
  heading: string;
  lede: string;
  // Readonly throughout: site content is declared `as const`.
  stats: readonly PillarStat[];
  capabilitiesHeading: string;
  capabilities: readonly PillarCapability[];
  topicsHeading?: string;
  topics?: readonly string[];
  faq: readonly AccordionItem[];
  imageLabel: string;
  imageHint: string;
  children: React.ReactNode;
}) {
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
            <Breadcrumbs trail={[{ label: crumb }]} />
          </div>
          <p className="mt-8 mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[13px] font-semibold">
            <span aria-hidden="true" className="size-2 rounded-full bg-coral" />
            {badge}
          </p>
          <h1 className="max-w-[18ch] font-display text-4xl leading-[1.05] font-bold tracking-tight text-white md:text-6xl">
            {heading}
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-on-dark/90">{lede}</p>
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

      {/* Stats — overlapping the hero, as on the home page */}
      <div className="relative z-20 mx-auto -mt-16 max-w-[1280px] px-6">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-surface-sunken bg-surface-raised p-7 shadow-[0_20px_46px_-26px_rgba(61,21,38,0.4)]"
            >
              <dd className="m-0 font-numeric text-3xl font-semibold text-accent tabular-nums">
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
              <dt className="mt-2 text-sm text-ink-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Capabilities */}
      <section aria-labelledby="capabilities" className="mx-auto max-w-[1280px] px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2
                id="capabilities"
                className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl"
              >
                {capabilitiesHeading}
              </h2>
              <ul className="mt-8 flex list-none flex-col gap-5">
                {capabilities.map((c) => (
                  <li key={c.title} className="flex gap-4">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="mt-0.5 size-6 shrink-0 text-accent"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M8 12l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>
                      <strong className="block font-display text-[17px] font-semibold text-ink-strong">
                        {c.title}
                      </strong>
                      <span className="mt-1 block text-[15px] leading-relaxed text-ink-muted">
                        {c.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <ImageSlot label={imageLabel} hint={imageHint} className="aspect-4/3.4" />
          </Reveal>
        </div>
      </section>

      {/* Topics (knowledge only) */}
      {topics && topicsHeading ? (
        <section aria-labelledby="topics" className="bg-gradient-soft">
          <div className="mx-auto max-w-[1280px] px-6 py-20 text-center">
            <h2
              id="topics"
              className="font-display text-3xl font-bold tracking-tight text-ink-strong"
            >
              {topicsHeading}
            </h2>
            <ul className="mt-8 flex list-none flex-wrap justify-center gap-3">
              {topics.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-surface-sunken bg-surface-raised px-5 py-2.5 font-numeric text-[13px] text-ink-body"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-surface-raised">
        <div className="mx-auto max-w-[820px] px-6 py-24">
          <h2
            id="faq"
            className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-strong"
          >
            Questions
          </h2>
          <Accordion items={faq} />
        </div>
      </section>

      {/* Request form */}
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-[760px] px-6 py-24">{children}</div>
      </section>
    </>
  );
}
