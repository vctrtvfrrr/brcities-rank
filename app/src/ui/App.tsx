import { useCallback, useEffect, useMemo, useState } from "react";
import { cityDetail } from "../domain/city-detail";
import { rank } from "../domain/rank";
import { createInitialSession, setGrade, toggleCategory, type Grade } from "../domain/session";
import type { Dataset } from "../domain/dataset";
import { CityDrawer } from "./CityDrawer";
import { MapView } from "./MapView";
import { RankTable } from "./RankTable";
import { loadStoredSession, storeSession, watchStoredSession } from "./session-storage";
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
  const [session, setSession] = useState(() => loadStoredSession(dataset) ?? createInitialSession(dataset));
  useEffect(() => storeSession(session), [session]);
  useEffect(() => watchStoredSession(dataset, setSession), [dataset]);
  const result = useMemo(() => rank(dataset, session), [dataset, session]);
  const { candidates, cut, cutCounts } = result;
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ code: string } | null>(null);
  const detail = useMemo(
    () => (selectedCode ? cityDetail(dataset, session, result, selectedCode) : null),
    [dataset, session, result, selectedCode],
  );
  const cutCodes = useMemo(() => new Set(cut.map((c) => c.code)), [cut]);
  const closeDetail = useCallback(() => setSelectedCode(null), []);
  const selectFromMap = useCallback((code: string) => {
    setSelectedCode(code);
    setReveal({ code });
  }, []);
  const activeEvaluator = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  const grade = useCallback(
    (id: string, code: string, value: Grade) => setSession((current) => setGrade(current, id, code, value)),
    [],
  );
  return (
    <div className="app">
      <Sidebar
        dataset={dataset}
        session={session}
        cutCounts={cutCounts}
        cutCodes={cutCodes}
        onSelectCity={selectFromMap}
        onChange={setSession}
        onReplaceSession={(next) => {
          setSession(next);
          setSelectedCode(null);
        }}
        onToggleCategory={(id) => setSession((current) => toggleCategory(current, id))}
      />
      <SplitPane
        top={
          <>
            <MapView dataset={dataset} candidates={candidates} cut={cut} onSelect={selectFromMap} />
            {detail && (
              <CityDrawer
                dataset={dataset}
                detail={detail}
                evaluatorName={activeEvaluator.name}
                onClose={closeDetail}
                onGrade={grade}
              />
            )}
          </>
        }
        bottom={
          <RankTable
            dataset={dataset}
            candidates={candidates}
            session={session}
            selectedCode={selectedCode}
            reveal={reveal}
            onSelect={setSelectedCode}
            onGrade={grade}
          />
        }
      />
    </div>
  );
}
