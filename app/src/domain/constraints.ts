import type { Dataset } from "./dataset";
import { inStateOrder, STATES } from "./regions";
import type { Constraint, Session } from "./session";
import { inTerrainOrder, TERRAIN_CLASSES, TERRAIN_CRITERION } from "./terrain";
import { outletVoltage, voltagePairs, VOLTAGES, VOLTAGE_CRITERION, type Voltage } from "./voltage";

export const KOPPEN_CRITERION = "koppen";
export const LOCATION_CRITERION = "location";
export const SCORE_CRITERION = "score";
export const MAX_SCORE = 100;
const KOPPEN_BECK = "koppen_beck";
const KOPPEN_ALVARES = "koppen_alvares";
const BOOLEAN_CRITERIA = ["hospital_geral", "fibra"];

export type ConstraintKind = "location" | "score" | "numeric" | "koppen" | "terrain" | "boolean" | "voltage";

export type ConstraintOption = {
  criterion: string;
  label: string;
  group: string;
  kind: ConstraintKind;
};

export type ConstraintEdit = Partial<{
  voltages: Voltage[];
  min: number | null;
  max: number | null;
  accepted: string[];
  states: string[];
  atLeast: number | null;
  value: boolean;
}>;

export function constraintKind(criterion: string): ConstraintKind {
  if (criterion === VOLTAGE_CRITERION) return "voltage";
  if (criterion === LOCATION_CRITERION) return "location";
  if (criterion === SCORE_CRITERION) return "score";
  if (criterion === KOPPEN_CRITERION) return "koppen";
  if (criterion === TERRAIN_CRITERION) return "terrain";
  return BOOLEAN_CRITERIA.includes(criterion) ? "boolean" : "numeric";
}

const LOCATION_OPTION: ConstraintOption = {
  criterion: LOCATION_CRITERION,
  label: "Localização",
  group: "Localização",
  kind: "location",
};

const SCORE_OPTION: ConstraintOption = {
  criterion: SCORE_CRITERION,
  label: "Pontuação mínima",
  group: "Pontuação",
  kind: "score",
};

function allOptions(dataset: Dataset): ConstraintOption[] {
  const fromCatalog = dataset.catalogo
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
  return [LOCATION_OPTION, SCORE_OPTION, ...fromCatalog];
}

export function constraintOptions(dataset: Dataset, session: Session): ConstraintOption[] {
  const taken = new Set(session.constraints.map((c) => c.criterion));
  return allOptions(dataset).filter((option) => !taken.has(option.criterion));
}

function neutralConstraint(option: ConstraintOption): Constraint {
  switch (option.kind) {
    case "voltage":
      return { criterion: VOLTAGE_CRITERION, on: true, voltages: [...VOLTAGES] };
    case "location":
      return { criterion: LOCATION_CRITERION, on: true, states: [...STATES] };
    case "score":
      return { criterion: SCORE_CRITERION, on: true, atLeast: null };
    case "koppen":
      return { criterion: KOPPEN_CRITERION, on: true, accepted: [] };
    case "terrain":
      return { criterion: TERRAIN_CRITERION, on: true, accepted: [...TERRAIN_CLASSES] };
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
    if ("voltages" in c)
      return edit.voltages ? { ...c, voltages: VOLTAGES.filter((v) => edit.voltages!.includes(v)) } : c;
    if ("states" in c) return edit.states ? { ...c, states: inStateOrder(edit.states) } : c;
    if ("atLeast" in c) return edit.atLeast === undefined ? c : { ...c, atLeast: edit.atLeast };
    if ("accepted" in c)
      return edit.accepted
        ? { ...c, accepted: c.criterion === TERRAIN_CRITERION ? inTerrainOrder(edit.accepted) : edit.accepted }
        : c;
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

export type NumericLimits = { min: number | null; max: number | null };

export function numericLimits(session: Session, criterion: string): NumericLimits {
  const constraint = session.constraints.find((c) => c.criterion === criterion && c.on);
  return constraint && "min" in constraint ? constraint : { min: null, max: null };
}

function roundedAsShown(score: number): number {
  return Math.round(score * 10) / 10;
}

export type CityPasser = (index: number) => boolean;

export function passesConstraint(
  dataset: Dataset,
  constraint: Constraint,
  scoreOf: (index: number) => number | null,
): CityPasser {
  const { colunas } = dataset;
  if ("voltages" in constraint) {
    return (i) =>
      voltagePairs(colunas[VOLTAGE_CRITERION]?.[i]).some((pair) => constraint.voltages.includes(outletVoltage(pair)));
  }
  if ("atLeast" in constraint) {
    const { atLeast } = constraint;
    return (i) => {
      const score = scoreOf(i);
      return atLeast === null || score === null || roundedAsShown(score) >= atLeast;
    };
  }
  if ("states" in constraint) {
    const states = new Set(constraint.states);
    return (i) => states.has(colunas.uf[i]);
  }
  if ("accepted" in constraint) {
    const accepted = new Set(constraint.accepted);
    if (constraint.criterion === TERRAIN_CRITERION) {
      const column = colunas[TERRAIN_CRITERION];
      return (i) => typeof column[i] === "string" && accepted.has(column[i] as string);
    }
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
