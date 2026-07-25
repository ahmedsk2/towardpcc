import Link from "next/link";
import { db } from "@towardpcc/db";
import { listScores } from "@towardpcc/scoring-engine";
import { requireAdmin } from "@/lib/auth/guard";
import { setPublished } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCalculatorsPage() {
  await requireAdmin();
  const scores = listScores();
  const metaRows = await db.calculatorMeta.findMany();
  const meta = new Map(metaRows.map((r) => [r.slug, r]));

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink-strong">Calculators</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] text-ink-muted">
        Presentation and publish state only — formulas and interpretation bands are owned by the
        scoring engine and cannot be edited here.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-surface-sunken">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-sunken bg-surface-sunken/40 text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Calculator</th>
              <th className="px-4 py-2 font-medium">Validators</th>
              <th className="px-4 py-2 font-medium">Published</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => {
              const m = meta.get(s.slug);
              const published = m?.published ?? true;
              const validators = Array.isArray(m?.validatorSlots)
                ? (m.validatorSlots as unknown[]).filter(Boolean).length
                : 0;
              return (
                <tr key={s.slug} className="border-b border-surface-sunken/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink-strong">{s.name}</span>
                    <span className="ml-2 font-numeric text-xs text-ink-muted">{s.slug}</span>
                  </td>
                  <td className="px-4 py-3 font-numeric text-xs text-ink-muted">{validators}/2</td>
                  <td className="px-4 py-3">
                    <form action={setPublished}>
                      <input type="hidden" name="slug" value={s.slug} />
                      <input type="hidden" name="published" value={published ? "false" : "true"} />
                      <button
                        type="submit"
                        className={
                          published
                            ? "rounded-full bg-success-bg px-2.5 py-1 font-numeric text-[11px] tracking-wide text-success-text uppercase"
                            : "rounded-full bg-surface-sunken px-2.5 py-1 font-numeric text-[11px] tracking-wide text-ink-body uppercase"
                        }
                        title="Toggle published"
                      >
                        {published ? "Published" : "Unpublished"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/calculators/${s.slug}`}
                      className="text-sm font-medium text-accent-deep hover:text-accent"
                    >
                      Validators →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
