import type { Dataset } from "./dataset";

export type CityMatch = { code: string; name: string; uf: string };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function searchCities(dataset: Dataset, query: string, limit = 8): CityMatch[] {
  const wanted = normalize(query);
  if (wanted === "") return [];
  const { codigo_ibge, nome, uf } = dataset.colunas;
  const starts: CityMatch[] = [];
  const contains: CityMatch[] = [];
  nome.forEach((name, i) => {
    const at = normalize(name).indexOf(wanted);
    if (at < 0) return;
    (at === 0 ? starts : contains).push({ code: codigo_ibge[i], name, uf: uf[i] });
  });
  return [...starts, ...contains].slice(0, limit);
}
