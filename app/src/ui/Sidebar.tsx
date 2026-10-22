import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import { CategoryPanel } from "./CategoryPanel";
import { EvaluatorPanel } from "./EvaluatorPanel";
import { Filters } from "./Filters";
import { formatDate } from "./format";
import { ScoreReadingDialog, SourcesDialog } from "./InfoDialogs";

type Props = {
  dataset: Dataset;
  session: Session;
  cutCounts: Record<string, number>;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
};

export function Sidebar({ dataset, session, cutCounts, onChange, onToggleCategory }: Props) {
  return (
    <aside className="side" aria-label="Sessão">
      <header className="brand">
        <h1>BRCities Rank</h1>
        <p className="muted small">Dados coletados em {formatDate(dataset.coleta)}</p>
        <p className="links small">
          <ScoreReadingDialog />
          <SourcesDialog dataset={dataset} />
        </p>
      </header>
      <section aria-labelledby="sec-session">
        <h2 id="sec-session">Sessão</h2>
        <p className="muted">{session.name || "Sessão sem nome"}</p>
      </section>
      <section aria-labelledby="sec-evaluator">
        <h2 id="sec-evaluator">Avaliador ativo</h2>
        <EvaluatorPanel session={session} onChange={onChange} />
      </section>
      <section aria-labelledby="sec-filters">
        <h2 id="sec-filters">Filtros</h2>
        <Filters dataset={dataset} session={session} cutCounts={cutCounts} onChange={onChange} />
      </section>
      <section className="fill" aria-labelledby="sec-categories">
        <h2 id="sec-categories">Categorias</h2>
        <CategoryPanel dataset={dataset} session={session} onChange={onChange} onToggleCategory={onToggleCategory} />
      </section>
    </aside>
  );
}
