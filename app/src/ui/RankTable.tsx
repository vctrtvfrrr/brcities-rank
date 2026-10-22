import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Candidate } from "../domain/rank";

const ROW_HEIGHT = 28;
const DASH = "–";

export function RankTable({ candidates }: { candidates: Candidate[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div className="table-wrap" ref={scroller}>
      <div role="table" aria-label="Candidatas" aria-rowcount={candidates.length + 1}>
        <div role="row" className="row head">
          <span role="columnheader" className="num">#</span>
          <span role="columnheader">Cidade</span>
          <span role="columnheader" className="num">Pontuação</span>
        </div>
        <div className="body" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const candidate = candidates[item.index];
            return (
              <div
                role="row"
                aria-rowindex={item.index + 2}
                className="row"
                key={candidate.code}
                style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
              >
                <span role="cell" className="num">{candidate.position ?? DASH}</span>
                <span role="cell">
                  {candidate.name} <span className="muted">{candidate.uf}</span>
                </span>
                <span role="cell" className="num">{candidate.score ?? DASH}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
