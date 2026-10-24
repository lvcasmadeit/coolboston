import { describe, expect, it } from "vitest";
import { heatModel } from "@/lib/heatModel";
import { heatScore } from "@/lib/heatScore";
import { createDashboardStore } from "@/lib/store";
import type { CellTemps } from "@/lib/types";

const cells: CellTemps[] = [
  { id: "a", temp3pm: 90, surface: 100 },
  { id: "b", temp3pm: 92, surface: null },
  { id: "c", temp3pm: null, surface: 110 },
];

describe("heatModel", () => {
  it("builds lookup, baseline and base scores from the base data", () => {
    const m = heatModel(cells)!;
    expect(m.byId.get("b")).toBe(cells[1]);
    expect(m.baseline).toEqual({ air: 91, surface: 105 });
    expect(m.scores.get("a")).toBe(heatScore(90, 100));
    expect(m.scores.get("b")).toBeNull();
    expect(m.scores.get("c")).toBeNull();
  });

  it("is memoised per array, so callers share one instance", () => {
    expect(heatModel(cells)).toBe(heatModel(cells));
    expect(heatModel([...cells])).not.toBe(heatModel(cells));
  });

  it("returns the same model and scores across unrelated store changes", () => {
    const m = heatModel(cells)!;
    const store = createDashboardStore();
    store.getState().setViewMode("change");
    store.getState().setLayerOpacity("heat", 0.3);
    store.getState().addAction({ intervention: "street-trees", target: { kind: "area", cells: ["a"] } });
    const again = heatModel(cells)!;
    expect(again).toBe(m);
    expect(again.scores).toBe(m.scores);
  });

  it("is null when no tile has a score", () => {
    expect(heatModel([{ id: "x", temp3pm: 90, surface: null }])).toBeNull();
  });
});
