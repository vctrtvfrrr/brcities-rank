import { describe, expect, it } from "vitest";
import { cityDetail } from "./city-detail";
import { datasetWithCities, fixtureDataset } from "./fixture-dataset";
import { rank } from "./rank";
import { addConstraint, editConstraint } from "./constraints";
import { createInitialSession, toggleCategory, type Session } from "./session";

const scored = (session: Session) => ["Segurança", "Clima", "Porte"].reduce(toggleCategory, session);

const open = (dataset = fixtureDataset, session = createInitialSession(dataset)) => {
  const result = rank(dataset, session);
  return (code: string) => cityDetail(dataset, session, result, code);
};

describe("cityDetail standing", () => {
  it("shows position and Pontuação of a ranked Candidate out of all Candidates", () => {
    const dataset = fixtureDataset;
    const session = scored(createInitialSession(dataset));
    const result = rank(dataset, session);
    const best = result.candidates[0];
    const detail = cityDetail(dataset, session, result, best.code)!;
    expect(detail.standing).toEqual({ kind: "ranked", position: 1, of: 6, score: best.score });
  });

  it("marks a Candidate without Pontuação as unscored", () => {
    expect(open()("2611606")!.standing).toEqual({ kind: "unscored" });
  });

  it("lists every ligada Restrição the cut city fails, in Sessão order", () => {
    let session = createInitialSession(fixtureDataset);
    session = addConstraint(fixtureDataset, session, "crime");
    session = editConstraint(session, "crime", { max: 15 });
    session = addConstraint(fixtureDataset, session, "rain");
    session = editConstraint(session, "rain", { max: 110 });
    session = addConstraint(fixtureDataset, session, "fibra");
    const detail = open(fixtureDataset, session)("3304557")!;
    expect(detail.standing.kind).toBe("cut");
    if (detail.standing.kind !== "cut") return;
    expect(detail.standing.failed.map((c) => c.criterion)).toEqual(["crime", "rain"]);
  });

  it("returns null for an unknown code", () => {
    expect(open()("0000000")).toBeNull();
  });
});

describe("cityDetail criteria", () => {
  const session = scored(createInitialSession(fixtureDataset));
  const result = rank(fixtureDataset, session);
  const detail = cityDetail(fixtureDataset, session, result, "4106902")!;
  const criterion = (category: string, key: string) =>
    detail.categories.find((c) => c.id === category)!.criteria.find((c) => c.key === key)!;

  it("reports the raw value, unit, label and the note computed by rank", () => {
    const candidate = result.candidates.find((c) => c.code === "4106902")!;
    expect(criterion("Segurança", "crime")).toMatchObject({
      label: "Crime",
      unit: "/100 mil",
      value: 5,
      missing: false,
      note: candidate.criterionScores.crime,
    });
  });

  it("reports the category note computed by rank", () => {
    const candidate = result.candidates.find((c) => c.code === "4106902")!;
    expect(detail.categories.find((c) => c.id === "Clima")!.note).toBe(candidate.categoryScores.Clima);
  });

  it("reports the vigente P5/P95 from rank", () => {
    expect(criterion("Segurança", "crime").bounds).toEqual(result.bounds.crime);
    expect(result.bounds.crime).not.toBeNull();
  });

  it("gives the P5/P95 of a logarithmic criterion in raw units", () => {
    const { bounds } = criterion("Porte", "populacao_2026");
    expect(bounds!.low).toBeGreaterThan(22000);
    expect(bounds!.high).toBeLessThan(12000000);
  });

  it("flags Dado ausente, which counts 0", () => {
    const missing = cityDetail(fixtureDataset, session, result, "1100015")!.categories[0].criteria[0];
    expect(missing).toMatchObject({ key: "crime", value: null, missing: true, note: 0 });
  });

  it("reports the sources of the criterion with edition, year, address and credit", () => {
    expect(criterion("Segurança", "crime").sources).toEqual([fixtureDataset.fontes[0]]);
  });

  it("keeps a switched-off category in the detail, marked off", () => {
    const off = cityDetail(
      fixtureDataset,
      createInitialSession(fixtureDataset),
      rank(fixtureDataset, createInitialSession(fixtureDataset)),
      "4106902",
    )!;
    expect(off.categories.map((c) => [c.id, c.on])).toEqual([
      ["Segurança", false],
      ["Clima", false],
      ["Porte", false],
    ]);
  });

  it("reports no P5/P95 when no Candidate has data for the criterion", () => {
    const dataset = datasetWithCities([{ code: "1", name: "A" }]);
    const session = createInitialSession(dataset);
    const only = cityDetail(dataset, session, rank(dataset, session), "1")!;
    expect(only.categories[0].criteria[0]).toMatchObject({ bounds: null, missing: true, note: 0 });
  });
});

describe("cityDetail of a cut city", () => {
  it("shows raw values but no notes", () => {
    let session = addConstraint(fixtureDataset, createInitialSession(fixtureDataset), "crime");
    session = editConstraint(session, "crime", { max: 15 });
    const detail = open(fixtureDataset, scored(session))("3304557")!;
    const crime = detail.categories[0].criteria[0];
    expect(crime).toMatchObject({ value: 30, note: null });
    expect(detail.categories[0].note).toBeNull();
  });
});

describe("cityDetail filters", () => {
  it("shows both Köppen classes and flags when they diverge", () => {
    expect(open()("3304557")!.filters.koppen).toEqual({ beck: "Aw", alvares: null, diverge: false });
    expect(open()("1100015")!.filters.koppen).toEqual({ beck: "Aw", alvares: "Am", diverge: true });
    expect(open()("3550308")!.filters.koppen).toEqual({ beck: "Cfa", alvares: "Cfa", diverge: false });
  });

  it("shows hospital and fibra, keeping Dado ausente as null", () => {
    expect(open()("2611606")!.filters).toMatchObject({ hospital: false, fibra: null });
    expect(open()("3550308")!.filters).toMatchObject({ hospital: true, fibra: true });
  });

  it("carries the sources of the filters", () => {
    expect(open()("3550308")!.filters.fibraSources).toEqual([fixtureDataset.fontes[0]]);
    expect(open()("3550308")!.filters.koppenSources).toEqual([fixtureDataset.fontes[1]]);
  });
});
