import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { quantileRange } from "@/lib/heat";
import { category, displayScore, heatScore, normalize, scoreColor } from "@/lib/heatScore";
import { HEAT_SCORE, NO_DATA_COLOR, SCORE_COLOR_STOPS, type HeatScoreConfig } from "@/lib/heatScoreConfig";
import type { CellsFile } from "@/lib/types";

// The spec's illustrative fixed anchors, independent of the fitted ones.
const FIXED: HeatScoreConfig = {
  weights: { air: 0.6, surface: 0.4 },
  anchorsF: { air: { min: 70, max: 105 }, surface: { min: 75, max: 150 } },
};
const { air, surface } = HEAT_SCORE.anchorsF;

describe("heatScore", () => {
  it("is 0 at both minima and 100 at both maxima", () => {
    expect(heatScore(air.min, surface.min)).toBe(0);
    expect(heatScore(air.max, surface.max)).toBeCloseTo(100, 9);
  });

  it("is 50 at both midpoints", () => {
    expect(heatScore((air.min + air.max) / 2, (surface.min + surface.max) / 2)).toBeCloseTo(50, 9);
  });

  it("matches the spec example with fixed anchors: A = S = 0.5 gives 50", () => {
    expect(normalize(87.5, FIXED.anchorsF.air)).toBe(0.5);
    expect(normalize(112.5, FIXED.anchorsF.surface)).toBe(0.5);
    expect(heatScore(87.5, 112.5, FIXED)).toBeCloseTo(50, 9);
  });

  it("clamps inputs outside the anchors", () => {
    expect(heatScore(air.min - 10, surface.min - 10)).toBe(0);
    expect(heatScore(air.max + 10, surface.max + 10)).toBeCloseTo(100, 9);
    expect(heatScore(60, 200, FIXED)).toBeCloseTo(40, 9);
  });

  it("weights air 0.6 and surface 0.4: air at max, surface at min gives 60", () => {
    expect(heatScore(air.max, surface.min)).toBeCloseTo(60, 9);
    expect(heatScore(air.min, surface.max)).toBeCloseTo(40, 9);
  });

  it("is null, never 0, when either input is missing", () => {
    expect(heatScore(null, 90)).toBeNull();
    expect(heatScore(90, null)).toBeNull();
    expect(heatScore(null, null)).toBeNull();
  });

  it("is unrounded; display rounds", () => {
    const h = heatScore(90, 90)!;
    expect(Number.isInteger(h)).toBe(false);
    expect(displayScore(h)).toBe(Math.round(h));
    expect(displayScore(null)).toBeNull();
  });
});

describe("weights", () => {
  it("sum to 1", () => {
    expect(HEAT_SCORE.weights.air + HEAT_SCORE.weights.surface).toBeCloseTo(1, 12);
  });
});

describe("category", () => {
  it("uses the rounded score at each boundary", () => {
    expect(category(0)).toBe("Low");
    expect(category(24)).toBe("Low");
    expect(category(24.4)).toBe("Low");
    expect(category(24.5)).toBe("Moderate");
    expect(category(25)).toBe("Moderate");
    expect(category(49)).toBe("Moderate");
    expect(category(50)).toBe("High");
    expect(category(74)).toBe("High");
    expect(category(75)).toBe("Very High");
    expect(category(100)).toBe("Very High");
    expect(category(null)).toBeNull();
  });
});

describe("scoreColor", () => {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  it("is exact at every stop", () => {
    for (const s of SCORE_COLOR_STOPS) expect(scoreColor(s.score)).toEqual([...rgb(s.color), 255]);
  });

  it("interpolates linearly between stops (12.5 is halfway from 0 to 25)", () => {
    const [a, b] = [rgb(SCORE_COLOR_STOPS[0].color), rgb(SCORE_COLOR_STOPS[1].color)];
    expect(scoreColor(12.5, 100)).toEqual([...a.map((v, i) => Math.round((v + b[i]) / 2)), 100]);
  });

  it("clamps outside 0–100 and is neutral grey without a score", () => {
    expect(scoreColor(-5)).toEqual(scoreColor(0));
    expect(scoreColor(130)).toEqual(scoreColor(100));
    expect(scoreColor(null, 50)).toEqual([...rgb(NO_DATA_COLOR), 50]);
  });
});

describe("calibration", () => {
  it("fitted anchors are within 0.2 °F of the 2nd–98th percentiles of cells.json", () => {
    const file = JSON.parse(readFileSync(join(__dirname, "../data/cells.json"), "utf8")) as CellsFile;
    const fitted = {
      air: quantileRange(file.cells.map((c) => c.temp3pm))!,
      surface: quantileRange(file.cells.map((c) => c.surface))!,
    };
    for (const k of ["air", "surface"] as const) {
      expect(Math.abs(HEAT_SCORE.anchorsF[k].min - fitted[k].min)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(HEAT_SCORE.anchorsF[k].max - fitted[k].max)).toBeLessThanOrEqual(0.2);
    }
  });
});
