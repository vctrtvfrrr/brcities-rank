import { describe, expect, it } from "vitest";
import { markerColor } from "./marker-color";

const LIGHT_LAND = [248, 244, 240];
const BLACK = [0, 0, 0];
const WCAG_NON_TEXT_CONTRAST = 3;

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

const channels = (color: string) => color.match(/\d+/g)!.map(Number);

describe("markerColor", () => {
  it("keeps every position readable against light map land", () => {
    for (const position of [1, 2, 60, 119, 120]) {
      expect(contrast(channels(markerColor(position, 120)), LIGHT_LAND)).toBeGreaterThanOrEqual(WCAG_NON_TEXT_CONTRAST);
    }
  });

  it("keeps the best position clear of the black map lines", () => {
    expect(contrast(channels(markerColor(1, 120)), BLACK)).toBeGreaterThanOrEqual(WCAG_NON_TEXT_CONTRAST);
  });

  it("darkens the better positions", () => {
    expect(luminance(channels(markerColor(1, 120)))).toBeLessThan(luminance(channels(markerColor(120, 120))));
  });
});
