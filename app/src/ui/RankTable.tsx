import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type CSSProperties } from "react";
import type { Candidate } from "../domain/rank";
import type { Category } from "../domain/session";

const ROW_HEIGHT = 28;
const DASH = "–";

const categoryName = (category: Category) => (category.kind === "objective" ? category.id : category.name);
const formatNote = (note: number) => Math.round(note).toString();
const formatScore = (score: number) => score.toFixed(1).replace(".", ",");

export function RankTable({ candidates, categories }: { candidates: Candidate[]; categories: Category[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div className="table-wrap" ref={scroller}>
      <div
        role="table"
        aria-label="Candidatas"
        aria-rowcount={candidates.length + 1}
        style={{ "--categories": categories.length } as CSSProperties}
      >
        <div role="row" className="row head">
          <span role="columnheader" className="num">#</span>
          <span role="columnheader">Cidade</span>
          <span role="columnheader" className="num">Pontuação</span>
          {categories.map((category) => (
            <span role="columnheader" key={category.id} className={category.on ? "num" : "num dim"}>
              {categoryName(category)}
            </span>
          ))}
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
                <span role="cell" className="num">{candidate.score === null ? DASH : formatScore(candidate.score)}</span>
                {categories.map((category) => (
                  <span role="cell" key={category.id} className={category.on ? "num" : "num dim"}>
                    {formatNote(candidate.categoryScores[category.id])}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
