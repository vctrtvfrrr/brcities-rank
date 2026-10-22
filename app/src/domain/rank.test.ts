import { describe, expect, it } from "vitest";
import { datasetWithCities, fixtureDataset } from "./fixture-dataset";
import { rank } from "./rank";
import { createInitialSession } from "./session";

describe("rank (minimal)", () => {
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
