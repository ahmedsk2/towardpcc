import Link from "next/link";
import { Card, StatusChip } from "@towardpcc/ui";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";

const pillars = [
  { href: "/calculators", ...site.pillars.calculators },
  { href: "/knowledge", ...site.pillars.knowledge },
  { href: "/data", ...site.pillars.data },
  { href: "/services", ...site.pillars.services },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6">
      <section className="max-w-3xl py-20 md:py-28">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong md:text-6xl">
          {site.home.heading}
        </h1>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed">{site.home.lede}</p>
        <p className="mt-4 font-numeric text-sm tracking-[0.08em] text-ink-muted uppercase">
          {site.home.status}
        </p>
      </section>

      <section aria-labelledby="pillars-heading" className="pb-24">
        <h2 id="pillars-heading" className="sr-only">
          {site.home.pillarsHeading}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((p) => (
            <Reveal key={p.href}>
              <Link
                href={p.href}
                className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Card className="h-full transition-colors duration-150 group-hover:border-ink-muted/40">
                  <StatusChip tone={p.href === "/calculators" ? "accent" : "neutral"}>
                    {p.status}
                  </StatusChip>
                  <h3 className="mt-3 font-display text-xl font-medium text-ink-strong">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{p.description}</p>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
