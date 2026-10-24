import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cityDetail } from "../domain/city-detail";
import { rank } from "../domain/rank";
import { createInitialSession, setGrade, toggleCategory, type Grade, type Session } from "../domain/session";
import type { Dataset } from "../domain/dataset";
import {
  activeSession,
  adoptionOverwrites,
  adoptSession,
  createLibrary,
  switchSession,
  updateActive,
  type Library,
} from "../domain/session-library";
import { decodeSessionLink, sessionLinkPayload } from "../domain/session-link";
import { CityDrawer } from "./CityDrawer";
import { MapView } from "./MapView";
import { RankTable } from "./RankTable";
import { loadStoredLibrary, storeLibrary, watchStoredLibrary } from "./session-storage";
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
  const [library, setLibrary] = useState(
    () => loadStoredLibrary(dataset) ?? createLibrary(createInitialSession(dataset)),
  );
  useEffect(() => storeLibrary(library), [library]);
  // Another tab may change the Sessions; this tab stays on its own active Session while it exists.
  useEffect(
    () => watchStoredLibrary(dataset, (next) => setLibrary((current) => switchSession(next, current.activeName))),
    [dataset],
  );
  const session = activeSession(library);
  const setSession = useCallback(
    (update: (session: Session) => Session) => setLibrary((current) => updateActive(current, update)),
    [],
  );
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
  const replaceLibrary = useCallback((next: Library) => {
    setLibrary(next);
    setSelectedCode(null);
  }, []);
  const adopt = useCallback(
    (incoming: Session) => {
      const overwrites = adoptionOverwrites(dataset, library, incoming);
      const label = incoming.name || "Sessão sem nome";
      if (
        overwrites &&
        !window.confirm(`Já existe a Sessão "${label}" neste navegador. Substituí-la inteira, sem mesclar?`)
      ) {
        return false;
      }
      replaceLibrary(adoptSession(library, incoming));
      return true;
    },
    [dataset, library, replaceLibrary],
  );
  useSessionLink(dataset, adopt);
  const activeEvaluator = session.evaluators.find((e) => e.id === session.activeEvaluatorId)!;
  const grade = useCallback(
    (id: string, code: string, value: Grade) => setSession((current) => setGrade(current, id, code, value)),
    [setSession],
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
        library={library}
        onReplaceLibrary={replaceLibrary}
        onAdoptSession={adopt}
        onToggleCategory={(id) => setSession((current) => toggleCategory(current, id))}
      />
      <SplitPane
        top={
          <>
            <MapView
              dataset={dataset}
              candidates={candidates}
              cut={cut}
              selectedCode={selectedCode}
              onSelect={selectFromMap}
            />
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

// Opens the Session carried by a shared link, on load and whenever the fragment changes, then clears the fragment.
function useSessionLink(dataset: Dataset, adopt: (session: Session) => boolean) {
  const adoptRef = useRef(adopt);
  adoptRef.current = adopt;
  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      const payload = sessionLinkPayload(window.location.hash);
      if (payload === null) return;
      const result = await decodeSessionLink(dataset, payload);
      if (cancelled) return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (result.ok) adoptRef.current(result.session);
      else window.alert(`Não foi possível abrir a Sessão do link. ${result.reason}`);
    };
    void open();
    const onHashChange = () => void open();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [dataset]);
}
