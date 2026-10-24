import { gridDisk, latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { applyDeltas, computeDeltas } from "@/lib/cooling";
import { HEX_AREA_M2 } from "@/lib/geo";
import type { Action, BuildingIntervention, Hex, SelectedBuilding } from "@/lib/types";

const CELL = latLngToCell(42.3555, -71.06, 10);
const NEIGHBOURS = gridDisk(CELL, 1).filter((c) => c !== CELL);

let n = 0;
const building = (roofAreaM2: number, cell = CELL): SelectedBuilding => ({
  id: ++n,
  footprint: { type: "Polygon", coordinates: [] },
  heightM: 20,
  roofAreaM2,
  cell,
});
const onBuilding = (intervention: BuildingIntervention, roofAreaM2: number, cell = CELL): Action => ({
  id: `a${++n}`,
  intervention,
  target: { kind: "building", building: building(roofAreaM2, cell) },
});
const trees = (cells: string[]): Action => ({ id: `a${++n}`, intervention: "street-trees", target: { kind: "area", cells } });

describe("computeDeltas", () => {
  it("is empty with no actions", () => {
    expect(computeDeltas([]).size).toBe(0);
  });

  it("a 1,000 m² cool-building roof cools its hex by about 0.22 °F", () => {
    const d = computeDeltas([onBuilding("cool-building", 1000)]).get(CELL)!;
    expect(d.air).toBeCloseTo(-0.22, 2);
    expect(Math.abs(d.air + 0.22)).toBeLessThanOrEqual(0.01);
    expect(d.surface).toBeCloseTo((-55 * 1000) / HEX_AREA_M2, 6);
  });

  it("street trees over a fully selected hex give -0.07 °C (-0.13 °F)", () => {
    const d = computeDeltas([trees([CELL])]).get(CELL)!;
    expect(d.air).toBeCloseTo(-0.126, 3);
    expect(d.surface).toBe(0); // not quantified
  });

  it("two actions in one hex add; neighbours are unchanged", () => {
    const a = onBuilding("cool-building", 1000);
    const b = onBuilding("green-roof", 2000);
    const sum = computeDeltas([a]).get(CELL)!.air + computeDeltas([b]).get(CELL)!.air;
    const deltas = computeDeltas([a, b]);
    expect(deltas.get(CELL)!.air).toBeCloseTo(sum, 9);
    for (const c of NEIGHBOURS) expect(deltas.has(c)).toBe(false);
  });

  it("caps the total share in a hex at 1", () => {
    // Two green roofs each covering the whole hex: total share 2 -> scaled to 1.
    const d = computeDeltas([onBuilding("green-roof", HEX_AREA_M2), onBuilding("green-roof", HEX_AREA_M2)]).get(CELL)!;
    expect(d.air).toBeCloseTo(-5, 9);
    // A single roof larger than the hex is capped too.
    expect(computeDeltas([onBuilding("green-roof", 3 * HEX_AREA_M2)]).get(CELL)!.air).toBeCloseTo(-5, 9);
  });

  it("solar and green walls give no air or surface change and take no share", () => {
    expect(computeDeltas([onBuilding("solar", 5000), onBuilding("green-walls", 5000)]).size).toBe(0);
    const withSolar = computeDeltas([onBuilding("solar", HEX_AREA_M2), onBuilding("cool-building", 1000)]);
    expect(withSolar.get(CELL)!.air).toBeCloseTo(computeDeltas([onBuilding("cool-building", 1000)]).get(CELL)!.air, 9);
  });

  it("green roof + solar cools like a green roof", () => {
    const a = computeDeltas([onBuilding("green-roof-solar", 1500)]).get(CELL)!;
    const b = computeDeltas([onBuilding("green-roof", 1500)]).get(CELL)!;
    expect(a).toEqual(b);
  });

  it("an area action touches each selected cell once", () => {
    const cells = [CELL, NEIGHBOURS[0], CELL];
    const d = computeDeltas([trees(cells)]);
    expect([...d.keys()].sort()).toEqual([CELL, NEIGHBOURS[0]].sort());
  });

  it("runs 50 actions across the 8,044-hex grid in under 20 ms", () => {
    const disk = gridDisk(CELL, 51).slice(0, 8044);
    const hexes: Hex[] = disk.map((id) => ({ id, temp3pm: 91, surface: 100 }));
    const actions = Array.from({ length: 50 }, (_, i) =>
      i % 2 ? onBuilding("cool-building", 1200, disk[i * 37]) : trees(disk.slice(i * 20, i * 20 + 10)),
    );
    computeDeltas(actions); // warm up
    const t0 = performance.now();
    applyDeltas(hexes, computeDeltas(actions));
    expect(performance.now() - t0).toBeLessThan(20);
  });
});

describe("applyDeltas", () => {
  it("applies deltas to treated hexes, leaves others and null bases alone", () => {
    const hexes: Hex[] = [
      { id: CELL, temp3pm: 92, surface: 100 },
      { id: NEIGHBOURS[0], temp3pm: 91, surface: 99 },
      { id: NEIGHBOURS[1], temp3pm: null, surface: null },
    ];
    const deltas = computeDeltas([trees([CELL, NEIGHBOURS[1]])]);
    const [a, b, c] = applyDeltas(hexes, deltas);
    expect(a.temp3pmAfter).toBeCloseTo(92 - 0.126, 3);
    expect(a.surfaceAfter).toBe(100);
    expect(b.temp3pmAfter).toBe(91);
    expect(c.temp3pmAfter).toBeNull();
    expect(c.surfaceAfter).toBeNull();
  });
});
