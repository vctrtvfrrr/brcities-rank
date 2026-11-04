import "./maplibre-worker";
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import { isAmongFirstTen, type Candidate, type CutCity } from "../domain/rank";
import stateOutlinesUrl from "../assets/state-outlines.geojson?url";
import { CITIES_LAYER, citiesLayer, CUT_COLOR, haloWidth } from "./cities-layer";
import { BASEMAP_STYLE_URL, STATE_OUTLINE_COLOR } from "./map-style";
import { FIRST_TEN_COLOR, markerColor, rankedCount } from "./marker-color";
import { ReliefLegend } from "./ReliefLegend";
import { RELIEF_LAYER_IDS, reliefInsertionLayer, reliefLayers, reliefSource, reliefVisibility } from "./relief-layers";

const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-74, -34],
  [-34, 5.5],
];
const OUTLINES_SOURCE = "state-outlines";
const CITIES_SOURCE = "cities";
const RELIEF_SOURCE = "relief";

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
type MapContent = Markers & { reliefVisible: boolean };

function addReliefLayers(map: MapLibreMap, visible: boolean) {
  const below = reliefInsertionLayer(map.getStyle().layers);
  map.addSource(RELIEF_SOURCE, reliefSource());
  for (const layer of reliefLayers(RELIEF_SOURCE, visible)) map.addLayer(layer, below);
}

function addDatasetLayers(map: MapLibreMap, dataset: Dataset, content: MapContent) {
  const { candidates, cut, selectedCode, reliefVisible } = content;
  addReliefLayers(map, reliefVisible);
  map.addSource(OUTLINES_SOURCE, { type: "geojson", data: stateOutlinesUrl });
  map.addLayer({
    id: "state-outlines",
    type: "line",
    source: OUTLINES_SOURCE,
    paint: { "line-color": STATE_OUTLINE_COLOR, "line-width": 1 },
  });
  map.addSource(CITIES_SOURCE, { type: "geojson", data: citiesGeoJson(dataset, candidates, cut, selectedCode) });
  map.addLayer(citiesLayer(CITIES_SOURCE, reliefVisible));
}

function showRelief(map: MapLibreMap, visible: boolean) {
  if (!map.getLayer(CITIES_LAYER)) return;
  for (const id of RELIEF_LAYER_IDS) map.setLayoutProperty(id, "visibility", reliefVisibility(visible));
  map.setPaintProperty(CITIES_LAYER, "circle-stroke-width", haloWidth(visible));
}

type MapViewProps = MapContent & { dataset: Dataset; onSelect: (code: string) => void };

export function MapView({ dataset, candidates, cut, selectedCode, reliefVisible, onSelect }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [reliefUnavailable, setReliefUnavailable] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef<MapContent>({ candidates, cut, selectedCode, reliefVisible });
  latest.current = { candidates, cut, selectedCode, reliefVisible };
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
    let reliefTileLoaded = false;
    map.on("load", () => {
      basemapLoaded = true;
      addDatasetLayers(map, dataset, latest.current);
    });
    map.on("sourcedata", (event) => {
      if (event.sourceId !== RELIEF_SOURCE || !event.tile) return;
      reliefTileLoaded = true;
      setReliefUnavailable(false);
    });
    // The basemap is context only (ADR 0001): if its style cannot be fetched, keep the dataset layers over a blank background.
    map.on("error", (event) => {
      const { sourceId } = event as { sourceId?: string };
      if (sourceId === RELIEF_SOURCE && !reliefTileLoaded) setReliefUnavailable(true);
      if (basemapLoaded || sourceId) return;
      basemapLoaded = true;
      map.once("style.load", () => addDatasetLayers(map, dataset, latest.current));
      map.setStyle(BLANK_STYLE);
    });

    map.on("click", CITIES_LAYER, (event) => {
      const code = event.features?.[0]?.properties?.code;
      if (typeof code === "string") onSelectRef.current(code);
    });
    map.on("mouseenter", CITIES_LAYER, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", CITIES_LAYER, () => (map.getCanvas().style.cursor = ""));

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

  useEffect(() => {
    if (mapRef.current) showRelief(mapRef.current, reliefVisible);
  }, [reliefVisible]);

  const reliefSentence = reliefVisible
    ? reliefUnavailable
      ? " O relevo deveria aparecer, mas não pôde ser carregado."
      : " O relevo está visível, em cores por altitude do verde das terras baixas ao branco dos picos, com a legenda de altitudes no canto inferior esquerdo."
    : "";

  return (
    <div className="map" ref={container} role="region" aria-label="Mapa das cidades" aria-describedby="map-description">
      <p id="map-description" className="visually-hidden">
        {`${candidates.length} candidatas em tons de azul, do azul-marinho na melhor posição ao azul na pior, com a candidata sem pontuação em azul-acinzentado e as dez primeiras em vermelho e um pouco maiores, e ${cut.length} cidades cortadas em cinza e menores; a cidade aberta no detalhe fica em roxo e bem maior.${reliefSentence} Os marcadores não recebem foco: use a tabela, ou a busca de cidade na barra lateral (que inclui as cortadas), para abrir o detalhe de uma cidade. As setas movem o mapa e + e − dão zoom.`}
      </p>
      {reliefVisible && !unavailable && <ReliefLegend unavailable={reliefUnavailable} />}
      {unavailable && (
        <p className="notice" role="alert">
          Não foi possível iniciar o mapa neste navegador (é preciso WebGL). A tabela continua disponível.
        </p>
      )}
    </div>
  );
}
