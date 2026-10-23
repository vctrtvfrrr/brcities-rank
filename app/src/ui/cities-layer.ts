import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";

export const CUT_COLOR = "#c3c6cc";
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
  const firstTen: ExpressionSpecification = ["get", "firstTen"];
  return {
    id: "cities",
    type: "circle",
    source,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["get", "color"],
      "circle-stroke-color": HALO_COLOR,
      "circle-stroke-width": byZoom(["literal", 0], ["case", cut, 0, 0.75]),
      "circle-radius": byZoom(["case", firstTen, 2.5, 1.5], ["case", firstTen, 5.5, 4]),
    },
  };
}
