import { describe, expect, it } from "vitest";
import { TILE_AREA_M2, neighbourhood, tileIdAt } from "@/lib/grid";
import { computeDeltas } from "@/lib/cooling";
import { capitalCost, energyEstimate, heatIslandChangePct } from "@/lib/impact";
import { selectionMetrics } from "@/lib/metrics";
import type { Action, CellTemps, SelectedBuilding } from "@/lib/types";
import { CATALOG } from "@/lib/interventions";
const TREE_AIR = CATALOG["street-trees"].airCoefficient.deltaFPerShare!; // +0.30 canopy: −0.21 °C

const CELL = tileIdAt([-71.06, 42.3555]);
const [N1, N2] = neighbourhood(CELL, 1).filter((c) => c !== CELL);
const hexes: CellTemps[] = [
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
  primaryTile: CELL,
  tiles: [{ id: CELL, overlapM2: roofAreaM2 }],
});
const v = (r: { kind: string; value?: { central: number } }) => r.value!.central;

describe("selectionMetrics", () => {
  it("current conditions for a building are its hex values; no change without actions", () => {
    const m = selectionMetrics({ kind: "building", building: B(1) }, [], byId, baseline);
    expect(m.level).toBe("building tile");
    expect(m.before).toEqual({ air: 93, surface: 105, heatIslandF: 2 });
    expect(m.change).toBeNull();
  });

  it("a green roof: tile air and surface change, heat-island %, cost, energy, peak-summer roof change", () => {
    const a: Action = { id: "a", intervention: "green-roof", target: { kind: "building", building: B(1) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, baseline);
    const d = computeDeltas([a], byId).get(CELL)!;
    expect(m.change!.airDeltaF).toBeCloseTo(d.air, 9);
    // Air spreads over the neighbourhood tiles present in the data: CELL, N1, N2.
    expect(m.change!.airDeltaF).toBeCloseTo((-5 * 1500) / (3 * TILE_AREA_M2), 9);
    expect(m.change!.surfaceDeltaF).toBeCloseTo((-56 * 1500) / TILE_AREA_M2, 9);
    expect(m.change!.surfaceDeltaF).toBeCloseTo(d.surface, 9);
    expect(m.change!.heatIslandPct).toBeCloseTo(heatIslandChangePct(2, 2 + d.air)!, 9);
    expect(m.change!.totals.capital.central).toBeCloseTo(v(capitalCost(a) as never), 6);
    expect(m.change!.totals.usd.central).toBeCloseTo(v(energyEstimate(a).usd as never), 6);
    expect(m.change!.energyNotQuantified).toBe(true); // green roof kWh is not quantified
    expect(m.change!.roofSurfaceF).toBe(-56);
  });

  it("tile temperatures include other buildings' actions nearby, but cost covers this building only", () => {
    const mine: Action = { id: "a", intervention: "cool-building", target: { kind: "building", building: B(1) } };
    const other: Action = { id: "b", intervention: "green-roof", target: { kind: "building", building: B(2) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [mine, other], byId, baseline);
    expect(m.change!.airDeltaF).toBeCloseTo(computeDeltas([mine, other], byId).get(CELL)!.air, 9);
    expect(m.change!.totals.capital.central).toBeCloseTo(v(capitalCost(mine) as never), 6);
    expect(m.change!.roofSurfaceF).toBe(-55);
  });

  it("solar alone: a small air change and the shaded-roof surface change", () => {
    const a: Action = { id: "s", intervention: "solar", target: { kind: "building", building: B(1) } };
    const c = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, baseline).change!;
    expect(c.airDeltaF!).toBeLessThan(0);
    expect(c.airDeltaF!).toBeGreaterThan(-0.1);
    expect(c.roofSurfaceF).toBe(-15);
    expect(c.energyNotQuantified).toBe(false);
  });

  it("an area averages hexes with data and picks up overlapping area actions", () => {
    const sel = { kind: "area" as const, cells: [CELL, N1, N2] };
    const trees: Action = { id: "t", intervention: "street-trees", target: { kind: "area", cells: [N1] } };
    const m = selectionMetrics(sel, [trees], byId, baseline);
    expect(m.level).toBe("area mean");
    expect(m.before.air).toBe(92.5); // N2 has no air data
    expect(m.before.surface).toBeCloseTo(101, 9);
    // N1 is treated; CELL, its neighbour, gets half of N1's change as spillover. N2 has no air data.
    expect(m.change!.airDeltaF).toBeCloseTo((TREE_AIR + TREE_AIR / 2) / 2, 9);
    expect(m.change!.roofSurfaceF).toBeNull();
    expect(selectionMetrics({ kind: "area", cells: [CELL] }, [trees], byId, baseline).change).toBeNull();
  });

  it("heat-island % is n/a when the selection is at or below +0.5 °F", () => {
    const a: Action = { id: "a", intervention: "green-roof", target: { kind: "building", building: B(1) } };
    const m = selectionMetrics({ kind: "building", building: B(1) }, [a], byId, { air: 92.6, surface: 95 });
    expect(m.change!.heatIslandPct).toBeNull();
  });
});
