import { describe, expect, it } from "vitest";
import { fixtureDataset } from "./fixture-dataset";
import { createInitialSession, toggleCategory } from "./session";
import {
  activeSession,
  addBlankSession,
  adoptionOverwrites,
  adoptSession,
  createLibrary,
  isNameTaken,
  parseLibrary,
  removeActive,
  serializeLibrary,
  switchSession,
  updateActive,
} from "./session-library";

const named = (name: string) => ({ ...createInitialSession(fixtureDataset), name });

describe("Library", () => {
  it("adds blank Sessions under unused names and makes them active", () => {
    let library = createLibrary(named(""));
    library = addBlankSession(fixtureDataset, library);
    library = addBlankSession(fixtureDataset, library);
    expect(library.sessions.map((s) => s.name)).toEqual(["", "Nova Sessão", "Nova Sessão 2"]);
    expect(activeSession(library).name).toBe("Nova Sessão 2");
  });

  it("edits only the active Session, following a rename", () => {
    let library = addBlankSession(fixtureDataset, createLibrary(named("Casa")));
    library = updateActive(library, (s) => ({ ...toggleCategory(s, "Clima"), name: "Praia" }));
    expect(library.activeName).toBe("Praia");
    expect(library.sessions[0]).toEqual(named("Casa"));
  });

  it("tells a taken name apart from the active Session's own", () => {
    const library = addBlankSession(fixtureDataset, createLibrary(named("Casa")));
    expect(isNameTaken(library, "Casa")).toBe(true);
    expect(isNameTaken(library, "Nova Sessão")).toBe(false);
    expect(isNameTaken(library, "Outra")).toBe(false);
  });

  it("switches only to a Session that exists", () => {
    const library = addBlankSession(fixtureDataset, createLibrary(named("Casa")));
    expect(switchSession(library, "Casa").activeName).toBe("Casa");
    expect(switchSession(library, "Nada")).toBe(library);
  });

  it("leaves a blank Session when the last one is removed", () => {
    const library = removeActive(fixtureDataset, createLibrary(toggleCategory(named("Casa"), "Clima")));
    expect(library.sessions).toEqual([createInitialSession(fixtureDataset)]);
  });

  it("adopts a Session by name: replacing the one with the same name, or joining the others", () => {
    const library = createLibrary(named("Casa"));
    const praia = named("Praia");
    expect(adoptSession(library, praia).sessions).toEqual([named("Casa"), praia]);
    const casa = toggleCategory(named("Casa"), "Clima");
    expect(adoptSession(library, casa)).toEqual({ activeName: "Casa", sessions: [casa] });
  });

  it("asks before adopting only when a Session with the same name has something else in it", () => {
    const library = createLibrary(toggleCategory(named("Casa"), "Clima"));
    expect(adoptionOverwrites(fixtureDataset, library, named("Praia"))).toBe(false);
    expect(adoptionOverwrites(fixtureDataset, library, library.sessions[0])).toBe(false);
    expect(adoptionOverwrites(fixtureDataset, library, named("Casa"))).toBe(true);
    expect(adoptionOverwrites(fixtureDataset, createLibrary(named("Casa")), library.sessions[0])).toBe(false);
  });

  it("round-trips through storage, dropping invalid Sessions and repeated names", () => {
    const library = adoptSession(createLibrary(named("Casa")), toggleCategory(named("Praia"), "Clima"));
    expect(parseLibrary(fixtureDataset, serializeLibrary(library))).toEqual({ library, rejected: [] });
    const raw = JSON.parse(serializeLibrary(library));
    raw.sessions.push({ version: 99 }, named("Casa"));
    const { library: parsed, rejected } = parseLibrary(fixtureDataset, JSON.stringify(raw));
    expect(parsed).toEqual(library);
    expect(rejected).toEqual([{ version: 99 }]);
    expect(parseLibrary(fixtureDataset, "nada").library).toBeNull();
  });
});
