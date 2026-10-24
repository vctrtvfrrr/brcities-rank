import type { Dataset } from "./dataset";
import { createInitialSession, type Session } from "./session";
import { hasOwnSession, parseSession, serializeSession } from "./session-file";

// The browser keeps several Sessions, and the name is what tells them apart.
export type Library = { activeName: string; sessions: Session[] };

export const NEW_SESSION_NAME = "Nova Sessão";

export function createLibrary(session: Session): Library {
  return { activeName: session.name, sessions: [session] };
}

export function activeSession(library: Library): Session {
  return library.sessions.find((s) => s.name === library.activeName) ?? library.sessions[0];
}

export function findSession(library: Library, name: string): Session | undefined {
  return library.sessions.find((s) => s.name === name);
}

export function updateActive(library: Library, update: (session: Session) => Session): Library {
  const active = activeSession(library);
  const next = update(active);
  if (next === active) return library;
  return {
    activeName: next.name,
    sessions: library.sessions.map((s) => (s === active ? next : s)),
  };
}

export function isNameTaken(library: Library, name: string): boolean {
  return name !== activeSession(library).name && library.sessions.some((s) => s.name === name);
}

export function switchSession(library: Library, name: string): Library {
  return findSession(library, name) ? { ...library, activeName: name } : library;
}

function unusedName(library: Library): string {
  for (let n = 1; ; n++) {
    const name = n === 1 ? NEW_SESSION_NAME : `${NEW_SESSION_NAME} ${n}`;
    if (!findSession(library, name)) return name;
  }
}

export function addBlankSession(dataset: Dataset, library: Library): Library {
  const session = { ...createInitialSession(dataset), name: unusedName(library) };
  return { activeName: session.name, sessions: [...library.sessions, session] };
}

export function removeActive(dataset: Dataset, library: Library): Library {
  const active = activeSession(library);
  const sessions = library.sessions.filter((s) => s !== active);
  if (sessions.length === 0) return createLibrary(createInitialSession(dataset));
  return { activeName: sessions[0].name, sessions };
}

// Puts an incoming Session (from a file or a link) in the Library: it replaces the one with the same name, or joins as a new one.
export function adoptSession(library: Library, session: Session): Library {
  const replaced = findSession(library, session.name);
  const sessions = replaced
    ? library.sessions.map((s) => (s === replaced ? session : s))
    : [...library.sessions, session];
  return { activeName: session.name, sessions };
}

// Adopting asks first only when it would overwrite a Session with the same name that has something different in it.
export function adoptionOverwrites(dataset: Dataset, library: Library, session: Session): boolean {
  const current = findSession(library, session.name);
  if (!current) return false;
  return serializeSession(current) !== serializeSession(session) && hasOwnSession(dataset, { ...current, name: "" });
}

export function serializeLibrary(library: Library): string {
  return JSON.stringify(library);
}

// Reads a stored Library, keeping each valid Session and the first of any repeated name; rejected holds the Sessions that failed.
export function parseLibrary(dataset: Dataset, text: string): { library: Library | null; rejected: unknown[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { library: null, rejected: [text] };
  }
  const entry = raw as { activeName?: unknown; sessions?: unknown };
  if (!Array.isArray(entry?.sessions)) return { library: null, rejected: [raw] };
  const sessions: Session[] = [];
  const rejected: unknown[] = [];
  for (const item of entry.sessions) {
    const result = parseSession(dataset, JSON.stringify(item));
    if (!result.ok) rejected.push(item);
    else if (!findSession({ activeName: "", sessions }, result.session.name)) sessions.push(result.session);
  }
  if (sessions.length === 0) return { library: null, rejected };
  const activeName = typeof entry.activeName === "string" ? entry.activeName : sessions[0].name;
  return { library: switchSession({ activeName: sessions[0].name, sessions }, activeName), rejected };
}
