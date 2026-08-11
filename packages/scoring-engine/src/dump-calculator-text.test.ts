import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { it } from "vitest";
import { registry } from "./scores/registry";
import type { InterpretationBand, Reference, ScoreDefinition, ScoreInput } from "./types";

/**
 * Writes every word the calculators show a clinician into one markdown file.
 *
 * WHY THIS IS A TEST FILE. Everything that reads the registry has to go through
 * the package's own vitest, because the score definitions are TypeScript and
 * `npx tsx` from the repo root resolves nothing (the root guide records that
 * trap for playwright and vitest alike). Naming it `.test.ts` is what gets it a
 * runner, not a claim that it asserts anything.
 *
 * Set TPCC_DUMP=1 to write the file; it is inert otherwise, so `pnpm test` does
 * not produce an artefact on every run.
 *
 *   TPCC_DUMP=1 pnpm --filter @towardpcc/scoring-engine exec vitest run \
 *     --coverage.enabled=false src/dump-calculator-text.test.ts
 */

const EM = String.fromCharCode(8212);
const CAPS_RUN = /\b[A-Z]{3,}(?:[ ,-]+[A-Z]{2,})+\b/g;

const out: string[] = [];
const w = (s = "") => out.push(s);

/** Fence a string so long clinical prose never breaks the document. */
const q = (s: string | undefined) => (s ? s.replace(/\r?\n/g, " ").trim() : "");

function tells(text: string): { em: number; caps: number } {
  return {
    em: (text.match(new RegExp(EM, "g")) ?? []).length,
    caps: (text.match(CAPS_RUN) ?? []).length,
  };
}

/** Every user-visible string on one score, in the order a reader meets them. */
function visibleStrings(s: ScoreDefinition): string[] {
  const bits: string[] = [s.name];
  for (const i of s.inputs) {
    bits.push(i.label.en);
    if (i.helpText) bits.push(i.helpText.en);
    if (i.group) bits.push(i.group.en);
    if (i.type === "categorical") for (const o of i.options) bits.push(o.label.en);
  }
  for (const b of s.interpretation) bits.push(b.label.en, b.description.en);
  for (const c of s.cautions ?? []) bits.push(c.en);
  if (s.formula) bits.push(s.formula.en);
  bits.push(s.notes.en);
  if (s.derived)
    bits.push(s.derived.label.en, s.derived.description.en, s.derived.caution?.en ?? "");
  return bits.filter(Boolean);
}

function bandRange(b: InterpretationBand): string {
  const lo = b.min === null ? "-inf" : `${b.min}`;
  const hi = b.max === null ? "+inf" : `${b.max}`;
  const l = b.minInclusive === false ? "(" : "[";
  const r = b.maxInclusive === true ? "]" : ")";
  return `${l}${lo}, ${hi}${r}`;
}

function locator(r: Reference): string {
  const anyR = r as { pmid?: string; doi?: string; url?: string };
  if (anyR.pmid) return `PMID ${anyR.pmid}`;
  if (anyR.doi) return `DOI ${anyR.doi}`;
  return anyR.url ?? "";
}

function inputLine(i: ScoreInput): string {
  const req = i.required ? "required" : "optional";
  if (i.type === "numeric") {
    const alts = (i.unit.alternates ?? []).map(
      (a) => a.unit + (a.sameUnitSpelling ? " (spelling)" : ""),
    );
    const units = [i.unit.canonical, ...alts].filter(Boolean).join(" / ") || "no unit";
    return `numeric, ${units}, accepts ${i.min} to ${i.max}, ${req}`;
  }
  if (i.type === "boolean") return `yes/no, ${req}`;
  return `choice of ${i.options.length}, ${req}`;
}

