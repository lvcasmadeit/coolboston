import { describe, expect, it } from "vitest";
import { computeDeltas } from "@/lib/cooling";
import { heatModel } from "@/lib/heatModel";
import { heatScore } from "@/lib/heatScore";
import { selectionScore } from "@/lib/selectionScore";
import type { CellTemps, SelectedBuilding } from "@/lib/types";

const cells: CellTemps[] = [
  { id: "100_100", temp3pm: 92, surface: 100 },
  { id: "100_110", temp3pm: 90, surface: 80 },
  { id: "100_120", temp3pm: null, surface: 90 },
];
const m = heatModel(cells)!;
const building: SelectedBuilding = {
  id: 1,
  footprint: { type: "Polygon", coordinates: [] },
  heightM: 10,
  roofAreaM2: 5000,
  primaryTile: "100_100",
  tiles: [{ id: "100_100", overlapM2: 5000 }],
};

describe("selectionScore", () => {
  it("a building scores its primary tile; no change without actions", () => {
    const s = selectionScore({ kind: "building", building }, m.byId, new Map(), m.scores)!;
    expect(s.before).toBe(heatScore(92, 100));
    expect(s.change).toBe(0);
    expect(s.tiles).toBe(1);
  });

  it("an area averages the tiles that have a score; actions lower the after score", () => {
    const sel = { kind: "area" as const, cells: ["100_100", "100_110", "100_120"] };
    const d = computeDeltas([{ id: "t", intervention: "green-roof", target: { kind: "building", building } }], m.byId);
    const s = selectionScore(sel, m.byId, d, m.scores)!;
    expect(s.tiles).toBe(2);
    expect(s.before).toBeCloseTo((heatScore(92, 100)! + heatScore(90, 80)!) / 2, 9);
    expect(s.change).toBeLessThan(0);
    expect(s.after).toBeCloseTo(s.before + s.change, 9);
  });

  it("is null when no selected tile has a score", () => {
    expect(selectionScore({ kind: "area", cells: ["100_120", "999_999"] }, m.byId, new Map(), m.scores)).toBeNull();
  });
});
