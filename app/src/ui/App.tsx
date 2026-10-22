import { useCallback, useMemo, useState } from "react";
import { cityDetail } from "../domain/city-detail";
import { rank } from "../domain/rank";
import { createInitialSession, toggleCategory } from "../domain/session";
import type { Dataset } from "../domain/dataset";
import { CityDrawer } from "./CityDrawer";
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
  const result = useMemo(() => rank(dataset, session), [dataset, session]);
  const { candidates, cut, cutCounts } = result;
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ code: string } | null>(null);
  const detail = useMemo(
    () => (selectedCode ? cityDetail(dataset, session, result, selectedCode) : null),
    [dataset, session, result, selectedCode],
  );
  const closeDetail = useCallback(() => setSelectedCode(null), []);
  const selectFromMap = useCallback((code: string) => {
    setSelectedCode(code);
    setReveal({ code });
  }, []);
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
        top={
          <>
            <MapView dataset={dataset} candidates={candidates} cut={cut} onSelect={selectFromMap} />
            {detail && <CityDrawer dataset={dataset} detail={detail} onClose={closeDetail} />}
          </>
        }
        bottom={
          <RankTable
            dataset={dataset}
            candidates={candidates}
            categories={session.categories}
            selectedCode={selectedCode}
            reveal={reveal}
            onSelect={setSelectedCode}
          />
        }
      />
    </div>
  );
}
