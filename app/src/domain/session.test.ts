import { describe, expect, it } from "vitest";
import { fixtureDataset } from "./fixture-dataset";
import {
  averageWeights,
  createInitialSession,
  displayWeights,
  equalizeWeights,
  orderedCategories,
  setWeight,
  toggleCategory,
  type Session,
} from "./session";

describe("createInitialSession", () => {
  const session = createInitialSession(fixtureDataset);

  it("starts neutral: no constraints, no subjective categories, unnamed", () => {
    expect(session.constraints).toEqual([]);
    expect(session.name).toBe("");
    expect(session.categories.filter((c) => c.kind === "subjective")).toEqual([]);
  });

  it("builds the objective categories from the catalog, all off, in catalog order", () => {
    expect(session.categories).toEqual([
      { id: "Segurança", kind: "objective", on: false },
      { id: "Clima", kind: "objective", on: false },
      { id: "Porte", kind: "objective", on: false },
    ]);
  });

  it("ignores categories that only hold filters", () => {
    expect(session.categories.map((c) => c.id)).not.toContain("Internet");
  });

  it("has the single evaluator 'Você', active, with equal weights summing 100", () => {
    expect(session.evaluators).toHaveLength(1);
    const [evaluator] = session.evaluators;
    expect(evaluator.name).toBe("Você");
    expect(session.activeEvaluatorId).toBe(evaluator.id);
    expect(Object.keys(evaluator.weights)).toEqual(["Segurança", "Clima", "Porte"]);
    expect(Object.values(evaluator.weights).every((w) => w === 100 / 3)).toBe(true);
    expect(Object.values(evaluator.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect(evaluator.grades).toEqual({});
  });
});

describe("toggleCategory", () => {
  const session = createInitialSession(fixtureDataset);

  it("turns a category on and off without touching weights or grades", () => {
    const on = toggleCategory(session, "Clima");
    expect(on.categories.find((c) => c.id === "Clima")?.on).toBe(true);
    expect(on.categories.filter((c) => c.on)).toHaveLength(1);
    expect(on.evaluators).toEqual(session.evaluators);
    expect(toggleCategory(on, "Clima").categories).toEqual(session.categories);
  });

  it("does not mutate the previous Session", () => {
    toggleCategory(session, "Clima");
    expect(session.categories.every((c) => !c.on)).toBe(true);
  });
});

const activeWeights = (session: Session) => session.evaluators.find((e) => e.id === session.activeEvaluatorId)!.weights;

const withActiveWeights = (session: Session, weights: Record<string, number>): Session => ({
  ...session,
  evaluators: session.evaluators.map((e) => (e.id === session.activeEvaluatorId ? { ...e, weights } : e)),
});

const sum = (weights: Record<string, number>) => Object.values(weights).reduce((a, b) => a + b, 0);

describe("setWeight", () => {
  const session = createInitialSession(fixtureDataset);

  it("makes the other categories absorb the difference in their current proportion", () => {
    const start = withActiveWeights(session, { Segurança: 50, Clima: 30, Porte: 20 });
    const weights = activeWeights(setWeight(start, "Segurança", 60));
    expect(weights.Segurança).toBe(60);
    expect(weights.Clima).toBeCloseTo(24);
    expect(weights.Porte).toBeCloseTo(16);
  });

  it("keeps the sum at 100 with full precision", () => {
    const weights = activeWeights(setWeight(session, "Clima", 7));
    expect(sum(weights)).toBeCloseTo(100, 10);
    expect(weights.Segurança).toBeCloseTo(46.5);
    expect(weights.Porte).toBeCloseTo(46.5);
  });

  it("keeps a category at 0 at 0", () => {
    const start = withActiveWeights(session, { Segurança: 60, Clima: 0, Porte: 40 });
    const weights = activeWeights(setWeight(start, "Segurança", 80));
    expect(weights).toEqual({ Segurança: 80, Clima: 0, Porte: 20 });
  });

  it("splits the remainder equally when every other category is at 0", () => {
    const start = withActiveWeights(session, { Segurança: 100, Clima: 0, Porte: 0 });
    const weights = activeWeights(setWeight(start, "Segurança", 70));
    expect(weights).toEqual({ Segurança: 70, Clima: 15, Porte: 15 });
  });

  it("gives everything to the category set to 100", () => {
    expect(activeWeights(setWeight(session, "Porte", 100))).toEqual({ Segurança: 0, Clima: 0, Porte: 100 });
  });

  it("clamps the value into 0..100", () => {
    expect(activeWeights(setWeight(session, "Porte", 140)).Porte).toBe(100);
    expect(activeWeights(setWeight(session, "Porte", -5)).Porte).toBe(0);
  });

  it("keeps a lone category at 100", () => {
    const [only] = session.categories;
    const single = {
      ...session,
      categories: [only],
      evaluators: session.evaluators.map((e) => ({ ...e, weights: { [only.id]: 100 } })),
    };
    expect(activeWeights(setWeight(single, only.id, 70))).toEqual({ [only.id]: 100 });
  });

  it("changes only the active evaluator", () => {
    const other = { id: "evaluator-2", name: "Outra", weights: { Segurança: 100, Clima: 0, Porte: 0 }, grades: {} };
    const two = { ...session, evaluators: [...session.evaluators, other] };
    const next = setWeight({ ...two, activeEvaluatorId: "evaluator-2" }, "Clima", 50);
    expect(next.evaluators[0]).toEqual(session.evaluators[0]);
    expect(next.evaluators[1].weights).toEqual({ Segurança: 50, Clima: 50, Porte: 0 });
  });

  it("does not mutate the previous Session", () => {
    setWeight(session, "Clima", 7);
    expect(Object.values(activeWeights(session)).every((w) => w === 100 / 3)).toBe(true);
  });
});

describe("displayWeights", () => {
  const session = createInitialSession(fixtureDataset);
  const display = (weights: Record<string, number>) =>
    displayWeights(withActiveWeights(session, weights).evaluators[0], session.categories);

  it("rounds to integers that add up to 100 by the largest remainder", () => {
    const shown = display({ Segurança: 100 / 3, Clima: 100 / 3, Porte: 100 / 3 });
    expect(Object.values(shown).sort()).toEqual([33, 33, 34]);
    expect(sum(shown)).toBe(100);
  });

  it("gives the extra point to the larger remainder, then to the catalog order", () => {
    expect(display({ Segurança: 10.4, Clima: 40.5, Porte: 49.1 })).toEqual({ Segurança: 10, Clima: 41, Porte: 49 });
    expect(display({ Segurança: 33.5, Clima: 33.5, Porte: 33 })).toEqual({ Segurança: 34, Clima: 33, Porte: 33 });
  });

  it("shows exact integers unchanged", () => {
    expect(display({ Segurança: 70, Clima: 30, Porte: 0 })).toEqual({ Segurança: 70, Clima: 30, Porte: 0 });
  });

  it("is not thrown off by float noise just below an integer", () => {
    const shown = display({ Segurança: 29.999999999999996, Clima: 40, Porte: 30.000000000000004 });
    expect(shown).toEqual({ Segurança: 30, Clima: 40, Porte: 30 });
  });
});

describe("equalizeWeights", () => {
  const session = createInitialSession(fixtureDataset);

  it("returns the active evaluator to 100/n on every category", () => {
    const skewed = setWeight(session, "Clima", 90);
    const weights = activeWeights(equalizeWeights(skewed));
    expect(Object.keys(weights)).toEqual(["Segurança", "Clima", "Porte"]);
    expect(Object.values(weights).every((w) => w === 100 / 3)).toBe(true);
  });

  it("leaves the other evaluators alone", () => {
    const other = { id: "evaluator-2", name: "Outra", weights: { Segurança: 100, Clima: 0, Porte: 0 }, grades: {} };
    const two = { ...session, evaluators: [...session.evaluators, other] };
    expect(equalizeWeights(setWeight(two, "Clima", 90)).evaluators[1]).toEqual(other);
  });
});

describe("averageWeights", () => {
  const session = createInitialSession(fixtureDataset);

  it("averages the percentages of all evaluators, counting a weight of 0 as 0", () => {
    const other = { id: "evaluator-2", name: "Outra", weights: { Segurança: 100, Clima: 0, Porte: 0 }, grades: {} };
    const two = withActiveWeights(
      { ...session, evaluators: [...session.evaluators, other] },
      {
        Segurança: 20,
        Clima: 50,
        Porte: 30,
      },
    );
    expect(averageWeights(two)).toEqual({ Segurança: 60, Clima: 25, Porte: 15 });
  });
});

describe("orderedCategories", () => {
  const session = createInitialSession(fixtureDataset);
  const ids = (s: Session) => orderedCategories(s).map((c) => c.id);

  it("follows the catalog order while the weights tie", () => {
    expect(ids(session)).toEqual(["Segurança", "Clima", "Porte"]);
  });

  it("sorts by the active evaluator's weight, descending", () => {
    const next = withActiveWeights(session, { Segurança: 20, Clima: 30, Porte: 50 });
    expect(ids(next)).toEqual(["Porte", "Clima", "Segurança"]);
  });

  it("breaks a tie by the catalog order", () => {
    const next = withActiveWeights(session, { Segurança: 25, Clima: 50, Porte: 25 });
    expect(ids(next)).toEqual(["Clima", "Segurança", "Porte"]);
  });
});
