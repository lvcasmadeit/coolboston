import { describe, expect, it } from "vitest";
import { SLAB_HEIGHT_M } from "@/components/layers/HeatLayer";
import { createSelectionLayer } from "@/components/layers/SelectionLayer";

const CELL = "8a2a306638a7fff";

describe("createSelectionLayer", () => {
  it("draws one closed ring per cell above the slab", () => {
    const layer = createSelectionLayer([CELL]);
    const data = layer.props.data as { id: string; ring: number[][] }[];
    expect(data).toHaveLength(1);
    const ring = data[0].ring;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.every((p) => p[2] > SLAB_HEIGHT_M)).toBe(true);
    expect(layer.props.pickable).toBe(false);
  });

  it("is empty for no cells", () => {
    expect(createSelectionLayer([]).props.data).toEqual([]);
  });
});
