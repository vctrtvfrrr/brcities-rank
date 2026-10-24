import { constraintOptions } from "./constraints";
import type { Dataset } from "./dataset";
import {
  createInitialSession,
  MAX_WEIGHT,
  SESSION_VERSION,
  type Category,
  type Constraint,
  type Evaluator,
  type Grade,
  type Session,
} from "./session";

export type ParseResult = { ok: true; session: Session } | { ok: false; reason: string };

class InvalidSession extends Error {}

function refuse(reason: string): never {
  throw new InvalidSession(reason);
}

const WEIGHT_SUM_TOLERANCE = 1e-6;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectOf(value: unknown, what: string): Json {
  return isObject(value) ? value : refuse(`${what} deve ser um objeto.`);
}

function arrayOf(value: unknown, what: string): unknown[] {
  return Array.isArray(value) ? value : refuse(`${what} deve ser uma lista.`);
}

function stringOf(value: unknown, what: string): string {
  return typeof value === "string" ? value : refuse(`${what} deve ser um texto.`);
}

function booleanOf(value: unknown, what: string): boolean {
  return typeof value === "boolean" ? value : refuse(`${what} deve ser verdadeiro ou falso.`);
}

function limitOf(value: unknown, what: string): number | null {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : refuse(`${what} deve ser um número ou vazio.`);
}

function parseConstraints(dataset: Dataset, raw: unknown): Constraint[] {
  const kinds = new Map(
    constraintOptions(dataset, { constraints: [] } as unknown as Session).map((o) => [o.criterion, o.kind]),
  );
  const seen = new Set<string>();
  return arrayOf(raw, "As restrições").map((item) => {
    const entry = objectOf(item, "Cada restrição");
    const criterion = stringOf(entry.criterion, "O critério da restrição");
    const kind = kinds.get(criterion);
    if (!kind) refuse(`A restrição cita o critério "${criterion}", que não existe nos dados.`);
    if (seen.has(criterion)) refuse(`O critério "${criterion}" tem mais de uma restrição.`);
    seen.add(criterion);
    const on = booleanOf(entry.on, `O estado da restrição "${criterion}"`);
    if (kind === "koppen") {
      const accepted = arrayOf(entry.accepted, `As classes aceitas de "${criterion}"`).map((c) =>
        stringOf(c, "Cada classe Köppen"),
      );
      return { criterion: "koppen", on, accepted };
    }
    if (kind === "boolean") {
      return {
        criterion: criterion as "hospital_geral" | "fibra",
        on,
        value: booleanOf(entry.value, `O valor exigido de "${criterion}"`),
      };
    }
    return {
      criterion,
      on,
      min: limitOf(entry.min, `O mínimo de "${criterion}"`),
      max: limitOf(entry.max, `O máximo de "${criterion}"`),
    };
  });
}

function parseCategories(dataset: Dataset, raw: unknown): Category[] {
  const expected = new Set(dataset.catalogo.filter((c) => c.pontua).map((c) => c.categoria));
  const seen = new Set<string>();
  const categories = arrayOf(raw, "As categorias").map((item): Category => {
    const entry = objectOf(item, "Cada categoria");
    const id = stringOf(entry.id, "O id da categoria");
    if (seen.has(id)) refuse(`A categoria "${id}" aparece mais de uma vez.`);
    seen.add(id);
    const on = booleanOf(entry.on, `O estado da categoria "${id}"`);
    if (entry.kind === "objective") {
      if (!expected.has(id)) refuse(`A categoria "${id}" não existe nos dados.`);
      return { id, kind: "objective", on };
    }
    if (entry.kind === "subjective") {
      if (!/^subjective-\d{1,9}$/.test(id)) refuse(`O id "${id}" da categoria subjetiva é inválido.`);
      return { id, kind: "subjective", name: stringOf(entry.name, `O nome de "${id}"`), on };
    }
    return refuse(`A categoria "${id}" tem um tipo desconhecido.`);
  });
  for (const id of expected) if (!seen.has(id)) refuse(`Falta a categoria "${id}".`);
  return categories;
}

type WeightsParser = (raw: unknown, categories: Category[], who: string) => Record<string, number>;

function weightEntries(
  raw: unknown,
  categories: Category[],
  who: string,
  isValid: (value: unknown) => value is number,
  range: string,
) {
  const entry = objectOf(raw, `Os pesos de "${who}"`);
  const weights: Record<string, number> = {};
  for (const { id } of categories) {
    const value = entry[id];
    if (!isValid(value)) refuse(`O peso de "${id}" para "${who}" deve ser ${range}.`);
    weights[id] = value;
  }
  if (Object.keys(entry).length !== categories.length) refuse(`"${who}" tem peso para categoria desconhecida.`);
  return weights;
}