it("writes the calculator text dump", () => {
  if (!process.env.TPCC_DUMP) return;

  const scores = [...registry].sort((a, b) => a.name.localeCompare(b.name));

  w("# Calculator text, in full");
  w();
  w(
    "Every word the calculators put in front of a clinician, pulled straight from " +
      "the score definitions so it cannot drift from what the site renders. " +
      "Generated, not written: regenerate rather than edit.",
  );
  w();
  w(`${scores.length} calculators. Generated from the registry at HEAD.`);
  w();
  w("## How to read the two counts");
  w();
  w(
    "`—` counts em dashes and `CAPS` counts runs of shouted words, in " +
      "user-visible text only. They are the two mechanically countable tells " +
      "from the 10 August review, and they are here so the editorial pass has " +
      "a target rather than an impression. Neither is a defect on its own.",
  );
  w();

  // ---- summary table -------------------------------------------------------
  w("## Where the work is");
  w();
  w("| Calculator | Version | Inputs | Strings | Em dashes | Caps runs |");
  w("| --- | --- | ---: | ---: | ---: | ---: |");
  let totEm = 0;
  let totCaps = 0;
  let totStr = 0;
  const rows = scores.map((s) => {
    const bits = visibleStrings(s);
    const t = tells(bits.join(" "));
    totEm += t.em;
    totCaps += t.caps;
    totStr += bits.length;
    return { s, bits, t };
  });
  for (const { s, bits, t } of [...rows].sort((a, b) => b.t.em + b.t.caps - (a.t.em + a.t.caps))) {
    w(
      `| [${s.name}](#${s.slug}) | ${s.version} | ${s.inputs.length} | ${bits.length} | ${t.em} | ${t.caps} |`,
    );
  }
  w(`| **Total** | | | **${totStr}** | **${totEm}** | **${totCaps}** |`);
  w();
  w("---");
  w();

  // ---- per calculator ------------------------------------------------------
  for (const s of scores) {
    w(`## ${s.name}`);
    w();
    w(`<a id="${s.slug}"></a>`);
    w();
    w(
      `\`${s.slug}\` · v${s.version} · ${s.status} · ${s.category}` +
        (s.missingAsNormal ? " · blank scores as normal" : "") +
        (s.interpretationStatus ? ` · interpretation ${s.interpretationStatus}` : ""),
    );
    w();

    // Inputs
    w("### Inputs");
    w();
    let group: string | null = null;
    for (const i of s.inputs) {
      const g = i.group?.en ?? null;
      if (g !== group) {
        group = g;
        if (g) {
          w(`**${g}**`);
          w();
        }
      }
      w(`- **${i.label.en}** — ${inputLine(i)}`);
      if (i.showWhen) {
        w(`  - Asked only when \`${i.showWhen.input}\` is ${i.showWhen.equals.join(" or ")}`);
      }
      if (i.missingIsNotNormal) w("  - Blank is not an answer here");
      if (i.type === "categorical") {
        for (const o of i.options) w(`  - _${o.label.en}_`);
      }
      if (i.helpText) {
        w(`  - Help: ${q(i.helpText.en)}`);
      }
    }
    w();

    // Outputs and bands
    if (s.composition) {
      w("### Composition");
      w();
      w(`Total \`${s.composition.total}\`, made of:`);
      w();
      for (const c of s.composition.components) {
        w(`- \`${c.id}\` — ${c.min ?? 0} to ${c.max}`);
      }
      w();
    }
    if (s.derived) {
      w("### Derived output");
      w();
      w(`**${s.derived.label.en}** — from ${s.derived.from.map((f) => `\`${f}\``).join(" and ")}`);
      w();
      w(q(s.derived.description.en));
      w();
      if (s.derived.caution) {
        w(`> ${q(s.derived.caution.en)}`);
        w();
      }
    }
    if (s.interpretation.length) {
      w("### Interpretation bands");
      w();
      w("| Applies to | Range | Label | Description |");
      w("| --- | --- | --- | --- |");
      for (const b of s.interpretation) {
        w(
          `| \`${b.appliesTo}\` | ${bandRange(b)} | ${b.label.en} | ${q(b.description.en).replace(/\|/g, "\\|")} |`,
        );
      }
      w();
    } else {
      w("### Interpretation bands");
      w();
      w("_None declared._");
      w();
    }

    if (s.cautions?.length) {
      w("### Cautions");
      w();
      for (const c of s.cautions) {
        w(`> ${q(c.en)}`);
        w();
      }
    }

    if (s.formula) {
      w("### How it is calculated");
      w();
      w(q(s.formula.en));
      w();
    }

    w("### Limitations and notes");
    w();
    w(q(s.notes.en));
    w();

    w("### References");
    w();
    for (const r of s.references) {
      const loc = locator(r);
      w(`- ${r.citation}${loc ? ` (${loc})` : ""}`);
      if (r.note) w(`  - ${q(r.note)}`);
    }
    w();

    w("### Rights");
    w();
    const ip = s.ipStatus as unknown as { kind?: string; evidence?: string };
    if (ip && typeof ip === "object" && (ip.kind || ip.evidence)) {
      w(`**${ip.kind ?? "unstated"}** — ${q(ip.evidence)}`);
    } else {
      w(q(String(s.ipStatus)));
    }
    w();
    w("---");
    w();
  }

  writeFileSync(resolve(process.cwd(), "../../docs/calculator-text.md"), out.join("\n"), "utf8");
});
