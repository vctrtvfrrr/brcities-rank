import type { Dataset } from "./dataset";

export const fixtureDataset: Dataset = {
  versao: 1,
  coleta: "2026-01-15",
  fontes: [],
  catalogo: [
    { chave: "crime", categoria: "Segurança", rotulo: "Crime", unidade: "/100 mil", direcao: "menor", transformacao: "nenhuma", pontua: true, fontes: [] },
    { chave: "rain", categoria: "Clima", rotulo: "Chuva", unidade: "dias", direcao: "menor", transformacao: "nenhuma", pontua: true, fontes: [] },
    { chave: "heat", categoria: "Clima", rotulo: "Calor", unidade: "°C", direcao: "menor", transformacao: "nenhuma", pontua: true, fontes: [] },
    { chave: "populacao_2026", categoria: "Porte", rotulo: "População", unidade: "hab.", direcao: "maior", transformacao: "logaritmo", pontua: true, fontes: [] },
    { chave: "koppen_beck", categoria: "Clima", rotulo: "Köppen de Beck", unidade: "", direcao: null, transformacao: "nenhuma", pontua: false, fontes: [] },
    { chave: "fibra", categoria: "Internet", rotulo: "Fibra", unidade: "", direcao: null, transformacao: "nenhuma", pontua: false, fontes: [] },
  ],
  colunas: {
    codigo_ibge: ["3550308", "3304557", "1100015", "2927408", "4106902", "2611606"],
    nome: ["São Paulo", "Rio de Janeiro", "Alta Floresta D'Oeste", "Salvador", "Curitiba", "Recife"],
    uf: ["SP", "RJ", "RO", "BA", "PR", "PE"],
    latitude: [-23.55, -22.91, -11.93, -12.97, -25.43, -8.05],
    longitude: [-46.63, -43.2, -62.0, -38.5, -49.27, -34.88],
    crime: [10, 30, null, 20, 5, 40],
    rain: [100, 120, 190, 110, 140, 150],
    heat: [28, 33, 27, 30, 25, 31],
    populacao_2026: [12000000, 6700000, 22000, 2400000, 1900000, 1500000],
    koppen_beck: ["Cfa", "Aw", "Aw", "Af", "Cfb", "As"],
    fibra: [true, true, false, true, true, null],
  },
};

type CityInput = {
  code: string;
  name: string;
  uf?: string;
  population?: number;
  values?: Record<string, number | string | boolean | null>;
};

export function datasetWithCities(cities: CityInput[]): Dataset {
  const criteria = fixtureDataset.catalogo
    .map((entry) => entry.chave)
    .filter((key) => key !== "populacao_2026");
  return {
    ...fixtureDataset,
    colunas: {
      ...Object.fromEntries(criteria.map((key) => [key, cities.map((c) => c.values?.[key] ?? null)])),
      codigo_ibge: cities.map((c) => c.code),
      nome: cities.map((c) => c.name),
      uf: cities.map((c) => c.uf ?? "XX"),
      latitude: cities.map(() => 0),
      longitude: cities.map(() => 0),
      populacao_2026: cities.map((c) => c.population ?? 1000),
    },
  };
}
