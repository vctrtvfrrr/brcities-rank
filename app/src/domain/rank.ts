import { numericLimits, passesConstraint, type NumericLimits } from "./constraints";
import type { CatalogEntry, Dataset } from "./dataset";
import type { Session } from "./session";

export type CityScores = {
  score: number | null;
  categoryScores: Record<string, number>;
  gradeAverages: Record<string, number>;
  criterionScores: Record<string, number>;
};

export type Candidate = CityScores & {
  index: number;
  code: string;
  name: string;
  uf: string;
  position: number | null;
};

const FIRST_TEN = 10;

export function isAmongFirstTen(candidate: Candidate): boolean {
  return candidate.position !== null && candidate.position <= FIRST_TEN;
}

export type CutCity = {
  index: number;
  code: string;
  name: string;
  uf: string;
  failedConstraints: string[];
  scores: CityScores;
};

export type RankResult = {
  candidates: Candidate[];
  cut: CutCity[];
  cutCounts: Record<string, number>;
  rulers: Record<string, Ruler | null>;
};

export type Ruler = { worst: number; best: number };

const collator = new Intl.Collator("pt-BR");

export function rank(dataset: Dataset, session: Session): RankResult {
  const { codigo_ibge, nome, uf, populacao_2026 } = dataset.colunas;
  const scoring = scoreCities(dataset, session);
  const checks = session.constraints.map((constraint) => ({
    criterion: constraint.criterion,
    on: constraint.on,
    passes: passesConstraint(dataset, constraint, (index) => scoring.cities[index].score),
  }));
  const cutCounts = Object.fromEntries(checks.map((check) => [check.criterion, 0]));
  const candidates: Candidate[] = [];
  const cut: CutCity[] = [];

  codigo_ibge.forEach((code, index) => {
    const failed = checks.filter((check) => !check.passes(index));
    for (const check of failed) cutCounts[check.criterion]++;
    const failedConstraints = failed.filter((check) => check.on).map((check) => check.criterion);
    const identity = { index, code, name: nome[index], uf: uf[index] };
    const scores = scoring.cities[index];
    if (failedConstraints.length > 0) cut.push({ ...identity, failedConstraints, scores });
    else candidates.push({ ...identity, ...scores, position: null });
  });

  const population = (index: number) => populacao_2026[index];
  const byPopulationThenCode = (a: Candidate, b: Candidate) =>
    population(b.index) - population(a.index) || Number(a.code) - Number(b.code);
  candidates.sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score || byPopulationThenCode(a, b);
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return collator.compare(a.name, b.name) || byPopulationThenCode(a, b);
  });
  let position = 0;
  for (const candidate of candidates) {
    if (candidate.score !== null) candidate.position = ++position;
  }
  return { candidates, cut, cutCounts, rulers: scoring.rulers };
}

function scoreCities(dataset: Dataset, session: Session) {
  const { codigo_ibge } = dataset.colunas;
  const objective = scoreObjectives(dataset, session);
  const participations = averageParticipations(session);
  const subjectives = session.categories.filter((c) => c.kind === "subjective");
  const counting = Object.keys(participations).filter((id) => participations[id] > 0);

  const cities = codigo_ibge.map<CityScores>((code, index) => {
    const scores = { ...objective.categories[index] };
    const gradeAverages: Record<string, number> = {};
    for (const category of subjectives) {
      const average = averageGrade(session, category.id, code);
      if (average === null) continue;
      gradeAverages[category.id] = average;
      scores[category.id] = (average - 1) * 25;
    }
    let weighted = 0;
    let total = 0;
    for (const id of counting) {
      if (scores[id] === undefined) continue;
      weighted += participations[id] * scores[id];
      total += participations[id];
    }
    return {
      score: total > 0 ? weighted / total : null,
      categoryScores: scores,
      gradeAverages,
      criterionScores: objective.criteria[index],
    };
  });
  return { cities, rulers: objective.rulers };
}

