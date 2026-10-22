import { useEffect, useRef, useState } from "react";
import {
  averageWeights,
  displayWeights,
  equalizeWeights,
  orderedCategories,
  setWeight,
  type Category,
  type Session,
} from "../domain/session";

const categoryName = (category: Category) => (category.kind === "objective" ? category.id : category.name);
const formatAverage = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const POINTER_RELEASE_EVENTS = ["pointerup", "pointercancel", "blur"] as const;
const KEYBOARD_RELEASE_EVENTS = ["keyup", "blur"] as const;

type Props = {
  session: Session;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
};

export function CategoryPanel({ session, onChange, onToggleCategory }: Props) {
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
                <span className="category-name">{name}</span>
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
        <button type="button" onClick={equalize}>
          Igualar pesos
        </button>
      </div>
    </>
  );
}
