import { describe, expect, it } from "vitest";
import { CUT_COLOR } from "./cities-layer";
import { STATE_OUTLINE_COLOR } from "./map-style";
import { markerColor } from "./marker-color";
import { RELIEF_PALETTE } from "./relief-layers";

const LIGHT_LAND = [248, 244, 240];
const WCAG_NON_TEXT_CONTRAST = 3;
const POSITIONS = [1, 2, 60, 119, 120];

function luminance([r, g, b]: number[]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: number[], b: number[]) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function channels(color: string) {
  if (color.startsWith("#"))
    return color
      .slice(1)
      .match(/../g)!
      .map((hex) => parseInt(hex, 16));
  return color.match(/\d+/g)!.map(Number);
}

const markers = [
  ...POSITIONS.map((position) => ({ name: `position ${position}`, color: markerColor(position, 120) })),
  { name: "candidate without score", color: markerColor(null, 120) },
  { name: "cut city", color: CUT_COLOR },
];

describe("markerColor", () => {
  it.each(markers)("keeps the $name marker readable against light map land", ({ color }) => {
    expect(contrast(channels(color), LIGHT_LAND)).toBeGreaterThanOrEqual(WCAG_NON_TEXT_CONTRAST);
  });

  it.each(markers)("keeps the $name marker readable against every relief color", ({ color }) => {
    for (const stop of RELIEF_PALETTE) {
      expect(contrast(channels(color), channels(stop.color))).toBeGreaterThanOrEqual(WCAG_NON_TEXT_CONTRAST);
    }
  });

  it("keeps the best position apart from the state outlines", () => {
    expect(contrast(channels(markerColor(1, 120)), channels(STATE_OUTLINE_COLOR))).toBeGreaterThanOrEqual(2);
  });

  it("tells the best position from the worst at a glance", () => {
    expect(contrast(channels(markerColor(1, 120)), channels(markerColor(120, 120)))).toBeGreaterThanOrEqual(2);
  });

  it("darkens the better positions", () => {
    expect(luminance(channels(markerColor(1, 120)))).toBeLessThan(luminance(channels(markerColor(120, 120))));
  });

  it("draws the candidate without score lighter than the worst position", () => {
    expect(luminance(channels(markerColor(null, 120)))).toBeGreaterThan(luminance(channels(markerColor(120, 120))));
  });

  it("draws cut cities lighter than the candidate without score", () => {
    expect(luminance(channels(CUT_COLOR))).toBeGreaterThan(luminance(channels(markerColor(null, 120))));
  });

  it("draws cut cities in neutral gray and the candidate without score in blue", () => {
    const [cutRed, cutGreen, cutBlue] = channels(CUT_COLOR);
    const [red, , blue] = channels(markerColor(null, 120));
    expect(Math.max(cutRed, cutGreen, cutBlue) - Math.min(cutRed, cutGreen, cutBlue)).toBeLessThanOrEqual(4);
    expect(blue - red).toBeGreaterThanOrEqual(64);
  });
});
