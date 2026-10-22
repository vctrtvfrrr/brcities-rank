import { SUPPORTED_CONTRACT_VERSION, type Dataset } from "./dataset";

export class UnsupportedContractVersionError extends Error {
  override name = "UnsupportedContractVersionError";

  constructor(readonly version: unknown) {
    super(`Unsupported dataset contract version: ${String(version)}`);
  }
}

export async function loadDataset(url: string, fetchImpl: typeof fetch = fetch): Promise<Dataset> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Failed to fetch the dataset (HTTP ${response.status})`);
  const payload = await response.json();
  if (payload?.versao !== SUPPORTED_CONTRACT_VERSION) throw new UnsupportedContractVersionError(payload?.versao);
  return payload as Dataset;
}
