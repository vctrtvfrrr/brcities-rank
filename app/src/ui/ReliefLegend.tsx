import { formatCount } from "./format";
import { RELIEF_PALETTE } from "./relief-layers";

const LABELED_ELEVATIONS = [0, 250, 700, 1500, 3000];

const share = (index: number) => (index / (RELIEF_PALETTE.length - 1)) * 100;

const gradient = `linear-gradient(to right, ${RELIEF_PALETTE.map((stop, i) => `${stop.color} ${share(i)}%`).join(", ")})`;

export function ReliefLegend({ unavailable }: { unavailable: boolean }) {
  return (
    <div className="relief-legend" role="group" aria-label="Legenda do relevo">
      {unavailable ? (
        <p className="relief-unavailable">Relevo indisponível</p>
      ) : (
        <>
          <p className="relief-title">Altitude (m)</p>
          <div className="relief-bar" style={{ background: gradient }} aria-hidden="true" />
          <ol className="relief-ticks">
            {RELIEF_PALETTE.map((stop, i) =>
              LABELED_ELEVATIONS.includes(stop.elevation) ? (
                <li key={stop.elevation} style={{ left: `${share(i)}%` }}>
                  {formatCount(stop.elevation)}
                </li>
              ) : null,
            )}
          </ol>
        </>
      )}
    </div>
  );
}
