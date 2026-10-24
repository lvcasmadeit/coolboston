import { describe, expect, it } from "vitest";
import { buildDeckLayers, type DeckLayerInputs } from "@/components/layers/buildLayers";
import { createDashboardStore } from "@/lib/store";
import type { Action, Hex } from "@/lib/types";

const hexes: Hex[] = [{ id: "8a2a306638a7fff", temp3pm: 91, surface: 100 }];
const roof: Action = {
  id: "a",
  intervention: "green-roof",
  target: { kind: "building", building: { id: 1, footprint: { type: "Polygon", coordinates: [[[-71.06, 42.35], [-71.059, 42.35], [-71.059, 42.351], [-71.06, 42.35]]] }, heightM: 20, roofAreaM2: 900, cell: hexes[0].id } },
};

function inputs(store: ReturnType<typeof createDashboardStore>): DeckLayerInputs {
  const s = store.getState();
  return {
    hexes,
    view: { metric: s.metric, mode: s.viewMode, deltas: new Map(), baseline: { air: 91, surface: 100 }, ranges: { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } } },
    maxPct: 0,
    actions: s.actions,
    areaCells: s.selection?.kind === "area" ? s.selection.cells : null,
    layers: s.layers,
  };
}
const ids = (i: DeckLayerInputs) => buildDeckLayers(i).map((l) => l.id);

describe("buildDeckLayers", () => {
  it("store toggles reach the layer list", () => {
    const store = createDashboardStore();
    store.getState().addAction({ intervention: "green-roof", target: roof.target as never });
    store.getState().setAreaCells([hexes[0].id]);
    expect(ids(inputs(store))).toEqual(["heat-hexes", "roof-markers", "area-selection"]);
    store.getState().toggleLayer("heat");
    store.getState().toggleLayer("roofs");
    expect(ids(inputs(store))).toEqual(["area-selection"]);
  });

  it("store opacity reaches the layers' fill alpha", () => {
    const store = createDashboardStore();
    store.getState().addAction({ intervention: "green-roof", target: roof.target as never });
    store.getState().setLayerOpacity("heat", 0.2);
    store.getState().setLayerOpacity("roofs", 0.4);
    const [heat, roofs] = buildDeckLayers(inputs(store));
    const fill = (l: typeof heat, d: unknown) => (l.props.getFillColor as unknown as (d: unknown) => number[])(d);
    expect(fill(heat, hexes[0])[3]).toBe(51);
    expect(fill(roofs, (roofs.props.data as unknown[])[0])[3]).toBe(102);
  });

  it("omits roof caps when there are no building actions", () => {
    expect(ids(inputs(createDashboardStore()))).toEqual(["heat-hexes"]);
  });
});
