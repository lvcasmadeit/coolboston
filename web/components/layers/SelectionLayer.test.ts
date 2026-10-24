import { describe, expect, it } from "vitest";
import { SLAB_HEIGHT_M } from "@/components/layers/HeatLayer";
import { createSelectionLayer } from "@/components/layers/SelectionLayer";

import type { Cell } from "@/lib/types";

const CELL: Cell = { id: "2363_9011", landAreaM2: 10_000, coords: null, temp3pm: 91, surface: 100 };
const RING = [[-71.06, 42.36], [-71.059, 42.36], [-71.059, 42.361], [-71.06, 42.36]];

describe("createSelectionLayer", () => {
  it("draws one closed outline per tile polygon above the slab", () => {
    const layer = createSelectionLayer([CELL, { ...CELL, id: "2364_9011", coords: [[RING], [RING]] }]);
    const data = layer.props.data as { id: string; rings: number[][][] }[];
    expect(data.map((d) => d.id)).toEqual(["2363_9011", "2364_9011", "2364_9011"]);
    const ring = data[0].rings[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.every((p) => p[2] > SLAB_HEIGHT_M)).toBe(true);
    expect(layer.props.pickable).toBe(false);
  });

  it("is empty for no cells", () => {
    expect(createSelectionLayer([]).props.data).toEqual([]);
  });
});
