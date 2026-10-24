import { describe, expect, it } from "vitest";
import { datasetWithCities, fixtureDataset } from "./fixture-dataset";
import { isAmongFirstTen, rank, type Candidate } from "./rank";
import { addConstraint, editConstraint, toggleConstraint } from "./constraints";
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

describe("Régua", () => {
  const tenths = datasetWithCities(
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((crime, i) => ({
      code: String(i + 1),
      name: `Cidade ${i + 1}`,
      values: { crime, rain: i },
    })),
  );
  const limited = (criterion: string, edit: { min?: number | null; max?: number | null }, session: Session) =>
    editConstraint(addConstraint(tenths, session, criterion), criterion, edit);
  const crimeNotes = (session: Session) =>
    Object.fromEntries(rank(tenths, session).candidates.map((c) => [c.name, c.criterionScores.crime]));

  it("does not depend on the other Candidatas", () => {
    const notes = crimeNotes(limited("rain", { min: 5 }, createInitialSession(tenths)));
    expect(notes["Cidade 1"]).toBeUndefined();
    expect(notes["Cidade 6"]).toBeCloseTo(50);
    expect(notes["Cidade 11"]).toBe(0);
  });

  it("takes the limit of a Restrição on the bad side as the end worth 0", () => {
    const notes = crimeNotes(limited("crime", { max: 50 }, createInitialSession(tenths)));
    expect(notes["Cidade 6"]).toBe(0);
    expect(notes["Cidade 4"]).toBeCloseTo((20 / 45) * 100);
    expect(notes["Cidade 1"]).toBe(100);
  });

  it("takes the limit of a Restrição on the good side as the end worth 100", () => {
    const notes = crimeNotes(limited("crime", { min: 30 }, createInitialSession(tenths)));
    expect(notes["Cidade 4"]).toBe(100);
    expect(notes["Cidade 7"]).toBeCloseTo((35 / 65) * 100);
  });

  it("measures a logarithmic criterion up to the limit in logarithm", () => {
    const dataset = datasetWithCities(
      [10, 100, 1000, 10000, 100000].map((population, i) => ({
        code: String(i + 1),
        name: `Cidade ${i + 1}`,
        population,
      })),
    );
    let session = addConstraint(dataset, withOn(createInitialSession(dataset), "Porte"), "populacao_2026");
    session = editConstraint(session, "populacao_2026", { min: 100, max: 10000 });
    const notes = byName(rank(dataset, session));
    expect(notes["Cidade 2"].categoryScores.Porte).toBe(0);
    expect(notes["Cidade 3"].categoryScores.Porte).toBeCloseTo(50);
    expect(notes["Cidade 4"].categoryScores.Porte).toBe(100);
  });

  it("ignores the limit of a Restrição that is off", () => {
    const off = toggleConstraint(limited("crime", { max: 50 }, createInitialSession(tenths)), "crime");
    expect(crimeNotes(off)["Cidade 6"]).toBeCloseTo(50);
  });

  it("moves the other end to the real extreme when the national percentile falls on the wrong side of the limit", () => {
    const notes = crimeNotes(limited("crime", { min: 98 }, createInitialSession(tenths)));
    expect(notes["Cidade 11"]).toBe(0);
    const capped = crimeNotes(limited("crime", { max: 2 }, createInitialSession(tenths)));
    expect(capped["Cidade 1"]).toBe(100);
  });

  it("moves the other end to the real extreme when the national percentile lands right on the limit", () => {
    expect(rank(tenths, limited("crime", { max: 5 }, createInitialSession(tenths))).rulers.crime).toEqual({
      worst: 5,
      best: 0,
    });
  });

  it("treats a limit of 0 on a logarithmic criterion as no limit", () => {
    const dataset = datasetWithCities(
      [10, 100, 1000].map((population, i) => ({ code: String(i + 1), name: `Cidade ${i + 1}`, population })),
    );
    const session = withOn(createInitialSession(dataset), "Porte");
    const limitedSession = editConstraint(addConstraint(dataset, session, "populacao_2026"), "populacao_2026", {
      min: 0,
    });
    expect(byName(rank(dataset, limitedSession))["Cidade 2"].categoryScores.Porte).toBeCloseTo(50);
  });

  it("gives 100 to every Candidata when the limit sits on the real extreme", () => {
    const notes = crimeNotes(limited("crime", { min: 100 }, createInitialSession(tenths)));
    expect(notes["Cidade 11"]).toBe(100);
  });
});

