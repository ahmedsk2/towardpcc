import Link from "next/link";
import { registry } from "@towardpcc/scoring-engine";
import { requireAdmin } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * READ-ONLY, on purpose. Until 2026-09-03 this page carried a publish toggle
 * and a validator form that wrote to `CalculatorMeta` — and nothing public
 * ever read that table. The catalogue, `/validation` and the counts all come
 * from the engine registry, so a name saved here changed nothing a visitor
 * saw while the audit log recorded that it had. A control that looks like it
 * works and does not is worse than no control, so both are gone. Status and
 * validator slots live in the score definition in `packages/scoring-engine`,
 * change through a pull request, and ship with the score's version and tests.
 * This page shows exactly what the site shows.
 */
export default async function AdminCalculatorsPage() {
  await requireAdmin();
  const scores = registry;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink-strong">Calculators</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] text-ink-muted">
        What the site shows, read from the scoring engine. Status, validator slots, formulas and
        interpretation bands are all owned by the score definition and change through a pull request
        against <code className="font-numeric text-[13px]">packages/scoring-engine</code>— nothing
        on this screen is editable.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-subtle bg-surface-sunken/40 text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Calculator
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Validators
              </th>
              <th scope="col" className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => {
              const assigned = s.validators.filter((v) => v.status === "assigned").length;
              return (
                <tr key={s.slug} className="border-b border-border-subtle/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink-strong">{s.name}</span>
                    <span className="ml-2 font-numeric text-xs text-ink-muted">{s.slug}</span>
                  </td>
                  <td className="px-4 py-3 font-numeric text-xs text-ink-muted">{s.status}</td>
                  <td className="px-4 py-3 font-numeric text-xs text-ink-muted">{assigned}/2</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/calculators/${s.slug}`}
                      className="rounded-sm text-sm text-accent-deep hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      View
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
