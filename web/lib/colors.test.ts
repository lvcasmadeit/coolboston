import { describe, expect, it } from "vitest";
import { HEAT_RAMP, TRANSPARENT, heatColor, rampCss } from "@/lib/colors";

const first = [...HEAT_RAMP[0], 255];
const last = [...HEAT_RAMP[HEAT_RAMP.length - 1], 255];

describe("heatColor", () => {
  it("returns the first stop at min and the last at max", () => {
    expect(heatColor(88, 88, 94)).toEqual(first);
    expect(heatColor(94, 88, 94)).toEqual(last);
  });

  it("clamps values outside the range", () => {
    expect(heatColor(50, 88, 94)).toEqual(first);
    expect(heatColor(120, 88, 94)).toEqual(last);
  });

  it("is transparent for null and non-finite values", () => {
    expect(heatColor(null, 88, 94)).toEqual(TRANSPARENT);
    expect(heatColor(Number.NaN, 88, 94)).toEqual(TRANSPARENT);
  });

  it("hits interior stops exactly and interpolates between them", () => {
    const n = HEAT_RAMP.length - 1;
    expect(heatColor(1 / n, 0, 1)).toEqual([...HEAT_RAMP[1], 255]);
    const mid = heatColor(0.5 / n, 0, 1);
    for (let c = 0; c < 3; c++) expect(mid[c]).toBe(Math.round((HEAT_RAMP[0][c] + HEAT_RAMP[1][c]) / 2));
  });

  it("does not produce NaN when min equals max", () => {
    expect(heatColor(90, 90, 90)).toEqual(first);
  });
});

describe("rampCss", () => {
  it("is a left-to-right gradient over every stop", () => {
    const css = rampCss();
    expect(css.startsWith("linear-gradient(to right")).toBe(true);
    expect(css.match(/rgb\(/g)).toHaveLength(HEAT_RAMP.length);
  });
});
