import type { Dataset } from "./dataset";

export const SESSION_VERSION = 1;

export type Constraint =
  | { criterion: string; on: boolean; min: number | null; max: number | null }
  | { criterion: "koppen"; on: boolean; accepted: string[] }
  | { criterion: "hospital_geral" | "fibra"; on: boolean; value: boolean };

export type Category =
  | { id: string; kind: "objective"; on: boolean }
  | { id: string; kind: "subjective"; name: string; on: boolean };

export type Grade = 1 | 2 | 3 | 4 | 5;

export type Evaluator = {
  id: string;
  name: string;
  weights: Record<string, number>;
  grades: Record<string, Record<string, Grade>>;
};

export type Session = {
  version: number;
  name: string;
  constraints: Constraint[];
  categories: Category[];
  evaluators: Evaluator[];
  activeEvaluatorId: string;
};

const FIRST_EVALUATOR_ID = "evaluator-1";

export function createInitialSession(dataset: Dataset): Session {
  const objectiveIds = [...new Set(dataset.catalogo.filter((c) => c.pontua).map((c) => c.categoria))];
  const equalWeight = 100 / objectiveIds.length;
  return {
    version: SESSION_VERSION,
    name: "",
    constraints: [],
    categories: objectiveIds.map((id) => ({ id, kind: "objective", on: false })),
    evaluators: [
      {
        id: FIRST_EVALUATOR_ID,
        name: "Você",
        weights: Object.fromEntries(objectiveIds.map((id) => [id, equalWeight])),
        grades: {},
      },
    ],
    activeEvaluatorId: FIRST_EVALUATOR_ID,
  };
}

export function toggleCategory(session: Session, id: string): Session {
  return {
    ...session,
    categories: session.categories.map((category) =>
      category.id === id ? { ...category, on: !category.on } : category,
    ),
  };
}

const FLOAT_NOISE = 1e-9;

function updateActiveEvaluator(session: Session, update: (evaluator: Evaluator) => Evaluator): Session {
  return {
    ...session,
    evaluators: session.evaluators.map((e) => (e.id === session.activeEvaluatorId ? update(e) : e)),
  };
}

export function setWeight(session: Session, id: string, value: number): Session {
  const others = session.categories.map((c) => c.id).filter((other) => other !== id);
  const clamped = others.length === 0 ? 100 : Math.min(100, Math.max(0, value));
  return updateActiveEvaluator(session, (evaluator) => {
    const othersTotal = others.reduce((total, other) => total + evaluator.weights[other], 0);
    const remainder = 100 - clamped;
    const weights: Record<string, number> = {};
    for (const category of session.categories) {
      if (category.id === id) weights[id] = clamped;
      else if (othersTotal > 0) weights[category.id] = (evaluator.weights[category.id] * remainder) / othersTotal;
      else weights[category.id] = remainder / others.length;
    }
    return { ...evaluator, weights };
  });
}

export function equalizeWeights(session: Session): Session {
  const equal = 100 / session.categories.length;
  return updateActiveEvaluator(session, (evaluator) => ({
    ...evaluator,
    weights: Object.fromEntries(session.categories.map((c) => [c.id, equal])),
  }));
}

export function displayWeights(evaluator: Evaluator, categories: Category[]): Record<string, number> {
  const floors = categories.map((c) => Math.floor(evaluator.weights[c.id] + FLOAT_NOISE));
  const byLargestRemainder = categories
    .map((c, at) => ({ at, remainder: evaluator.weights[c.id] - floors[at] }))
    .sort((a, b) => b.remainder - a.remainder || a.at - b.at);
  const missing = 100 - floors.reduce((total, floor) => total + floor, 0);
  for (const { at } of byLargestRemainder.slice(0, Math.max(0, missing))) floors[at]++;
  return Object.fromEntries(categories.map((c, at) => [c.id, floors[at]]));
}

export function averageWeights(session: Session): Record<string, number> {
  return Object.fromEntries(
    session.categories.map((c) => [
      c.id,
      session.evaluators.reduce((total, e) => total + (e.weights[c.id] ?? 0), 0) / session.evaluators.length,
    ]),
  );
}

export function orderedCategories(session: Session): Category[] {
  const active = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  return session.categories
    .map((category, at) => ({ category, at }))
    .sort((a, b) => active.weights[b.category.id] - active.weights[a.category.id] || a.at - b.at)
    .map(({ category }) => category);
}
