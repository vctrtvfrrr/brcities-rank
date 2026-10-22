import type { Dataset } from "../domain/dataset";
import { renameSession, type Session } from "../domain/session";
import { CategoryPanel } from "./CategoryPanel";
import { CitySearch } from "./CitySearch";
import { EvaluatorPanel } from "./EvaluatorPanel";
import { Filters } from "./Filters";
import { formatDate } from "./format";
import { ScoreReadingDialog, SourcesDialog } from "./InfoDialogs";
import { SessionPanel } from "./SessionPanel";

type Props = {
  dataset: Dataset;
  session: Session;
  cutCounts: Record<string, number>;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
  onReplaceSession: (session: Session) => void;
  cutCodes: Set<string>;
  onSelectCity: (code: string) => void;
};

export function Sidebar({
  dataset,
  session,
  cutCounts,
  onChange,
  onToggleCategory,
  onReplaceSession,
  cutCodes,
  onSelectCity,
}: Props) {
  return (
    <aside className="side" aria-label="Sessão">
      <header className="brand">
        <h1>BRCities Rank</h1>
        <p className="muted small">Dados coletados em {formatDate(dataset.coleta)}</p>
        <div className="links small">
          <ScoreReadingDialog />
          <SourcesDialog dataset={dataset} />
        </div>
      </header>
      <section aria-labelledby="sec-session">
        <h2 id="sec-session">Sessão</h2>
        <SessionPanel
          dataset={dataset}
          session={session}
          onReplace={onReplaceSession}
          onRename={(name) => onChange((current) => renameSession(current, name))}
        />
      </section>
      <section aria-labelledby="sec-search">
        <h2 id="sec-search">Buscar cidade</h2>
        <CitySearch dataset={dataset} cutCodes={cutCodes} onSelect={onSelectCity} />
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
