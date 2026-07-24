/**
 * TowardPCC scoring engine — pure TypeScript, zero runtime dependencies,
 * no DOM/browser APIs (enforced by tsconfig `lib`/`types`).
 * Score definitions, compute functions, and interpretation bands land in P2.
 */

export const ENGINE_VERSION = "0.1.0";

export interface ScoreSummary {
  id: string;
  slug: string;
  name: string;
  version: string;
}

const registry: ScoreSummary[] = [];

export function listScores(): readonly ScoreSummary[] {
  return registry;
}
