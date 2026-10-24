import { describe, expect, it } from "vitest";
import { TILE_AREA_M2, neighbourhood, tileIdAt } from "@/lib/grid";
import { SPILLOVER, applyDeltas, computeDeltas } from "@/lib/cooling";
import type { Action, BuildingIntervention, CellTemps, SelectedBuilding } from "@/lib/types";
import { CATALOG } from "@/lib/interventions";
const TREE_AIR = CATALOG["street-trees"].airCoefficient.deltaFPerShare!; // +0.30 canopy: −0.21 °C

const CELL = tileIdAt([-71.06, 42.3555]);
const NEIGHBOURS = neighbourhood(CELL, 1).filter((c) => c !== CELL);
/** Rings a building's air change reaches: the 5 × 5 spread plus the spillover rings. */
const AIR_REACH = () => 2 + SPILLOVER.length;

let n = 0;
const building = (roofAreaM2: number, cell = CELL): SelectedBuilding => ({
  id: ++n,
  footprint: { type: "Polygon", coordinates: [] },
  heightM: 20,
  roofAreaM2,
  primaryTile: cell,
  tiles: [{ id: cell, overlapM2: roofAreaM2 }],
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

  it("a 1,000 m² cool-building roof: air spread over 25 tiles, surface on its own tile plus spillover", () => {
    const d = computeDeltas([onBuilding("cool-building", 1000)]);
    // -0.61 °C per +0.1 albedo × 3 = -3.29 °F at full share; air share 1,000 / (25 × 10,000).
    const air = -3.294 * (1000 / 250_000);
    for (const id of neighbourhood(CELL, 2)) expect(d.get(id)!.air).toBeCloseTo(air, 6);
    const surface = (-55 * 1000) / TILE_AREA_M2;
    expect(d.get(CELL)!.surface).toBeCloseTo(surface, 6);
    expect(d.get(NEIGHBOURS[0])!.surface).toBeCloseTo(surface * SPILLOVER[0], 6);
    // Air spills 1–2 rings beyond the 5 × 5: 9 × 9 tiles touched in all.
    expect(d.size).toBe(81);
    const ring3 = neighbourhood(CELL, 3).filter((c) => !neighbourhood(CELL, 2).includes(c));
    for (const c of ring3) expect(d.get(c)!.air).toBeCloseTo(air * SPILLOVER[0], 6);
  });

  it("spillover: tiles around a cooled tile cool less, falling off with distance", () => {
    const d = computeDeltas([trees([CELL])]);
    const direct = d.get(CELL)!.air;
    expect(direct).toBeLessThan(0);
    for (const c of NEIGHBOURS) expect(d.get(c)!.air).toBeCloseTo(direct * SPILLOVER[0], 9);
    const ring2 = neighbourhood(CELL, 2).filter((c) => !neighbourhood(CELL, 1).includes(c));
    for (const c of ring2) expect(d.get(c)!.air).toBeCloseTo(direct * SPILLOVER[1], 9);
    expect(d.size).toBe(25);
    for (const c of neighbourhood(CELL, 3)) if (!d.has(c)) expect(neighbourhood(CELL, 2)).not.toContain(c);
  });

  it("spillover never stacks: inside a uniformly treated block every tile keeps its own change", () => {
    const block = neighbourhood(CELL, 2);
    const d = computeDeltas([trees(block)]);
    for (const c of block) expect(d.get(c)!.air).toBeCloseTo(TREE_AIR, 9);
  });

  it("spillover only reaches tiles in the data", () => {
    const land = new Map([[CELL, { id: CELL }], [NEIGHBOURS[0], { id: NEIGHBOURS[0] }]]);
    expect([...computeDeltas([trees([CELL])], land).keys()].sort()).toEqual([CELL, NEIGHBOURS[0]].sort());
  });

  it("worked example (SPEC-square-grid): a 5,164 m² green roof half-covering its tile", () => {
    const d = computeDeltas([onBuilding("green-roof", 5164)]);
    expect(d.get(NEIGHBOURS[3])!.air).toBeCloseTo(-0.103, 3); // ≈ −0.1 °F on every neighbourhood tile
    expect(d.get(CELL)!.surface).toBeCloseTo(-28.9, 1); // ≈ −29 °F on the tile it half covers
  });

  it("a footprint straddling two tiles cools the surface of both by their overlap", () => {
    const [east] = neighbourhood(CELL, 1).filter((c) => c !== CELL).slice(-1);
    const b: SelectedBuilding = { ...building(2000), tiles: [{ id: CELL, overlapM2: 1500 }, { id: east, overlapM2: 500 }] };
    const d = computeDeltas([{ id: "x", intervention: "green-roof", target: { kind: "building", building: b } }]);
    expect(d.get(CELL)!.surface).toBeCloseTo(-56 * 0.15, 9);
    // East's own overlap gives −2.8 °F; the larger tile's spillover (½ × −8.4) is stronger and wins.
    expect(d.get(east)!.surface).toBeCloseTo(Math.min(-56 * 0.05, -56 * 0.15 * SPILLOVER[0]), 9);
  });

  it("only tiles in the data share the effect; land area sets the shares", () => {
    const land = new Map([
      [CELL, { id: CELL, landAreaM2: 4000 }],
      [NEIGHBOURS[0], { id: NEIGHBOURS[0], landAreaM2: 6000 }],
    ]);
    const d = computeDeltas([onBuilding("green-roof", 1000)], land);
    expect([...d.keys()].sort()).toEqual([CELL, NEIGHBOURS[0]].sort());
    expect(d.get(CELL)!.air).toBeCloseTo(-5 * (1000 / 10_000), 9); // Σ land of present tiles = 10,000
    expect(d.get(CELL)!.surface).toBeCloseTo(-56 * (1000 / 4000), 9);
  });

  it("a building with no tile in the data has no effect", () => {
    expect(computeDeltas([onBuilding("green-roof", 1000)], new Map()).size).toBe(0);
  });

  it("urban trees over a fully selected tile: −0.21 °C air (−0.38 °F) and shaded surface", () => {
    const d = computeDeltas([trees([CELL])]).get(CELL)!;
    expect(d.air).toBeCloseTo(TREE_AIR, 9);
    expect(TREE_AIR).toBeCloseTo(-0.378, 3);
    expect(d.surface).toBeCloseTo(-32.5 * 0.3, 9);
  });

  it("two actions on one tile add; tiles beyond the 5 × 5 neighbourhood plus spillover are unchanged", () => {
    const a = onBuilding("cool-building", 1000);
    const b = onBuilding("green-roof", 2000);
    const sum = (k: "air" | "surface") => computeDeltas([a]).get(CELL)![k] + computeDeltas([b]).get(CELL)![k];
    const deltas = computeDeltas([a, b]);
    expect(deltas.get(CELL)!.air).toBeCloseTo(sum("air"), 9);
    expect(deltas.get(CELL)!.surface).toBeCloseTo(sum("surface"), 9);
    const reach = AIR_REACH();
    const outside = neighbourhood(CELL, reach + 1).filter((c) => !neighbourhood(CELL, reach).includes(c));
    for (const c of outside) expect(deltas.has(c)).toBe(false);
  });

  it("caps each kind's total share on a tile at 1, separately", () => {
    // Two green roofs each covering the whole tile: surface share 2 -> scaled to 1; air share 2 × 0.04 stays.
    const d = computeDeltas([onBuilding("green-roof", TILE_AREA_M2), onBuilding("green-roof", TILE_AREA_M2)]).get(CELL)!;
    expect(d.surface).toBeCloseTo(-56, 9);
    expect(d.air).toBeCloseTo(-5 * 0.08, 9);
    // Street trees (air share 1) plus a roof's air share on the same tile: air capped at 1.
    const t = computeDeltas([trees([CELL]), onBuilding("green-roof", 2 * 250_000)]).get(CELL)!;
    expect(t.air).toBeCloseTo((TREE_AIR + -5) / 2, 9);
  });

  it("solar and green walls cool their tile, by less than a green roof", () => {
    for (const id of ["solar", "green-walls"] as const) {
      const d = computeDeltas([onBuilding(id, 5000)]).get(CELL)!;
      const g = computeDeltas([onBuilding("green-roof", 5000)]).get(CELL)!;
      expect(d.air).toBeLessThan(0);
      expect(d.surface).toBeLessThan(0);
      expect(d.surface).toBeGreaterThan(g.surface);
    }
    expect(computeDeltas([onBuilding("solar", TILE_AREA_M2)]).get(CELL)!.surface).toBe(-15);
  });

  it("green roof + solar cools like a green roof", () => {
    const a = computeDeltas([onBuilding("green-roof-solar", 1500)]).get(CELL)!;
    const b = computeDeltas([onBuilding("green-roof", 1500)]).get(CELL)!;
    expect(a).toEqual(b);
  });

  it("an area action treats each selected cell once", () => {
    const once = computeDeltas([trees([CELL, NEIGHBOURS[0]])]);
    const twice = computeDeltas([trees([CELL, NEIGHBOURS[0], CELL])]);
    expect(twice).toEqual(once);
    expect(once.get(CELL)!.air).toBeCloseTo(TREE_AIR, 9);
  });

  it("runs 50 actions across a 13,562-tile grid in under 20 ms", () => {
    const disk = neighbourhood(CELL, 58).slice(0, 13_562);
    const hexes: CellTemps[] = disk.map((id) => ({ id, temp3pm: 91, surface: 100 }));
    const actions = Array.from({ length: 50 }, (_, i) =>
      i % 2 ? onBuilding("cool-building", 1200, disk[i * 37]) : trees(disk.slice(i * 20, i * 20 + 10)),
    );
    applyDeltas(hexes, computeDeltas(actions)); // warm up both (JIT)
    const t0 = performance.now();
    applyDeltas(hexes, computeDeltas(actions));
    expect(performance.now() - t0).toBeLessThan(20);
  });
});

describe("applyDeltas", () => {
  it("applies deltas to treated hexes, leaves others and null bases alone", () => {
    const hexes: CellTemps[] = [
      { id: CELL, temp3pm: 92, surface: 100 },
      { id: NEIGHBOURS[0], temp3pm: 91, surface: 99 },
      { id: NEIGHBOURS[1], temp3pm: null, surface: null },
    ];
    const far = neighbourhood(CELL, 3)[0]; // 3 tiles away: beyond the spillover
    hexes[1] = { ...hexes[1], id: far };
    const deltas = computeDeltas([trees([CELL, NEIGHBOURS[1]])]);
    const [a, b, c] = applyDeltas(hexes, deltas);
    expect(a.temp3pmAfter).toBeCloseTo(92 + TREE_AIR, 9);
    expect(a.surfaceAfter).toBeCloseTo(100 - 32.5 * 0.3, 9);
    expect(b.temp3pmAfter).toBe(91);
    expect(c.temp3pmAfter).toBeNull();
    expect(c.surfaceAfter).toBeNull();
  });
});
