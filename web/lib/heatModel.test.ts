import { describe, expect, it } from "vitest";
import { heatModel } from "@/lib/heatModel";
import type { Hex } from "@/lib/types";

const hexes: Hex[] = [
  { id: "a", temp3pm: 90, surface: 100 },
  { id: "b", temp3pm: 92, surface: null },
  { id: "c", temp3pm: null, surface: 110 },
];

describe("heatModel", () => {
  it("builds lookup, baseline and ranges from the base data", () => {
    const m = heatModel(hexes)!;
    expect(m.byId.get("b")).toBe(hexes[1]);
    expect(m.baseline).toEqual({ air: 91, surface: 105 });
    expect(m.ranges).toEqual({ air: { min: 90, max: 92 }, surface: { min: 100, max: 110 } });
  });

  it("is memoised per array, so callers share one instance", () => {
    expect(heatModel(hexes)).toBe(heatModel(hexes));
    expect(heatModel([...hexes])).not.toBe(heatModel(hexes));
  });

  it("is null without any air or surface data", () => {
    expect(heatModel([{ id: "x", temp3pm: null, surface: null }])).toBeNull();
  });
});
