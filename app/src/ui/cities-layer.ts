import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";

export const CUT_COLOR = "#c3c6cc";
export const SELECTED_COLOR = "#6a1b9a";
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
  const selected: ExpressionSpecification = ["get", "selected"];
  return {
    id: "cities",
    type: "circle",
    source,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["case", selected, SELECTED_COLOR, ["get", "color"]],
      "circle-stroke-color": HALO_COLOR,
      "circle-stroke-width": byZoom(["case", selected, 1.5, 0], ["case", selected, 2, cut, 0, 0.75]),
      "circle-radius": byZoom(["case", selected, 5, firstTen, 2.5, 1.5], ["case", selected, 10, firstTen, 5.5, 4]),
    },
  };
}
