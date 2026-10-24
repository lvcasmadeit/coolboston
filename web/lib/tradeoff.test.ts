import { describe, expect, it } from "vitest";
import { tileIdAt } from "@/lib/grid";
import { capitalCost } from "@/lib/impact";
import { selectionMetrics } from "@/lib/metrics";
import { chartActions, tradeoffPoints } from "@/lib/tradeoff";
import type { Action, CellTemps, SelectedBuilding } from "@/lib/types";

const CELL = tileIdAt([-71.06, 42.3555]);
const byId = new Map<string, CellTemps>([[CELL, { id: CELL, temp3pm: 93, surface: 105 }]]);
const baseline = { air: 91, surface: 95 };
const B = (id: number, heightM: number | null = 20): SelectedBuilding => ({
  id,
  footprint: { type: "Polygon", coordinates: [[[-71.0602, 42.3554], [-71.05984, 42.3554], [-71.05984, 42.35567], [-71.0602, 42.3554]]] },
  heightM,
  roofAreaM2: 1500,
  primaryTile: CELL,
  tiles: [{ id: CELL, overlapM2: 1500 }],
});
const green: Action = { id: "g", intervention: "green-roof", target: { kind: "building", building: B(1) } };
const solar: Action = { id: "s", intervention: "solar", target: { kind: "building", building: B(2) } };
const trees: Action = { id: "t", intervention: "street-trees", target: { kind: "area", cells: [CELL] } };

describe("tradeoffPoints", () => {
  it("is empty with no actions", () => {
    expect(tradeoffPoints([], byId, baseline)).toEqual([]);
  });

  it("x is the central cost with a low/high error bar; y is the action's own heat-island %", () => {
    const [p] = tradeoffPoints([green], byId, baseline);
    const cost = capitalCost(green);
    if (cost.kind !== "range") throw new Error();
    expect(p.costCentral).toBe(cost.value.central);
    expect(p.costError).toEqual([cost.value.central - cost.value.low, cost.value.high - cost.value.central]);
    expect(p.heatIslandPct).toBeCloseTo(
      selectionMetrics({ kind: "building", building: B(1) }, [green], byId, baseline).change!.heatIslandPct!,
      9,
    );
    expect(p.roofSurfaceF).toBe(-56);
    expect(p.costLabel).toMatch(/^\$/);
  });

  it("each point counts its own action only", () => {
    const pts = tradeoffPoints([green, trees], byId, baseline);
    const alone = tradeoffPoints([trees], byId, baseline)[0];
    expect(pts[1].heatIslandPct).toBeCloseTo(alone.heatIslandPct!, 9);
  });

  it("solar has a small change and its shaded-roof surface; trees have no roof surface change", () => {
    const [s, t] = tradeoffPoints([solar, trees], byId, baseline);
    expect(s.heatIslandPct!).toBeGreaterThan(0);
    expect(s.roofSurfaceF).toBe(-15);
    expect(t.roofSurfaceF).toBeNull();
  });

  it("drops actions whose cost is not quantified", () => {
    const walls: Action = { id: "w", intervention: "green-walls", target: { kind: "building", building: B(3, null) } };
    expect(tradeoffPoints([walls], byId, baseline)).toEqual([]);
  });

  it("n/a heat island gives a null y", () => {
    expect(tradeoffPoints([green], byId, { air: 92.8, surface: 95 })[0].heatIslandPct).toBeNull();
  });
});

describe("chartActions", () => {
  it("uses the selection's actions, or every action without a selection", () => {
    expect(chartActions(null, [green, solar, trees]).map((a) => a.id)).toEqual(["g", "s", "t"]);
    expect(chartActions({ kind: "building", building: B(1) }, [green, solar, trees]).map((a) => a.id)).toEqual(["g"]);
    expect(chartActions({ kind: "area", cells: [CELL] }, [green, trees]).map((a) => a.id)).toEqual(["t"]);
  });
});
