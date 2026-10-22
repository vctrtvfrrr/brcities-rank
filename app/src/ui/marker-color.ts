import type { Candidate } from "../domain/rank";

const UNRANKED_COLOR = "#1f6f5c";
const BEST = [10, 56, 44];
const WORST = [40, 125, 100];

export function markerColor(position: number | null, rankedCount: number): string {
  if (position === null) return UNRANKED_COLOR;
  const share = rankedCount > 1 ? (position - 1) / (rankedCount - 1) : 0;
  const channels = BEST.map((best, i) => Math.round(best + (WORST[i] - best) * share));
  return `rgb(${channels.join(",")})`;
}

export function rankedCount(candidates: Candidate[]): number {
  return candidates.reduce((count, c) => count + (c.position === null ? 0 : 1), 0);
}
