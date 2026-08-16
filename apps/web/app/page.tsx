import { ComingSoon } from "@/components/coming-soon/coming-soon";
import { site } from "@/content/site";
import { withCounts } from "@/lib/published-counts";

const c = site.comingSoon;

/**
 * `/` SERVES THE HOLDING PAGE, at the founder's instruction (2026-08-11), until
 * they ask for the real home page back.
 *
 * The previous home page is parked verbatim at `app/home/page.tsx` and carries
 * the restore instructions in its own header. Nothing else on the site moved:
 * every calculator, and every other page, is still reachable at the URL it
 * always had.
 */
export const metadata = {
  title: { absolute: c.metaTitle },
  description: withCounts(c.lede),
};

export default function HomePage() {
  return <ComingSoon />;
}
