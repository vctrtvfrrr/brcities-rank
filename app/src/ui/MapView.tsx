import "./maplibre-worker";
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import type { Candidate } from "../domain/rank";
import stateOutlinesUrl from "../assets/state-outlines.geojson?url";
import { BASEMAP_STYLE_URL } from "./map-style";
import { markerColor, rankedCount } from "./marker-color";

const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-74, -34],
  [-34, 5.5],
];
const OUTLINES_SOURCE = "state-outlines";
const CITIES_SOURCE = "cities";

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e8e6df" } }],
};

function citiesGeoJson(dataset: Dataset, candidates: Candidate[]): FeatureCollection<Point> {
  const { codigo_ibge, latitude, longitude } = dataset.colunas;
  const ranked = rankedCount(candidates);
  return {
    type: "FeatureCollection",
    features: candidates.map(({ index, position }) => ({
      type: "Feature",
      properties: {
        code: codigo_ibge[index],
        color: markerColor(position, ranked),
        order: position === null ? 0 : ranked - position + 1,
      },
      geometry: { type: "Point", coordinates: [longitude[index], latitude[index]] },
    })),
  };
}

function addDatasetLayers(map: MapLibreMap, dataset: Dataset, candidates: Candidate[]) {
  map.addSource(OUTLINES_SOURCE, { type: "geojson", data: stateOutlinesUrl });
  map.addLayer({
    id: "state-outlines",
    type: "line",
    source: OUTLINES_SOURCE,
    paint: { "line-color": "#6b6f78", "line-width": 1 },
  });
  map.addSource(CITIES_SOURCE, { type: "geojson", data: citiesGeoJson(dataset, candidates) });
  map.addLayer({
    id: "cities",
    type: "circle",
    source: CITIES_SOURCE,
    layout: { "circle-sort-key": ["get", "order"] },
    paint: {
      "circle-color": ["get", "color"],
      "circle-opacity": 0.8,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 8, 4],
    },
  });
}

export function MapView({ dataset, candidates }: { dataset: Dataset; candidates: Candidate[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef(candidates);
  latest.current = candidates;

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
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    let basemapLoaded = false;
    map.on("load", () => {
      basemapLoaded = true;
      addDatasetLayers(map, dataset, latest.current);
    });
    // The basemap is context only (ADR 0001): if its style cannot be fetched, keep the dataset layers over a blank background.
    map.on("error", (event) => {
      if (basemapLoaded || (event as { sourceId?: string }).sourceId) return;
      basemapLoaded = true;
      map.once("style.load", () => addDatasetLayers(map, dataset, latest.current));
      map.setStyle(BLANK_STYLE);
    });

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
    source?.setData(citiesGeoJson(dataset, candidates));
  }, [dataset, candidates]);

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
