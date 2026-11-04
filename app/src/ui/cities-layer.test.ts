import { expression, validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { citiesLayer, haloWidth } from "./cities-layer";
import { reliefInsertionLayer, reliefLayers, reliefSource } from "./relief-layers";

function styleErrors(sources: Record<string, SourceSpecification>, layers: LayerSpecification[]) {
  return validateStyleMin({ version: 8, sources, layers } as never).map((e) => e.message);
}

function evaluate(value: unknown, zoom: number, properties: Record<string, unknown>) {
  const parsed = expression.createExpression(value, "number");
  if (parsed.result !== "success") throw new Error("invalid expression");
  return parsed.value.evaluate({ zoom }, { type: "Point", properties } as never);
}

const citiesSource: SourceSpecification = { type: "geojson", data: { type: "FeatureCollection", features: [] } };
const candidate = { cut: false, firstTen: false, selected: false };
const cutCity = { cut: true, firstTen: false, selected: false };

describe("citiesLayer", () => {
  it.each([false, true])("is a valid MapLibre layer with relief visible: %s", (reliefVisible) => {
    expect(styleErrors({ cities: citiesSource }, [citiesLayer("cities", reliefVisible)])).toEqual([]);
  });

  it.each([false, true])("draws its halo with the halo width for relief visible: %s", (reliefVisible) => {
    expect(citiesLayer("cities", reliefVisible).paint!["circle-stroke-width"]).toEqual(haloWidth(reliefVisible));
  });

  it.each([4, 8])("draws cut cities smaller than candidates at zoom %s", (zoom) => {
    const radius = citiesLayer("cities", false).paint!["circle-radius"];
    expect(evaluate(radius, zoom, cutCity)).toBeLessThan(evaluate(radius, zoom, candidate));
  });
});

describe("haloWidth", () => {
  it("rings every marker when relief is visible", () => {
    expect(evaluate(haloWidth(true), 8, cutCity)).toBeGreaterThan(0);
    expect(evaluate(haloWidth(true), 4, candidate)).toBeGreaterThan(0);
  });

  it("leaves cut cities without halo when relief is hidden", () => {
    expect(evaluate(haloWidth(false), 8, cutCity)).toBe(0);
  });
});

describe("reliefLayers", () => {
  it.each([false, true])("are valid MapLibre layers over a raster-dem source with visible: %s", (visible) => {
    expect(styleErrors({ relief: reliefSource() }, reliefLayers("relief", visible))).toEqual([]);
  });
});

describe("reliefInsertionLayer", () => {
  it("places relief below the first water layer", () => {
    const layers = [
      { id: "background", type: "background" },
      { id: "park", type: "fill", source: "basemap", "source-layer": "park" },
      { id: "water", type: "fill", source: "basemap", "source-layer": "water" },
      { id: "waterway", type: "line", source: "basemap", "source-layer": "waterway" },
      { id: "label", type: "symbol", source: "basemap", "source-layer": "place" },
    ] as LayerSpecification[];
    expect(reliefInsertionLayer(layers)).toBe("water");
  });

  it("falls back to below the first label when the style has no water", () => {
    const layers = [
      { id: "background", type: "background" },
      { id: "roads", type: "line", source: "basemap", "source-layer": "transportation" },
      { id: "label", type: "symbol", source: "basemap", "source-layer": "place" },
    ] as LayerSpecification[];
    expect(reliefInsertionLayer(layers)).toBe("label");
  });

  it("places relief on top of a style with neither water nor labels", () => {
    expect(reliefInsertionLayer([{ id: "background", type: "background" }] as LayerSpecification[])).toBeUndefined();
  });
});
