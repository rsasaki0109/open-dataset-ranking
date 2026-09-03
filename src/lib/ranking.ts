import type { Dataset } from '../types';

/**
 * Ranking formulas (MVP, intentionally simple).
 * Mirrors scripts/ranking.py — keep both in sync.
 *
 * - popularity_score  = log10(1 + downloads) / LOG_NORM
 * - engagement_score  = log10(1 + likes + votes) / LOG_NORM
 * - freshness_score   = exp(-age_days / FRESHNESS_HALF_LIFE_DAYS * ln2)
 *                     = 0.5 ^ (age_days / HALF_LIFE)
 * - total_score       = W_POP * popularity + W_FRESH * freshness + W_ENG * engagement
 */

export const LOG_NORM = 7; // log10(1 + 10_000_000) ~= 7
export const FRESHNESS_HALF_LIFE_DAYS = 180;
export const WEIGHTS = { popularity: 0.5, freshness: 0.2, engagement: 0.3 } as const;

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function popularityScore(downloads: number): number {
  return clamp01(Math.log10(1 + Math.max(0, downloads)) / LOG_NORM);
}

export function engagementScore(likes: number, votes: number): number {
  return clamp01(Math.log10(1 + Math.max(0, likes) + Math.max(0, votes)) / LOG_NORM);
}

export function freshnessScore(updatedAt: string, nowMs: number = Date.now()): number {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return 0;
  const ageDays = Math.max(0, (nowMs - t) / 86_400_000);
  return clamp01(Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS));
}

export function totalScore(
  pop: number,
  fresh: number,
  eng: number,
  weights: { popularity: number; freshness: number; engagement: number } = WEIGHTS,
): number {
  return (
    weights.popularity * pop + weights.freshness * fresh + weights.engagement * eng
  );
}

export function scoreDataset(d: Dataset, nowMs: number = Date.now()): Dataset {
  const pop = popularityScore(d.downloads);
  const eng = engagementScore(d.likes, d.votes);
  const fresh = freshnessScore(d.updated_at, nowMs);
  return {
    ...d,
    popularity_score: pop,
    freshness_score: fresh,
    engagement_score: eng,
    total_score: totalScore(pop, fresh, eng),
  };
}

/** Re-score a list (used when JSON scores are missing/stale). */
export function scoreAll(datasets: Dataset[], nowMs: number = Date.now()): Dataset[] {
  return datasets.map((d) => scoreDataset(d, nowMs));
}

export type SortKey = 'trending' | 'popular' | 'recent' | 'engagement';

export function sortDatasets(datasets: Dataset[], sort: SortKey): Dataset[] {
  const arr = [...datasets];
  switch (sort) {
    case 'popular':
      return arr.sort((a, b) => b.popularity_score - a.popularity_score);
    case 'recent':
      return arr.sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
      );
    case 'engagement':
      return arr.sort((a, b) => b.engagement_score - a.engagement_score);
    case 'trending':
    default:
      return arr.sort((a, b) => b.total_score - a.total_score);
  }
}
