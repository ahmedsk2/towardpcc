import type { Metadata } from "next";
import Link from "next/link";
import { listScores, registry } from "@towardpcc/scoring-engine";
import { Callout } from "@towardpcc/ui";
import { PageHero } from "@/components/page-hero";
import {
  ContrastChip,
  CountChip,
  CoverageChip,
  NetworkChip,
  ReviewChip,
} from "@/components/trust/evidence-chip";
import { COVERAGE, PRIVACY_SPEC, evidence } from "@/lib/evidence";
import { site } from "@/content/site";

/**
 * The page an institution looks for when deciding whether this is real.
 *
 * One rule governs what may appear here: every claim is either ENFORCED by
 * something that runs on each release, or DERIVED from data in this repository.
 * Nothing is a snapshot.
 *
 * That is why there is no "828 tests passing" figure, which the source plan
 * asked for. A test count is true on the day it is written and quietly wrong
 * afterwards, and a stale number on the page whose entire subject is
 * trustworthiness is worse than no number. What is stated instead is the gate:
 * the engine cannot merge below 100% coverage. That claim stays true without
 * anyone maintaining it.
 */
export const metadata: Metadata = {
  title: "How to check this",
  description:
    "The claims TowardPCC makes, and how each one is enforced or can be verified: privacy, coverage, accessibility, data location and backups.",
};

const c = site.calculators;

function Claim({
  heading,
  how,
  chip,
  children,
}: {
  heading: string;
  how: string;
  /** The evidence, where the build can compute it. Omitted where it cannot. */
  chip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="font-display text-xl font-medium text-ink-strong">{heading}</h2>
      <div className="mt-3 max-w-[58ch] leading-relaxed text-ink-body">{children}</div>
      <p className="mt-4 flex max-w-[58ch] items-start gap-2.5 rounded-md border border-border-subtle bg-surface-sunken/60 p-3.5 font-numeric text-[13px] text-ink-muted">
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
          ✓
        </span>
        <span>
          <strong className="font-semibold text-ink-strong">How it is checked: </strong>
          {how}
        </span>
      </p>
      {/* The proof itself, where one can be computed. Five of the seven claims
          have a chip; residency and backups do not, because `me-riyadh-1` lives
          only in a comment and the last restore-drill date lives in prose. A
          chip showing an underivable number is the decorative assertion this
          page exists to refuse — see lib/evidence.ts. */}
      {chip}
    </section>
  );
}

