import { beforeEach, describe, expect, it } from "vitest";
import { createDashboardStore, DEFAULT_LAYERS } from "@/lib/store";
import type { SelectedBuilding } from "@/lib/types";

const LAYERS = {
  heat: { visible: true, opacity: 1 },
  canopy: { visible: false, opacity: 0.7 },
};

describe("default layers", () => {
  it("shows heat hexes at 50% opacity", () => {
    expect(DEFAULT_LAYERS.heat).toEqual({ visible: true, opacity: 0.5 });
    expect(createDashboardStore().getState().layers.heat.opacity).toBe(0.5);
  });
});

const CELL_A = "8a2a306638a7fff";
const CELL_B = "8a2a306638affff";
const BUILDING: SelectedBuilding = {
  id: 42,
  footprint: { type: "Polygon", coordinates: [[[-71.06, 42.35], [-71.059, 42.35], [-71.059, 42.351], [-71.06, 42.35]]] },
  heightM: 30,
  roofAreaM2: 900,
  cell: CELL_A,
};

let store: ReturnType<typeof createDashboardStore>;
beforeEach(() => {
  store = createDashboardStore(LAYERS);
});

describe("dashboard store", () => {
  it("has the documented defaults", () => {
    const s = store.getState();
    expect(s.selection).toBeNull();
    expect(s.actions).toEqual([]);
    expect(s.viewMode).toBe("heat");
    expect(s.layers).toEqual(LAYERS);
  });

  it("does not share layer state between stores", () => {
    store.getState().toggleLayer("heat");
    expect(createDashboardStore(LAYERS).getState().layers.heat.visible).toBe(true);
  });

  it("replaces an area selection with a building and vice versa", () => {
    store.getState().setAreaCells([CELL_A]);
    store.getState().selectBuilding(BUILDING);
    expect(store.getState().selection).toEqual({ kind: "building", building: BUILDING });
    store.getState().toggleAreaCell(CELL_A);
    expect(store.getState().selection).toEqual({ kind: "area", cells: [CELL_A] });
  });

  it("toggles area cells; toggling the last cell clears the selection", () => {
    store.getState().toggleAreaCell(CELL_A);
    store.getState().toggleAreaCell(CELL_B);
    expect(store.getState().selection).toEqual({ kind: "area", cells: [CELL_A, CELL_B] });
    store.getState().toggleAreaCell(CELL_A);
    expect(store.getState().selection).toEqual({ kind: "area", cells: [CELL_B] });
    store.getState().toggleAreaCell(CELL_B);
    expect(store.getState().selection).toBeNull();
  });

  it("dedupes setAreaCells and treats an empty list as no selection", () => {
    store.getState().setAreaCells([CELL_A, CELL_B, CELL_A]);
    expect(store.getState().selection).toEqual({ kind: "area", cells: [CELL_A, CELL_B] });
    store.getState().setAreaCells([]);
    expect(store.getState().selection).toBeNull();
  });

  it("clears the selection", () => {
    store.getState().selectBuilding(BUILDING);
    store.getState().clearSelection();
    expect(store.getState().selection).toBeNull();
  });

  it("adds actions with unique ids, removes, undoes and resets", () => {
    const st = store.getState();
    const a = st.addAction({ intervention: "green-roof", target: { kind: "building", building: BUILDING } });
    const b = st.addAction({ intervention: "trees", target: { kind: "area", cells: [CELL_A] } });
    const c = st.addAction({ intervention: "solar", target: { kind: "building", building: BUILDING } });
    expect(new Set([a, b, c]).size).toBe(3);
    expect(store.getState().actions.map((x) => x.id)).toEqual([a, b, c]);

    store.getState().removeAction(b);
    expect(store.getState().actions.map((x) => x.id)).toEqual([a, c]);
    store.getState().undo();
    expect(store.getState().actions.map((x) => x.id)).toEqual([a]);
    store.getState().resetActions();
    expect(store.getState().actions).toEqual([]);
    store.getState().undo();
    expect(store.getState().actions).toEqual([]);
  });

  it("does not reuse ids after removal", () => {
    const a = store.getState().addAction({ intervention: "trees", target: { kind: "area", cells: [CELL_A] } });
    store.getState().undo();
    const b = store.getState().addAction({ intervention: "trees", target: { kind: "area", cells: [CELL_A] } });
    expect(b).not.toBe(a);
  });

  it("only accepts actions whose intervention matches the target kind", () => {
    // @ts-expect-error green roof needs a building target
    store.getState().addAction({ intervention: "green-roof", target: { kind: "area", cells: [CELL_A] } });
    // @ts-expect-error trees need an area target
    store.getState().addAction({ intervention: "trees", target: { kind: "building", building: BUILDING } });
  });

  it("sets the view mode", () => {
    store.getState().setViewMode("change");
    expect(store.getState().viewMode).toBe("change");
  });

  it("toggles one layer without touching others", () => {
    store.getState().toggleLayer("canopy");
    expect(store.getState().layers.canopy.visible).toBe(true);
    expect(store.getState().layers.heat).toEqual(LAYERS.heat);
  });

  it("clamps layer opacity to 0-1", () => {
    store.getState().setLayerOpacity("heat", 1.5);
    expect(store.getState().layers.heat.opacity).toBe(1);
    store.getState().setLayerOpacity("heat", -0.2);
    expect(store.getState().layers.heat.opacity).toBe(0);
    store.getState().setLayerOpacity("heat", 0.4);
    expect(store.getState().layers.heat.opacity).toBe(0.4);
  });

  it("ignores unknown layer ids", () => {
    const before = store.getState().layers;
    store.getState().toggleLayer("nope");
    store.getState().setLayerOpacity("nope", 0.5);
    expect(store.getState().layers).toBe(before);
  });
});
