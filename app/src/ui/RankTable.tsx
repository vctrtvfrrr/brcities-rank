import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { isAmongFirstTen, type Candidate } from "../domain/rank";
import type { Dataset } from "../domain/dataset";
import { SCORE_READING, SUBJECTIVE_GRADING } from "../domain/explanations";
import { gradeOf, type Grade, type Session } from "../domain/session";
import { CategoryLabel } from "./CategoryTip";
import { formatGrade } from "./format";
import { ScoreBadge, ScoreLegend } from "./ScoreBadge";
import { Tooltip } from "./Tooltip";

const ROW_HEIGHT = 28;
const DASH = "–";

type RankTableProps = {
  dataset: Dataset;
  candidates: Candidate[];
  session: Session;
  selectedCode: string | null;
  reveal: { code: string } | null;
  onSelect: (code: string) => void;
};

export function RankTable({ dataset, candidates, session, selectedCode, reveal, onSelect }: RankTableProps) {
  const categories = session.categories.filter((category) => category.on);
  const evaluator = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const revealed = useRef(reveal);
  useEffect(() => {
    if (!reveal || reveal === revealed.current) return;
    revealed.current = reveal;
    const at = candidates.findIndex((c) => c.code === reveal.code);
    if (at >= 0) virtualizer.scrollToIndex(at, { align: "center" });
  }, [reveal, candidates, virtualizer]);

  const pendingRow = useRef<number | null>(null);
  const focusRow = (index: number) => {
    const target = Math.min(candidates.length - 1, Math.max(0, index));
    pendingRow.current = target;
    virtualizer.scrollToIndex(target, { align: "auto" });
    requestAnimationFrame(() => {
      scroller.current
        ?.querySelector<HTMLElement>(`[data-code="${candidates[target].code}"]`)
        ?.focus({ preventScroll: true });
      pendingRow.current = null;
    });
  };

  const onRowKeyDown = (event: KeyboardEvent, code: string, index: number) => {
    if (event.target !== event.currentTarget) return;
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      focusRow((pendingRow.current ?? index) + step);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(code);
    }
  };

  return (
    <div className="table-wrap" ref={scroller}>
      <div
        role="table"
        aria-label="Candidatas"
        aria-rowcount={candidates.length + 1}
        style={{ "--categories": categories.length } as CSSProperties}
      >
        <div role="row" className="row head">
          <span role="columnheader" className="num">
            #
          </span>
          <span role="columnheader">Cidade</span>
          <span role="columnheader" className="num">
            <Tooltip label="Pontuação">
              <strong>Como se lê a Pontuação</strong>
              {SCORE_READING.map((paragraph) => (
                <span className="tip-block" key={paragraph}>
                  {paragraph}
                </span>
              ))}
              <ScoreLegend />
            </Tooltip>
          </span>
          {categories.map((category) => (
            <span role="columnheader" key={category.id} className="num column-head">
              {category.kind === "subjective" ? (
                <Tooltip label={category.name}>
                  <strong>{category.name}</strong>
                  <span className="tip-block">{SUBJECTIVE_GRADING}</span>
                </Tooltip>
              ) : (
                <CategoryLabel dataset={dataset} id={category.id} name={category.id} />
              )}
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
                className={rowClass(candidate, selectedCode)}
                aria-selected={candidate.code === selectedCode}
                tabIndex={0}
                onClick={() => onSelect(candidate.code)}
                onKeyDown={(event) => onRowKeyDown(event, candidate.code, item.index)}
                data-code={candidate.code}
                key={candidate.code}
                style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
              >
                <span role="cell" className="num">
                  {candidate.position ?? DASH}
                </span>
                <span role="cell">
                  {candidate.name} <span className="muted">{candidate.uf}</span>
                </span>
                <span role="cell" className="num">
                  {candidate.score === null ? DASH : <ScoreBadge score={candidate.score} />}
                </span>
                {categories.map((category) =>
                  category.kind === "subjective" ? (
                    <SubjectiveCell
                      key={category.id}
                      average={candidate.gradeAverages[category.id] ?? null}
                      mine={gradeOf(session, category.id, candidate.code) ?? null}
                      evaluatorName={evaluator.name}
                    />
                  ) : (
                    <span role="cell" key={category.id} className="num">
                      <ScoreBadge score={candidate.categoryScores[category.id]} note />
                    </span>
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function rowClass(candidate: Candidate, selectedCode: string | null): string {
  return ["row", isAmongFirstTen(candidate) && "first-ten", candidate.code === selectedCode && "selected"]
    .filter(Boolean)
    .join(" ");
}

function SubjectiveCell({
  average,
  mine,
  evaluatorName,
}: {
  average: number | null;
  mine: Grade | null;
  evaluatorName: string;
}) {
  return (
    <span role="cell" className="num">
      {average === null ? (
        DASH
      ) : (
        <>
          <span className="mean">{formatGrade(average)}</span>
          {mine !== null && (
            <span className="mine" title={`Nota de ${evaluatorName}`}>
              {mine}
            </span>
          )}
        </>
      )}
    </span>
  );
}
