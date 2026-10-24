import type { Dataset } from "./dataset";

export const SESSION_VERSION = 2;

export const MAX_WEIGHT = 10;
export const DEFAULT_WEIGHT = 5;

export type Constraint =
  | { criterion: string; on: boolean; min: number | null; max: number | null }
  | { criterion: "koppen"; on: boolean; accepted: string[] }
  | { criterion: "location"; on: boolean; states: string[] }
  | { criterion: "score"; on: boolean; atLeast: number | null }
  | { criterion: "hospital_geral" | "fibra"; on: boolean; value: boolean };

export type Category =
  | { id: string; kind: "objective"; on: boolean }
  | { id: string; kind: "subjective"; name: string; on: boolean };

export type Grade = 1 | 2 | 3 | 4 | 5;

export const GRADES: Grade[] = [1, 2, 3, 4, 5];

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
  return {
    version: SESSION_VERSION,
    name: "",
    constraints: [],
    categories: objectiveIds.map((id) => ({ id, kind: "objective", on: false })),
    evaluators: [
      {
        id: FIRST_EVALUATOR_ID,
        name: "Você",
        weights: Object.fromEntries(objectiveIds.map((id) => [id, DEFAULT_WEIGHT])),
        grades: {},
      },
    ],
    activeEvaluatorId: FIRST_EVALUATOR_ID,
  };
}

export function renameSession(session: Session, name: string): Session {
  return { ...session, name };
}

export function toggleCategory(session: Session, id: string): Session {
  return {
    ...session,
    categories: session.categories.map((category) =>
      category.id === id ? { ...category, on: !category.on } : category,
    ),
  };
}

function updateActiveEvaluator(session: Session, update: (evaluator: Evaluator) => Evaluator): Session {
  return {
    ...session,
    evaluators: session.evaluators.map((e) => (e.id === session.activeEvaluatorId ? update(e) : e)),
  };
}

export function setWeight(session: Session, id: string, value: number): Session {
  const weight = Math.round(Math.min(MAX_WEIGHT, Math.max(0, value)));
  return updateActiveEvaluator(session, (evaluator) => ({
    ...evaluator,
    weights: { ...evaluator.weights, [id]: weight },
  }));
}

const defaultWeights = (categories: Category[]) => Object.fromEntries(categories.map((c) => [c.id, DEFAULT_WEIGHT]));

export function equalizeWeights(session: Session): Session {
  return updateActiveEvaluator(session, (evaluator) => ({ ...evaluator, weights: defaultWeights(session.categories) }));
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

const SUBJECTIVE_ID_PREFIX = "subjective-";

export function addSubjective(session: Session): Session {
  const taken = session.categories
    .filter((c) => c.kind === "subjective")
    .map((c) => Number(c.id.slice(SUBJECTIVE_ID_PREFIX.length)));
  const number = Math.max(0, ...taken) + 1;
  const id = `${SUBJECTIVE_ID_PREFIX}${number}`;
  return {
    ...session,
    categories: [...session.categories, { id, kind: "subjective", name: `Subjetiva ${number}`, on: true }],
    evaluators: session.evaluators.map((e) => ({ ...e, weights: { ...e.weights, [id]: 0 } })),
  };
}

export function renameSubjective(session: Session, id: string, name: string): Session {
  return {
    ...session,
    categories: session.categories.map((c) => (c.id === id && c.kind === "subjective" ? { ...c, name } : c)),
  };
}

export function countGrades(session: Session, id: string): number {
  return session.evaluators.reduce((total, e) => total + Object.keys(e.grades[id] ?? {}).length, 0);
}

export function deleteSubjective(session: Session, id: string): Session {
  const without = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([category]) => category !== id));
  return {
    ...session,
    categories: session.categories.filter((c) => c.id !== id),
    evaluators: session.evaluators.map((evaluator) => ({
      ...evaluator,
      weights: without(evaluator.weights),
      grades: without(evaluator.grades),
    })),
  };
}

export function gradeOf(session: Session, id: string, code: string, evaluatorId = session.activeEvaluatorId) {
  return session.evaluators.find((e) => e.id === evaluatorId)?.grades[id]?.[code];
}

export function setGrade(session: Session, id: string, code: string, grade: Grade): Session {
  return updateActiveEvaluator(session, (evaluator) => {
    const { [code]: current, ...others } = evaluator.grades[id] ?? {};
    const cityGrades = current === grade ? others : { ...others, [code]: grade };
    return { ...evaluator, grades: { ...evaluator.grades, [id]: cityGrades } };
  });
}

const EVALUATOR_ID_PREFIX = "evaluator-";

export function addEvaluator(session: Session): Session {
  const taken = session.evaluators.map((e) => Number(e.id.slice(EVALUATOR_ID_PREFIX.length)));
  const id = `${EVALUATOR_ID_PREFIX}${Math.max(0, ...taken) + 1}`;
  const added: Evaluator = {
    id,
    name: `Avaliador ${session.evaluators.length + 1}`,
    weights: defaultWeights(session.categories),
    grades: {},
  };
  return { ...session, evaluators: [...session.evaluators, added], activeEvaluatorId: id };
}

export function renameEvaluator(session: Session, id: string, name: string): Session {
  return { ...session, evaluators: session.evaluators.map((e) => (e.id === id ? { ...e, name } : e)) };
}

export function activateEvaluator(session: Session, id: string): Session {
  return session.evaluators.some((e) => e.id === id) ? { ...session, activeEvaluatorId: id } : session;
}

export function countEvaluatorGrades(session: Session, id: string): number {
  const grades = session.evaluators.find((e) => e.id === id)?.grades ?? {};
  return Object.values(grades).reduce((total, cities) => total + Object.keys(cities).length, 0);
}

export function removeEvaluator(session: Session, id: string): Session {
  if (session.evaluators.length === 1 || !session.evaluators.some((e) => e.id === id)) return session;
  const evaluators = session.evaluators.filter((e) => e.id !== id);
  const activeEvaluatorId = session.activeEvaluatorId === id ? evaluators[0].id : session.activeEvaluatorId;
  return { ...session, evaluators, activeEvaluatorId };
}
