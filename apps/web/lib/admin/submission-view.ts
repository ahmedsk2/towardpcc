import type { SubmissionStatus, SubmissionType } from "@towardpcc/db";

/** Read a string field from a validated JSON payload, safely. */
export function payloadField(payload: unknown, key: string): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return "";
}

/** Ordered key/value pairs for rendering a submission (values are plain text —
 *  React escapes them; never dangerouslySetInnerHTML). */
export function payloadEntries(payload: unknown): { key: string; value: string }[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

export const TYPE_LABELS: Record<SubmissionType, string> = {
  CONTACT: "Contact",
  SERVICE: "Research services",
  KNOWLEDGE_PILOT: "Knowledge pilot",
  DATA_INTEREST: "Data interest",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  NEW: "New",
  TRIAGED: "Triaged",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
  SPAM: "Spam",
};

export const STATUS_ORDER: SubmissionStatus[] = ["NEW", "TRIAGED", "IN_PROGRESS", "CLOSED", "SPAM"];
