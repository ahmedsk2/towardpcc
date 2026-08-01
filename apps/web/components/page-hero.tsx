import { Breadcrumbs } from "@/components/nav/breadcrumbs";

/**
 * Compact hero for the secondary pages (contact, legal). Same gradient band and
 * waveform edge as the pillar pages, at reduced height — these are pages people
 * arrive at with a task, not pages that need to sell anything.
 */
export function PageHero({
  crumb,
  title,
  lede,
  eyebrow,
}: {
  crumb: string;
  title: string;
  lede?: string;
  eyebrow?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_320px_at_20%_20%,rgba(255,122,107,0.26),transparent_70%),radial-gradient(500px_320px_at_85%_80%,rgba(234,58,87,0.28),transparent_70%)]"
      />
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pt-8 pb-16">
        <div className="[&_a]:text-ink-on-dark/70 [&_[aria-current]]:text-ink-on-dark">
          <Breadcrumbs trail={[{ label: crumb }]} />
        </div>
        {eyebrow ? (
          <p className="mt-8 mb-3 font-numeric text-eyebrow tracking-[0.14em] text-coral uppercase">
            {eyebrow}
          </p>
        ) : null}
        {/* `text-display-2`, not `text-4xl md:text-5xl`. The token is a
            clamp() — it scales continuously with the viewport instead of
            snapping once at 768px — and it is the SAME scale the calculator
            and pillar page titles already use, so a reader moving between
            sections is not shown three different h1 sizes for the same rank. */}
        <h1
          className={`${eyebrow ? "" : "mt-8"} max-w-[20ch] font-display text-display-2 leading-[1.05] font-bold tracking-tight text-ink-on-dark`}
        >
          {title}
        </h1>
        {lede ? (
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-ink-on-dark/90">{lede}</p>
        ) : null}
      </div>
      <svg
        viewBox="0 0 1440 110"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="relative z-10 block h-12 w-full md:h-20"
      >
        <path
          d="M0,58 C130,96 220,16 360,44 C500,72 580,14 720,46 C860,78 940,20 1080,48 C1200,72 1320,84 1440,64 L1440,110 L0,110 Z"
          fill="var(--color-surface-page)"
        />
      </svg>
    </section>
  );
}
