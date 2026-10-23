import type { Candidate } from "../domain/rank";

export const FIRST_TEN_COLOR = "#c62828";
const UNRANKED_COLOR = "#1a8a64";
const BEST = [0, 112, 79];
const WORST = [38, 150, 110];

export function markerColor(position: number | null, rankedCount: number): string {
  if (position === null) return UNRANKED_COLOR;
  const share = rankedCount > 1 ? (position - 1) / (rankedCount - 1) : 0;
  const channels = BEST.map((best, i) => Math.round(best + (WORST[i] - best) * share));
  return `rgb(${channels.join(",")})`;
}

export function rankedCount(candidates: Candidate[]): number {
  return candidates.reduce((count, c) => count + (c.position === null ? 0 : 1), 0);
}
