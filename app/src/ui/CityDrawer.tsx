import { useEffect, useRef } from "react";
import type { CategoryDetail, CityDetail, CriterionDetail, SubjectiveDetail } from "../domain/city-detail";
import type { Dataset, SourceInfo } from "../domain/dataset";
import { GRADES, type Grade } from "../domain/session";
import { ScoreBadge } from "./ScoreBadge";
import { describeConstraint, formatCount, formatDate, formatGrade, formatNote, formatValue } from "./format";

const yesNo = (value: boolean | null) => (value === null ? null : value ? "sim" : "não");

export function CityDrawer({
  dataset,
  detail,
  evaluatorName,
  onClose,
  onGrade,
}: {
  dataset: Dataset;
  detail: CityDetail;
  evaluatorName: string;
  onClose: () => void;
  onGrade: (id: string, code: string, grade: Grade) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    drawer.current?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    drawer.current?.scrollTo({ top: 0 });
  }, [detail.code]);

  return (
    <aside className="drawer" ref={drawer} tabIndex={-1} aria-label={`Detalhe de ${detail.name}`}>
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
      {detail.subjectives.map((subjective) => (
        <Subjective
          key={subjective.id}
          subjective={subjective}
          evaluatorName={evaluatorName}
          onGrade={(grade) => onGrade(subjective.id, detail.code, grade)}
        />
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
      <b className="score">
        <ScoreBadge score={standing.score} />
      </b>{" "}
      <span className="muted">pontos</span>
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
        <span>{category.note === null ? "" : <ScoreBadge score={category.note} note />}</span>
      </div>
      <div className="crit-list">
        {category.criteria.map((criterion) => (
          <Criterion key={criterion.key} criterion={criterion} />
        ))}
      </div>
    </section>
  );
}

function Subjective({
  subjective,
  evaluatorName,
  onGrade,
}: {
  subjective: SubjectiveDetail;
  evaluatorName: string;
  onGrade: (grade: Grade) => void;
}) {
  return (
    <section className={subjective.on ? "catblock" : "catblock off"} aria-label={subjective.name}>
      <div className="cathead">
        <span>
          {subjective.name} <span className="tag sub">subjetiva</span>
          {subjective.on ? "" : " (desligada)"}
        </span>
        <span>{subjective.note === null ? "" : <ScoreBadge score={subjective.note} note />}</span>
      </div>
      <div className="crit">
        <span>Média das notas</span>
        <span className="wide">{subjective.average === null ? "–" : formatGrade(subjective.average)}</span>
      </div>
      <ul className="evaluator-grades" aria-label={`Notas de ${subjective.name}`}>
        {subjective.grades.map((entry) => (
          <li key={entry.id} className={entry.active ? "active" : undefined}>
            <span>{entry.evaluator}</span>
            <span>{entry.grade ?? "–"}</span>
          </li>
        ))}
      </ul>
      <div className="grade-row">
        <span className="muted small">Nota de {evaluatorName}</span>
        <span className="stars show" role="group" aria-label={`Nota de ${evaluatorName} para ${subjective.name}`}>
          {GRADES.map((grade) => (
            <button
              type="button"
              key={grade}
              className={subjective.mine === grade ? "on" : undefined}
              aria-pressed={subjective.mine === grade}
              aria-label={`Nota ${grade}`}
              onClick={() => onGrade(grade)}
            >
              {grade}
            </button>
          ))}
        </span>
      </div>
    </section>
  );
}

function Criterion({ criterion }: { criterion: CriterionDetail }) {
  const { ruler } = criterion;
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
        {ruler && ` · 0 em ${formatValue(ruler.worst)} / 100 em ${formatValue(ruler.best)}`}
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
