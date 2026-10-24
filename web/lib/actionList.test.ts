import { describe, expect, it } from "vitest";
import { tileCentre, tileIdAt } from "@/lib/grid";
import { actionRows } from "@/lib/actionList";
import { createDashboardStore } from "@/lib/store";
import type { SelectedBuilding } from "@/lib/types";

const CELL = tileIdAt([-71.06, 42.3555]);
const RING = [[-71.0602, 42.3554], [-71.05984, 42.3554], [-71.05984, 42.35567], [-71.0602, 42.35567], [-71.0602, 42.3554]];
const B: SelectedBuilding = { id: 7, footprint: { type: "Polygon", coordinates: [RING] }, heightM: 20, roofAreaM2: 912.4, cell: CELL };

describe("actionRows", () => {
  it("derives rows from the store and follows remove, undo and reset", () => {
    const store = createDashboardStore();
    const s = store.getState();
    const a = s.addAction({ intervention: "green-roof", target: { kind: "building", building: B } });
    const b = s.addAction({ intervention: "street-trees", target: { kind: "area", cells: [CELL] } });
    s.addAction({ intervention: "green-walls", target: { kind: "building", building: B } });

    const rows = actionRows(store.getState().actions);
    expect(rows.map((r) => r.label)).toEqual(["Green walls", "Street trees", "Green roof"]); // newest first
    expect(rows[2]).toMatchObject({ id: a, target: "Building, 912 m² roof" });
    expect(rows[2].cost).toMatch(/^\$[\d.]+k–\$[\d.]+k$/);
    expect(rows[1].target).toBe("Area, 1 tile");

    store.getState().removeAction(b);
    expect(actionRows(store.getState().actions).map((r) => r.label)).toEqual(["Green walls", "Green roof"]);
    store.getState().undo();
    expect(actionRows(store.getState().actions).map((r) => r.id)).toEqual([a]);
    store.getState().resetActions();
    expect(actionRows(store.getState().actions)).toEqual([]);
  });

  it("centres buildings on their footprint and areas on their cells", () => {
    const store = createDashboardStore();
    store.getState().addAction({ intervention: "cool-building", target: { kind: "building", building: B } });
    store.getState().addAction({ intervention: "street-trees", target: { kind: "area", cells: [CELL] } });
    const [area, building] = actionRows(store.getState().actions);
    expect(building.center[0]).toBeCloseTo(-71.06002, 4);
    expect(building.center[1]).toBeCloseTo(42.355535, 4);
    expect(area.center).toEqual(tileCentre(CELL));
  });
});
