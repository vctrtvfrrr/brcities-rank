import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { citiesLayer } from "./cities-layer";
import { reliefLayers, reliefSource } from "./relief-layers";

function styleErrors(sources: Record<string, SourceSpecification>, layers: LayerSpecification[]) {
  return validateStyleMin({ version: 8, sources, layers } as never).map((e) => e.message);
}

const citiesSource: SourceSpecification = { type: "geojson", data: { type: "FeatureCollection", features: [] } };

describe("citiesLayer", () => {
  it.each([false, true])("is a valid MapLibre layer with relief visible: %s", (reliefVisible) => {
    expect(styleErrors({ cities: citiesSource }, [citiesLayer("cities", reliefVisible)])).toEqual([]);
  });
});

describe("reliefLayers", () => {
  it.each([false, true])("are valid MapLibre layers over a raster-dem source with visible: %s", (visible) => {
    expect(styleErrors({ relief: reliefSource() }, reliefLayers("relief", visible))).toEqual([]);
  });
});
