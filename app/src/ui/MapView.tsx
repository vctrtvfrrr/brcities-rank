import "./maplibre-worker";
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import { isAmongFirstTen, type Candidate, type CutCity } from "../domain/rank";
import stateOutlinesUrl from "../assets/state-outlines.geojson?url";
import { citiesLayer, CUT_COLOR } from "./cities-layer";
import { BASEMAP_STYLE_URL } from "./map-style";
import { FIRST_TEN_COLOR, markerColor, rankedCount } from "./marker-color";

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

// The selected city is drawn above every other marker.
const SELECTED_ORDER = Number.MAX_SAFE_INTEGER;

function citiesGeoJson(
  dataset: Dataset,
  candidates: Candidate[],
  cut: CutCity[],
  selectedCode: string | null,
): FeatureCollection<Point> {
  const { codigo_ibge, latitude, longitude } = dataset.colunas;
  const ranked = rankedCount(candidates);
  return {
    type: "FeatureCollection",
    features: [
      ...cut.map(({ index }) => {
        const code = codigo_ibge[index];
        const selected = code === selectedCode;
        return {
          type: "Feature" as const,
          properties: {
            code,
            color: CUT_COLOR,
            order: selected ? SELECTED_ORDER : -1,
            cut: true,
            firstTen: false,
            selected,
          },
          geometry: { type: "Point" as const, coordinates: [longitude[index], latitude[index]] },
        };
      }),
      ...candidates.map((candidate) => {
        const { index, position } = candidate;
        const firstTen = isAmongFirstTen(candidate);
        const code = codigo_ibge[index];
        const selected = code === selectedCode;
        return {
          type: "Feature" as const,
          properties: {
            code,
            color: firstTen ? FIRST_TEN_COLOR : markerColor(position, ranked),
            order: selected ? SELECTED_ORDER : position === null ? 0 : ranked - position + 1,
            cut: false,
            firstTen,
            selected,
          },
          geometry: { type: "Point" as const, coordinates: [longitude[index], latitude[index]] },
        };
      }),
    ],
  };
}

type Markers = { candidates: Candidate[]; cut: CutCity[]; selectedCode: string | null };

function addDatasetLayers(map: MapLibreMap, dataset: Dataset, { candidates, cut, selectedCode }: Markers) {
  map.addSource(OUTLINES_SOURCE, { type: "geojson", data: stateOutlinesUrl });
  map.addLayer({
    id: "state-outlines",
    type: "line",
    source: OUTLINES_SOURCE,
    paint: { "line-color": "#5d616a", "line-width": 1 },
  });
  map.addSource(CITIES_SOURCE, { type: "geojson", data: citiesGeoJson(dataset, candidates, cut, selectedCode) });
  map.addLayer(citiesLayer(CITIES_SOURCE));
}

type MapViewProps = Markers & { dataset: Dataset; onSelect: (code: string) => void };

export function MapView({ dataset, candidates, cut, selectedCode, onSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef<Markers>({ candidates, cut, selectedCode });
  latest.current = { candidates, cut, selectedCode };
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
      addDatasetLayers(map, dataset, latest.current);
    });
    // The basemap is context only (ADR 0001): if its style cannot be fetched, keep the dataset layers over a blank background.
    map.on("error", (event) => {
      if (basemapLoaded || (event as { sourceId?: string }).sourceId) return;
      basemapLoaded = true;
      map.once("style.load", () => addDatasetLayers(map, dataset, latest.current));
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
    source?.setData(citiesGeoJson(dataset, candidates, cut, selectedCode));
  }, [dataset, candidates, cut, selectedCode]);

  return (
    <div className="map" ref={container} role="region" aria-label="Mapa das cidades" aria-describedby="map-description">
      <p id="map-description" className="visually-hidden">
        {`${candidates.length} candidatas em tons de verde, mais escuro quanto melhor a posição, com as dez primeiras em vermelho e um pouco maiores, e ${cut.length} cidades cortadas em cinza-claro; a cidade aberta no detalhe fica em roxo e bem maior. Os marcadores não recebem foco: use a tabela, ou a busca de cidade na barra lateral (que inclui as cortadas), para abrir o detalhe de uma cidade. As setas movem o mapa e + e − dão zoom.`}
      </p>
      {unavailable && (
        <p className="notice" role="alert">
          Não foi possível iniciar o mapa neste navegador (é preciso WebGL). A tabela continua disponível.
        </p>
      )}
    </div>
  );
}
