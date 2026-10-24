import { describe, expect, it } from "vitest";
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
