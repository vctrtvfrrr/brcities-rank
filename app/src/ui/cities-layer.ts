import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";

export const CUT_COLOR = "#5d616a";
const HALO_COLOR = "#ffffff";

export function citiesLayer(source: string): CircleLayerSpecification {
  const byZoom = (low: ExpressionSpecification, high: ExpressionSpecification): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    low,
    8,
    high,
  ];
  const cut: ExpressionSpecification = ["get", "cut"];
  return {
    id: "cities",
    type: "circle",
    source,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["case", cut, "rgba(0,0,0,0)", ["get", "color"]],
      "circle-stroke-color": ["case", cut, CUT_COLOR, HALO_COLOR],
      "circle-stroke-width": byZoom(["case", cut, 1, 0], ["case", cut, 1, 0.75]),
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 8, 4],
    },
  };
}