export default function TrustPage() {
  // Every figure on this page comes from lib/evidence.ts, which is the only
  // module allowed to compute one — so the heading and the chip beside it
  // cannot disagree. These four were previously derived inline here and
  // rendered only as words inside a heading.
  const e = evidence();
  const scores = listScores({ status: "published" });
  const citations = e.citations;
  const validated = e.validated;

  return (
    <>
      <PageHero
        crumb="How to check this"
        eyebrow="Trust"
        title="Every claim on this site, and how to check it"
        lede="We would rather be checkable than impressive. Each claim below is either enforced by something that runs on every release, or countable from the source."
      />

      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="flex flex-col gap-12">
          <Claim
            heading="Nothing you type into a calculator is transmitted"
            chip={<NetworkChip spec={PRIVACY_SPEC} />}
            how="A test fills a calculator with the network disabled, asserts the result is still correct, and fails the build if any request carries data. A second scan fails the build if any file under the calculator routes reads the query string or declares a server action."
          >
            <p>
              The scoring engine ships to your browser and runs there. Shareable links carry your
              inputs in the URL <em>fragment</em>, the part after the <code>#</code>, which browsers
              never send to a server. This is the one guarantee the whole platform is built around,
              so it is enforced by architecture and not by policy.
            </p>
          </Claim>

          <Claim
            heading={`${scores.length} calculators, ${citations} citations, none of them decorative`}
            chip={<CountChip scores={scores.length} citations={citations} />}
            how="Both figures are counted from the score definitions at build time. The build fails if any score carries a reference without at least one locator — a PMID, a DOI or a URL. It checks that a locator is present, not that it still resolves: that would need a live network call, and the test suite is deliberately offline. Locators are re-checked by hand, and a source that has gone missing is said to have gone missing rather than left as a dead link."
          >
            <p>
              Every score names the publication it comes from, and gives you a way to look it up.
              Where a value in a score has no published source — or had one that is no longer
              retrievable — it is marked <code>[NEEDS SOURCE]</code> in the limitations rather than
              quietly presented as evidence.
            </p>
          </Claim>

          <Claim
            heading="The engine cannot merge below full test coverage"
            chip={<CoverageChip percent={e.coveragePercent} axes={Object.keys(COVERAGE)} />}
            how="The coverage gate is set to 100% for lines, branches, functions and statements. It runs in CI, and a pull request that drops below it does not merge."
          >
            <p>
              Each score is tested against worked examples reproduced from its own source
              publication, so the tests check agreement with the literature rather than agreement
              with our implementation.
            </p>
          </Claim>

          <Claim
            heading={
              validated > 0
                ? `${validated} of ${registry.length} scores have completed clinical review`
                : "Clinical validation is pending, and the badges say so"
            }
            how="The validation state lives in each score's definition and is rendered on its page. Nothing shows a reviewer's name until one is recorded."
            chip={<ReviewChip validated={validated} total={registry.length} />}
          >
            <p>
              Every calculator carries two reviewer slots. Today they read{" "}
              <strong>{c.validationPending.toLowerCase()}</strong>, and they will keep saying that
              until real clinicians have reviewed them. Hiding an empty slot would be the easy
              choice; showing it is the honest one, because it tells you exactly how much human
              review stands behind a number.
            </p>
          </Claim>

          <Claim
            heading="Accessibility is asserted, not assumed"
            chip={<ContrastChip ratio={e.contrast} />}
            how="Colour contrast is computed from the shipped stylesheet in a unit test (every border token against every surface), and layout is checked at 375, 768 and 1440 pixels on every page. Reduced-motion behaviour is tested too."
          >
            <p>
              The target is WCAG 2.2 AA. It is checked mechanically because the alternative is
              checking it once and hoping: an earlier release shipped a border at 1.056:1 (visually
              absent), while a hand-maintained test passed, because it was asserting a colour the
              interface was not actually using.
            </p>
          </Claim>

          <Claim
            heading="Where your data is, stated precisely"
            how="The database runs in Oracle Cloud's Riyadh region. Requests reach it through a content-delivery network, which is disclosed rather than glossed."
          >
            <p>
              Anything the platform stores (a pilot request, a message you send us) is stored in
              Saudi Arabia. Requests travel through a global delivery network before reaching those
              servers, so while your data is <em>stored</em> in the Kingdom, the request carrying it
              may be <em>processed</em> outside it in transit. Calculators are unaffected: they
              transmit nothing, so there is nothing to route.
            </p>
            {/* Named rather than omitted. The exposure is small — the operator
                notification carries a category and a link and nothing about the
                person who wrote in — but "small enough not to mention" is the
                reasoning that produced every claim this site has had to correct.
                See ADR-0004 decision 5. */}
            <p className="mt-3">
              One thing leaves deliberately, and it is not about you: when something arrives, our
              own team is emailed a notification through a relay outside the Kingdom. That message
              says only which kind of enquiry arrived and links to it. It carries no name, no
              address and none of what you wrote. We do not email you back automatically at all. Any
              reply comes from a person.
            </p>
            <p className="mt-3">
              <Link
                href="/legal/data-protection"
                className="text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                How we handle data, in full
              </Link>
            </p>
          </Claim>

          <Claim
            heading="Backups exist and the restore has been rehearsed"
            how="Nightly encrypted dumps to in-region object storage, and a restore drill that was actually performed: dump restored into a scratch database, table and row counts matched, admin record intact."
          >
            <p>
              A backup nobody has restored is a hypothesis. The audit log is additionally
              append-only at the database level: the application&rsquo;s own role has UPDATE and
              DELETE revoked on it, so even a complete compromise of the application cannot rewrite
              its history.
            </p>
          </Claim>
        </div>

        <Callout tone="note" className="mt-14 max-w-[58ch]">
          If a claim on this site cannot be checked, that is a defect. Tell us at{" "}
          <a
            href={`mailto:${site.utility.email}`}
            className="underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            {site.utility.email}
          </a>{" "}
          and it will be corrected or removed.
        </Callout>
      </div>
    </>
  );
}
