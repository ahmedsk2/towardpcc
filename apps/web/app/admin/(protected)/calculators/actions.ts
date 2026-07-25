"use server";

import { revalidatePath } from "next/cache";
import { db, Prisma } from "@towardpcc/db";
import { getScore } from "@towardpcc/scoring-engine";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/guard";

/** Toggle whether a calculator is published (admin override over the engine). */
export async function setPublished(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const published = formData.get("published") === "true";
  if (!getScore(slug)) return; // slug must map to a real engine score

  const before = await db.calculatorMeta.findUnique({ where: { slug } });
  await db.calculatorMeta.upsert({
    where: { slug },
    create: { slug, published, updatedById: admin.id },
    update: { published, updatedById: admin.id },
  });
  await recordAudit({
    actorId: admin.id,
    action: "CALCMETA_PUBLISH_CHANGED",
    entity: `CalculatorMeta:${slug}`,
    diff: { published: { from: before?.published ?? "default(true)", to: published } },
  });
  revalidatePath("/admin/calculators");
}

/**
 * Save the two independent-validator slots (PRD §6.4). Empty name clears a slot.
 * Only presentation metadata — never touches the engine's formulas or bands.
 */
export async function saveValidators(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (!getScore(slug)) return;

  const slot = (i: number) => {
    const name = String(formData.get(`v${i}_name`) ?? "").trim();
    if (!name) return null;
    return {
      name: name.slice(0, 120),
      credentials: String(formData.get(`v${i}_credentials`) ?? "")
        .trim()
        .slice(0, 160),
      date: String(formData.get(`v${i}_date`) ?? "").trim(),
    };
  };
  const validatorSlots = [slot(0), slot(1)];

  await db.calculatorMeta.upsert({
    where: { slug },
    create: {
      slug,
      validatorSlots: validatorSlots as Prisma.InputJsonValue,
      updatedById: admin.id,
    },
    update: { validatorSlots: validatorSlots as Prisma.InputJsonValue, updatedById: admin.id },
  });
  await recordAudit({
    actorId: admin.id,
    action: "CALCMETA_VALIDATORS_EDITED",
    entity: `CalculatorMeta:${slug}`,
    diff: { validators: validatorSlots.map((s) => s?.name ?? null) },
  });
  revalidatePath(`/admin/calculators/${slug}`);
  revalidatePath("/admin/calculators");
}
