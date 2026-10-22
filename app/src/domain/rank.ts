import type { Dataset } from "./dataset";
import type { Session } from "./session";

export type Candidate = {
  index: number;
  code: string;
  name: string;
  uf: string;
  position: number | null;
  score: number | null;
};

export type RankResult = { candidates: Candidate[] };

const collator = new Intl.Collator("pt-BR");

export function rank(dataset: Dataset, _session: Session): RankResult {
  const { codigo_ibge, nome, uf, populacao_2026 } = dataset.colunas;
  const candidates = codigo_ibge.map<Candidate>((code, index) => ({
    index,
    code,
    name: nome[index],
    uf: uf[index],
    position: null,
    score: null,
  }));
  candidates.sort(
    (a, b) =>
      collator.compare(a.name, b.name) ||
      populacao_2026[b.index] - populacao_2026[a.index] ||
      Number(a.code) - Number(b.code),
  );
  return { candidates };
}
