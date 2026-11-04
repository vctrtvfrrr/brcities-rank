import type { CircleLayerSpecification, ExpressionSpecification } from "maplibre-gl";

export const CITIES_LAYER = "cities";
export const CUT_COLOR = "#7d7d7d";
export const SELECTED_COLOR = "#6a1b9a";
const HALO_COLOR = "#ffffff";

const cut: ExpressionSpecification = ["get", "cut"];
const firstTen: ExpressionSpecification = ["get", "firstTen"];
const selected: ExpressionSpecification = ["get", "selected"];

function byZoom(low: ExpressionSpecification, high: ExpressionSpecification): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 4, low, 8, high];
}

export function haloWidth(reliefVisible: boolean): ExpressionSpecification {
  return reliefVisible
    ? byZoom(["case", selected, 1.5, 0.75], ["case", selected, 2, 0.75])
    : byZoom(["case", selected, 1.5, 0], ["case", selected, 2, cut, 0, 0.75]);
}

export function citiesLayer(source: string, reliefVisible: boolean): CircleLayerSpecification {
  return {
    id: CITIES_LAYER,
    type: "circle",
    source,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["case", selected, SELECTED_COLOR, ["get", "color"]],
      "circle-stroke-color": HALO_COLOR,
      "circle-stroke-width": haloWidth(reliefVisible),
      "circle-radius": byZoom(
        ["case", selected, 5, firstTen, 2.5, cut, 1.25, 1.5],
        ["case", selected, 10, firstTen, 5.5, cut, 3, 4],
      ),
    },
  };
}
