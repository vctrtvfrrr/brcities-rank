import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import { citiesLayer } from "./cities-layer";

describe("citiesLayer", () => {
  it("is a valid MapLibre layer", () => {
    const errors = validateStyleMin({
      version: 8,
      sources: { cities: { type: "geojson", data: { type: "FeatureCollection", features: [] } } },
      layers: [citiesLayer("cities")],
    } as never);
    expect(errors.map((e) => e.message)).toEqual([]);
  });
});
