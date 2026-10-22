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
};

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
};

type Bounds = { low: number; high: number };

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
  const categoryScores = scoreCategories(dataset, candidateIndexes);
  const weights = averageWeights(session);
  const counting = session.categories.filter((c) => c.on && (weights[c.id] ?? 0) > 0).map((c) => c.id);

  const candidates = candidateIndexes.map<Candidate>((index, at) => {
    const scores = categoryScores[at];
    let weighted = 0;
    let total = 0;
    for (const id of counting) {
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
  return { candidates, cut, cutCounts };
}

function scoreCategories(dataset: Dataset, indexes: number[]): Record<string, number>[] {
  const criteriaByCategory = new Map<string, CatalogEntry[]>();
  for (const entry of dataset.catalogo) {
    if (!entry.pontua) continue;
    criteriaByCategory.set(entry.categoria, [...(criteriaByCategory.get(entry.categoria) ?? []), entry]);
  }
  const notes = new Map(
    dataset.catalogo.filter((e) => e.pontua).map((entry) => [entry.chave, criterionNotes(dataset, entry, indexes)]),
  );
  return indexes.map((_, position) =>
    Object.fromEntries(
      [...criteriaByCategory].map(([category, criteria]) => [
        category,
        criteria.reduce((sum, entry) => sum + notes.get(entry.chave)![position], 0) / criteria.length,
      ]),
    ),
  );
}

function criterionNotes(dataset: Dataset, entry: CatalogEntry, indexes: number[]): number[] {
  const column = dataset.colunas[entry.chave] as (number | null)[];
  const transformed = indexes.map((index) => transform(entry, column[index]));
  const bounds = trimBounds(transformed.filter((v): v is number => v !== null));
  return transformed.map((value) => {
    if (value === null || bounds === null) return 0;
    if (bounds.low === bounds.high) return 100;
    const note = ((Math.min(Math.max(value, bounds.low), bounds.high) - bounds.low) / (bounds.high - bounds.low)) * 100;
    return entry.direcao === "menor" ? 100 - note : note;
  });
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
