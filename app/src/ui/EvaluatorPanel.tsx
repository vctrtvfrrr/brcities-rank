import { useEffect, useState } from "react";
import {
  activateEvaluator,
  addEvaluator,
  countEvaluatorGrades,
  removeEvaluator,
  renameEvaluator,
  type Session,
} from "../domain/session";

type Props = {
  session: Session;
  onChange: (update: (session: Session) => Session) => void;
};

export function EvaluatorPanel({ session, onChange }: Props) {
  const active = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  const [draft, setDraft] = useState(active.name);
  useEffect(() => setDraft(active.name), [active.id, active.name]);
  const isLast = session.evaluators.length === 1;

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") setDraft(active.name);
    else if (trimmed !== active.name) onChange((current) => renameEvaluator(current, active.id, trimmed));
  };

  const remove = () => {
    const lost = countEvaluatorGrades(session, active.id);
    if (
      window.confirm(
        `Remover "${active.name}"? Saem ${lost} ${lost === 1 ? "nota" : "notas"} e todos os pesos dele; o Ranking passa a combinar só os demais.`,
      )
    ) {
      onChange((current) => removeEvaluator(current, active.id));
    }
  };

  return (
    <>
      <div className="evaluator-row">
        <select
          value={active.id}
          aria-label="Avaliador ativo"
          onChange={(event) => onChange((current) => activateEvaluator(current, event.target.value))}
        >
          {session.evaluators.map((evaluator) => (
            <option key={evaluator.id} value={evaluator.id}>
              {evaluator.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Cadastrar avaliador"
          title="Cadastrar avaliador"
          onClick={() => onChange(addEvaluator)}
        >
          +
        </button>
      </div>
      <div className="evaluator-row">
        <input
          type="text"
          value={draft}
          aria-label="Nome do avaliador ativo"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        />
        <button
          type="button"
          disabled={isLast}
          title={isLast ? "A Sessão precisa de ao menos um avaliador" : "Remover o avaliador ativo"}
          onClick={remove}
        >
          Remover
        </button>
      </div>
    </>
  );
}
