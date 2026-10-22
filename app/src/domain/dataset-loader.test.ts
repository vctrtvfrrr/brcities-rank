import { describe, expect, it } from "vitest";
import { fixtureDataset } from "./fixture-dataset";
import { loadDataset, UnsupportedContractVersionError } from "./dataset-loader";

const respondWith =
  (body: unknown, ok = true) =>
  async () =>
    ({ ok, status: ok ? 200 : 404, json: async () => body }) as Response;

describe("loadDataset", () => {
  it("returns the dataset when the contract version is known", async () => {
    await expect(loadDataset("/dataset.json", respondWith(fixtureDataset))).resolves.toEqual(fixtureDataset);
  });

  it("refuses an unknown contract version, reporting it", async () => {
    const future = { ...fixtureDataset, versao: 2 };
    await expect(loadDataset("/dataset.json", respondWith(future))).rejects.toMatchObject({
      name: UnsupportedContractVersionError.name,
      version: 2,
    });
  });

  it("refuses a payload without a contract version", async () => {
    await expect(loadDataset("/dataset.json", respondWith({ colunas: {} }))).rejects.toBeInstanceOf(
      UnsupportedContractVersionError,
    );
  });

  it("fails when the file cannot be fetched", async () => {
    await expect(loadDataset("/dataset.json", respondWith(null, false))).rejects.toThrow(/404/);
  });
});
