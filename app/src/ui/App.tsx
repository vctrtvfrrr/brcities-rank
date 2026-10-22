import { useMemo, useState } from "react";
import { rank } from "../domain/rank";
import { createInitialSession, toggleCategory } from "../domain/session";
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
  const [session, setSession] = useState(() => createInitialSession(dataset));
  const { candidates, cut, cutCounts } = useMemo(() => rank(dataset, session), [dataset, session]);
  return (
    <div className="app">
      <Sidebar
        dataset={dataset}
        session={session}
        cutCounts={cutCounts}
        onChange={setSession}
        onToggleCategory={(id) => setSession((current) => toggleCategory(current, id))}
      />
      <SplitPane
        top={<MapView dataset={dataset} candidates={candidates} cut={cut} />}
        bottom={<RankTable candidates={candidates} categories={session.categories} />}
      />
    </div>
  );
}
