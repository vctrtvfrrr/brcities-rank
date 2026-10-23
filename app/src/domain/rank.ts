import { passesConstraint } from "./constraints";
import type { CatalogEntry, Dataset } from "./dataset";
import { averageWeights, type Session } from "./session";

export type Candidate = {
  index: number;
  code: string;
  name: string;
  uf: string;
  position: number | null;
  score: number | null;
  categoryScores: Record<string, number>;
  gradeAverages: Record<string, number>;
  criterionScores: Record<string, number>;
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
};

export type RankResult = {
  candidates: Candidate[];
  cut: CutCity[];
  cutCounts: Record<string, number>;
  bounds: Record<string, Bounds | null>;
};

export type Bounds = { low: number; high: number };

const collator = new Intl.Collator("pt-BR");

export function rank(dataset: Dataset, session: Session): RankResult {
  const { codigo_ibge, nome, uf, populacao_2026 } = dataset.colunas;
  const checks = session.constraints.map((constraint) => ({
    criterion: constraint.criterion,
    on: constraint.on,
    passes: passesConstraint(dataset, constraint),
  }));
  const cutCounts = Object.fromEntries(checks.map((check) => [check.criterion, 0]));
  const candidateIndexes: number[] = [];
  const cut: CutCity[] = [];

  codigo_ibge.forEach((code, index) => {
    const failed = checks.filter((check) => !check.passes(index));
    for (const check of failed) cutCounts[check.criterion]++;
    const failedConstraints = failed.filter((check) => check.on).map((check) => check.criterion);
    if (failedConstraints.length > 0) cut.push({ index, code, name: nome[index], uf: uf[index], failedConstraints });
    else candidateIndexes.push(index);
  });

  const population = (index: number) => populacao_2026[index];
  const scoring = scoreCandidates(dataset, candidateIndexes);
  const weights = averageWeights(session);
  const subjectives = session.categories.filter((c) => c.kind === "subjective");
  const counting = session.categories.filter((c) => c.on && (weights[c.id] ?? 0) > 0).map((c) => c.id);

  const candidates = candidateIndexes.map<Candidate>((index, at) => {
    const scores = { ...scoring.categories[at] };
    const gradeAverages: Record<string, number> = {};
    for (const category of subjectives) {
      const average = averageGrade(session, category.id, codigo_ibge[index]);
      if (average === null) continue;
      gradeAverages[category.id] = average;
      scores[category.id] = (average - 1) * 25;
    }
    let weighted = 0;
    let total = 0;
    for (const id of counting) {
      if (scores[id] === undefined) continue;
      weighted += weights[id] * scores[id];
      total += weights[id];
    }
    return {
      index,
      code: codigo_ibge[index],
      name: nome[index],
      uf: uf[index],
      position: null,
      score: total > 0 ? weighted / total : null,
      categoryScores: scores,
      gradeAverages,
      criterionScores: scoring.criteria[at],
    };
  });

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
  return { candidates, cut, cutCounts, bounds: scoring.bounds };
}

function averageGrade(session: Session, id: string, code: string): number | null {
  const grades = session.evaluators.flatMap((e) => e.grades[id]?.[code] ?? []);
  return grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}

type Scoring = {
  categories: Record<string, number>[];
  criteria: Record<string, number>[];
  bounds: Record<string, Bounds | null>;
};

function scoreCandidates(dataset: Dataset, indexes: number[]): Scoring {
  const scoring = dataset.catalogo.filter((entry) => entry.pontua);
  const criteriaByCategory = new Map<string, CatalogEntry[]>();
  for (const entry of scoring) {
    criteriaByCategory.set(entry.categoria, [...(criteriaByCategory.get(entry.categoria) ?? []), entry]);
  }
  const scored = new Map(scoring.map((entry) => [entry.chave, scoreCriterion(dataset, entry, indexes)]));
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
    bounds: Object.fromEntries(scoring.map((entry) => [entry.chave, scored.get(entry.chave)!.bounds])),
  };
}

function scoreCriterion(dataset: Dataset, entry: CatalogEntry, indexes: number[]) {
  const column = dataset.colunas[entry.chave] as (number | null)[];
  const transformed = indexes.map((index) => transform(entry, column[index]));
  const bounds = trimBounds(transformed.filter((v): v is number => v !== null));
  const notes = transformed.map((value) => {
    if (value === null || bounds === null) return 0;
    if (bounds.low === bounds.high) return 100;
    const note = ((Math.min(Math.max(value, bounds.low), bounds.high) - bounds.low) / (bounds.high - bounds.low)) * 100;
    return entry.direcao === "menor" ? 100 - note : note;
  });
  const raw = bounds && { low: untransform(entry, bounds.low), high: untransform(entry, bounds.high) };
  return { notes, bounds: raw };
}

function untransform(entry: CatalogEntry, value: number): number {
  return entry.transformacao === "logaritmo" ? Math.exp(value) : value;
}

function transform(entry: CatalogEntry, value: number | null): number | null {
  if (value === null) return null;
  return entry.transformacao === "logaritmo" ? Math.log(value) : value;
}

function trimBounds(values: number[]): Bounds | null {
  if (values.length === 0) return null;
  const sorted = Float64Array.from(values).sort();
  return { low: percentile(sorted, 0.05), high: percentile(sorted, 0.95) };
}

function percentile(sorted: Float64Array, fraction: number): number {
  const at = (sorted.length - 1) * fraction;
  const lower = Math.floor(at);
  const upper = Math.ceil(at);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (at - lower);
}
