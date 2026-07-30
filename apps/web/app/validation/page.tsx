import type { Metadata } from "next";
import Link from "next/link";
import { listScores, registry } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { PageHero } from "@/components/page-hero";
import { site } from "@/content/site";

/**
 * Turns "validation pending" from an admission into an invitation.
 *
 * Every calculator carries two reviewer slots and today every one of them is
 * empty. The site already says so on each score — hiding it was never an
 * option — but saying it 22 times without ever explaining what review means, or
 * how someone could do it, leaves the largest open question about the platform
 * unanswered.
 *
 * The status table is generated from the definitions, so it cannot flatter:
 * when a reviewer is recorded the row changes here and the badge changes on the
 * score, from the same source.
 *
 * No dedicated volunteer form. Adding one means a new SubmissionType and a
 * Prisma migration against production for a flow that will run a handful of
 * times; /contact already reaches the same inbox.
 */
export const metadata: Metadata = {
  title: "Clinical validation",
  description:
    "How TowardPCC scores are reviewed, the current status of all 22, and how to volunteer as a validator.",
};

const c = site.calculators;

export default function ValidationPage() {
  const published = listScores({ status: "published" });
  const rows = registry
    .filter((s) => published.some((p) => p.slug === s.slug))
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      category: c.categoryLabels[s.category],
      assigned: s.validators.filter((v) => v.status === "assigned").length,
      reviewers: s.validators
        .map((v) => (v.status === "assigned" ? v.name : null))
        .filter((n): n is string => Boolean(n)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const complete = rows.filter((r) => r.assigned === 2).length;

  return (
    <>
      <PageHero
        crumb="Clinical validation"
        eyebrow="Validation"
        title="Two clinicians, or the badge keeps saying pending"
        lede="Every score names its source and is tested against that source's worked examples. That makes it faithful to the literature. It does not make it reviewed. This page says exactly where that stands."
      />

      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <section>
          <h2 className="font-display text-2xl font-medium text-ink-strong">The standard</h2>
          <div className="mt-4 max-w-[68ch] leading-relaxed text-ink-body">
            <p>
              Two independent reviewers per score, each a clinician who uses it. Review means
              checking three things: that the formula matches the cited publication, that the
              interpretation bands match the edition we claim to implement, and that the limitations
              say what a clinician actually needs warning about.
            </p>
            <p className="mt-3">
              A reviewer is named on the score they reviewed, with their credentials and the date.
              Not a logo, not an endorsement of the platform: a specific person accountable for a
              specific number.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-medium text-ink-strong">
            Where it stands today
          </h2>
          <p className="mt-3 max-w-[68ch] leading-relaxed text-ink-body">
            {complete === 0 ? (
              <>
                <strong>None of the {rows.length} scores has completed review.</strong> The engine
                is tested to 100% coverage against published worked examples, and that is a
                different claim from clinical sign-off. Both are stated separately because they are
                different guarantees, and conflating them would be the easiest lie on this site.
              </>
            ) : (
              <>
                <strong>
                  {complete} of {rows.length} scores have completed review.
                </strong>{" "}
                The rest are pending and say so on their own pages.
              </>
            )}
          </p>

          <div className="mt-8 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Clinical validation status for every published calculator
              </caption>
              <thead className="border-b border-border-subtle bg-surface-sunken/50 text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Score
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap">
                    Reviewers
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-b border-border-subtle/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/calculators/${r.slug}`}
                        className="text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{r.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.assigned === 2 ? (
                        <span className="text-success-text">{r.reviewers.join(", ")}</span>
                      ) : (
                        <span className="numeric text-ink-muted tabular-nums">
                          {r.assigned} of 2
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-medium text-ink-strong">Volunteer</h2>
          <div className="mt-4 max-w-[68ch] leading-relaxed text-ink-body">
            <p>
              If you practise pediatric critical care and use any of these scores, you are qualified
              to review it. It takes about an hour per score: read the definition, check it against
              the paper, tell us what is wrong or missing.
            </p>
            <p className="mt-3">
              Write to us naming the scores you would review and your credentials. There is no
              committee and no form to fill in twice.
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-[15px] font-bold text-ink-on-accent transition-colors duration-150 hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Offer to review a score
          </Link>
        </section>

        <Callout tone="note" className="mt-14 max-w-[68ch]">
          Until a score is reviewed its page says so plainly. Nothing here is presented as validated
          because it is tested, and nothing is presented as tested because it is cited. They are
          three separate claims and the site keeps them apart.
        </Callout>
      </div>
    </>
  );
}
