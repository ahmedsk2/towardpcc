import { Callout } from "@towardpcc/ui";
import { PageHero } from "@/components/page-hero";
import { site } from "@/content/site";

const dp = site.dataProtection;

export const metadata = {
  title: dp.title,
  description: dp.metaDescription,
};

export default function DataProtectionPage() {
  return (
    <>
      <PageHero crumb={dp.title} eyebrow="Legal" title={dp.heading} lede={dp.lede} />
      <div className="mx-auto max-w-[760px] px-6 pt-8 pb-24">
        <div className="mt-12 flex flex-col gap-10">
          {dp.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-medium text-ink-strong">
                {section.heading}
              </h2>
              <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">{section.body}</p>
            </section>
          ))}
        </div>

        {/* Per-feature collection table (§8.2) */}
        <section className="mt-14">
          <h2 className="font-display text-xl font-medium text-ink-strong">
            {dp.collection.heading}
          </h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">{dp.collection.intro}</p>
          <div className="mt-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-subtle bg-surface-sunken/40 text-ink-muted">
                <tr>
                  {dp.collection.columns.map((c) => (
                    <th key={c} scope="col" className="px-4 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dp.collection.rows.map((row) => (
                  <tr
                    key={row[0]}
                    className="border-b border-border-subtle/60 align-top last:border-0"
                  >
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={
                          i === 0
                            ? "px-4 py-3 font-medium text-ink-strong"
                            : "px-4 py-3 text-ink-body"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Section heading={dp.residencyHeading} body={dp.residencyBody} />

        {/* Security posture */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-medium text-ink-strong">
            {dp.security.heading}
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {dp.security.points.map((p) => (
              <li key={p} className="flex gap-3 leading-relaxed text-ink-body">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                {p}
              </li>
            ))}
          </ul>
        </section>

        <Section heading={dp.subProcessorsHeading} body={dp.subProcessorsBody} />

        <section className="mt-12">
          <h2 className="font-display text-xl font-medium text-ink-strong">{dp.deletionHeading}</h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">{dp.deletionBody}</p>
          <p className="mt-3 text-[15px] text-ink-body">
            {dp.contactLabel}:{" "}
            <a
              href={`mailto:${dp.contactEmail}`}
              className="numeric font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {dp.contactEmail}
            </a>
          </p>
        </section>

        <Callout tone="note" className="mt-12 text-[13px]">
          {dp.pendingNote.replace(/\s*<!--.*?-->\s*$/, "")}
        </Callout>
      </div>
    </>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  // Blank lines separate paragraphs. HTML collapses whitespace, so a multi-part
  // explanation rendered into a single <p> becomes an unreadable wall — which
  // matters most on exactly the sections that need more than one point, like
  // where data is stored versus where it is processed in transit.
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-medium text-ink-strong">{heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">
          {p}
        </p>
      ))}
    </section>
  );
}
