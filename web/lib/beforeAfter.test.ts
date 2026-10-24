import { latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { beforeAfterRows } from "@/lib/beforeAfter";
import { selectionMetrics } from "@/lib/metrics";
import type { Action, Hex, SelectedBuilding } from "@/lib/types";

const CELL = latLngToCell(42.3555, -71.06, 10);
const byId = new Map<string, Hex>([[CELL, { id: CELL, temp3pm: 93, surface: 105 }]]);
const baseline = { air: 91, surface: 95 };
const B: SelectedBuilding = { id: 1, footprint: { type: "Polygon", coordinates: [] }, heightM: 20, roofAreaM2: 1500, cell: CELL };
const sel = { kind: "building" as const, building: B };
const green: Action = { id: "g", intervention: "green-roof", target: { kind: "building", building: B } };

describe("beforeAfterRows", () => {
  it("is empty with no metrics or no applicable action", () => {
    expect(beforeAfterRows(null)).toEqual([]);
    expect(beforeAfterRows(selectionMetrics(sel, [], byId, baseline))).toEqual([]);
  });

  it("gives air, surface and heat island before and after, and moves with actions", () => {
    const rows = beforeAfterRows(selectionMetrics(sel, [green], byId, baseline));
    expect(rows.map((r) => r.key)).toEqual(["air", "surface", "heatIsland"]);
    expect(rows[0].before).toBe(93);
    expect(rows[0].after).toBeLessThan(93);
    expect(rows[2].before).toBe(2);
    expect(rows[2].before - rows[2].after).toBeCloseTo(rows[0].before - rows[0].after, 9);
    expect(rows[1].after).toBeLessThan(105);
  });

  it("drops a metric with no data", () => {
    const noSurface = new Map<string, Hex>([[CELL, { id: CELL, temp3pm: 93, surface: null }]]);
    expect(beforeAfterRows(selectionMetrics(sel, [green], noSurface, baseline)).map((r) => r.key)).toEqual(["air", "heatIsland"]);
  });
});
