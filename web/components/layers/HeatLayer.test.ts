import { describe, expect, it } from "vitest";
import { createHeatLayer, TILE_Z_M, tileParts, type TilePart } from "@/components/layers/HeatLayer";
import type { HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

const hex: Cell = { id: "2363_9011", landAreaM2: 10_000, coords: null, temp3pm: 91, surface: 100 };
const part = (cell: Cell): TilePart => ({ cell, polygon: [] });
const view = (opacity: number, over: Partial<HeatView> = {}): HeatView => ({
  metric: "air",
  mode: "heat",
  deltas: new Map(),
  baseline: { air: 91, surface: 100 },
  ranges: { air: { min: 88, max: 94 }, surface: { min: 80, max: 110 } },
  opacity,
  ...over,
});

type FillAccessor = (d: TilePart) => number[];

describe("createHeatLayer", () => {
  // deck.gl gamma-corrects layer `opacity` (0.5 composites as 0.5^(1/2.2) ≈ 0.73), so the
  // requested opacity goes into the fill alpha, which is blended as-is.
  it("puts opacity in the fill alpha and leaves layer opacity at 1", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)(part(hex));

    expect(layer.props.opacity).toBe(1);
    expect(fill[3]).toBe(128);
  });

  it("keeps null cells fully transparent at any opacity", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);
    const fill = (layer.props.getFillColor as unknown as FillAccessor)(part({ ...hex, temp3pm: null }));

    expect(fill).toEqual([0, 0, 0, 0]);
  });

  it("recomputes fill colors when opacity changes", () => {
    expect(createHeatLayer([hex], view(0.3), 0).props.updateTriggers.getFillColor).toContain(0.3);
  });

  it("lays every tile flat 1 m above the ground, below every building", () => {
    const layer = createHeatLayer([hex], view(0.5), 0);
    expect(layer.props.extruded).toBe(false);
    expect(TILE_Z_M).toBe(1);
    expect(tileParts([hex])[0].polygon[0].every((p) => p[2] === TILE_Z_M)).toBe(true);
  });

  it("keeps the same data and recolours through updateTriggers when actions or modes change", () => {
    const cells = [hex];
    const deltas = new Map([[hex.id, { air: -1, surface: -5 }]]);
    const a = createHeatLayer(cells, view(0.5), 0);
    const b = createHeatLayer(cells, view(0.5, { deltas, mode: "change", metric: "surface" }), 4);
    expect(b.props.data).toBe(a.props.data);
    expect(b.props.id).toBe(a.props.id);
    const t = b.props.updateTriggers.getFillColor as unknown[];
    expect(t).toContain(deltas);
    expect(t).toContain("change");
    expect(t).toContain("surface");
    expect(t).toContain(4);
  });

  it("draws one polygon per tile part: full tiles as their square, split tiles per piece", () => {
    const ring = [[-71.06, 42.36], [-71.059, 42.36], [-71.059, 42.361], [-71.06, 42.36]];
    const split: Cell = { ...hex, id: "2364_9011", landAreaM2: 3000, coords: [[ring], [ring]] };
    const parts = tileParts([hex, split]);
    expect(parts.map((p) => p.cell.id)).toEqual(["2363_9011", "2364_9011", "2364_9011"]);
    expect(parts[0].polygon[0]).toHaveLength(5);
    expect(tileParts([hex, split])).not.toBe(parts);
  });
});
