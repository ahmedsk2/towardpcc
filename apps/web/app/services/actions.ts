"use server";

import { handleSubmission, type SubmitResult } from "@/lib/submissions";

export async function submitService(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  return handleSubmission("SERVICE", formData);
}
