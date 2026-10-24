import { useId, useState, type ReactNode } from "react";
import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import type { Library } from "../domain/session-library";
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
  library: Library;
  cutCounts: Record<string, number>;
  onChange: (update: (session: Session) => Session) => void;
  onToggleCategory: (id: string) => void;
  onReplaceLibrary: (library: Library) => void;
  onAdoptSession: (session: Session) => boolean;
  cutCodes: Set<string>;
  onSelectCity: (code: string) => void;
};

export function Sidebar({
  dataset,
  session,
  library,
  cutCounts,
  onChange,
  onToggleCategory,
  onReplaceLibrary,
  onAdoptSession,
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
      <div className="side-sections">
        <Section id="session" title="Sessão">
          <SessionPanel
            dataset={dataset}
            library={library}
            onChange={onChange}
            onReplaceLibrary={onReplaceLibrary}
            onAdopt={onAdoptSession}
          />
        </Section>
        <Section id="search" title="Buscar cidade">
          <CitySearch dataset={dataset} cutCodes={cutCodes} onSelect={onSelectCity} />
        </Section>
        <Section id="evaluator" title="Avaliador ativo">
          <EvaluatorPanel session={session} onChange={onChange} />
        </Section>
        <Section id="filters" title="Filtros">
          <Filters dataset={dataset} session={session} cutCounts={cutCounts} onChange={onChange} />
        </Section>
        <Section id="categories" title="Categorias">
          <CategoryPanel dataset={dataset} session={session} onChange={onChange} onToggleCategory={onToggleCategory} />
        </Section>
      </div>
    </aside>
  );
}

const COLLAPSED_KEY = "brcities-rank:collapsed-sections";

function readCollapsed(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function storeCollapsed(id: string, collapsed: boolean) {
  try {
    const others = readCollapsed().filter((other) => other !== id);
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed ? [...others, id] : others));
  } catch {
    // Remembering which sections are collapsed is a convenience; it can be lost.
  }
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed().includes(id));
  const bodyId = useId();
  const toggle = () => {
    setCollapsed(!collapsed);
    storeCollapsed(id, !collapsed);
  };
  return (
    <section aria-labelledby={`sec-${id}`} className={collapsed ? "collapsed" : undefined}>
      <h2>
        <button
          type="button"
          id={`sec-${id}`}
          className="section-toggle"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={toggle}
        >
          {title}
        </button>
      </h2>
      <div id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
