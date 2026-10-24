import { latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { HEX_AREA_M2, footprintPerimeterM } from "@/lib/geo";
import {
  HEAT_ISLAND_MIN_F,
  capitalCost,
  computeBaseline,
  energyEstimate,
  greenWallAreaM2,
  heatIslandChangePct,
  heatIslandF,
  solarKw,
  totals,
  type Estimate,
} from "@/lib/impact";
import { CATALOG } from "@/lib/interventions";
import type { Action, BuildingIntervention, Hex, SelectedBuilding } from "@/lib/types";

const CELL = latLngToCell(42.3555, -71.06, 10);
// ~30 m × 30 m footprint
const RING = [[-71.0602, 42.3554], [-71.05984, 42.3554], [-71.05984, 42.35567], [-71.0602, 42.35567], [-71.0602, 42.3554]];
const B = (roofAreaM2: number, heightM: number | null = 20): SelectedBuilding => ({
  id: 1,
  footprint: { type: "Polygon", coordinates: [RING] },
  heightM,
  roofAreaM2,
  cell: CELL,
});
const on = (intervention: BuildingIntervention, b: SelectedBuilding): Action => ({ id: "x", intervention, target: { kind: "building", building: b } });
const v = (e: Estimate) => {
  if (e.kind !== "range") throw new Error(`not quantified: ${e.reason}`);
  return e.value;
};

describe("baseline and heat island", () => {
  const hexes: Hex[] = [
    { id: "a", temp3pm: 90, surface: 100 },
    { id: "b", temp3pm: 92, surface: null },
    { id: "c", temp3pm: null, surface: 110 },
  ];

  it("means use valid hexes only", () => {
    expect(computeBaseline(hexes)).toEqual({ air: 91, surface: 105 });
  });

  it("H = T − mean; null stays null", () => {
    expect(heatIslandF(92, 91)).toBe(1);
    expect(heatIslandF(null, 91)).toBeNull();
  });

  it("2.0 → 1.9 °F is a 5% change", () => {
    expect(heatIslandChangePct(2.0, 1.9)).toBeCloseTo(5, 9);
  });

  it("is n/a at exactly 0.5 °F and below, defined just above", () => {
    expect(HEAT_ISLAND_MIN_F).toBe(0.5);
    expect(heatIslandChangePct(0.5, 0.4)).toBeNull();
    expect(heatIslandChangePct(-1, -1.2)).toBeNull();
    expect(heatIslandChangePct(0.5000001, 0.4)).not.toBeNull();
    expect(heatIslandChangePct(2, null)).toBeNull();
  });
});

describe("capital cost", () => {
  it("roof actions are roof area × unit cost", () => {
    const c = v(capitalCost(on("green-roof", B(1000))));
    const line = CATALOG["green-roof"].costPerUnit[0];
    expect(c).toEqual({ low: line.low * 1000, central: line.central * 1000, high: line.high * 1000 });
  });

  it("solar is installed watts × $/W, with roof share by building size", () => {
    // Size classes: small < 464.5 m² (5,000 ft²), large > 2,322.6 m² (25,000 ft²).
    const kw = solarKw(B(1000));
    expect(kw.central).toBeCloseTo(1000 * 0.49 * 0.126, 9);
    expect(solarKw(B(300)).central).toBeCloseTo(300 * 0.26 * 0.126, 9);
    expect(solarKw(B(5000)).central).toBeCloseTo(5000 * 0.66 * 0.126, 9);
    expect(v(capitalCost(on("solar", B(1000)))).central).toBeCloseTo(kw.central * 1000 * 3.35, 6);
  });

  it("green roof + solar costs the sum of its parts", () => {
    const b = B(1000);
    const sum = v(capitalCost(on("green-roof", b))).central + v(capitalCost(on("solar", b))).central;
    expect(v(capitalCost(on("green-roof-solar", b))).central).toBeCloseTo(sum, 6);
  });

  it("green walls use perimeter × min(height, 10 m); unknown height is not quantified", () => {
    expect(greenWallAreaM2(B(900, 40))).toBeCloseTo(footprintPerimeterM(B(900).footprint) * 10, 6);
    expect(greenWallAreaM2(B(900, 6))).toBeCloseTo(footprintPerimeterM(B(900).footprint) * 6, 6);
    expect(capitalCost(on("green-walls", B(900, null))).kind).toBe("not-quantified");
  });

  it("street trees are selected ground area × $/m²", () => {
    const a: Action = { id: "t", intervention: "street-trees", target: { kind: "area", cells: [CELL, CELL] } };
    expect(v(capitalCost(a)).central).toBeCloseTo(HEX_AREA_M2 * CATALOG["street-trees"].costPerUnit[0].central, 6);
  });

  it("every range stays ordered", () => {
    for (const id of ["solar", "green-roof", "cool-building", "green-walls", "green-roof-solar"] as const) {
      const c = v(capitalCost(on(id, B(1000))));
      expect(c.low).toBeLessThanOrEqual(c.central);
      expect(c.central).toBeLessThanOrEqual(c.high);
    }
  });
});

describe("energy", () => {
  it("solar = usable area × kW/m² × yield, $ at the commercial rate", () => {
    const e = energyEstimate(on("solar", B(1000)));
    const kwh = v(e.kwh);
    expect(kwh.central).toBeCloseTo(1000 * 0.49 * 0.126 * 1305, 6);
    expect(kwh.low).toBeCloseTo(1000 * 0.49 * 0.112 * 1268, 6);
    expect(v(e.usd).central).toBeCloseTo(kwh.central * 0.2466, 6);
  });

  it("cool building: kWh/m² × roof, valued at the commercial rate", () => {
    const e = energyEstimate(on("cool-building", B(1000)));
    expect(v(e.kwh)).toEqual({ low: 3300, central: 5020, high: 7690 });
    expect(v(e.usd).central).toBeCloseTo(5020 * 0.2466, 6);
  });

  it("green roof is dollars only; green walls and trees are not quantified", () => {
    const g = energyEstimate(on("green-roof", B(1000)));
    expect(g.kwh.kind).toBe("not-quantified");
    expect(v(g.usd).central).toBeCloseTo(650, 6);
    expect(energyEstimate(on("green-walls", B(1000))).usd).toEqual({
      kind: "not-quantified",
      reason: "No per m² source for a temperate climate.",
    });
    const t: Action = { id: "t", intervention: "street-trees", target: { kind: "area", cells: [CELL] } };
    expect(energyEstimate(t).kwh.kind).toBe("not-quantified");
  });

  it("green roof + solar: kWh from solar, $ from both parts", () => {
    const b = B(1000);
    const c = energyEstimate(on("green-roof-solar", b));
    expect(v(c.kwh)).toEqual(v(energyEstimate(on("solar", b)).kwh));
    expect(v(c.usd).central).toBeCloseTo(v(energyEstimate(on("solar", b)).usd).central + 650, 6);
  });
});

describe("totals", () => {
  it("sums quantified values and counts unquantified capital", () => {
    const actions = [on("green-roof", B(1000)), on("cool-building", B(500)), on("green-walls", B(500, null))];
    const t = totals(actions);
    expect(t.capital.central).toBeCloseTo(
      v(capitalCost(actions[0])).central + v(capitalCost(actions[1])).central,
      6,
    );
    expect(t.capitalNotQuantified).toBe(1);
    expect(t.kwh.central).toBeCloseTo(2510, 6);
    expect(totals([]).capital).toEqual({ low: 0, central: 0, high: 0 });
  });
});
