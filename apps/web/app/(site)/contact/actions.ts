"use server";

import { handleSubmission, type SubmitResult } from "@/lib/submissions";

/** Server Action for the contact form (CSRF-safe by construction). The type is
 * fixed here — never taken from the request. */
export async function submitContact(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  return handleSubmission("CONTACT", formData);
}
