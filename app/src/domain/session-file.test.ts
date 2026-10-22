import { describe, expect, it } from "vitest";
import { addConstraint, editConstraint } from "./constraints";
import { fixtureDataset } from "./fixture-dataset";
import {
  addEvaluator,
  addSubjective,
  createInitialSession,
  renameEvaluator,
  setGrade,
  setWeight,
  toggleCategory,
  type Session,
} from "./session";
import { exportFileName, hasOwnSession, parseSession, serializeSession } from "./session-file";

function richSession(): Session {
  let session = createInitialSession(fixtureDataset);
  session = addConstraint(fixtureDataset, session, "crime");
  session = editConstraint(session, "crime", { min: 5, max: 30.5 });
  session = addConstraint(fixtureDataset, session, "koppen");
  session = editConstraint(session, "koppen", { accepted: ["Cfa", "Aw"] });
  session = addConstraint(fixtureDataset, session, "fibra");
  session = editConstraint(session, "fibra", { value: false });
  session = toggleCategory(session, "Clima");
  session = addSubjective(session);
  session = setWeight(session, "Clima", 37.123456789);
  session = setGrade(session, "subjective-1", "3550308", 4);
  session = addEvaluator(session);
  session = renameEvaluator(session, "evaluator-2", "Ana");
  session = setWeight(session, "subjective-1", 20);
  session = setGrade(session, "subjective-1", "3304557", 2);
  return { ...session, name: "Família Silva" };
}

describe("serializeSession and parseSession", () => {
  it("round-trips a full Session without loss", () => {
    const session = richSession();
    const result = parseSession(fixtureDataset, serializeSession(session));
    expect(result).toEqual({ ok: true, session });
  });

  it("round-trips the initial Session", () => {
    const session = createInitialSession(fixtureDataset);
    expect(parseSession(fixtureDataset, serializeSession(session))).toEqual({ ok: true, session });
  });

  it("ignores unknown fields", () => {
    const session = createInitialSession(fixtureDataset);
    const text = JSON.stringify({ ...session, extra: 1 });
    expect(parseSession(fixtureDataset, text)).toEqual({ ok: true, session });
  });
});

describe("parseSession refusing invalid files", () => {
  const valid = () => JSON.parse(serializeSession(richSession()));
  const refuses = (mutate: (file: any) => void) => {
    const file = valid();
    mutate(file);
    const result = parseSession(fixtureDataset, JSON.stringify(file));
    expect(result.ok).toBe(false);
    return result;
  };

  it.each([
    ["empty text", ""],
    ["text that is not JSON", "not json"],
    ["JSON that is not an object", "[1, 2]"],
    ["null", "null"],
  ])("refuses %s", (_label, text) => {
    expect(parseSession(fixtureDataset, text).ok).toBe(false);
  });

  it("refuses an unknown format version", () => {
    const result = refuses((f) => (f.version = 99));
    expect(result).toMatchObject({ reason: expect.stringContaining("99") });
  });

  it("refuses a constraint on a criterion missing from the catalog", () => {
    const result = refuses((f) => (f.constraints[0].criterion = "inexistente"));
    expect(result).toMatchObject({ reason: expect.stringContaining("inexistente") });
  });

  it("refuses a constraint whose shape does not match its criterion", () => {
    refuses((f) => (f.constraints[0] = { criterion: "crime", on: true, value: true }));
  });

  it("refuses two constraints on the same criterion", () => {
    refuses((f) => f.constraints.push({ ...f.constraints[0] }));
  });

  it("refuses a numeric limit that is not a finite number", () => {
    refuses((f) => (f.constraints[0].min = "5"));
  });

  it("refuses an objective category missing from the catalog", () => {
    refuses((f) => (f.categories[0].id = "Inexistente"));
  });

  it("refuses a Session that drops an objective category", () => {
    refuses((f) => {
      f.categories = f.categories.filter((c: any) => c.id !== "Porte");
      for (const e of f.evaluators) delete e.weights.Porte;
    });
  });

  it("refuses a Session with no evaluators", () => {
    refuses((f) => (f.evaluators = []));
  });

  it("refuses an active evaluator that does not exist", () => {
    refuses((f) => (f.activeEvaluatorId = "evaluator-99"));
  });

  it("refuses weights that do not sum 100", () => {
    refuses((f) => (f.evaluators[0].weights.Porte += 10));
  });

  it("refuses weights that miss a category", () => {
    refuses((f) => delete f.evaluators[0].weights.Porte);
  });

  it("refuses a negative weight", () => {
    refuses((f) => {
      f.evaluators[0].weights.Porte = -5;
      f.evaluators[0].weights.Clima += 5;
    });
  });

  it("refuses a grade outside 1 to 5", () => {
    refuses((f) => (f.evaluators[0].grades["subjective-1"]["3550308"] = 6));
  });

  it("refuses grades for a category that is not subjective", () => {
    refuses((f) => (f.evaluators[0].grades.Clima = { "3550308": 3 }));
  });

  it("refuses duplicated evaluator ids", () => {
    refuses((f) => (f.evaluators[1].id = f.evaluators[0].id));
  });
});

describe("exportFileName", () => {
  it("names the file after the Session", () => {
    expect(exportFileName("Família Silva")).toBe("sessao-familia-silva.json");
  });

  it("falls back to a generic name when the Session has none", () => {
    expect(exportFileName("")).toBe("sessao-brcities.json");
    expect(exportFileName("  /?! ")).toBe("sessao-brcities.json");
  });
});

describe("hasOwnSession", () => {
  it("is false for the initial Session", () => {
    expect(hasOwnSession(fixtureDataset, createInitialSession(fixtureDataset))).toBe(false);
  });

  it("is true once anything changes, including only the name", () => {
    const initial = createInitialSession(fixtureDataset);
    expect(hasOwnSession(fixtureDataset, { ...initial, name: "x" })).toBe(true);
    expect(hasOwnSession(fixtureDataset, toggleCategory(initial, "Clima"))).toBe(true);
  });
});
