"use server";

import { handleSubmission, type SubmitResult } from "@/lib/submissions";

export async function submitKnowledge(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  return handleSubmission("KNOWLEDGE_PILOT", formData);
}
