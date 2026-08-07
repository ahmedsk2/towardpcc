import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Imagery belonging to someone else must not ship.
 *
 * This guard exists because a comment was not enough. `content/site.ts` said
 * dashboard imagery "cannot be published until the pilot unit approves it", and
 * commit 9682cfd was titled "show the registry's stage instead of imagery it
 * cannot publish" — while `app/data/page.tsx` kept an `imageSrc` pointing at a
 * live screenshot of the pilot unit's Command Center. It served a real 30-day
 * admissions and discharges curve, with real dates, at
 * `https://www.towardpcc.com/images/registry-dashboard.jpg` (HTTP 200, 62 KB)
 * from 2026-07-27 until 2026-08-07.
 *
 * Nothing caught it, because the repository described an intention rather than
 * asserting a property. The correction generalises past this one image: a claim
 * about what the site does NOT publish is only worth writing if something fails
 * when it becomes untrue.
 *
 * TO PUBLISH IT, TWO THINGS MUST BOTH BE TRUE: written permission from the
 * pilot unit is on file, or the source is a demo/seeded instance carrying no
 * real unit's figures — AND this guard is updated deliberately, in that same
 * change, with the reason.
 */

const WEB = join(import.meta.dirname, "..");

/**
 * Named individually rather than by pattern.
 *
 * A pattern like "anything with `dashboard` in the name" would quietly cover a
 * future file nobody has assessed, which is the open-ended exemption this file
 * exists to refuse. Add a name here only alongside the reason it is blocked.
 */
const UNAPPROVED_IMAGES = [
  {
    file: "registry-dashboard.jpg",
    why: "the pilot unit's real dated admissions/discharges curve; no written permission on file",
  },
] as const;

/** Source trees that can cause a file to be requested by a browser. */
const SOURCE_DIRS = ["app", "components", "content", "lib"];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = join(WEB, dir);
  if (!existsSync(abs)) return acc;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(rel, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(rel);
  }
  return acc;
}

describe("imagery that is not ours to publish", () => {
  it.each(UNAPPROVED_IMAGES)("$file is not present in public/images", ({ file, why }) => {
    const path = join(WEB, "public", "images", file);
    expect(
      existsSync(path),
      `public/images/${file} is committed and therefore served at /images/${file} whether or not any page renders it — ${why}`,
    ).toBe(false);
  });

  /**
   * Checked separately from the file's existence, because they fail apart. The
   * original bug was a live reference; deleting only the file would leave a
   * broken image, and deleting only the reference would leave the URL fetchable.
   */
  it.each(UNAPPROVED_IMAGES)("$file is referenced by no rendered source", ({ file, why }) => {
    const offenders = sourceFiles(".")
      .filter((rel) => {
        const body = readFileSync(join(WEB, rel), "utf8");
        // Ignore the explanatory comments that record why it was pulled: match
        // only a real path reference, not the bare filename in prose.
        return body.includes(`/images/${file}`) && !rel.endsWith("unpublished-imagery.test.ts");
      })
      // The `imageHint` prop names the file as a place to SAVE one, not a src.
      .filter((rel) => {
        const body = readFileSync(join(WEB, rel), "utf8");
        const lines = body.split("\n").filter((l) => l.includes(`/images/${file}`));
        return lines.some((l) => !l.includes("imageHint") && !l.trimStart().startsWith("//"));
      });

    expect(
      offenders,
      `these files reference /images/${file} — ${why}. Remove the reference, or update UNAPPROVED_IMAGES deliberately with the permission on file.`,
    ).toEqual([]);
  });
});
