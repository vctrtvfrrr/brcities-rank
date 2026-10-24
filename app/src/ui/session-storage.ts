import type { Dataset } from "../domain/dataset";
import { createLibrary, parseLibrary, serializeLibrary, type Library } from "../domain/session-library";
import { parseSession } from "../domain/session-file";

const STORAGE_KEY = "brcities-rank:sessions";
const LEGACY_KEY = "brcities-rank:session";
const REJECTED_KEY = "brcities-rank:session:rejected";

function keepRejected(rejected: unknown[]) {
  if (rejected.length === 0) return;
  try {
    localStorage.setItem(REJECTED_KEY, JSON.stringify(rejected));
  } catch {
    // Keeping a copy is best effort.
  }
}

function parseStored(dataset: Dataset, text: string | null): Library | null {
  if (text === null) return null;
  const { library, rejected } = parseLibrary(dataset, text);
  keepRejected(rejected);
  return library;
}

// Before the Library, the browser kept a single Session under another key.
function loadLegacy(dataset: Dataset): Library | null {
  const text = localStorage.getItem(LEGACY_KEY);
  if (text === null) return null;
  const result = parseSession(dataset, text);
  if (!result.ok) {
    keepRejected([text]);
    return null;
  }
  return createLibrary(result.session);
}

export function loadStoredLibrary(dataset: Dataset): Library | null {
  try {
    return parseStored(dataset, localStorage.getItem(STORAGE_KEY)) ?? loadLegacy(dataset);
  } catch {
    return null;
  }
}

export function storeLibrary(library: Library): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeLibrary(library));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage can be unavailable or full; the Sessions keep working in memory.
  }
}

export function watchStoredLibrary(dataset: Dataset, onChange: (library: Library) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || event.storageArea !== localStorage) return;
    const library = parseStored(dataset, event.newValue);
    if (library) onChange(library);
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
