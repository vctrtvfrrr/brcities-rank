export const SUPPORTED_CONTRACT_VERSION = 1;

type Cell = string | number | boolean | null;

export type CatalogEntry = {
  chave: string;
  categoria: string;
  rotulo: string;
  unidade: string;
  direcao: "maior" | "menor" | null;
  transformacao: "nenhuma" | "logaritmo";
  pontua: boolean;
  fontes: string[];
};

export type SourceInfo = {
  chave: string;
  nome: string;
  edicao: string;
  ano: string;
  endereco: string;
  credito: string;
};

export type Dataset = {
  versao: number;
  coleta: string;
  fontes: SourceInfo[];
  catalogo: CatalogEntry[];
  colunas: Record<string, Cell[]> & {
    codigo_ibge: string[];
    nome: string[];
    uf: string[];
    latitude: number[];
    longitude: number[];
    populacao_2026: number[];
  };
};
