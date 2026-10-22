import { describe, expect, it } from "vitest";
import { datasetWithCities, fixtureDataset } from "./fixture-dataset";
import { rank } from "./rank";
import { addConstraint, editConstraint } from "./constraints";
import { addSubjective, createInitialSession, setGrade, toggleCategory, type Session } from "./session";

describe("rank without categories", () => {
  it("returns every city as a Candidate, without Pontuação, in alphabetical order", () => {
    const { candidates } = rank(fixtureDataset, createInitialSession(fixtureDataset));
    expect(candidates.map((c) => c.name)).toEqual([
      "Alta Floresta D'Oeste",
      "Curitiba",
      "Recife",
      "Rio de Janeiro",
      "Salvador",
      "São Paulo",
    ]);
    expect(candidates.every((c) => c.score === null && c.position === null)).toBe(true);
  });

  it("carries the identity of each city", () => {
    const { candidates } = rank(fixtureDataset, createInitialSession(fixtureDataset));
    expect(candidates.find((c) => c.name === "Recife")).toMatchObject({ code: "2611606", uf: "PE", index: 5 });
  });

  it("sorts accented names by alphabet, not by code point", () => {
    const dataset = datasetWithCities([
      { code: "1", name: "Zé Doca" },
      { code: "2", name: "Água Boa" },
      { code: "3", name: "Belém" },
    ]);
    const { candidates } = rank(dataset, createInitialSession(dataset));
    expect(candidates.map((c) => c.name)).toEqual(["Água Boa", "Belém", "Zé Doca"]);
  });

  it("breaks a name tie by larger population, then by smaller IBGE code", () => {
    const dataset = datasetWithCities([
      { code: "9", name: "Bom Jesus", uf: "PB", population: 500 },
      { code: "3", name: "Bom Jesus", uf: "RS", population: 900 },
      { code: "5", name: "Bom Jesus", uf: "PI", population: 500 },
    ]);
    const { candidates } = rank(dataset, createInitialSession(dataset));
    expect(candidates.map((c) => c.code)).toEqual(["3", "5", "9"]);
  });

  it("returns no Candidates for an empty dataset", () => {
    const dataset = datasetWithCities([]);
    expect(rank(dataset, createInitialSession(dataset)).candidates).toEqual([]);
  });
});

const withOn = (session: Session, ...ids: string[]) => ids.reduce(toggleCategory, session);

const withWeights = (session: Session, weights: Record<string, number>): Session => ({
  ...session,
  evaluators: session.evaluators.map((e) => ({ ...e, weights })),
});

const crimeCities = (values: (number | null)[]) =>
  datasetWithCities(values.map((crime, i) => ({ code: String(i + 1), name: `Cidade ${i + 1}`, values: { crime } })));

const byName = (result: ReturnType<typeof rank>) => Object.fromEntries(result.candidates.map((c) => [c.name, c]));

