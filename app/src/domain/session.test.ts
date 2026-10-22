import { describe, expect, it } from "vitest";
import { fixtureDataset } from "./fixture-dataset";
import {
  activateEvaluator,
  addEvaluator,
  addSubjective,
  averageWeights,
  countEvaluatorGrades,
  countGrades,
  createInitialSession,
  deleteSubjective,
  displayWeights,
  equalizeWeights,
  gradeOf,
  orderedCategories,
  removeEvaluator,
  renameEvaluator,
  renameSubjective,
  setGrade,
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

const twoEvaluators = (session: Session): Session => ({
  ...session,
  evaluators: [
    ...session.evaluators,
    { id: "evaluator-2", name: "Ana", weights: { ...session.evaluators[0].weights }, grades: {} },
  ],
});

describe("addSubjective", () => {
  const start = twoEvaluators(createInitialSession(fixtureDataset));

  it("adds a subjective category that is on, with weight 0 for every evaluator", () => {
    const session = addSubjective(start);
    const added = session.categories.at(-1)!;
    expect(added).toMatchObject({ kind: "subjective", on: true });
    expect(session.evaluators.map((e) => e.weights[added.id])).toEqual([0, 0]);
  });

  it("keeps the existing weights untouched, still summing 100", () => {
    const session = addSubjective(start);
    for (const evaluator of session.evaluators) {
      expect(evaluator.weights.Clima).toBeCloseTo(100 / 3);
      expect(sum(evaluator.weights)).toBeCloseTo(100);
    }
  });

  it("gives each new subjective its own id and a distinct default name", () => {
    const session = addSubjective(addSubjective(start));
    const [first, second] = session.categories.filter((c) => c.kind === "subjective");
    expect(first.id).not.toBe(second.id);
    expect(first.kind === "subjective" && second.kind === "subjective" && first.name !== second.name).toBe(true);
  });

  it("orders a subjective after the objectives when the weights tie", () => {
    const session = addSubjective(withActiveWeights(start, { Segurança: 40, Clima: 40, Porte: 20 }));
    expect(
      orderedCategories(session)
        .map((c) => c.id)
        .at(-1),
    ).toBe(session.categories.at(-1)!.id);
  });

  it("does not mutate the previous Session", () => {
    addSubjective(start);
    expect(start.categories).toHaveLength(3);
  });
});

describe("renameSubjective", () => {
  it("renames only the chosen subjective", () => {
    const session = addSubjective(addSubjective(createInitialSession(fixtureDataset)));
    const [first, second] = session.categories.filter((c) => c.kind === "subjective");
    const renamed = renameSubjective(session, first.id, "Lazer");
    expect(renamed.categories.find((c) => c.id === first.id)).toMatchObject({ name: "Lazer" });
    expect(renamed.categories.find((c) => c.id === second.id)).toEqual(second);
  });

  it("keeps the grades and weights, which are keyed by id", () => {
    const base = addSubjective(createInitialSession(fixtureDataset));
    const id = base.categories.at(-1)!.id;
    const graded = setGrade(base, id, "3550308", 4);
    expect(renameSubjective(graded, id, "Lazer").evaluators).toEqual(graded.evaluators);
  });
});

describe("setGrade", () => {
  const base = addSubjective(twoEvaluators(createInitialSession(fixtureDataset)));
  const id = base.categories.at(-1)!.id;

  it("records the grade of the active evaluator for a city", () => {
    const session = setGrade(base, id, "3550308", 5);
    expect(gradeOf(session, id, "3550308")).toBe(5);
    expect(session.evaluators[1].grades).toEqual({});
  });

  it("records it for the evaluator that is active at the time", () => {
    const session = setGrade({ ...base, activeEvaluatorId: "evaluator-2" }, id, "3550308", 2);
    expect(session.evaluators[1].grades[id]).toEqual({ "3550308": 2 });
    expect(session.evaluators[0].grades).toEqual({});
  });

  it("replaces a different grade", () => {
    const session = setGrade(setGrade(base, id, "3550308", 5), id, "3550308", 2);
    expect(gradeOf(session, id, "3550308")).toBe(2);
  });

  it("erases the grade when the same one is given again", () => {
    const session = setGrade(setGrade(base, id, "3550308", 5), id, "3550308", 5);
    expect(gradeOf(session, id, "3550308")).toBeUndefined();
  });

  it("keeps the grades of other cities", () => {
    const session = setGrade(setGrade(base, id, "3550308", 5), id, "3304557", 1);
    expect(gradeOf(setGrade(session, id, "3304557", 1), id, "3550308")).toBe(5);
  });
});

describe("deleteSubjective", () => {
  const base = twoEvaluators(createInitialSession(fixtureDataset));
  const added = addSubjective(addSubjective(base));
  const [first, second] = added.categories.filter((c) => c.kind === "subjective");

  const withLoad = (): Session => {
    let session: Session = {
      ...added,
      evaluators: added.evaluators.map((e) => ({
        ...e,
        weights: { Segurança: 30, Clima: 15, Porte: 15, [first.id]: 40, [second.id]: 0 },
      })),
    };
    session = setGrade(session, first.id, "3550308", 5);
    session = setGrade(session, first.id, "3304557", 2);
    session = setGrade({ ...session, activeEvaluatorId: "evaluator-2" }, first.id, "3550308", 3);
    return { ...session, activeEvaluatorId: "evaluator-1" };
  };

  it("counts the grades of every evaluator", () => {
    expect(countGrades(withLoad(), first.id)).toBe(3);
    expect(countGrades(withLoad(), second.id)).toBe(0);
  });

  it("removes the category, its weights and its grades from every evaluator", () => {
    const session = deleteSubjective(withLoad(), first.id);
    expect(session.categories.map((c) => c.id)).not.toContain(first.id);
    for (const evaluator of session.evaluators) {
      expect(evaluator.weights).not.toHaveProperty(first.id);
      expect(evaluator.grades).not.toHaveProperty(first.id);
    }
  });

  it("renormalizes the remaining weights of each evaluator in proportion", () => {
    const session = deleteSubjective(withLoad(), first.id);
    for (const evaluator of session.evaluators) {
      expect(evaluator.weights.Segurança).toBeCloseTo(50);
      expect(evaluator.weights.Clima).toBeCloseTo(25);
      expect(evaluator.weights.Porte).toBeCloseTo(25);
      expect(evaluator.weights[second.id]).toBe(0);
      expect(sum(evaluator.weights)).toBeCloseTo(100);
    }
  });

  it("keeps the other subjectives and their grades", () => {
    const graded = setGrade(withLoad(), second.id, "3550308", 4);
    const session = deleteSubjective(graded, first.id);
    expect(gradeOf(session, second.id, "3550308")).toBe(4);
  });

  it("splits the weight equally when everything left was at 0", () => {
    const session: Session = {
      ...added,
      evaluators: added.evaluators.map((e) => ({
        ...e,
        weights: { Segurança: 0, Clima: 0, Porte: 0, [first.id]: 100, [second.id]: 0 },
      })),
    };
    const result = deleteSubjective(session, first.id);
    expect(result.evaluators[0].weights.Clima).toBeCloseTo(25);
    expect(result.evaluators[0].weights[second.id]).toBeCloseTo(25);
  });
});

describe("grades survive any change that is not deleting them", () => {
  it("keeps grades through toggles and weight changes", () => {
    const base = addSubjective(createInitialSession(fixtureDataset));
    const id = base.categories.at(-1)!.id;
    let session = setGrade(base, id, "3550308", 5);
    session = toggleCategory(toggleCategory(session, id), id);
    session = setWeight(session, id, 70);
    session = equalizeWeights(session);
    expect(gradeOf(session, id, "3550308")).toBe(5);
  });
});

describe("evaluators", () => {
  const base = () => {
    const withSubjective = addSubjective(createInitialSession(fixtureDataset));
    return setGrade(withSubjective, "subjective-1", "3550308", 4);
  };

  describe("addEvaluator", () => {
    it("adds a numbered evaluator with equal weights over every category, no grades, and makes it active", () => {
      const session = addEvaluator(base());
      expect(session.evaluators).toHaveLength(2);
      const added = session.evaluators[1];
      expect(added.name).toBe("Avaliador 2");
      expect(session.activeEvaluatorId).toBe(added.id);
      expect(Object.keys(added.weights)).toEqual(["Segurança", "Clima", "Porte", "subjective-1"]);
      expect(Object.values(added.weights).every((w) => w === 25)).toBe(true);
      expect(added.grades).toEqual({});
    });

    it("leaves the existing evaluators untouched", () => {
      const before = base();
      const session = addEvaluator(before);
      expect(session.evaluators[0]).toEqual(before.evaluators[0]);
    });

    it("never reuses the id of a removed evaluator", () => {
      const two = addEvaluator(base());
      const three = addEvaluator(two);
      const ids = removeEvaluator(three, two.evaluators[1].id).evaluators.map((e) => e.id);
      const next = addEvaluator(removeEvaluator(three, two.evaluators[1].id));
      expect(new Set([...ids, next.activeEvaluatorId]).size).toBe(3);
    });

    it("does not mutate the previous Session", () => {
      const before = base();
      const snapshot = structuredClone(before);
      addEvaluator(before);
      expect(before).toEqual(snapshot);
    });
  });

  describe("renameEvaluator", () => {
    it("renames only the chosen evaluator", () => {
      const two = addEvaluator(base());
      const session = renameEvaluator(two, two.evaluators[1].id, "Ana");
      expect(session.evaluators.map((e) => e.name)).toEqual(["Você", "Ana"]);
    });
  });

  describe("activateEvaluator", () => {
    it("switches the active evaluator, so weights and grades edit the chosen one", () => {
      const two = addEvaluator(base());
      const first = two.evaluators[0].id;
      const session = setWeight(activateEvaluator(two, first), "Clima", 70);
      expect(session.activeEvaluatorId).toBe(first);
      expect(session.evaluators[0].weights.Clima).toBe(70);
      expect(session.evaluators[1].weights.Clima).toBe(25);
    });

    it("ignores an unknown evaluator", () => {
      const session = base();
      expect(activateEvaluator(session, "nobody")).toBe(session);
    });
  });

  describe("removeEvaluator", () => {
    it("drops the evaluator with its weights and grades", () => {
      const two = addEvaluator(base());
      const session = removeEvaluator(two, two.evaluators[0].id);
      expect(session.evaluators.map((e) => e.name)).toEqual(["Avaliador 2"]);
      expect(gradeOf(session, "subjective-1", "3550308")).toBeUndefined();
    });

    it("moves the active evaluator to the first remaining one when the active is removed", () => {
      const two = addEvaluator(addEvaluator(base()));
      const session = removeEvaluator(two, two.activeEvaluatorId);
      expect(session.activeEvaluatorId).toBe(session.evaluators[0].id);
    });

    it("keeps the active evaluator when another one is removed", () => {
      const two = addEvaluator(base());
      const session = removeEvaluator(activateEvaluator(two, two.evaluators[0].id), two.evaluators[1].id);
      expect(session.activeEvaluatorId).toBe(two.evaluators[0].id);
    });

    it("refuses to remove the last evaluator", () => {
      const session = base();
      expect(removeEvaluator(session, session.activeEvaluatorId)).toBe(session);
    });
  });

  describe("countEvaluatorGrades", () => {
    it("counts the grades an evaluator would lose", () => {
      let session = setGrade(base(), "subjective-1", "3304557", 2);
      expect(countEvaluatorGrades(session, session.activeEvaluatorId)).toBe(2);
      session = addEvaluator(session);
      expect(countEvaluatorGrades(session, session.activeEvaluatorId)).toBe(0);
    });
  });

  describe("combining evaluators", () => {
    it("averages the weights of all evaluators, counting 0 as 0", () => {
      const two = addEvaluator(createInitialSession(fixtureDataset));
      const session = setWeight(two, "Clima", 100);
      expect(averageWeights(session)).toEqual({
        Segurança: (100 / 3 + 0) / 2,
        Clima: (100 / 3 + 100) / 2,
        Porte: (100 / 3 + 0) / 2,
      });
    });

    it("keeps each evaluator's grade apart", () => {
      const two = setGrade(addEvaluator(base()), "subjective-1", "3550308", 2);
      expect(gradeOf(two, "subjective-1", "3550308")).toBe(2);
      expect(gradeOf(two, "subjective-1", "3550308", two.evaluators[0].id)).toBe(4);
    });
  });
});
