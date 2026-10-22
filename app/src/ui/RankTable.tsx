import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { Candidate } from "../domain/rank";
import type { Dataset } from "../domain/dataset";
import { SCORE_READING } from "../domain/explanations";
import { GRADES, gradeOf, type Grade, type Session } from "../domain/session";
import { CategoryLabel } from "./CategoryTip";
import { formatGrade, formatNote, formatScore } from "./format";
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
  onGrade: (id: string, code: string, grade: Grade) => void;
};

export function RankTable({ dataset, candidates, session, selectedCode, reveal, onSelect, onGrade }: RankTableProps) {
  const { categories } = session;
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

  const onRowKeyDown = (event: KeyboardEvent, code: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(code);
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
            </Tooltip>
          </span>
          {categories.map((category) => (
            <span role="columnheader" key={category.id} className={category.on ? "num" : "num dim"}>
              {category.kind === "subjective" ? (
                category.name
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
                className={candidate.code === selectedCode ? "row selected" : "row"}
                aria-selected={candidate.code === selectedCode}
                tabIndex={0}
                onClick={() => onSelect(candidate.code)}
                onKeyDown={(event) => onRowKeyDown(event, candidate.code)}
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
                  {candidate.score === null ? DASH : formatScore(candidate.score)}
                </span>
                {categories.map((category) =>
                  category.kind === "subjective" ? (
                    <SubjectiveCell
                      key={category.id}
                      on={category.on}
                      label={`${category.name} de ${candidate.name}`}
                      average={candidate.gradeAverages[category.id] ?? null}
                      mine={gradeOf(session, category.id, candidate.code) ?? null}
                      evaluatorName={evaluator.name}
                      onGrade={(grade) => onGrade(category.id, candidate.code, grade)}
                    />
                  ) : (
                    <span role="cell" key={category.id} className={category.on ? "num" : "num dim"}>
                      {formatNote(candidate.categoryScores[category.id])}
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

function SubjectiveCell({
  on,
  label,
  average,
  mine,
  evaluatorName,
  onGrade,
}: {
  on: boolean;
  label: string;
  average: number | null;
  mine: Grade | null;
  evaluatorName: string;
  onGrade: (grade: Grade) => void;
}) {
  return (
    <span role="cell" className="num subcell">
      <span className={on ? undefined : "dim"}>
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
      <span className="stars" role="group" aria-label={`Nota de ${evaluatorName} para ${label}`}>
        {GRADES.map((grade) => (
          <button
            type="button"
            key={grade}
            className={mine === grade ? "on" : undefined}
            aria-pressed={mine === grade}
            aria-label={`Nota ${grade}`}
            onClick={(event) => {
              event.stopPropagation();
              onGrade(grade);
            }}
          >
            {grade}
          </button>
        ))}
      </span>
    </span>
  );
}
