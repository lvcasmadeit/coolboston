import { describe, expect, it } from "vitest";
import { changedIndices, rgbaCss, tileFeatures, tileFillColors } from "@/lib/heatFill";
import type { HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

const RING = [[-71.06, 42.36], [-71.059, 42.36], [-71.059, 42.361], [-71.06, 42.36]];
const cells: Cell[] = [
  { id: "2363_9011", landAreaM2: 10_000, coords: null, temp3pm: 94, surface: 100 },
  { id: "2364_9011", landAreaM2: 4_000, coords: [[RING]], temp3pm: null, surface: 90 },
];
const view: Omit<HeatView, "opacity"> = {
  metric: "air",
  mode: "heat",
  deltas: new Map(),
  baseline: { air: 91, surface: 100 },
  ranges: { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } },
};

describe("tileFeatures", () => {
  it("one feature per cell, id = index, full tiles as their square", () => {
    const fc = tileFeatures(cells);
    expect(fc.features.map((f) => f.id)).toEqual([0, 1]);
    expect(fc.features[0].properties).toEqual({ id: "2363_9011", temp3pm: 94 });
    expect(fc.features[0].geometry.coordinates[0][0]).toHaveLength(5);
    expect(fc.features[1].geometry.coordinates).toBe(cells[1].coords);
  });

  it("is built once per cell array", () => {
    expect(tileFeatures(cells)).toBe(tileFeatures(cells));
  });
});

describe("tileFillColors", () => {
  it("colours at full opacity (layer opacity is a paint property) and leaves missing data transparent", () => {
    const [hot, missing] = tileFillColors(cells, view, 0);
    expect(hot).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/);
    expect(missing).toBe("rgba(0, 0, 0, 0)");
  });

  it("formats alpha as a 0–1 fraction", () => {
    expect(rgbaCss([10, 20, 30, 64])).toBe("rgba(10, 20, 30, 0.251)");
  });
});

describe("changedIndices", () => {
  it("is everything the first time, then only what changed", () => {
    expect(changedIndices(null, ["a", "b"])).toEqual([0, 1]);
    expect(changedIndices(["a", "b", "c"], ["a", "x", "c"])).toEqual([1]);
    expect(changedIndices(["a"], ["a"])).toEqual([]);
  });
});
