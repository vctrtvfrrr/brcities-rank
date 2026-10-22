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

  const refocus = useRef<{ code: string; id: string; grade: Grade } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    const at = candidates.findIndex((c) => c.code === target.code);
    if (at < 0) {
      refocus.current = null;
      return;
    }
    virtualizer.scrollToIndex(at, { align: "auto" });
    const frame = requestAnimationFrame(() => {
      const button = scroller.current?.querySelector<HTMLElement>(
        `[data-cell="${target.code}:${target.id}"] [data-grade="${target.grade}"]`,
      );
      if (!button) return;
      button.focus({ preventScroll: true });
      refocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [candidates, virtualizer]);

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
                      cellKey={`${candidate.code}:${category.id}`}
                      onGrade={(grade, byKeyboard) => {
                        if (byKeyboard) refocus.current = { code: candidate.code, id: category.id, grade };
                        onGrade(category.id, candidate.code, grade);
                      }}
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
  cellKey,
  onGrade,
}: {
  on: boolean;
  label: string;
  average: number | null;
  mine: Grade | null;
  evaluatorName: string;
  cellKey: string;
  onGrade: (grade: Grade, byKeyboard: boolean) => void;
}) {
  return (
    <span role="cell" className="num subcell" data-cell={cellKey}>
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
            data-grade={grade}
            onClick={(event) => {
              event.stopPropagation();
              onGrade(grade, event.detail === 0);
            }}
          >
            {grade}
          </button>
        ))}
      </span>
    </span>
  );
}