describe("criterion normalization", () => {
  const tenths = crimeCities([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  const scoreOf = (dataset = tenths) => byName(rank(dataset, withOn(createInitialSession(dataset), "Segurança")));

  it("trims at P5 and P95 interpolated between neighbouring positions and inverts when lower is better", () => {
    const cities = scoreOf();
    expect(cities["Cidade 1"].categoryScores["Segurança"]).toBe(100);
    expect(cities["Cidade 11"].categoryScores["Segurança"]).toBe(0);
    expect(cities["Cidade 6"].categoryScores["Segurança"]).toBeCloseTo(50);
    expect(cities["Cidade 3"].categoryScores["Segurança"]).toBeCloseTo(100 - (15 / 90) * 100);
  });

  it("keeps the direction when higher is better", () => {
    const dataset = datasetWithCities(
      [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v, i) => ({
        code: String(i + 1),
        name: `Cidade ${i + 1}`,
        population: v + 1,
      })),
    );
    const cities = byName(rank(dataset, withOn(createInitialSession(dataset), "Porte")));
    expect(cities["Cidade 1"].categoryScores["Porte"]).toBe(0);
    expect(cities["Cidade 11"].categoryScores["Porte"]).toBe(100);
  });

  it("applies the logarithm to the population before trimming", () => {
    const dataset = datasetWithCities([
      { code: "1", name: "A", population: 10 },
      { code: "2", name: "B", population: 100 },
      { code: "3", name: "C", population: 1000 },
    ]);
    const cities = byName(rank(dataset, withOn(createInitialSession(dataset), "Porte")));
    expect(cities["B"].categoryScores["Porte"]).toBeCloseTo(50);
  });

  it("computes the bounds only over cities that have data", () => {
    const dataset = crimeCities([null, null, 10, 20, 30]);
    const cities = scoreOf(dataset);
    expect(cities["Cidade 3"].categoryScores["Segurança"]).toBe(100);
    expect(cities["Cidade 5"].categoryScores["Segurança"]).toBe(0);
  });

  it("gives Dado ausente a note of 0, even when lower is better", () => {
    expect(scoreOf(crimeCities([null, 10, 20]))["Cidade 1"].categoryScores["Segurança"]).toBe(0);
  });

  it("gives 100 to every city with data when P5 equals P95", () => {
    const cities = scoreOf(crimeCities([7, 7, 7, null]));
    expect(cities["Cidade 1"].categoryScores["Segurança"]).toBe(100);
    expect(cities["Cidade 3"].categoryScores["Segurança"]).toBe(100);
    expect(cities["Cidade 4"].categoryScores["Segurança"]).toBe(0);
  });

  it("gives 100 to a lone Candidate with data", () => {
    expect(scoreOf(crimeCities([42]))["Cidade 1"].categoryScores["Segurança"]).toBe(100);
  });

  it("gives 0 to everyone when no Candidate has data for a criterion, yet they still get a Pontuação", () => {
    const cities = scoreOf(crimeCities([null, null]));
    expect(cities["Cidade 1"].categoryScores["Segurança"]).toBe(0);
    expect(cities["Cidade 1"].score).toBe(0);
    expect(cities["Cidade 1"].position).toBe(1);
  });

  it("handles a dataset without cities", () => {
    const dataset = crimeCities([]);
    expect(rank(dataset, withOn(createInitialSession(dataset), "Segurança")).candidates).toEqual([]);
  });

  it("averages the criteria of a category, counting the ones without data as 0", () => {
    const dataset = datasetWithCities([
      { code: "1", name: "A", values: { rain: 100, heat: 20 } },
      { code: "2", name: "B", values: { rain: 200, heat: null } },
      { code: "3", name: "C", values: { rain: 150, heat: 30 } },
    ]);
    const cities = byName(rank(dataset, withOn(createInitialSession(dataset), "Clima")));
    expect(cities["A"].categoryScores["Clima"]).toBe(100);
    expect(cities["B"].categoryScores["Clima"]).toBe(0);
    expect(cities["C"].categoryScores["Clima"]).toBeCloseTo(25);
  });

  it("reports the note of a category that is off, leaving it out of the Pontuação", () => {
    const dataset = crimeCities([0, 50, 100]);
    const result = rank(dataset, createInitialSession(dataset));
    expect(result.candidates.every((c) => c.score === null)).toBe(true);
    expect(byName(result)["Cidade 1"].categoryScores["Segurança"]).toBe(100);
  });
});

describe("Pontuação", () => {
  const dataset = datasetWithCities([
    { code: "1", name: "A", population: 1000, values: { crime: 0, rain: 100, heat: 20 } },
    { code: "2", name: "B", population: 1000, values: { crime: 100, rain: 200, heat: 30 } },
    { code: "3", name: "C", population: 1000, values: { crime: 50, rain: 150, heat: 25 } },
  ]);
  const base = createInitialSession(dataset);

  it("is the average of the categories that are on, weighted by the average weight", () => {
    const session = withWeights(withOn(base, "Segurança", "Clima"), { Segurança: 75, Clima: 25, Porte: 0 });
    const c = byName(rank(dataset, session))["C"];
    const { Segurança, Clima } = c.categoryScores;
    expect(c.score).toBeCloseTo((75 * Segurança + 25 * Clima) / 100);
  });

  it("averages the weights of all evaluators, counting a missing weight as 0", () => {
    const first = withWeights(withOn(base, "Segurança", "Clima"), { Segurança: 100, Clima: 0, Porte: 0 });
    const session: Session = {
      ...first,
      evaluators: [...first.evaluators, { id: "e2", name: "Outra", weights: { Clima: 100 }, grades: {} }],
    };
    const c = byName(rank(dataset, session))["C"];
    expect(c.score).toBeCloseTo((c.categoryScores["Segurança"] + c.categoryScores["Clima"]) / 2);
  });

  it("leaves a category that is off out of the calculation, sharing its weight among the others", () => {
    const session = withWeights(withOn(base, "Segurança"), { Segurança: 20, Clima: 50, Porte: 30 });
    const c = byName(rank(dataset, session))["C"];
    expect(c.score).toBeCloseTo(c.categoryScores["Segurança"]);
  });

  it("leaves a category with average weight 0 out of the calculation", () => {
    const session = withWeights(withOn(base, "Segurança", "Clima"), { Segurança: 100, Clima: 0, Porte: 0 });
    const c = byName(rank(dataset, session))["C"];
    expect(c.score).toBeCloseTo(c.categoryScores["Segurança"]);
  });

  it("leaves a Candidate without Pontuação when no category enters the calculation", () => {
    const session = withWeights(withOn(base, "Clima"), { Segurança: 100, Clima: 0, Porte: 0 });
    const { candidates } = rank(dataset, session);
    expect(candidates.every((c) => c.score === null && c.position === null)).toBe(true);
    expect(candidates.map((c) => c.name)).toEqual(["A", "B", "C"]);
  });

  it("distinguishes a Pontuação of 0 from no Pontuação", () => {
    const only = crimeCities([0, 100]);
    const { candidates } = rank(only, withOn(createInitialSession(only), "Segurança"));
    expect(candidates.map((c) => [c.name, c.score, c.position])).toEqual([
      ["Cidade 1", 100, 1],
      ["Cidade 2", 0, 2],
    ]);
  });
});

describe("Ranking order", () => {
  it("orders by Pontuação descending with sequential positions, turning the table order alphabetical again when every category is off", () => {
    const dataset = crimeCities([30, 0, 100, 60]);
    const on = rank(dataset, withOn(createInitialSession(dataset), "Segurança"));
    expect(on.candidates.map((c) => [c.name, c.position])).toEqual([
      ["Cidade 2", 1],
      ["Cidade 1", 2],
      ["Cidade 4", 3],
      ["Cidade 3", 4],
    ]);
    const off = rank(dataset, createInitialSession(dataset));
    expect(off.candidates.map((c) => c.name)).toEqual(["Cidade 1", "Cidade 2", "Cidade 3", "Cidade 4"]);
  });

  it("breaks a tie by larger population, then by smaller IBGE code", () => {
    const dataset = datasetWithCities([
      { code: "9", name: "Zeta", population: 500, values: { crime: 10 } },
      { code: "3", name: "Alfa", population: 900, values: { crime: 10 } },
      { code: "5", name: "Beta", population: 500, values: { crime: 10 } },
      { code: "7", name: "Gama", population: 500, values: { crime: 90 } },
    ]);
    const { candidates } = rank(dataset, withOn(createInitialSession(dataset), "Segurança"));
    expect(candidates.map((c) => c.code)).toEqual(["3", "5", "9", "7"]);
  });

  it("compares the Pontuação with full precision", () => {
    const dataset = datasetWithCities([
      { code: "1", name: "A", population: 1, values: { crime: 50.0000001 } },
      { code: "2", name: "B", population: 9, values: { crime: 50 } },
      { code: "3", name: "C", population: 5, values: { crime: 0 } },
      { code: "4", name: "D", population: 5, values: { crime: 100 } },
    ]);
    const { candidates } = rank(dataset, withOn(createInitialSession(dataset), "Segurança"));
    expect(candidates.map((c) => c.name)).toEqual(["C", "B", "A", "D"]);
  });

  it("uses numeric order for the IBGE code tiebreak", () => {
    const dataset = datasetWithCities([
      { code: "10", name: "A", values: { crime: 10 } },
      { code: "9", name: "B", values: { crime: 10 } },
    ]);
    const { candidates } = rank(dataset, withOn(createInitialSession(dataset), "Segurança"));
    expect(candidates.map((c) => c.code)).toEqual(["9", "10"]);
  });
});

describe("subjective categories", () => {
  const dataset = datasetWithCities([
    { code: "1", name: "A", values: { crime: 0 } },
    { code: "2", name: "B", values: { crime: 100 } },
    { code: "3", name: "C", values: { crime: 50 } },
  ]);
  const withSubjective = () => {
    const session = addSubjective(createInitialSession(dataset));
    return { session, id: session.categories.at(-1)!.id };
  };
  const secondEvaluator = (session: Session): Session => ({
    ...session,
    evaluators: [
      ...session.evaluators,
      { id: "e2", name: "Ana", weights: { ...session.evaluators[0].weights }, grades: {} },
    ],
  });
  const gradeAs = (session: Session, evaluatorId: string, id: string, code: string, grade: 1 | 2 | 3 | 4 | 5) =>
    setGrade({ ...session, activeEvaluatorId: evaluatorId }, id, code, grade);

  it("has no note for a city that nobody graded", () => {
    const { session, id } = withSubjective();
    const [a] = rank(dataset, session).candidates;
    expect(a.categoryScores).not.toHaveProperty(id);
    expect(a.gradeAverages).not.toHaveProperty(id);
  });

  it("converts the average grade by (average − 1) × 25, without normalization", () => {
    const { session: base, id } = withSubjective();
    let session = base;
    session = setGrade(session, id, "1", 1);
    session = setGrade(session, id, "2", 3);
    session = setGrade(session, id, "3", 5);
    const scores = byName(rank(dataset, session));
    expect([scores.A, scores.B, scores.C].map((c) => c.categoryScores[id])).toEqual([0, 50, 100]);
  });

  it("averages the grades of every evaluator who graded the city", () => {
    const { session: base, id } = withSubjective();
    let session = secondEvaluator(base);
    session = gradeAs(session, "evaluator-1", id, "1", 5);
    session = gradeAs(session, "e2", id, "1", 2);
    session = gradeAs(session, "e2", id, "2", 4);
    const scores = byName(rank(dataset, session));
    expect(scores.A.gradeAverages[id]).toBe(3.5);
    expect(scores.A.categoryScores[id]).toBe(62.5);
    expect(scores.B.categoryScores[id]).toBe(75);
  });

  it("counts a grade even when the evaluator gave the subjective weight 0", () => {
    const { session: base, id } = withSubjective();
    const session = setGrade(toggleCategory(base, "Segurança"), id, "1", 5);
    const a = byName(rank(dataset, session))["A"];
    expect(a.categoryScores[id]).toBe(100);
    expect(a.score).toBeCloseTo(a.categoryScores["Segurança"]);
  });

  it("counts a grade given by an evaluator with weight 0 when another one weighs the subjective", () => {
    const { session: base, id } = withSubjective();
    let session = secondEvaluator(base);
    session = {
      ...session,
      evaluators: session.evaluators.map((e) =>
        e.id === "e2" ? { ...e, weights: { Segurança: 0, Clima: 0, Porte: 0, [id]: 100 } } : e,
      ),
    };
    session = gradeAs(session, "evaluator-1", id, "1", 5);
    expect(byName(rank(dataset, session))["A"].score).toBe(100);
  });

  it("leaves a subjective without a grade out of the calculation, sharing its weight among the rest", () => {
    const { session: base, id } = withSubjective();
    let session = toggleCategory(base, "Segurança");
    session = withWeights(session, { Segurança: 50, Clima: 0, Porte: 0, [id]: 50 });
    session = setGrade(session, id, "1", 1);
    const scores = byName(rank(dataset, session));
    expect(scores.A.score).toBeCloseTo((scores.A.categoryScores["Segurança"] * 50 + 0 * 50) / 100);
    expect(scores.B.score).toBeCloseTo(scores.B.categoryScores["Segurança"]);
  });

  it("leaves a Candidate without Pontuação when only an ungraded subjective weighs", () => {
    const { session: base, id } = withSubjective();
    const session = setGrade(withWeights(base, { Segurança: 0, Clima: 0, Porte: 0, [id]: 100 }), id, "1", 4);
    const { candidates } = rank(dataset, session);
    expect(candidates.map((c) => [c.name, c.score])).toEqual([
      ["A", 75],
      ["B", null],
      ["C", null],
    ]);
  });

  it("keeps the grades of a city that leaves the Corte, bringing them back when it returns", () => {
    const { session: base, id } = withSubjective();
    const graded = setGrade(base, id, "2", 5);
    const cutB = editConstraint(addConstraint(dataset, graded, "crime"), "crime", { max: 60 });
    const result = rank(dataset, cutB);
    expect(result.candidates.map((c) => c.name)).not.toContain("B");
    expect(cutB.evaluators[0].grades[id]).toEqual({ "2": 5 });
    const back = editConstraint(cutB, "crime", { max: null });
    expect(byName(rank(dataset, back))["B"].categoryScores[id]).toBe(100);
  });
});
