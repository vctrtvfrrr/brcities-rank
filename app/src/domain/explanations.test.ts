import { describe, expect, it } from "vitest";
import shippedDataset from "../../../pipeline/dados/dataset.json";
import type { Dataset } from "./dataset";
import { explainCategory, SCORE_READING } from "./explanations";
import { fixtureDataset } from "./fixture-dataset";

describe("explainCategory", () => {
  it("lists the criteria of the category from the dataset catalog, with unit and direction", () => {
    const explanation = explainCategory(fixtureDataset, "Clima")!;
    expect(explanation.criteria).toEqual([
      { label: "Chuva", unit: "dias", direction: "menor" },
      { label: "Calor", unit: "°C", direction: "menor" },
    ]);
  });

  it("leaves out the criteria that only filter", () => {
    const labels = explainCategory(fixtureDataset, "Saúde")?.criteria.map((c) => c.label) ?? [];
    expect(labels).toEqual([]);
  });

  it("explains what the category measures and how its note is computed", () => {
    const explanation = explainCategory(fixtureDataset, "Porte")!;
    expect(explanation.measures).not.toBe("");
    expect(explanation.scoring).toContain("0 a 100");
  });

  it("says that a city right on the limit of a restrição gets 0 and a missing value counts 0", () => {
    const { scoring } = explainCategory(fixtureDataset, "Clima")!;
    expect(scoring).toContain("no limite da restrição vale 0");
    expect(scoring).toContain("sem dado conta 0");
  });

  it("has no explanation for a category outside the catalog", () => {
    expect(explainCategory(fixtureDataset, "Lazer")).toBeNull();
  });

  it("covers every scoring category of the shipped dataset", () => {
    const shipped = shippedDataset as unknown as Dataset;
    const scoring = [...new Set(shipped.catalogo.filter((c) => c.pontua).map((c) => c.categoria))];
    expect(scoring).toHaveLength(6);
    for (const category of scoring) {
      expect(explainCategory(shipped, category), category).not.toBeNull();
    }
  });
});

describe("SCORE_READING", () => {
  const text = SCORE_READING.join(" ");

  it("says the notes come from the régua, not from the other Candidates", () => {
    expect(text).toContain("não dependem das outras Candidatas");
    expect(text).toContain("limite da restrição");
  });

  it("says a missing value counts 0, and how weights and subjective grades enter", () => {
    expect(text).toContain("Dado ausente");
    expect(text).toContain("peso");
    expect(text).toContain("subjetiva");
  });
});
