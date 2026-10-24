import { describe, expect, it } from "vitest";
import { addConstraint, constraintOptions, editConstraint, removeConstraint, toggleConstraint } from "./constraints";
import { fixtureDataset } from "./fixture-dataset";
import { rank } from "./rank";
import { createInitialSession, toggleCategory, type Session } from "./session";

const initial = createInitialSession(fixtureDataset);

const withConstraints = (...steps: ((s: Session) => Session)[]) => steps.reduce((s, step) => step(s), initial);
const add = (criterion: string) => (s: Session) => addConstraint(fixtureDataset, s, criterion);
const edit = (criterion: string, change: Parameters<typeof editConstraint>[2]) => (s: Session) =>
  editConstraint(s, criterion, change);

const candidateNames = (session: Session) =>
  rank(fixtureDataset, session)
    .candidates.map((c) => c.name)
    .sort();

describe("constraintOptions", () => {
  it("lists every criterion once, with Köppen as a single entry", () => {
    const keys = constraintOptions(fixtureDataset, initial).map((o) => o.criterion);
    expect(keys).toEqual([
      "location",
      "score",
      "crime",
      "rain",
      "heat",
      "populacao_2026",
      "koppen",
      "hospital_geral",
      "fibra",
    ]);
  });

  it("leaves out the criteria that already have a constraint", () => {
    const session = withConstraints(add("rain"), add("koppen"));
    const keys = constraintOptions(fixtureDataset, session).map((o) => o.criterion);
    expect(keys).not.toContain("rain");
    expect(keys).not.toContain("koppen");
    expect(keys).toContain("crime");
  });

  it("describes the kind of each option from the catalog", () => {
    const byKey = Object.fromEntries(constraintOptions(fixtureDataset, initial).map((o) => [o.criterion, o]));
    expect(byKey.crime).toMatchObject({ kind: "numeric", label: "Crime", group: "Segurança" });
    expect(byKey.koppen.kind).toBe("koppen");
    expect(byKey.fibra.kind).toBe("boolean");
    expect(byKey.location).toMatchObject({ kind: "location", label: "Localização", group: "Localização" });
    expect(byKey.score).toMatchObject({ kind: "score", label: "Pontuação mínima", group: "Pontuação" });
  });
});

describe("constraint commands", () => {
  it("adds an on constraint with the neutral value for its kind", () => {
    const session = withConstraints(add("crime"), add("koppen"), add("fibra"));
    expect(session.constraints).toEqual([
      { criterion: "crime", on: true, min: null, max: null },
      { criterion: "koppen", on: true, accepted: [] },
      { criterion: "fibra", on: true, value: true },
    ]);
  });

  it("ignores a second constraint on the same criterion and unknown criteria", () => {
    const once = withConstraints(add("crime"));
    expect(addConstraint(fixtureDataset, once, "crime")).toEqual(once);
    expect(addConstraint(fixtureDataset, once, "koppen_alvares")).toEqual(once);
    expect(addConstraint(fixtureDataset, once, "nope")).toEqual(once);
  });

  it("edits limits, accepted classes and the required value", () => {
    const session = withConstraints(
      add("crime"),
      add("koppen"),
      add("fibra"),
      edit("crime", { min: 5, max: 20 }),
      edit("koppen", { accepted: ["Aw"] }),
      edit("fibra", { value: false }),
    );
    expect(session.constraints).toEqual([
      { criterion: "crime", on: true, min: 5, max: 20 },
      { criterion: "koppen", on: true, accepted: ["Aw"] },
      { criterion: "fibra", on: true, value: false },
    ]);
  });

  it("turning a constraint off keeps its limits, and turning it on again restores the Corte", () => {
    const limited = withConstraints(add("crime"), edit("crime", { min: 10, max: 30 }));
    const off = toggleConstraint(limited, "crime");
    expect(off.constraints).toEqual([{ criterion: "crime", on: false, min: 10, max: 30 }]);
    expect(candidateNames(off)).toHaveLength(6);
    expect(candidateNames(toggleConstraint(off, "crime"))).toEqual(candidateNames(limited));
  });

  it("removes a constraint and gives the criterion back to the options", () => {
    const session = removeConstraint(withConstraints(add("crime"), add("rain")), "crime");
    expect(session.constraints.map((c) => c.criterion)).toEqual(["rain"]);
    expect(constraintOptions(fixtureDataset, session).map((o) => o.criterion)).toContain("crime");
  });

  it("does not touch the rest of the Session", () => {
    const session = withConstraints(add("crime"), edit("crime", { max: 5 }));
    expect(session.categories).toEqual(initial.categories);
    expect(session.evaluators).toEqual(initial.evaluators);
  });
});

