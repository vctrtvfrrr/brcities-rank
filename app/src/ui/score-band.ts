export type ScoreBand = { id: "low" | "mid" | "high" | "top"; label: string; range: string };

// Lower limits on the 0–100 scale; a value on a limit belongs to the band above it.
export const SCORE_BANDS: (ScoreBand & { from: number })[] = [
  { id: "top", label: "Muito alta", range: "80 a 100", from: 80 },
  { id: "high", label: "Alta", range: "60 a 80", from: 60 },
  { id: "mid", label: "Média", range: "40 a 60", from: 40 },
  { id: "low", label: "Baixa", range: "0 a 40", from: -Infinity },
];

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find((band) => score >= band.from)!;
}
