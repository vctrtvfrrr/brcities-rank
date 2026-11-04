import { describe, expect, it } from "vitest";
import { addConstraint, removeConstraint, toggleConstraint } from "./constraints";
import { fixtureDataset } from "./fixture-dataset";
import { createInitialSession, type Session } from "./session";
import { showsRelief } from "./terrain";

const initial = createInitialSession(fixtureDataset);

const withSteps = (...steps: ((s: Session) => Session)[]) => steps.reduce((s, step) => step(s), initial);
const add = (criterion: string) => (s: Session) => addConstraint(fixtureDataset, s, criterion);
const toggle = (criterion: string) => (s: Session) => toggleConstraint(s, criterion);
const remove = (criterion: string) => (s: Session) => removeConstraint(s, criterion);

const RELIEF_CRITERIA = ["altitude", "declividade_urbana", "classe_relevo"];

describe("showsRelief", () => {
  it("hides relief in a session without constraints", () => {
    expect(showsRelief(initial)).toBe(false);
  });

  it.each(RELIEF_CRITERIA)("shows relief as soon as a %s constraint is added", (criterion) => {
    expect(showsRelief(withSteps(add(criterion)))).toBe(true);
  });

  it.each(RELIEF_CRITERIA)("hides relief when the only %s constraint is toggled off", (criterion) => {
    expect(showsRelief(withSteps(add(criterion), toggle(criterion)))).toBe(false);
  });

  it.each(RELIEF_CRITERIA)("hides relief when the only %s constraint is removed", (criterion) => {
    expect(showsRelief(withSteps(add(criterion), remove(criterion)))).toBe(false);
  });

  it("keeps relief while one of two relief constraints is still on", () => {
    expect(showsRelief(withSteps(add("altitude"), add("classe_relevo"), toggle("altitude")))).toBe(true);
  });

  it("ignores constraints from other categories", () => {
    const session = withSteps(add("location"), add("tensao"), add("score"), add("crime"), add("fibra"), add("koppen"));
    expect(showsRelief(session)).toBe(false);
  });
});
