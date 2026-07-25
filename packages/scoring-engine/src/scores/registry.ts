import type { ScoreCategory, ScoreDefinition, ScoreStatus, ScoreSummary } from "../types";
import { oxygenationIndex } from "./oxygenation-index";
import { oxygenSaturationIndex } from "./oxygen-saturation-index";
import { pediatricGcs } from "./pediatric-gcs";
import { pelod2 } from "./pelod2";
import { pfRatio } from "./pf-ratio";
import { phoenix } from "./phoenix";
import { pim3 } from "./pim3";
import { psofa } from "./psofa";
import { sfRatio } from "./sf-ratio";
import { vis } from "./vis";

/**
 * The only file that statically imports every score (ADR-0002 decision 1).
 * Scores are added here exactly when they ship, alphabetically.
 */
export const registry: readonly ScoreDefinition[] = [
  oxygenationIndex,
  oxygenSaturationIndex,
  pediatricGcs,
  pelod2,
  pfRatio,
  phoenix,
  pim3,
  psofa,
  sfRatio,
  vis,
];

export interface ListScoresFilter {
  readonly category?: ScoreCategory;
  readonly status?: ScoreStatus;
}

export function listScores(
  filter?: ListScoresFilter,
  definitions: readonly ScoreDefinition[] = registry,
): readonly ScoreSummary[] {
  return definitions
    .filter(
      (s) =>
        (filter?.category === undefined || s.category === filter.category) &&
        (filter?.status === undefined || s.status === filter.status),
    )
    .map(({ id, slug, name, version, status, category }) => ({
      id,
      slug,
      name,
      version,
      status,
      category,
    }));
}

export function getScore(
  slug: string,
  definitions: readonly ScoreDefinition[] = registry,
): ScoreDefinition | undefined {
  return definitions.find((s) => s.slug === slug);
}
