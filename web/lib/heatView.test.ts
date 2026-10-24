import { describe, expect, it } from "vitest";
import { CHANGE_RAMP, FADED, HEAT_RAMP } from "@/lib/colors";
import { computeDeltas, type Deltas } from "@/lib/cooling";
import { quantileRange } from "@/lib/heat";
import { afterValue, changePct, fillColor, maxChangePct, type HeatView, tileTooltip } from "@/lib/heatView";
import { computeBaseline } from "@/lib/impact";
import type { CellTemps } from "@/lib/types";

const hexes: CellTemps[] = [
  { id: "hot", temp3pm: 94, surface: 110 },
  { id: "mild", temp3pm: 92, surface: 100 },
  { id: "cool", temp3pm: 88, surface: 80 },
  { id: "none", temp3pm: null, surface: null },
];
const byId = new Map(hexes.map((h) => [h.id, h]));
const baseline = computeBaseline(hexes); // air ≈ 91.33, surface ≈ 96.67
const ranges = { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } };
const trees = (cells: string[]) => computeDeltas([{ id: "t", intervention: "street-trees", target: { kind: "area", cells } }]);
const view = (deltas: Deltas, over: Partial<HeatView> = {}): HeatView => ({
  metric: "air",
  mode: "heat",
  deltas,
  baseline,
  ranges,
  opacity: 0.5,
  ...over,
});

describe("after values", () => {
  it("apply the metric's delta; null stays null", () => {
    const d = trees(["hot", "none"]);
    expect(afterValue(hexes[0], "air", d)).toBeCloseTo(94 - 0.126, 3);
    expect(afterValue(hexes[0], "surface", d)).toBe(110);
    expect(afterValue(hexes[3], "air", d)).toBeNull();
  });
});

describe("heat mode", () => {
  it("colours on the fixed baseline range, which does not move after actions", () => {
    const before = fillColor(hexes[0], view(new Map()), 0);
    expect(before).toEqual([...HEAT_RAMP[HEAT_RAMP.length - 1], 128]);
    const after = fillColor(hexes[0], view(trees(["hot"])), 0);
    expect(after).not.toEqual(before); // cooler, same domain
    expect(after[3]).toBe(128);
  });

  it("uses the surface range for the surface metric", () => {
    expect(fillColor(hexes[2], view(new Map(), { metric: "surface" }), 0)).toEqual([...HEAT_RAMP[0], 128]);
  });
});

describe("change mode", () => {
  it("colours affected hexes by % reduction on 0 → max, and fades the rest", () => {
    const d = computeDeltas([
      { id: "a", intervention: "street-trees", target: { kind: "area", cells: ["hot"] } },
      { id: "b", intervention: "street-trees", target: { kind: "area", cells: ["mild"] } },
    ]);
    const max = maxChangePct(byId, "air", d, baseline);
    expect(max).toBeCloseTo(changePct(hexes[1], "air", d, baseline)!, 9); // mild has the smaller H, so the larger %
    const v = view(d, { mode: "change" });
    expect(fillColor(hexes[1], v, max)).toEqual([...CHANGE_RAMP[CHANGE_RAMP.length - 1], 128]);
    expect(fillColor(hexes[0], v, max)).not.toEqual([...FADED, 32]);
    expect(fillColor(hexes[2], v, max)).toEqual([...FADED, 32]); // unaffected
  });

  it("fades affected hexes whose heat island is n/a (≤ 0.5 °F)", () => {
    const d = trees(["cool"]);
    expect(changePct(hexes[2], "air", d, baseline)).toBeNull();
    expect(fillColor(hexes[2], view(d, { mode: "change" }), 1)).toEqual([...FADED, 32]);
  });

  it("keeps no-data hexes transparent", () => {
    expect(fillColor(hexes[3], view(trees(["none"]), { mode: "change" }), 1)).toEqual([0, 0, 0, 0]);
  });

  it("max is 0 with no actions", () => {
    expect(maxChangePct(byId, "air", new Map(), baseline)).toBe(0);
  });
});

describe("quantileRange", () => {
  it("drops outliers at the 2nd and 98th percentiles and ignores nulls", () => {
    const vs = [null, ...Array.from({ length: 101 }, (_, i) => i)];
    expect(quantileRange(vs)).toEqual({ min: 2, max: 98 });
    expect(quantileRange([null])).toBeNull();
  });
});

describe("tileTooltip", () => {
  it("shows the base value, then the estimate and heat-island change once treated", () => {
    const v = { metric: "air" as const, mode: "heat" as const, deltas: new Map(), baseline, ranges: { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } } };
    expect(tileTooltip(hexes[0], v)).toBe("3pm air temp: 94.0 °F");
    const treated = tileTooltip(hexes[0], { ...v, deltas: trees(["hot"]) });
    expect(treated).toMatch(/^3pm air temp: 94\.0 °F → 93\.9 °F \(est\.\)\nHeat island: −\d+\.\d%$/);
  });
});
