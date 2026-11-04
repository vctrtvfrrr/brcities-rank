import { describe, expect, it } from "vitest";
import shippedDataset from "../../../pipeline/dados/dataset.json";
import type { Dataset } from "./dataset";
import { explainBands, explainCategory, explainScoreReading } from "./explanations";
import { fixtureDataset } from "./fixture-dataset";

describe("explainCategory", () => {
  it("lists the criteria of the category from the dataset catalog, with unit and direction", () => {
    const explanation = explainCategory(fixtureDataset, "Clima", "candidates")!;
    expect(explanation.criteria).toEqual([
      { label: "Chuva", unit: "dias", direction: "menor" },
      { label: "Calor", unit: "°C", direction: "menor" },
    ]);
  });

  it("leaves out the criteria that only filter", () => {
    const labels = explainCategory(fixtureDataset, "Saúde", "candidates")?.criteria.map((c) => c.label) ?? [];
    expect(labels).toEqual([]);
  });

  it("explains what the category measures and how its note is computed", () => {
    const explanation = explainCategory(fixtureDataset, "Porte", "candidates")!;
    expect(explanation.measures).not.toBe("");
    expect(explanation.scoring).toContain("0 a 100");
  });

  it("says that a city right on the limit of a restrição gets 0 and a missing value counts 0", () => {
    const { scoring } = explainCategory(fixtureDataset, "Clima", "candidates")!;
    expect(scoring).toContain("no limite da restrição vale 0");
    expect(scoring).toContain("sem dado conta 0");
  });

  it("under the Referência Candidatas, says the ends without a limit come from the Candidatas only", () => {
    const { scoring } = explainCategory(fixtureDataset, "Clima", "candidates")!;
    expect(scoring).toContain("entre as Candidatas");
    expect(scoring).not.toContain("Brasil");
  });

  it("under the Referência Brasil, says the ends without a limit come from all of Brazil only", () => {
    const { scoring } = explainCategory(fixtureDataset, "Clima", "brazil")!;
    expect(scoring).toContain("entre todos os municípios do Brasil");
    expect(scoring).not.toContain("Candidatas");
  });

  it("keeps the log note of Porte under each Referência", () => {
    expect(explainCategory(fixtureDataset, "Porte", "candidates")!.scoring).toContain("logaritmo");
    expect(explainCategory(fixtureDataset, "Porte", "brazil")!.scoring).toContain("logaritmo");
  });

  it("has no explanation for a category outside the catalog", () => {
    expect(explainCategory(fixtureDataset, "Lazer", "candidates")).toBeNull();
  });

  it("covers every scoring category of the shipped dataset", () => {
    const shipped = shippedDataset as unknown as Dataset;
    const scoring = [...new Set(shipped.catalogo.filter((c) => c.pontua).map((c) => c.categoria))];
    expect(scoring).toHaveLength(6);
    for (const category of scoring) {
      expect(explainCategory(shipped, category, "candidates"), category).not.toBeNull();
    }
  });
});

describe("explainScoreReading", () => {
  const candidates = explainScoreReading("candidates").join(" ");
  const brazil = explainScoreReading("brazil").join(" ");

  it("names the Referência in force", () => {
    expect(candidates).toContain("Referência");
    expect(brazil).toContain("Referência");
  });

  it("under the Referência Candidatas, says the régua comes from the group, so other restrições move every note", () => {
    expect(candidates).toContain("limite da restrição");
    expect(candidates).toContain("menos a Pontuação mínima");
    expect(candidates).toContain("a cidade cortada é medida pela mesma régua");
    expect(candidates).not.toContain("Brasil");
    expect(candidates).not.toContain("só dependem dos dados da cidade e das restrições");
  });

  it("under the Referência Brasil, says the régua comes from all of Brazil and notes only depend on the city", () => {
    expect(brazil).toContain("limite da restrição");
    expect(brazil).toContain("todos os municípios do Brasil");
    expect(brazil).toContain("só dependem dos dados da cidade e das restrições");
    expect(brazil).not.toContain("menos a Pontuação mínima");
  });

  it("says a missing value counts 0, and how weights and subjective grades enter, under each Referência", () => {
    for (const text of [candidates, brazil]) {
      expect(text).toContain("Dado ausente");
      expect(text).toContain("peso");
      expect(text).toContain("subjetiva");
    }
  });
});

describe("explainBands", () => {
  it("under the Referência Candidatas, says the Faixa can change when other cities enter or leave the Corte", () => {
    const text = explainBands("candidates");
    expect(text).toContain("Faixa");
    expect(text).toContain("melhor das Candidatas");
    expect(text).toContain("pode mudar");
    expect(text).not.toContain("Brasil");
  });

  it("under the Referência Brasil, says the Faixa does not change when other cities enter or leave the Corte", () => {
    const text = explainBands("brazil");
    expect(text).toContain("Faixa");
    expect(text).toContain("melhor do Brasil");
    expect(text).toContain("não muda");
    expect(text).not.toContain("Candidatas");
  });
});
