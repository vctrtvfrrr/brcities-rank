import { useEffect } from "react";
import type { CategoryDetail, CityDetail, CriterionDetail } from "../domain/city-detail";
import type { Dataset, SourceInfo } from "../domain/dataset";
import { describeConstraint, formatCount, formatDate, formatNote, formatScore, formatValue } from "./format";

const yesNo = (value: boolean | null) => (value === null ? null : value ? "sim" : "não");

export function CityDrawer({
  dataset,
  detail,
  onClose,
}: {
  dataset: Dataset;
  detail: CityDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="drawer" aria-label={`Detalhe de ${detail.name}`}>
      <div className="drawer-head">
        <h3>
          {detail.name} <span className="muted">{detail.uf}</span>
        </h3>
        <button type="button" className="ghost" aria-label="Fechar o detalhe" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="muted small">
        IBGE {detail.code} · Coleta de {formatDate(detail.collected)}
      </p>
      <Standing dataset={dataset} detail={detail} />
      {detail.categories.map((category) => (
        <Category key={category.id} category={category} />
      ))}
      <Filters detail={detail} />
    </aside>
  );
}

function Standing({ dataset, detail }: { dataset: Dataset; detail: CityDetail }) {
  const { standing } = detail;
  if (standing.kind === "cut") {
    return (
      <div className="standing">
        <span className="tag warn">Fora do Corte</span>
        <p className="small">Não passa em:</p>
        <ul className="failed">
          {standing.failed.map((constraint) => (
            <li key={constraint.criterion}>{describeConstraint(dataset, constraint)}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (standing.kind === "unscored") {
    return (
      <div className="standing">
        <span className="tag">Candidata</span>{" "}
        <span className="muted">sem Pontuação: nenhuma categoria ligada conta para ela</span>
      </div>
    );
  }
  return (
    <div className="standing">
      <span className="tag good">
        {standing.position}º de {formatCount(standing.of)}
      </span>{" "}
      <b className="score">{formatScore(standing.score)}</b> <span className="muted">pontos</span>
    </div>
  );
}

function Category({ category }: { category: CategoryDetail }) {
  return (
    <section className={category.on ? "catblock" : "catblock off"} aria-label={category.id}>
      <div className="cathead">
        <span>
          {category.id}
          {category.on ? "" : " (desligada)"}
        </span>
        <span>{category.note === null ? "" : formatNote(category.note)}</span>
      </div>
      <div className="crit-list">
        {category.criteria.map((criterion) => (
          <Criterion key={criterion.key} criterion={criterion} />
        ))}
      </div>
    </section>
  );
}

function Criterion({ criterion }: { criterion: CriterionDetail }) {
  const { bounds } = criterion;
  return (
    <div className="crit">
      <span>{criterion.label}</span>
      <span>
        {criterion.missing ? (
          <span className="tag warn">Dado ausente · conta 0</span>
        ) : (
          formatValue(criterion.value!, criterion.unit)
        )}
      </span>
      <span className="note">{criterion.note === null ? "–" : formatNote(criterion.note)}</span>
      <span className="src">
        <Sources sources={criterion.sources} />
        {bounds && ` · P5 ${formatValue(bounds.low)} / P95 ${formatValue(bounds.high)}`}
      </span>
    </div>
  );
}

function Sources({ sources }: { sources: SourceInfo[] }) {
  return (
    <>
      {sources.map((source, at) => (
        <span key={source.chave}>
          {at > 0 && "; "}
          <a href={source.endereco} target="_blank" rel="noreferrer">
            {source.nome}
          </a>
          , {source.edicao} ({source.ano}) · {source.credito}
        </span>
      ))}
    </>
  );
}

function Filters({ detail }: { detail: CityDetail }) {
  const { filters } = detail;
  const absent = <span className="tag warn">Dado ausente</span>;
  return (
    <section className="catblock" aria-label="Só filtram">
      <div className="cathead">
        <span>Só filtram</span>
      </div>
      <div className="crit-list">
        <div className="crit">
          <span>Köppen</span>
          <span className="wide">
            Beck <b>{filters.koppen.beck ?? "–"}</b> · Alvares <b>{filters.koppen.alvares ?? "sem dado"}</b>
            {filters.koppen.diverge && <span className="tag"> divergem</span>}
          </span>
          <span className="src">
            <Sources sources={filters.koppenSources} />
          </span>
        </div>
        <div className="crit">
          <span>Hospital geral com leito</span>
          <span className="wide">{yesNo(filters.hospital) ?? absent}</span>
          <span className="src">
            <Sources sources={filters.hospitalSources} />
          </span>
        </div>
        <div className="crit">
          <span>Acesso de fibra</span>
          <span className="wide">{yesNo(filters.fibra) ?? absent}</span>
          <span className="src">
            <Sources sources={filters.fibraSources} />
          </span>
        </div>
      </div>
    </section>
  );
}
