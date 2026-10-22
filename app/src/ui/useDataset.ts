import { useEffect, useState } from "react";
import type { Dataset } from "../domain/dataset";
import { loadDataset, UnsupportedContractVersionError } from "../domain/dataset-loader";
import { datasetUrl } from "./dataset-url";

export type DatasetState =
  | { status: "loading" }
  | { status: "ready"; dataset: Dataset }
  | { status: "error"; message: string };

function describeFailure(error: unknown): string {
  if (error instanceof UnsupportedContractVersionError) {
    return `Este dataset usa a versão de contrato ${String(error.version)}, que esta versão do app não conhece. Atualize o app ou gere o dataset de novo.`;
  }
  return "Não foi possível carregar os dados dos municípios. Tente recarregar a página.";
}

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadDataset(datasetUrl).then(
      (dataset) => !cancelled && setState({ status: "ready", dataset }),
      (error) => !cancelled && setState({ status: "error", message: describeFailure(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