const parseWeights: WeightsParser = (raw, categories, who) =>
  weightEntries(
    raw,
    categories,
    who,
    (value): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_WEIGHT,
    `um inteiro de 0 a ${MAX_WEIGHT}`,
  );

const PERCENTAGE_WEIGHTS_VERSION = 1;

const parsePercentageWeights: WeightsParser = (raw, categories, who) => {
  const percentages = weightEntries(
    raw,
    categories,
    who,
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100,
    "um número de 0 a 100",
  );
  const total = Object.values(percentages).reduce((sum, w) => sum + w, 0);
  if (Math.abs(total - 100) > WEIGHT_SUM_TOLERANCE) refuse(`Os pesos de "${who}" não somam 100.`);
  const largest = Math.max(...Object.values(percentages));
  return Object.fromEntries(
    Object.entries(percentages).map(([id, percentage]) => [
      id,
      percentage > 0 ? Math.max(1, Math.round((percentage / largest) * MAX_WEIGHT)) : 0,
    ]),
  );
};

function parseGrades(raw: unknown, categories: Category[], who: string): Evaluator["grades"] {
  const entry = objectOf(raw, `As notas de "${who}"`);
  const subjective = new Set(categories.filter((c) => c.kind === "subjective").map((c) => c.id));
  const grades: Evaluator["grades"] = {};
  for (const [id, cities] of Object.entries(entry)) {
    if (!subjective.has(id)) refuse(`"${who}" tem notas para "${id}", que não é uma categoria subjetiva.`);
    grades[id] = {};
    for (const [code, grade] of Object.entries(objectOf(cities, `As notas de "${id}"`))) {
      if (![1, 2, 3, 4, 5].includes(grade as number)) refuse(`Nota inválida em "${id}": use um valor de 1 a 5.`);
      grades[id][code] = grade as Grade;
    }
  }
  return grades;
}

function parseEvaluators(raw: unknown, categories: Category[], weightsOf: WeightsParser): Evaluator[] {
  const list = arrayOf(raw, "Os avaliadores");
  if (list.length === 0) refuse("A Sessão precisa de ao menos um avaliador.");
  const seen = new Set<string>();
  return list.map((item) => {
    const entry = objectOf(item, "Cada avaliador");
    const id = stringOf(entry.id, "O id do avaliador");
    if (!/^evaluator-\d{1,9}$/.test(id)) refuse(`O id "${id}" do avaliador é inválido.`);
    if (seen.has(id)) refuse(`O avaliador "${id}" aparece mais de uma vez.`);
    seen.add(id);
    const name = stringOf(entry.name, `O nome de "${id}"`);
    return {
      id,
      name,
      weights: weightsOf(entry.weights, categories, name),
      grades: parseGrades(entry.grades, categories, name),
    };
  });
}

function parse(dataset: Dataset, text: string): Session {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return refuse("O conteúdo não é um JSON válido.");
  }
  const file = objectOf(raw, "A Sessão");
  if (file.version !== SESSION_VERSION && file.version !== PERCENTAGE_WEIGHTS_VERSION) {
    const found = typeof file.version === "number" ? ` ${file.version}` : "";
    refuse(
      `Versão de formato${found} desconhecida; este app lê as versões ${PERCENTAGE_WEIGHTS_VERSION} e ${SESSION_VERSION}.`,
    );
  }
  const categories = parseCategories(dataset, file.categories);
  const evaluators = parseEvaluators(
    file.evaluators,
    categories,
    file.version === PERCENTAGE_WEIGHTS_VERSION ? parsePercentageWeights : parseWeights,
  );
  const activeEvaluatorId = stringOf(file.activeEvaluatorId, "O avaliador ativo");
  if (!evaluators.some((e) => e.id === activeEvaluatorId)) refuse("O avaliador ativo não existe na Sessão.");
  return {
    version: SESSION_VERSION,
    name: stringOf(file.name, "O nome da Sessão"),
    constraints: parseConstraints(dataset, file.constraints),
    categories,
    evaluators,
    activeEvaluatorId,
  };
}

export function serializeSession(session: Session): string {
  return JSON.stringify(session, null, 2);
}

export function parseSession(dataset: Dataset, text: string): ParseResult {
  try {
    return { ok: true, session: parse(dataset, text) };
  } catch (error) {
    if (error instanceof InvalidSession) return { ok: false, reason: error.message };
    throw error;
  }
}

export function hasOwnSession(dataset: Dataset, session: Session): boolean {
  return serializeSession(session) !== serializeSession(createInitialSession(dataset));
}

export function exportFileName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `sessao-${slug}.json` : "sessao-brcities.json";
}
