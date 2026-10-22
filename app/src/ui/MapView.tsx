import "./maplibre-worker";
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import type { Candidate, CutCity } from "../domain/rank";
import stateOutlinesUrl from "../assets/state-outlines.geojson?url";
import { BASEMAP_STYLE_URL } from "./map-style";
import { markerColor, rankedCount } from "./marker-color";

const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-74, -34],
  [-34, 5.5],
];
const OUTLINES_SOURCE = "state-outlines";
const CITIES_SOURCE = "cities";
const CUT_COLOR = "#6b6f78";
const CUT_OPACITY = 0.15;

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e8e6df" } }],
};

function citiesGeoJson(dataset: Dataset, candidates: Candidate[], cut: CutCity[]): FeatureCollection<Point> {
  const { codigo_ibge, latitude, longitude } = dataset.colunas;
  const ranked = rankedCount(candidates);
  return {
    type: "FeatureCollection",
    features: [
      ...cut.map(({ index }) => ({
        type: "Feature" as const,
        properties: { code: codigo_ibge[index], color: CUT_COLOR, order: -1, cut: true },
        geometry: { type: "Point" as const, coordinates: [longitude[index], latitude[index]] },
      })),
      ...candidates.map(({ index, position }) => ({
        type: "Feature" as const,
        properties: {
          code: codigo_ibge[index],
          color: markerColor(position, ranked),
          order: position === null ? 0 : ranked - position + 1,
          cut: false,
        },
        geometry: { type: "Point" as const, coordinates: [longitude[index], latitude[index]] },
      })),
    ],
  };
}

function addDatasetLayers(map: MapLibreMap, dataset: Dataset, candidates: Candidate[], cut: CutCity[]) {
  map.addSource(OUTLINES_SOURCE, { type: "geojson", data: stateOutlinesUrl });
  map.addLayer({
    id: "state-outlines",
    type: "line",
    source: OUTLINES_SOURCE,
    paint: { "line-color": "#6b6f78", "line-width": 1 },
  });
  map.addSource(CITIES_SOURCE, { type: "geojson", data: citiesGeoJson(dataset, candidates, cut) });
  map.addLayer({
    id: "cities",
    type: "circle",
    source: CITIES_SOURCE,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["get", "color"],
      "circle-opacity": ["case", ["get", "cut"], CUT_OPACITY, 0.8],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 8, 4],
    },
  });
}

type MapViewProps = { dataset: Dataset; candidates: Candidate[]; cut: CutCity[]; onSelect: (code: string) => void };

export function MapView({ dataset, candidates, cut, onSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef({ candidates, cut });
  latest.current = { candidates, cut };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: container.current!,
        style: BASEMAP_STYLE_URL,
        bounds: BRAZIL_BOUNDS,
        fitBoundsOptions: { padding: 20 },
      });
    } catch {
      setUnavailable(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

    let basemapLoaded = false;
    map.on("load", () => {
      basemapLoaded = true;
      addDatasetLayers(map, dataset, latest.current.candidates, latest.current.cut);
    });
    // The basemap is context only (ADR 0001): if its style cannot be fetched, keep the dataset layers over a blank background.
    map.on("error", (event) => {
      if (basemapLoaded || (event as { sourceId?: string }).sourceId) return;
      basemapLoaded = true;
      map.once("style.load", () => addDatasetLayers(map, dataset, latest.current.candidates, latest.current.cut));
      map.setStyle(BLANK_STYLE);
    });

    map.on("click", "cities", (event) => {
      const code = event.features?.[0]?.properties?.code;
      if (typeof code === "string") onSelectRef.current(code);
    });
    map.on("mouseenter", "cities", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "cities", () => (map.getCanvas().style.cursor = ""));

    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current!);
    return () => {
      resize.disconnect();
      mapRef.current = null;
      map.remove();
    };
  }, [dataset]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(CITIES_SOURCE);
    source?.setData(citiesGeoJson(dataset, candidates, cut));
  }, [dataset, candidates, cut]);

  return (
    <div className="map" ref={container}>
      {unavailable && (
        <p className="notice" role="alert">
          Não foi possível iniciar o mapa neste navegador (é preciso WebGL). A tabela continua disponível.
        </p>
      )}
    </div>
  );
}
