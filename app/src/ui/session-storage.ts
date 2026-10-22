import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import { parseSession, serializeSession } from "../domain/session-file";

const STORAGE_KEY = "brcities-rank:session";
const REJECTED_KEY = "brcities-rank:session:rejected";

function parseStored(dataset: Dataset, text: string | null): Session | null {
  if (text === null) return null;
  const result = parseSession(dataset, text);
  if (result.ok) return result.session;
  try {
    localStorage.setItem(REJECTED_KEY, text);
  } catch {
    // Keeping a copy is best effort.
  }
  return null;
}

export function loadStoredSession(dataset: Dataset): Session | null {
  try {
    return parseStored(dataset, localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function storeSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSession(session));
  } catch {
    // Storage can be unavailable or full; the Session keeps working in memory.
  }
}

export function watchStoredSession(dataset: Dataset, onChange: (session: Session) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || event.storageArea !== localStorage) return;
    const session = parseStored(dataset, event.newValue);
    if (session) onChange(session);
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
