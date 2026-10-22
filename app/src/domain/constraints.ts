import type { Dataset } from "./dataset";
import type { Constraint, Session } from "./session";

export const KOPPEN_CRITERION = "koppen";
const KOPPEN_BECK = "koppen_beck";
const KOPPEN_ALVARES = "koppen_alvares";
const BOOLEAN_CRITERIA = ["hospital_geral", "fibra"];

export type ConstraintKind = "numeric" | "koppen" | "boolean";

export type ConstraintOption = {
  criterion: string;
  label: string;
  group: string;
  kind: ConstraintKind;
};

export type ConstraintEdit = Partial<{ min: number | null; max: number | null; accepted: string[]; value: boolean }>;

export function constraintKind(criterion: string): ConstraintKind {
  if (criterion === KOPPEN_CRITERION) return "koppen";
  return BOOLEAN_CRITERIA.includes(criterion) ? "boolean" : "numeric";
}

function allOptions(dataset: Dataset): ConstraintOption[] {
  return dataset.catalogo
    .filter((entry) => entry.chave !== KOPPEN_ALVARES)
    .map((entry) => {
      const criterion = entry.chave === KOPPEN_BECK ? KOPPEN_CRITERION : entry.chave;
      return {
        criterion,
        label: criterion === KOPPEN_CRITERION ? "Köppen" : entry.rotulo,
        group: entry.categoria,
        kind: constraintKind(criterion),
      };
    });
}

export function constraintOptions(dataset: Dataset, session: Session): ConstraintOption[] {
  const taken = new Set(session.constraints.map((c) => c.criterion));
  return allOptions(dataset).filter((option) => !taken.has(option.criterion));
}

function neutralConstraint(option: ConstraintOption): Constraint {
  switch (option.kind) {
    case "koppen":
      return { criterion: KOPPEN_CRITERION, on: true, accepted: [] };
    case "boolean":
      return { criterion: option.criterion as "hospital_geral" | "fibra", on: true, value: true };
    case "numeric":
      return { criterion: option.criterion, on: true, min: null, max: null };
  }
}

export function addConstraint(dataset: Dataset, session: Session, criterion: string): Session {
  const option = constraintOptions(dataset, session).find((o) => o.criterion === criterion);
  if (!option) return session;
  return { ...session, constraints: [...session.constraints, neutralConstraint(option)] };
}

function mapConstraint(session: Session, criterion: string, change: (c: Constraint) => Constraint): Session {
  return { ...session, constraints: session.constraints.map((c) => (c.criterion === criterion ? change(c) : c)) };
}

export function editConstraint(session: Session, criterion: string, edit: ConstraintEdit): Session {
  return mapConstraint(session, criterion, (c) => {
    if ("accepted" in c) return edit.accepted ? { ...c, accepted: edit.accepted } : c;
    if ("value" in c) return edit.value === undefined ? c : { ...c, value: edit.value };
    return { ...c, min: edit.min === undefined ? c.min : edit.min, max: edit.max === undefined ? c.max : edit.max };
  });
}

export function toggleConstraint(session: Session, criterion: string): Session {
  return mapConstraint(session, criterion, (c) => ({ ...c, on: !c.on }));
}

export function removeConstraint(session: Session, criterion: string): Session {
  return { ...session, constraints: session.constraints.filter((c) => c.criterion !== criterion) };
}

export function numericRange(dataset: Dataset, criterion: string): [number, number] | null {
  const values = (dataset.colunas[criterion] ?? []).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return [Math.min(...values), Math.max(...values)];
}

export function koppenClasses(dataset: Dataset): string[] {
  const classes = new Set<string>();
  for (const column of [KOPPEN_BECK, KOPPEN_ALVARES]) {
    for (const value of dataset.colunas[column] ?? []) if (typeof value === "string") classes.add(value);
  }
  return [...classes].sort();
}

export type CityPasser = (index: number) => boolean;

export function passesConstraint(dataset: Dataset, constraint: Constraint): CityPasser {
  const { colunas } = dataset;
  if ("accepted" in constraint) {
    const accepted = new Set(constraint.accepted);
    const beck = colunas[KOPPEN_BECK];
    const alvares = colunas[KOPPEN_ALVARES];
    return (i) => {
      const b = beck[i];
      const a = alvares[i];
      return (typeof b === "string" && accepted.has(b)) || (typeof a === "string" && accepted.has(a));
    };
  }
  const column = colunas[constraint.criterion];
  if ("value" in constraint) return (i) => column[i] === constraint.value;
  const { min, max } = constraint;
  return (i) => {
    const v = column[i];
    return typeof v === "number" && (min === null || v >= min) && (max === null || v <= max);
  };
}
