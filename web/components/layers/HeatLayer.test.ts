import { describe, expect, it } from "vitest";
import { createHeatLayer, SLAB_HEIGHT_M } from "@/components/layers/HeatLayer";
import type { HeatView } from "@/lib/heatView";
import type { Hex } from "@/lib/types";

const hex: Hex = { id: "892a3066037ffff", temp3pm: 91, surface: 100 };
const view = (opacity: number, over: Partial<HeatView> = {}): HeatView => ({
  metric: "air",
  mode: "heat",
  deltas: new Map(),
  baseline: { air: 91, surface: 100 },
  ranges: { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } },
  opacity,
  ...over,
});

type FillAccessor = (d: Hex) => number[];

describe("createHeatLayer", () => {
  // deck.gl gamma-corrects layer `opacity` (0.5 composites as 0.5^(1/2.2) ≈ 0.73), so the
  // requested opacity goes into the fill alpha, which is blended as-is.
  it("puts opacity in the fill alpha and leaves layer opacity at 1", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)(hex);

    expect(layer.props.opacity).toBe(1);
    expect(fill[3]).toBe(128);
  });

  it("keeps null cells fully transparent at any opacity", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)({ ...hex, temp3pm: null });

    expect(fill).toEqual([0, 0, 0, 0]);
  });

  it("recomputes fill colors when opacity changes", () => {
    expect(createHeatLayer([hex], view(0.3), 0).props.updateTriggers.getFillColor).toContain(0.3);
  });

  it("raises every hex into a flat 18 m slab, above low-rise and below towers", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);

    expect(layer.props.extruded).toBe(true);
    expect(layer.props.getElevation).toBe(SLAB_HEIGHT_M);
    expect(SLAB_HEIGHT_M).toBe(18);
    expect(layer.props.elevationScale).toBe(1);
  });

  it("keeps the same data and recolours through updateTriggers when actions or modes change", () => {
    const hexes = [hex];
    const deltas = new Map([[hex.id, { air: -1, surface: -5 }]]);
    const a = createHeatLayer(hexes, view(0.5), 0);
    const b = createHeatLayer(hexes, view(0.5, { deltas, mode: "change", metric: "surface" }), 4);
    expect(b.props.data).toBe(a.props.data);
    expect(b.props.id).toBe(a.props.id);
    const t = b.props.updateTriggers.getFillColor as unknown[];
    expect(t).toContain(deltas);
    expect(t).toContain("change");
    expect(t).toContain("surface");
    expect(t).toContain(4);
  });
});
