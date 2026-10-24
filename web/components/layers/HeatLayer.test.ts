import { describe, expect, it } from "vitest";
import { createHeatLayer, SLAB_HEIGHT_M } from "@/components/layers/HeatLayer";
import type { Hex } from "@/lib/types";

const hex: Hex = { id: "892a3066037ffff", temp6am: 74, temp3pm: 91, temp7pm: 84 };
const range = { min: 88, max: 94 };

type FillAccessor = (d: Hex) => number[];

describe("createHeatLayer", () => {
  // deck.gl gamma-corrects layer `opacity` (0.5 composites as 0.5^(1/2.2) ≈ 0.73), so the
  // requested opacity goes into the fill alpha, which is blended as-is.
  it("puts opacity in the fill alpha and leaves layer opacity at 1", () => {
    const layer = createHeatLayer([hex], range, 0.5);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)(hex);

    expect(layer.props.opacity).toBe(1);
    expect(fill[3]).toBe(128);
  });

  it("keeps null cells fully transparent at any opacity", () => {
    const layer = createHeatLayer([hex], range, 0.5);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)({ ...hex, temp3pm: null });

    expect(fill).toEqual([0, 0, 0, 0]);
  });

  it("recomputes fill colors when opacity changes", () => {
    expect(createHeatLayer([hex], range, 0.3).props.updateTriggers.getFillColor).toContain(0.3);
  });

  it("raises every hex into a flat 18 m slab, above low-rise and below towers", () => {
    const layer = createHeatLayer([hex], range, 0.5);

    expect(layer.props.extruded).toBe(true);
    expect(layer.props.getElevation).toBe(SLAB_HEIGHT_M);
    expect(SLAB_HEIGHT_M).toBe(18);
    expect(layer.props.elevationScale).toBe(1);
  });
});