describe("Corte", () => {
  it("keeps everything when there are no constraints", () => {
    const result = rank(fixtureDataset, initial);
    expect(result.candidates).toHaveLength(6);
    expect(result.cut).toEqual([]);
  });

  it("treats numeric limits as inclusive", () => {
    const session = withConstraints(add("crime"), edit("crime", { min: 10, max: 30 }));
    expect(candidateNames(session)).toEqual(["Rio de Janeiro", "Salvador", "São Paulo"]);
  });

  it("accepts a single limit", () => {
    expect(candidateNames(withConstraints(add("crime"), edit("crime", { max: 10 })))).toEqual([
      "Curitiba",
      "São Paulo",
    ]);
    expect(candidateNames(withConstraints(add("crime"), edit("crime", { min: 30 })))).toEqual([
      "Recife",
      "Rio de Janeiro",
    ]);
  });

  it("cuts a city with missing data even when the constraint has no limits", () => {
    expect(candidateNames(withConstraints(add("crime")))).not.toContain("Alta Floresta D'Oeste");
    expect(candidateNames(withConstraints(add("crime")))).toHaveLength(5);
  });

  it("does not cut on missing data while the constraint is off", () => {
    expect(candidateNames(toggleConstraint(withConstraints(add("crime")), "crime"))).toHaveLength(6);
  });

  describe("Köppen", () => {
    const accepting = (...classes: string[]) => withConstraints(add("koppen"), edit("koppen", { accepted: classes }));

    it("passes when the Beck class is accepted", () => {
      expect(candidateNames(accepting("Cfa"))).toEqual(["São Paulo"]);
    });

    it("passes when only the Alvares class is accepted", () => {
      expect(candidateNames(accepting("Am"))).toEqual(["Alta Floresta D'Oeste"]);
    });

    it("passes on Beck alone when the city has no Alvares class", () => {
      expect(candidateNames(accepting("Aw"))).toEqual(["Alta Floresta D'Oeste", "Rio de Janeiro"]);
    });

    it("cuts the city with neither class, and everything when nothing is accepted", () => {
      expect(candidateNames(accepting("Cfa", "Aw", "Am", "Af", "Cfb"))).not.toContain("Recife");
      expect(candidateNames(accepting())).toEqual([]);
    });
  });

  describe("Localização", () => {
    const accepting = (...states: string[]) => withConstraints(add("location"), edit("location", { states }));

    it("starts accepting all 27 states, so it cuts nothing", () => {
      const session = withConstraints(add("location"));
      const [location] = session.constraints;
      expect("states" in location && location.states).toHaveLength(27);
      expect(candidateNames(session)).toHaveLength(6);
    });

    it("passes the cities whose state is accepted", () => {
      expect(candidateNames(accepting("SP", "PR"))).toEqual(["Curitiba", "São Paulo"]);
    });

    it("keeps the accepted states in a fixed order, without repeats", () => {
      const [location] = accepting("PR", "SP", "PR").constraints;
      expect(location).toEqual({ criterion: "location", on: true, states: ["SP", "PR"] });
    });

    it("cuts everything when no state is accepted", () => {
      expect(candidateNames(accepting())).toEqual([]);
    });
  });

  describe("Pontuação mínima", () => {
    it("starts without a minimum, cutting no city", () => {
      const session = withConstraints(add("score"));
      expect(session.constraints).toEqual([{ criterion: "score", on: true, atLeast: null }]);
      expect(candidateNames(session)).toHaveLength(6);
    });

    it("takes a minimum and clears it", () => {
      const session = withConstraints(add("score"), edit("score", { atLeast: 60 }));
      expect(session.constraints[0]).toEqual({ criterion: "score", on: true, atLeast: 60 });
      expect(edit("score", { atLeast: null })(session).constraints[0]).toEqual({
        criterion: "score",
        on: true,
        atLeast: null,
      });
    });
  });

  describe("Pontuação mínima as Corte", () => {
    const safety = (s: Session) => toggleCategory(s, "Segurança");
    const scores = (session: Session) =>
      Object.fromEntries(rank(fixtureDataset, session).candidates.map((c) => [c.name, c.score]));

    it("cuts the cities whose Pontuação is below the minimum, keeping the Pontuação of the rest", () => {
      const all = scores(withConstraints(safety));
      const session = withConstraints(safety, add("score"), edit("score", { atLeast: 50 }));
      const kept = scores(session);
      expect(Object.keys(kept).sort()).toEqual(
        Object.keys(all)
          .filter((name) => all[name]! >= 50)
          .sort(),
      );
      expect(kept["Curitiba"]).toBe(all["Curitiba"]);
    });

    it("lets a city without Pontuação pass", () => {
      const session = withConstraints(add("score"), edit("score", { atLeast: 90 }));
      expect(candidateNames(session)).toHaveLength(6);
    });

    it("keeps the Pontuação and notes of a city it cuts", () => {
      const session = withConstraints(safety, add("score"), edit("score", { atLeast: 101 }));
      const salvador = rank(fixtureDataset, session).cut.find((c) => c.name === "Salvador")!;
      expect(salvador.failedConstraints).toEqual(["score"]);
      const ranked = rank(fixtureDataset, withConstraints(safety)).candidates.find((c) => c.name === "Salvador")!;
      expect(salvador.scores.score).toBe(ranked.score);
      expect(salvador.scores.categoryScores).toEqual(ranked.categoryScores);
    });

    it("counts the cities it cuts", () => {
      const session = withConstraints(safety, add("score"), edit("score", { atLeast: 101 }));
      expect(rank(fixtureDataset, session).cutCounts.score).toBe(6);
    });
  });

  describe("hospital and fibra", () => {
    it("requires yes", () => {
      expect(candidateNames(withConstraints(add("hospital_geral")))).toEqual([
        "Curitiba",
        "Rio de Janeiro",
        "Salvador",
        "São Paulo",
      ]);
    });

    it("requires no, and still cuts the city without data", () => {
      const session = withConstraints(add("fibra"), edit("fibra", { value: false }));
      expect(candidateNames(session)).toEqual(["Alta Floresta D'Oeste"]);
    });
  });

  it("is the conjunction of the on constraints, whatever their order", () => {
    const a = withConstraints(add("crime"), add("hospital_geral"), edit("crime", { max: 20 }));
    const b = withConstraints(add("hospital_geral"), add("crime"), edit("crime", { max: 20 }));
    expect(candidateNames(a)).toEqual(["Curitiba", "Salvador", "São Paulo"]);
    expect(candidateNames(b)).toEqual(candidateNames(a));
    expect(rank(fixtureDataset, a).cutCounts).toEqual(rank(fixtureDataset, b).cutCounts);
  });

  it("gives a cut city no position and no Pontuação by leaving it out of the Candidates", () => {
    const { candidates, cut } = rank(fixtureDataset, withConstraints(add("hospital_geral")));
    expect(candidates.map((c) => c.code)).not.toContain("1100015");
    expect(cut.map((c) => c.code).sort()).toEqual(["1100015", "2611606"]);
    expect(cut.find((c) => c.code === "1100015")).toMatchObject({ name: "Alta Floresta D'Oeste", uf: "RO" });
  });
});

