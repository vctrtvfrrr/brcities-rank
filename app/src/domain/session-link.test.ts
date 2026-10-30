import { describe, expect, it } from "vitest";
import { addConstraint, editConstraint } from "./constraints";
import { fixtureDataset } from "./fixture-dataset";
import { createInitialSession, toggleCategory } from "./session";
import { decodeSessionLink, encodeSessionLink, sessionLinkPayload } from "./session-link";

describe("session link", () => {
  it("round-trips a Session through the URL fragment", async () => {
    const session = { ...toggleCategory(createInitialSession(fixtureDataset), "Clima"), name: "Família Silva" };
    const fragment = await encodeSessionLink(session);
    expect(fragment).toMatch(/^sessao=[A-Za-z0-9_-]+$/);
    const payload = sessionLinkPayload(`#${fragment}`)!;
    expect(await decodeSessionLink(fixtureDataset, payload)).toEqual({ ok: true, session });
  });

  it("finds no Session in a fragment without one", () => {
    expect(sessionLinkPayload("")).toBeNull();
    expect(sessionLinkPayload("#outra=1")).toBeNull();
  });

  it("refuses a corrupted link", async () => {
    const result = await decodeSessionLink(fixtureDataset, "abc");
    expect(result.ok).toBe(false);
  });
});

it("carries terrain constraints in a Session link and refuses an unknown class", async () => {
  let session = createInitialSession(fixtureDataset);
  for (const key of ["altitude", "declividade_urbana", "classe_relevo"])
    session = addConstraint(fixtureDataset, session, key);
  session = editConstraint(session, "altitude", { min: 700 });
  session = editConstraint(session, "declividade_urbana", { max: 8 });
  session = editConstraint(session, "classe_relevo", { accepted: ["plano", "ondulado"] });
  const hash = await encodeSessionLink(session);
  expect(await decodeSessionLink(fixtureDataset, sessionLinkPayload(hash)!)).toEqual({ ok: true, session });
  const invalid = {
    ...session,
    constraints: [{ criterion: "classe_relevo" as const, on: true, accepted: ["inexistente"] }],
  };
  const result = await decodeSessionLink(fixtureDataset, sessionLinkPayload(await encodeSessionLink(invalid))!);
  expect(result).toEqual({ ok: false, reason: 'A classe de relevo "inexistente" não existe.' });
});

it("round-trips Tensão through a link and refuses a voltage outside 127/220", async () => {
  const session = editConstraint(
    addConstraint(fixtureDataset, createInitialSession(fixtureDataset), "tensao"),
    "tensao",
    { voltages: [220] },
  );
  const hash = await encodeSessionLink(session);
  expect(await decodeSessionLink(fixtureDataset, sessionLinkPayload(hash)!)).toEqual({ ok: true, session });
  const invalid = {
    ...session,
    constraints: [{ criterion: "tensao", on: true, voltages: [110] }],
  } as unknown as typeof session;
  const result = await decodeSessionLink(fixtureDataset, sessionLinkPayload(await encodeSessionLink(invalid))!);
  expect(result).toEqual({ ok: false, reason: "A Tensão deve conter uma lista de tensões aceitas: 127 V ou 220 V." });
});
