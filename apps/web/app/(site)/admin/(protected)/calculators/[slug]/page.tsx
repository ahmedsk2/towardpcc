import Link from "next/link";
import { notFound } from "next/navigation";
import { getScore } from "@towardpcc/scoring-engine";
import { requireAdmin } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * READ-ONLY. This used to be a form that saved validator names to
 * `CalculatorMeta.validatorSlots`, which nothing public reads — see the note
 * on the list page. The two slots shown here are the engine's, i.e. what the
 * calculator page and `/validation` render. A name is a public claim that a
 * named person reviewed this score on a given date, so it is entered in the
 * score definition with that date, and reviewed like any other clinical
 * change.
 */
export default async function ValidatorView({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const score = getScore(slug);
  if (!score) notFound();

  return (
    <div className="max-w-[640px]">
      <Link
        href="/admin/calculators"
        className="rounded-sm text-sm text-accent-deep hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">←</span> Calculators
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink-strong">{score.name}</h1>
      <p className="mt-1 max-w-[60ch] text-[15px] text-ink-muted">
        Status <span className="font-numeric text-[13px]">{score.status}</span>, version{" "}
        <span className="font-numeric text-[13px]">{score.version}</span>. The two independent
        validator slots below are read from the score definition; to name a validator, change the
        definition in <code className="font-numeric text-[13px]">packages/scoring-engine</code> with
        the review date, through a pull request.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {score.validators.map((v, i) => (
          <div key={i} className="rounded-lg border border-border p-5">
            <p className="font-numeric text-xs tracking-wide text-ink-muted uppercase">
              Validator {i + 1}
            </p>
            {v.status === "assigned" ? (
              <p className="mt-2 text-[15px] text-ink-strong">
                {v.name}, {v.credentials}{" "}
                <span className="font-numeric text-[13px] text-ink-muted">({v.date})</span>
              </p>
            ) : (
              <p className="mt-2 text-[15px] text-ink-muted">Pending — slot not yet assigned.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
