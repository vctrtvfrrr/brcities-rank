import { describe, expect, it } from "vitest";
import { scoreBand } from "./score-band";

describe("scoreBand", () => {
  it("puts each score in its band, with the limit going to the band above", () => {
    expect([0, 39.9, 40, 59.99, 60, 79.9, 80, 100].map((score) => scoreBand(score).id)).toEqual([
      "low",
      "low",
      "mid",
      "mid",
      "high",
      "high",
      "top",
      "top",
    ]);
  });
});
