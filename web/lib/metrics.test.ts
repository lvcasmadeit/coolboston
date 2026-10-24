import { gridDisk, latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { computeDeltas } from "@/lib/cooling";
import { HEX_AREA_M2 } from "@/lib/geo";
import { capitalCost, energyEstimate, heatIslandChangePct } from "@/lib/impact";
import { selectionMetrics } from "@/lib/metrics";
import type { Action, Hex, SelectedBuilding } from "@/lib/types";

const CELL = latLngToCell(42.3555, -71.06, 10);
const [, N1, N2] = gridDisk(CELL, 1);
const hexes: Hex[] = [
  { id: CELL, temp3pm: 93, surface: 105 },
  { id: N1, temp3pm: 92, surface: 100 },
  { id: N2, temp3pm: null, surface: 98 },
];
const byId = new Map(hexes.map((h) => [h.id, h]));
const baseline = { air: 91, surface: 95 };
const B = (id: number, roofAreaM2 = 1500): SelectedBuilding => ({
  id,
  footprint: { type: "Polygon", coordinates: [[[-71.0602, 42.3554], [-71.05984, 42.3554], [-71.05984, 42.35567], [-71.0602, 42.3554]]] },
  heightM: 20,
  roofAreaM2,
  cell: CELL,
});
const v = (r: { kind: string; value?: { central: number } }) => r.value!.central;

describe("selectionMetrics", () => {
  it("current conditions for a building are its hex values; no change without actions", () => {
    const m = selectionMetrics({ kind: "building", building: B(1) }, [], byId, baseline);
    expect(m.level).toBe("building hex");
    expect(m.before).toEqual({ air: 93, surface: 105, heatIslandF: 2 });
    expect(m.change).toBeNull();
  });

  it("a green roof: hex air and surface change, heat-island %, cost, energy, peak-summer roof change", () => {
    const a: Action = { id: "a", intervention: "green-roof", target: { kind: "building", building: B(1) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, baseline);
    const d = computeDeltas([a]).get(CELL)!;
    expect(m.change!.airDeltaF).toBeCloseTo(d.air, 9);
    expect(m.change!.airDeltaF).toBeCloseTo((-5 * 1500) / HEX_AREA_M2, 9);
    expect(m.change!.surfaceDeltaF).toBeCloseTo(d.surface, 9);
    expect(m.change!.heatIslandPct).toBeCloseTo(heatIslandChangePct(2, 2 + d.air)!, 9);
    expect(m.change!.totals.capital.central).toBeCloseTo(v(capitalCost(a) as never), 6);
    expect(m.change!.totals.usd.central).toBeCloseTo(v(energyEstimate(a).usd as never), 6);
    expect(m.change!.energyNotQuantified).toBe(true); // green roof kWh is not quantified
    expect(m.change!.roofSurfaceF).toBe(-56);
  });

  it("hex temperatures include other buildings' actions in the hex, but cost covers this building only", () => {
    const mine: Action = { id: "a", intervention: "cool-building", target: { kind: "building", building: B(1) } };
    const other: Action = { id: "b", intervention: "green-roof", target: { kind: "building", building: B(2) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [mine, other], byId, baseline);
    expect(m.change!.airDeltaF).toBeCloseTo(computeDeltas([mine, other]).get(CELL)!.air, 9);
    expect(m.change!.totals.capital.central).toBeCloseTo(v(capitalCost(mine) as never), 6);
    expect(m.change!.roofSurfaceF).toBe(-55);
  });

  it("solar alone: no temperature change and no roof surface change", () => {
    const a: Action = { id: "s", intervention: "solar", target: { kind: "building", building: B(1) } };
    const c = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, baseline).change!;
    expect(c.airDeltaF).toBe(0);
    expect(c.roofSurfaceF).toBeNull();
    expect(c.energyNotQuantified).toBe(false);
  });

  it("an area averages hexes with data and picks up overlapping area actions", () => {
    const sel = { kind: "area" as const, cells: [CELL, N1, N2] };
    const trees: Action = { id: "t", intervention: "street-trees", target: { kind: "area", cells: [N1] } };
    const m = selectionMetrics(sel, [trees], byId, baseline);
    expect(m.level).toBe("area mean");
    expect(m.before.air).toBe(92.5); // N2 has no air data
    expect(m.before.surface).toBeCloseTo(101, 9);
    expect(m.change!.airDeltaF).toBeCloseTo(-0.126 / 2, 3);
    expect(m.change!.roofSurfaceF).toBeNull();
    expect(selectionMetrics({ kind: "area", cells: [CELL] }, [trees], byId, baseline).change).toBeNull();
  });

  it("heat-island % is n/a when the selection is at or below +0.5 °F", () => {
    const a: Action = { id: "a", intervention: "green-roof", target: { kind: "building", building: B(1) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, { air: 92.6, surface: 95 });
    expect(m.change!.heatIslandPct).toBeNull();
  });
});
