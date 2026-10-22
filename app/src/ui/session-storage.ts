import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import { parseSession, serializeSession } from "../domain/session-file";

const STORAGE_KEY = "brcities-rank:session";

export function loadStoredSession(dataset: Dataset): Session | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null) return null;
    const result = parseSession(dataset, text);
    return result.ok ? result.session : null;
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
