import "./maplibre-worker";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useRef } from "react";
import type { Dataset } from "../domain/dataset";
import stateOutlinesUrl from "../assets/state-outlines.geojson?url";
import { BASEMAP_STYLE_URL } from "./map-style";

const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-74, -34],
  [-34, 5.5],
];
const OUTLINES_SOURCE = "state-outlines";
const CITIES_SOURCE = "cities";

function citiesGeoJson(dataset: Dataset): FeatureCollection<Point> {
  const { codigo_ibge, latitude, longitude } = dataset.colunas;
  return {
    type: "FeatureCollection",
    features: codigo_ibge.map((code, index) => ({
      type: "Feature",
      properties: { code },
      geometry: { type: "Point", coordinates: [longitude[index], latitude[index]] },
    })),
  };
}

export function MapView({ dataset }: { dataset: Dataset }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current!,
      style: BASEMAP_STYLE_URL,
      bounds: BRAZIL_BOUNDS,
      fitBoundsOptions: { padding: 20 },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource(OUTLINES_SOURCE, { type: "geojson", data: stateOutlinesUrl });
      map.addLayer({
        id: "state-outlines",
        type: "line",
        source: OUTLINES_SOURCE,
        paint: { "line-color": "#6b6f78", "line-width": 1 },
      });
      map.addSource(CITIES_SOURCE, { type: "geojson", data: citiesGeoJson(dataset) });
      map.addLayer({
        id: "cities",
        type: "circle",
        source: CITIES_SOURCE,
        paint: {
          "circle-color": "#1f6f5c",
          "circle-opacity": 0.8,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 8, 4],
        },
      });
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current!);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, [dataset]);

  return <div className="map" ref={container} data-testid="map" />;
}
