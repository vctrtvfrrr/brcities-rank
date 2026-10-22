import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import { Filters } from "./Filters";

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

type Props = {
  dataset: Dataset;
  session: Session;
  cutCounts: Record<string, number>;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
};

export function Sidebar({ dataset, session, cutCounts, onChange, onToggleCategory }: Props) {
  const active = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  return (
    <aside className="side" aria-label="Sessão">
      <header className="brand">
        <h1>BRCities Rank</h1>
        <p className="muted small">Dados coletados em {formatDate(dataset.coleta)}</p>
      </header>
      <section aria-labelledby="sec-session">
        <h2 id="sec-session">Sessão</h2>
        <p className="muted">{session.name || "Sessão sem nome"}</p>
      </section>
      <section aria-labelledby="sec-evaluator">
        <h2 id="sec-evaluator">Avaliador ativo</h2>
        <p>{active.name}</p>
      </section>
      <section aria-labelledby="sec-filters">
        <h2 id="sec-filters">Filtros</h2>
        <Filters dataset={dataset} session={session} cutCounts={cutCounts} onChange={onChange} />
      </section>
      <section className="fill" aria-labelledby="sec-categories">
        <h2 id="sec-categories">Categorias</h2>
        <ul className="categories">
          {session.categories.map((category) => (
            <li key={category.id} className={category.on ? undefined : "off"}>
              <button
                type="button"
                role="switch"
                aria-checked={category.on}
                aria-label={category.kind === "objective" ? category.id : category.name}
                className={category.on ? "toggle on" : "toggle"}
                onClick={() => onToggleCategory(category.id)}
              />
              <span>{category.kind === "objective" ? category.id : category.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
