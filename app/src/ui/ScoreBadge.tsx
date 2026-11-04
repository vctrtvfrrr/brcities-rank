import { explainBands } from "../domain/explanations";
import type { Reference } from "../domain/session";
import { formatNote, formatScore } from "./format";
import { SCORE_BANDS, scoreBand } from "./score-band";

export function ScoreBadge({ score, note = false }: { score: number; note?: boolean }) {
  const band = scoreBand(score);
  return (
    <span className={`band ${band.id}`} title={`Faixa ${band.label.toLowerCase()}`}>
      {note ? formatNote(score) : formatScore(score)}
    </span>
  );
}

export function ScoreLegend({ reference }: { reference: Reference }) {
  return (
    <>
      <span className="tip-block tip-title">Cores</span>
      <span className="tip-block">{explainBands(reference)}</span>
      <ul className="band-legend">
        {SCORE_BANDS.map((band) => (
          <li key={band.id}>
            <span className={`band ${band.id}`}>{band.range}</span> {band.label}
          </li>
        ))}
      </ul>
    </>
  );
}
