import { useMemo, useState } from "react";
import { rank } from "../domain/rank";
import { createInitialSession } from "../domain/session";
import type { Dataset } from "../domain/dataset";
import { MapView } from "./MapView";
import { RankTable } from "./RankTable";
import { Sidebar } from "./Sidebar";
import { SplitPane } from "./SplitPane";
import { useDataset } from "./useDataset";

export function App() {
  const state = useDataset();
  if (state.status === "loading") return <p className="notice">Carregando os municípios…</p>;
  if (state.status === "error") {
    return (
      <p className="notice error" role="alert">
        {state.message}
      </p>
    );
  }
  return <Workspace dataset={state.dataset} />;
}

function Workspace({ dataset }: { dataset: Dataset }) {
  const [session] = useState(() => createInitialSession(dataset));
  const { candidates } = useMemo(() => rank(dataset, session), [dataset, session]);
  return (
    <div className="app">
      <Sidebar session={session} collectedOn={dataset.coleta} />
      <SplitPane
        top={<MapView dataset={dataset} />}
        bottom={<RankTable candidates={candidates} />}
      />
    </div>
  );
}
