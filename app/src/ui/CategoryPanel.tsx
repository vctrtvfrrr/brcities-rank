import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import {
  addSubjective,
  averageWeights,
  countGrades,
  deleteSubjective,
  displayWeights,
  equalizeWeights,
  orderedCategories,
  renameSubjective,
  setWeight,
  type Category,
  type Session,
} from "../domain/session";
import { CategoryLabel } from "./CategoryTip";

const categoryName = (category: Category) => (category.kind === "objective" ? category.id : category.name);
const formatAverage = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const POINTER_RELEASE_EVENTS = ["pointerup", "pointercancel", "blur"] as const;
const KEYBOARD_RELEASE_EVENTS = ["keyup", "blur"] as const;

type Props = {
  dataset: Dataset;
  session: Session;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
};

export function CategoryPanel({ dataset, session, onChange, onToggleCategory }: Props) {
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);
  const usingPointer = useRef(false);
  const active = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  const shown = displayWeights(active, session.categories);
  const averages = averageWeights(session);
  const categories = frozenOrder
    ? frozenOrder.map((id) => session.categories.find((c) => c.id === id)!)
    : orderedCategories(session);

  const frozen = frozenOrder !== null;
  useEffect(() => {
    if (!frozen) return;
    const release = () => setFrozenOrder(null);
    const events = usingPointer.current ? POINTER_RELEASE_EVENTS : KEYBOARD_RELEASE_EVENTS;
    for (const type of events) window.addEventListener(type, release);
    return () => {
      for (const type of events) window.removeEventListener(type, release);
    };
  }, [frozen]);

  const changeWeight = (id: string, value: number) => {
    setFrozenOrder((current) => current ?? categories.map((c) => c.id));
    onChange((current) => setWeight(current, id, value));
  };

  const [focusId, setFocusId] = useState<string | null>(null);
  const add = () => {
    setFrozenOrder(null);
    setFocusId(addSubjective(session).categories.at(-1)!.id);
    onChange(addSubjective);
  };

  const remove = (category: Category) => {
    const lost = countGrades(session, category.id);
    const evaluators = session.evaluators.length;
    if (
      window.confirm(
        `Apagar a subjetiva "${categoryName(category)}"? Saem ${lost} ${lost === 1 ? "nota" : "notas"} e o peso dela em ${evaluators} ${evaluators === 1 ? "avaliador" : "avaliadores"}; o peso vai para as demais categorias na proporção atual.`,
      )
    ) {
      setFrozenOrder(null);
      onChange((current) => deleteSubjective(current, category.id));
    }
  };

  const equalize = () => {
    if (
      window.confirm(
        `Igualar os pesos de "${active.name}"? Todas as ${categories.length} categorias voltam a ${formatAverage(100 / categories.length)}%.`,
      )
    ) {
      setFrozenOrder(null);
      onChange(equalizeWeights);
    }
  };

  return (
    <>
      <ul className="categories">
        {categories.map((category) => {
          const name = categoryName(category);
          return (
            <li key={category.id} className={category.on ? undefined : "off"}>
              <div className="category-head">
                <button
                  type="button"
                  role="switch"
                  aria-checked={category.on}
                  aria-label={name}
                  className={category.on ? "toggle on" : "toggle"}
                  onClick={() => onToggleCategory(category.id)}
                />
                <span className="category-name">
                  {category.kind === "subjective" ? (
                    <SubjectiveName
                      name={category.name}
                      autoFocus={category.id === focusId}
                      onCommit={(next) => onChange((current) => renameSubjective(current, category.id, next))}
                    />
                  ) : (
                    <CategoryLabel dataset={dataset} id={category.id} name={name} />
                  )}
                </span>
                {category.kind === "subjective" && (
                  <>
                    <span className="tag sub">subjetiva</span>
                    <button
                      type="button"
                      className="ghost"
                      aria-label={`Apagar a subjetiva ${name}`}
                      onClick={() => remove(category)}
                    >
                      ✕
                    </button>
                  </>
                )}
                <span className="pct">{shown[category.id]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={active.weights[category.id]}
                aria-label={`Peso de ${name}`}
                aria-valuetext={`${shown[category.id]}%`}
                onPointerDown={() => {
                  usingPointer.current = true;
                }}
                onKeyDown={() => {
                  usingPointer.current = false;
                }}
                onChange={(event) => changeWeight(category.id, Number(event.target.value))}
              />
              <p className="muted small">média da Sessão: {formatAverage(averages[category.id])}%</p>
            </li>
          );
        })}
      </ul>
      <div className="category-actions">
        <button type="button" onClick={add}>
          + Subjetiva
        </button>
        <button type="button" onClick={equalize}>
          Igualar pesos
        </button>
      </div>
    </>
  );
}

function SubjectiveName({
  name,
  autoFocus,
  onCommit,
}: {
  name: string;
  autoFocus: boolean;
  onCommit: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(name), [name]);
  useEffect(() => {
    if (autoFocus) input.current?.select();
  }, [autoFocus]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") setDraft(name);
    else if (trimmed !== name) onCommit(trimmed);
  };
  return (
    <input
      ref={input}
      type="text"
      className="sub-name"
      value={draft}
      aria-label="Nome da subjetiva"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
    />
  );
}
