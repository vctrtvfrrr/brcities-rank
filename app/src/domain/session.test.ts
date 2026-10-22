import { describe, expect, it } from "vitest";
import { fixtureDataset } from "./fixture-dataset";
import { createInitialSession, toggleCategory } from "./session";

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
