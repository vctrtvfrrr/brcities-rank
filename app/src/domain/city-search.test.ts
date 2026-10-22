import { describe, expect, it } from "vitest";
import { searchCities } from "./city-search";
import { fixtureDataset } from "./fixture-dataset";

describe("searchCities", () => {
  it("matches regardless of case and accents", () => {
    expect(searchCities(fixtureDataset, "sao paulo")).toEqual([{ code: "3550308", name: "São Paulo", uf: "SP" }]);
  });

  it("lists names that start with the text before names that only contain it", () => {
    const names = searchCities(fixtureDataset, "r").map((c) => c.name);
    expect(names.slice(0, 2)).toEqual(["Rio de Janeiro", "Recife"]);
    expect(names).toContain("Curitiba");
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchCities(fixtureDataset, "  ")).toEqual([]);
    expect(searchCities(fixtureDataset, "a", 2)).toHaveLength(2);
  });
});
