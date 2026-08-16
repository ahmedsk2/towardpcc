import { CardiopulmonaryScene } from "@/components/home/cardiopulmonary-scene";
import { site } from "@/content/site";

const c = site.comingSoon;

/**
 * THE PRE-LAUNCH HOLDING PAGE, served at `/` on the founder's instruction until
 * they ask for the home page back.
 *
 * IT CARRIES NOTHING BUT THE HERO. No header, no footer, no navigation, no
 * links, no counts, no contact — a site under construction that describes
 * itself at length is not under construction. Who it is for, and that it is
 * coming, is the whole brief.
 *
 * The chrome is absent because it lives in `app/(site)/layout.tsx` and this
 * page sits outside that group. See the note in the root layout.
 *
 * The figure is the existing `CardiopulmonaryScene`: a child's heart and lungs
 * as a wire mesh, anatomy covered by its own test suite, geometry built on the
 * server so it costs nothing at runtime.
 */
export const metadata = {
  title: { absolute: c.metaTitle },
  description: c.metaDescription,
};

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-dvh items-center overflow-hidden bg-gradient-hero text-ink-on-dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_12%_18%,rgba(255,122,107,0.3),transparent_70%),radial-gradient(700px_500px_at_88%_78%,rgba(234,58,87,0.34),transparent_70%)]"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-[1180px] items-center gap-10 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <p className="font-numeric text-eyebrow tracking-[0.16em] text-coral uppercase">
            {c.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-display-1 leading-[1.02] font-bold tracking-[-0.02em]">
            {c.heading}
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-ink-on-dark/85">{c.lede}</p>
        </div>
        {/* No card and no border: the figure sits on the gradient, as it does
            on the home page. A boxed figure reads as pasted in. */}
        <div>
          <CardiopulmonaryScene vitals={false} />
        </div>
      </div>
    </main>
  );
}
