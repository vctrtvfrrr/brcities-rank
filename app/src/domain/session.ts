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
