import { describe, expect, it } from "vitest";
import { REGIONS, regionSelection, toggleRegion } from "./regions";

const region = (name: string) => REGIONS.find((r) => r.name === name)!;

describe("regionSelection", () => {
  it("tells whether all, some or none of the region's states are accepted", () => {
    expect(regionSelection(["PR", "RS", "SC", "SP"], region("Sul"))).toBe("all");
    expect(regionSelection(["PR", "SP"], region("Sul"))).toBe("some");
    expect(regionSelection(["SP"], region("Sul"))).toBe("none");
  });
});

describe("toggleRegion", () => {
  it("accepts every state of the region when any is missing, keeping the others", () => {
    expect(toggleRegion(["SP", "PR"], region("Sul")).sort()).toEqual(["PR", "RS", "SC", "SP"]);
  });

  it("refuses every state of the region when all are accepted", () => {
    expect(toggleRegion(["SP", "PR", "RS", "SC"], region("Sul"))).toEqual(["SP"]);
  });
});
