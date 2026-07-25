import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@towardpcc/db";
import { getScore } from "@towardpcc/scoring-engine";
import { requireAdmin } from "@/lib/auth/guard";
import { saveValidators } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Slot = { name?: string; credentials?: string; date?: string } | null;

const fieldClass =
  "h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export default async function ValidatorEditor({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const score = getScore(slug);
  if (!score) notFound();

  const meta = await db.calculatorMeta.findUnique({ where: { slug } });
  const slots: Slot[] = Array.isArray(meta?.validatorSlots)
    ? (meta.validatorSlots as Slot[])
    : [null, null];

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
        Name the two independent clinical validators (PRD §6.4). Leave a name blank to clear that
        slot. This is presentation metadata — it never changes the computed result.
      </p>

      <form action={saveValidators} className="mt-8 flex flex-col gap-8">
        <input type="hidden" name="slug" value={slug} />
        {[0, 1].map((i) => {
          const s = slots[i] ?? {};
          return (
            <fieldset key={i} className="rounded-lg border border-surface-sunken p-5">
              <legend className="px-1 font-numeric text-xs tracking-wide text-ink-muted uppercase">
                Validator {i + 1}
              </legend>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor={`v${i}_name`} className="text-sm font-medium text-ink-strong">
                    Name
                  </label>
                  <input
                    id={`v${i}_name`}
                    name={`v${i}_name`}
                    defaultValue={s.name ?? ""}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor={`v${i}_credentials`}
                    className="text-sm font-medium text-ink-strong"
                  >
                    Credentials / affiliation
                  </label>
                  <input
                    id={`v${i}_credentials`}
                    name={`v${i}_credentials`}
                    defaultValue={s.credentials ?? ""}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor={`v${i}_date`} className="text-sm font-medium text-ink-strong">
                    Validation date
                  </label>
                  <input
                    id={`v${i}_date`}
                    name={`v${i}_date`}
                    type="date"
                    defaultValue={s.date ?? ""}
                    className={fieldClass}
                  />
                </div>
              </div>
            </fieldset>
          );
        })}
        <button
          type="submit"
          className="inline-flex min-h-11 w-max items-center rounded-md bg-accent px-5 text-[15px] font-semibold text-ink-on-accent hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Save validators
        </button>
      </form>
    </div>
  );
}
