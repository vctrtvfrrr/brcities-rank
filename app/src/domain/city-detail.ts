import type { CatalogEntry, Dataset, SourceInfo } from "./dataset";
import { SCORE_CRITERION } from "./constraints";
import type { Candidate, CityScores, CutCity, RankResult, Ruler } from "./rank";
import { gradeOf, type Constraint, type Grade, type Session } from "./session";

export type Standing =
  | { kind: "ranked"; position: number; of: number; score: number }
  | { kind: "unscored" }
  | { kind: "cut"; failed: Constraint[]; score: number | null };

export type CriterionDetail = {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  missing: boolean;
  note: number | null;
  ruler: Ruler | null;
  sources: SourceInfo[];
};

export type CategoryDetail = {
  id: string;
  on: boolean;
  note: number | null;
  criteria: CriterionDetail[];
};

export type SubjectiveDetail = {
  id: string;
  name: string;
  on: boolean;
  average: number | null;
  note: number | null;
  mine: Grade | null;
  grades: { id: string; evaluator: string; active: boolean; grade: Grade | null }[];
};

export type FiltersDetail = {
  terrain: { key: string; label: string; unit: string; value: string | number | null; sources: SourceInfo[] }[];
  koppen: { beck: string | null; alvares: string | null; diverge: boolean };
  koppenSources: SourceInfo[];
  hospital: boolean | null;
  hospitalSources: SourceInfo[];
  fibra: boolean | null;
  fibraSources: SourceInfo[];
};

export type CityDetail = {
  code: string;
  name: string;
  uf: string;
  collected: string;
  standing: Standing;
  categories: CategoryDetail[];
  subjectives: SubjectiveDetail[];
  filters: FiltersDetail;
};

export function cityDetail(dataset: Dataset, session: Session, result: RankResult, code: string): CityDetail | null {
  const { codigo_ibge, nome, uf } = dataset.colunas;
  const index = codigo_ibge.indexOf(code);
  if (index < 0) return null;
  const candidate = result.candidates.find((c) => c.code === code);
  const cutCity = result.cut.find((c) => c.code === code);
  const scores = candidate ?? scoresShownWhenCut(cutCity);
  const categoryOn = new Map(session.categories.map((c) => [c.id, c.on]));
  const sourcesOf = (...keys: string[]) => {
    const wanted = new Set(keys.flatMap((key) => dataset.catalogo.find((e) => e.chave === key)?.fontes ?? []));
    return dataset.fontes.filter((source) => wanted.has(source.chave));
  };
  const cell = (key: string) => dataset.colunas[key][index];
  const text = (key: string) => (typeof cell(key) === "string" ? (cell(key) as string) : null);
  const flag = (key: string) => (typeof cell(key) === "boolean" ? (cell(key) as boolean) : null);

  const criterionDetail = (entry: CatalogEntry): CriterionDetail => {
    const value = cell(entry.chave) as number | null;
    return {
      key: entry.chave,
      label: entry.rotulo,
      unit: entry.unidade,
      value,
      missing: value === null,
      note: scores?.criterionScores[entry.chave] ?? null,
      ruler: result.rulers[entry.chave] ?? null,
      sources: sourcesOf(entry.chave),
    };
  };
  const categoryIds = [...new Set(dataset.catalogo.filter((e) => e.pontua).map((e) => e.categoria))];
  const categories = categoryIds.map<CategoryDetail>((id) => ({
    id,
    on: categoryOn.get(id) ?? false,
    note: scores?.categoryScores[id] ?? null,
    criteria: dataset.catalogo.filter((e) => e.pontua && e.categoria === id).map(criterionDetail),
  }));

  const subjectives = session.categories.flatMap<SubjectiveDetail>((category) =>
    category.kind === "subjective"
      ? {
          id: category.id,
          name: category.name,
          on: category.on,
          average: scores?.gradeAverages[category.id] ?? null,
          note: scores?.categoryScores[category.id] ?? null,
          mine: gradeOf(session, category.id, code) ?? null,
          grades: session.evaluators.map((e) => ({
            id: e.id,
            evaluator: e.name,
            active: e.id === session.activeEvaluatorId,
            grade: e.grades[category.id]?.[code] ?? null,
          })),
        }
      : [],
  );
  const beck = text("koppen_beck");
  const alvares = text("koppen_alvares");
  return {
    code,
    name: nome[index],
    uf: uf[index],
    collected: dataset.coleta,
    standing: standingOf(session, result, candidate, cutCity),
    categories,
    subjectives,
    filters: {
      terrain: dataset.catalogo
        .filter((entry) => entry.categoria === "Relevo" && !entry.pontua)
        .map((entry) => ({
          key: entry.chave,
          label: entry.rotulo,
          unit: entry.unidade,
          value: cell(entry.chave) as string | number | null,
          sources: sourcesOf(entry.chave),
        })),
      koppen: { beck, alvares, diverge: beck !== null && alvares !== null && beck !== alvares },
      koppenSources: sourcesOf("koppen_beck", "koppen_alvares"),
      hospital: flag("hospital_geral"),
      hospitalSources: sourcesOf("hospital_geral"),
      fibra: flag("fibra"),
      fibraSources: sourcesOf("fibra"),
    },
  };
}

function standingOf(
  session: Session,
  result: RankResult,
  candidate: Candidate | undefined,
  cutCity: CutCity | undefined,
): Standing {
  if (candidate) {
    if (candidate.position === null || candidate.score === null) return { kind: "unscored" };
    return { kind: "ranked", position: candidate.position, of: result.candidates.length, score: candidate.score };
  }
  const failedKeys = new Set(cutCity?.failedConstraints);
  return {
    kind: "cut",
    failed: session.constraints.filter((c) => failedKeys.has(c.criterion)),
    score: scoresShownWhenCut(cutCity)?.score ?? null,
  };
}

function scoresShownWhenCut(city: CutCity | undefined): CityScores | undefined {
  return city?.failedConstraints.includes(SCORE_CRITERION) ? city.scores : undefined;
}