describe("corta N", () => {
  it("counts the cities each constraint cuts on its own, on or off", () => {
    const session = toggleConstraint(
      withConstraints(add("crime"), edit("crime", { max: 20 }), add("hospital_geral"), add("fibra")),
      "hospital_geral",
    );
    expect(rank(fixtureDataset, session).cutCounts).toEqual({ crime: 3, hospital_geral: 2, fibra: 2 });
  });

  it("is unaffected by the other constraints", () => {
    const alone = withConstraints(add("crime"), edit("crime", { max: 20 }));
    const crowded = withConstraints(add("crime"), edit("crime", { max: 20 }), add("hospital_geral"), add("fibra"));
    expect(rank(fixtureDataset, crowded).cutCounts.crime).toBe(rank(fixtureDataset, alone).cutCounts.crime);
  });
});

describe("restrictions that fail", () => {
  it("lists, for each cut city, every on constraint it fails", () => {
    const session = withConstraints(add("crime"), edit("crime", { max: 20 }), add("hospital_geral"), add("fibra"));
    const failures = Object.fromEntries(rank(fixtureDataset, session).cut.map((c) => [c.name, c.failedConstraints]));
    expect(failures).toEqual({
      "Alta Floresta D'Oeste": ["crime", "hospital_geral", "fibra"],
      Recife: ["crime", "hospital_geral", "fibra"],
      "Rio de Janeiro": ["crime"],
    });
  });

  it("leaves out the constraints that are off", () => {
    const session = toggleConstraint(withConstraints(add("crime"), add("hospital_geral")), "crime");
    const [alta] = rank(fixtureDataset, session).cut;
    expect(alta.failedConstraints).toEqual(["hospital_geral"]);
  });
});

describe("Corte and the notes", () => {
  const salvadorSafetyNote = (session: Session) =>
    rank(fixtureDataset, toggleCategory(session, "Segurança")).candidates.find((c) => c.name === "Salvador")!
      .categoryScores["Segurança"];

  it("gives 0 to a Candidate right on the limit of a Restrição", () => {
    const cut = withConstraints(add("crime"), edit("crime", { max: 20 }));
    expect(salvadorSafetyNote(cut)).toBe(0);
    expect(salvadorSafetyNote(initial)).toBeGreaterThan(0);
  });
});