describe("Pontuação", () => {
  const dataset = datasetWithCities([
    { code: "1", name: "A", population: 1000, values: { crime: 0, rain: 100, heat: 20 } },
    { code: "2", name: "B", population: 1000, values: { crime: 100, rain: 200, heat: 30 } },
    { code: "3", name: "C", population: 1000, values: { crime: 50, rain: 150, heat: 25 } },
  ]);
  const base = createInitialSession(dataset);

  it("is the average of the categories that are on, weighted by the Participação of each one", () => {
    const session = withWeights(withOn(base, "Segurança", "Clima"), { Segurança: 3, Clima: 1, Porte: 0 });
    const c = byName(rank(dataset, session))["C"];
    const { Segurança, Clima } = c.categoryScores;
    expect(c.score).toBeCloseTo(0.75 * Segurança + 0.25 * Clima);
  });

  const withEvaluators = (session: Session, ...weights: Record<string, number>[]): Session => ({
    ...session,
    evaluators: weights.map((w, at) => ({ id: `e${at + 1}`, name: `Avaliador ${at + 1}`, weights: w, grades: {} })),
  });
  const safeButHarsh = datasetWithCities([
    { code: "1", name: "A", values: { crime: 0, rain: 200, heat: 30 } },
    { code: "2", name: "B", values: { crime: 100, rain: 100, heat: 20 } },
  ]);
  const scoreOfA = (session: Session) => byName(rank(safeButHarsh, session))["A"].score;
  const bothOn = withOn(createInitialSession(safeButHarsh), "Segurança", "Clima");

  it("averages the Participações of the evaluators, so larger weights do not make an evaluator count more", () => {
    const session = withEvaluators(bothOn, { Segurança: 10, Clima: 10 }, { Segurança: 1 });
    expect(scoreOfA(session)).toBeCloseTo(75);
  });

  it("takes the Participação over the categories that are on, so weight on a category that is off dilutes nothing", () => {
    const session = withEvaluators(bothOn, { Segurança: 2, Clima: 2, Porte: 10 }, { Segurança: 0, Clima: 1, Porte: 0 });
    expect(scoreOfA(session)).toBeCloseTo(25);
  });

  it("leaves out an evaluator whose weights on the categories that are on are all 0", () => {
    const session = withEvaluators(bothOn, { Segurança: 3, Clima: 1, Porte: 0 }, { Segurança: 0, Clima: 0, Porte: 10 });
    expect(scoreOfA(session)).toBeCloseTo(75);
  });

  it("leaves a category that is off out of the calculation", () => {
    const session = withWeights(withOn(base, "Segurança"), { Segurança: 2, Clima: 5, Porte: 3 });
    const c = byName(rank(dataset, session))["C"];
    expect(c.score).toBeCloseTo(c.categoryScores["Segurança"]);
  });

  it("leaves a category that every evaluator weighs 0 out of the calculation", () => {
    const session = withWeights(withOn(base, "Segurança", "Clima"), { Segurança: 10, Clima: 0, Porte: 0 });
    const c = byName(rank(dataset, session))["C"];
    expect(c.score).toBeCloseTo(c.categoryScores["Segurança"]);
  });

  it("leaves a Candidate without Pontuação when every evaluator weighs the categories that are on 0", () => {
    const session = withWeights(withOn(base, "Clima"), { Segurança: 10, Clima: 0, Porte: 0 });
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
        e.id === "e2" ? { ...e, weights: { Segurança: 0, Clima: 0, Porte: 0, [id]: 10 } } : e,
      ),
    };
    session = gradeAs(session, "evaluator-1", id, "1", 5);
    expect(byName(rank(dataset, session))["A"].score).toBe(100);
  });

  it("leaves a subjective without a grade out of the calculation of that city only", () => {
    const { session: base, id } = withSubjective();
    let session = toggleCategory(base, "Segurança");
    session = withWeights(session, { Segurança: 5, Clima: 0, Porte: 0, [id]: 5 });
    session = setGrade(session, id, "1", 1);
    const scores = byName(rank(dataset, session));
    expect(scores.A.score).toBeCloseTo(0.5 * scores.A.categoryScores["Segurança"] + 0.5 * 0);
    expect(scores.B.score).toBeCloseTo(scores.B.categoryScores["Segurança"]);
  });

  it("leaves a Candidate without Pontuação when only an ungraded subjective weighs", () => {
    const { session: base, id } = withSubjective();
    const session = setGrade(withWeights(base, { Segurança: 0, Clima: 0, Porte: 0, [id]: 10 }), id, "1", 4);
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

describe("Dez primeiras", () => {
  const at = (position: number | null) => ({ position }) as Candidate;

  it("holds the positions 1 to 10 of the Ranking", () => {
    expect([1, 10].map((p) => isAmongFirstTen(at(p)))).toEqual([true, true]);
    expect(isAmongFirstTen(at(11))).toBe(false);
  });

  it("leaves out a Candidate without Pontuação", () => {
    expect(isAmongFirstTen(at(null))).toBe(false);
  });
});