function averageParticipations(session: Session): Record<string, number> {
  const on = session.categories.filter((c) => c.on).map((c) => c.id);
  const byEvaluator = session.evaluators.flatMap((evaluator) => {
    const weights = on.map((id) => evaluator.weights[id] ?? 0);
    const total = weights.reduce((sum, w) => sum + w, 0);
    return total > 0 ? [weights.map((w) => w / total)] : [];
  });
  if (byEvaluator.length === 0) return {};
  return Object.fromEntries(
    on.map((id, at) => [id, byEvaluator.reduce((sum, shares) => sum + shares[at], 0) / byEvaluator.length]),
  );
}

function averageGrade(session: Session, id: string, code: string): number | null {
  const grades = session.evaluators.flatMap((e) => e.grades[id]?.[code] ?? []);
  return grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}

type Scoring = {
  categories: Record<string, number>[];
  criteria: Record<string, number>[];
  rulers: Record<string, Ruler | null>;
};

function scoreObjectives(dataset: Dataset, session: Session): Scoring {
  const indexes = dataset.colunas.codigo_ibge.map((_, index) => index);
  const scoring = dataset.catalogo.filter((entry) => entry.pontua);
  const criteriaByCategory = new Map<string, CatalogEntry[]>();
  for (const entry of scoring) {
    criteriaByCategory.set(entry.categoria, [...(criteriaByCategory.get(entry.categoria) ?? []), entry]);
  }
  const scored = new Map(scoring.map((entry) => [entry.chave, scoreCriterion(dataset, session, entry, indexes)]));
  return {
    categories: indexes.map((_, position) =>
      Object.fromEntries(
        [...criteriaByCategory].map(([category, criteria]) => [
          category,
          criteria.reduce((sum, entry) => sum + scored.get(entry.chave)!.notes[position], 0) / criteria.length,
        ]),
      ),
    ),
    criteria: indexes.map((_, position) =>
      Object.fromEntries(scoring.map((entry) => [entry.chave, scored.get(entry.chave)!.notes[position]])),
    ),
    rulers: Object.fromEntries(scoring.map((entry) => [entry.chave, scored.get(entry.chave)!.ruler])),
  };
}

function scoreCriterion(dataset: Dataset, session: Session, entry: CatalogEntry, indexes: number[]) {
  const column = dataset.colunas[entry.chave] as (number | null)[];
  const ruler = measureRuler(column, entry, numericLimits(session, entry.chave));
  const notes = indexes.map((index) => {
    const value = transform(entry, column[index]);
    if (value === null || ruler === null) return 0;
    if (ruler.worst === ruler.best) return 100;
    const note = (value - ruler.worst) / (ruler.best - ruler.worst);
    return Math.min(Math.max(note, 0), 1) * 100;
  });
  const rawRuler = ruler && { worst: untransform(entry, ruler.worst), best: untransform(entry, ruler.best) };
  return { notes, ruler: rawRuler };
}

function measureRuler(column: (number | null)[], entry: CatalogEntry, limits: NumericLimits): Ruler | null {
  const values = column.map((value) => transform(entry, value)).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const sorted = Float64Array.from(values).sort();
  const min = transform(entry, limits.min);
  const max = transform(entry, limits.max);
  const low = min ?? lowEndWithoutLimit(sorted, max);
  const high = max ?? highEndWithoutLimit(sorted, min);
  return entry.direcao === "menor" ? { worst: high, best: low } : { worst: low, best: high };
}

function lowEndWithoutLimit(sorted: Float64Array, max: number | null): number {
  const p5 = percentile(sorted, 0.05);
  return max !== null && p5 >= max ? sorted[0] : p5;
}

function highEndWithoutLimit(sorted: Float64Array, min: number | null): number {
  const p95 = percentile(sorted, 0.95);
  return min !== null && p95 <= min ? sorted[sorted.length - 1] : p95;
}

function untransform(entry: CatalogEntry, value: number): number {
  return entry.transformacao === "logaritmo" ? Math.exp(value) : value;
}

function transform(entry: CatalogEntry, value: number | null): number | null {
  if (value === null) return null;
  if (entry.transformacao !== "logaritmo") return value;
  return value > 0 ? Math.log(value) : null;
}

function percentile(sorted: Float64Array, fraction: number): number {
  const at = (sorted.length - 1) * fraction;
  const lower = Math.floor(at);
  const upper = Math.ceil(at);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (at - lower);
}
