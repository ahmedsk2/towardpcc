"use server";

import { handleSubmission, type SubmitResult } from "@/lib/submissions";

export async function submitData(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  return handleSubmission("DATA_INTEREST", formData);
}
