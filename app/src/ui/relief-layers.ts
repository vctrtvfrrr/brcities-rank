import type {
  ColorReliefLayerSpecification,
  ExpressionSpecification,
  HillshadeLayerSpecification,
  RasterDEMSourceSpecification,
} from "maplibre-gl";
import { RELIEF_TILES_URL } from "./map-style";

export type ReliefStop = { elevation: number; color: string };

export const RELIEF_PALETTE: ReliefStop[] = [
  { elevation: 0, color: "#bfe2aa" },
  { elevation: 100, color: "#d0eaae" },
  { elevation: 250, color: "#e2efb0" },
  { elevation: 450, color: "#f3eaa8" },
  { elevation: 700, color: "#f0dca4" },
  { elevation: 1000, color: "#ebd2a6" },
  { elevation: 1500, color: "#e6d0b8" },
  { elevation: 2200, color: "#efe8e1" },
  { elevation: 3000, color: "#ffffff" },
];

const SEA = "rgba(0, 0, 0, 0)";
const RELIEF_ATTRIBUTION =
  'Relevo: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen Terrain Tiles</a> (SRTM e outras fontes)';

export const RELIEF_LAYER_IDS = ["relief-color", "relief-shade"];

export function reliefSource(): RasterDEMSourceSpecification {
  return {
    type: "raster-dem",
    tiles: [RELIEF_TILES_URL],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 12,
    attribution: RELIEF_ATTRIBUTION,
  };
}

export function reliefVisibility(visible: boolean): "visible" | "none" {
  return visible ? "visible" : "none";
}

export function reliefLayers(
  source: string,
  visible: boolean,
): [ColorReliefLayerSpecification, HillshadeLayerSpecification] {
  const [colorId, shadeId] = RELIEF_LAYER_IDS;
  const layout = { visibility: reliefVisibility(visible) };
  const colorByElevation: ExpressionSpecification = [
    "interpolate",
    ["linear"],
    ["elevation"],
    -1,
    SEA,
    ...RELIEF_PALETTE.flatMap(({ elevation, color }) => [elevation, color]),
  ];
  return [
    { id: colorId, type: "color-relief", source, layout, paint: { "color-relief-color": colorByElevation } },
    {
      id: shadeId,
      type: "hillshade",
      source,
      layout,
      paint: {
        "hillshade-shadow-color": "rgba(0, 0, 0, 0.3)",
        "hillshade-highlight-color": "rgba(255, 255, 255, 0.15)",
        "hillshade-accent-color": "rgba(0, 0, 0, 0.1)",
      },
    },
  ];
}
