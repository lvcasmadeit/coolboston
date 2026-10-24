import { describe, expect, it } from "vitest";
import { CATALOG, COOL_ROOF_ALBEDO_CHANGE, areaActions, buildingActions, type Range } from "@/lib/interventions";
import { AREA_INTERVENTIONS, BUILDING_INTERVENTIONS } from "@/lib/types";

const all = Object.values(CATALOG);

describe("intervention catalog", () => {
  it("has exactly the agreed actions", () => {
    expect(buildingActions().map((a) => a.id)).toEqual([
      "solar",
      "green-roof",
      "cool-building",
      "green-walls",
      "green-roof-solar",
    ]);
    expect(areaActions().map((a) => a.id)).toEqual(["street-trees"]);
    expect(Object.keys(CATALOG)).not.toContain("cool-pavement");
    expect(Object.keys(CATALOG)).not.toContain("depave");
  });

  it("keys match ids and appliesTo matches the building/area lists", () => {
    for (const [key, spec] of Object.entries(CATALOG)) expect(spec.id).toBe(key);
    for (const id of BUILDING_INTERVENTIONS) expect(CATALOG[id].appliesTo).toBe("building");
    for (const id of AREA_INTERVENTIONS) expect(CATALOG[id].appliesTo).toBe("area");
  });

  it("building and area sets are disjoint", () => {
    const b = new Set<string>(BUILDING_INTERVENTIONS);
    expect(AREA_INTERVENTIONS.filter((id) => b.has(id))).toEqual([]);
  });

  it("every action has at least one source with an https URL", () => {
    for (const spec of all) {
      expect(spec.sources.length, spec.id).toBeGreaterThan(0);
      for (const s of spec.sources) {
        expect(s.citation.length).toBeGreaterThan(0);
        expect(s.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("every range is ordered low <= central <= high and positive", () => {
    for (const spec of all) {
      const ranges: Range[] = [...spec.costPerUnit];
      if (spec.energy.kind === "kwh-per-m2" || spec.energy.kind === "usd-per-m2") ranges.push(spec.energy.perM2);
      if (spec.energy.kind === "solar") ranges.push(spec.energy.kwPerM2, spec.energy.kwhPerKwYear);
      for (const r of ranges) {
        expect(r.low, spec.id).toBeGreaterThan(0);
        expect(r.low).toBeLessThanOrEqual(r.central);
        expect(r.central).toBeLessThanOrEqual(r.high);
      }
    }
  });

  it("the combined action is green roof + solar, one roof action, cost lines from both parts", () => {
    const c = CATALOG["green-roof-solar"];
    expect(c.parts).toEqual(["green-roof", "solar"]);
    expect(c.roofAction).toBe(true);
    expect(c.costPerUnit).toEqual([...CATALOG["green-roof"].costPerUnit, ...CATALOG.solar.costPerUnit]);
    expect(c.airCoefficient).toEqual(CATALOG["green-roof"].airCoefficient);
  });

  it("roof rule flags: green walls are not a roof action", () => {
    expect(BUILDING_INTERVENTIONS.filter((id) => !CATALOG[id].roofAction)).toEqual(["green-walls"]);
  });

  it("cooling coefficients match the plan formulas", () => {
    expect(COOL_ROOF_ALBEDO_CHANGE).toBe(0.3);
    // -0.61 °C × 3 = -1.83 °C = -3.294 °F per unit share
    expect(CATALOG["cool-building"].airCoefficient.deltaFPerShare).toBeCloseTo(-3.294, 3);
    expect(CATALOG["street-trees"].airCoefficient.deltaFPerShare).toBeCloseTo(-0.378, 3); // −0.07 °C per +0.1 canopy × 3
    expect(CATALOG["street-trees"].surfaceChange.deltaFPerShare).toBeCloseTo(-9.75, 9); // −32.5 °F × 0.3 shaded
    expect(CATALOG["green-roof"].airCoefficient.deltaFPerShare).toBe(-5);
    expect(CATALOG["green-roof"].surfaceChange.deltaFPerShare).toBe(-56);
    expect(CATALOG["cool-building"].surfaceChange.deltaFPerShare).toBe(-55);
  });

  it("solar and green walls claim modest, labelled cooling", () => {
    expect(CATALOG.solar.airCoefficient.deltaFPerShare).toBeCloseTo(-0.36, 9);
    expect(CATALOG.solar.surfaceChange.deltaFPerShare).toBe(-15);
    expect(CATALOG["green-walls"].airCoefficient.deltaFPerShare).toBeCloseTo(-0.9, 9);
    expect(CATALOG["green-walls"].surfaceChange.deltaFPerShare).toBe(-10);
    for (const id of ["solar", "green-walls"] as const) expect(CATALOG[id].surfaceChange.basis).toMatch(/Assumption/);
  });

  it("labels: Urban trees and Cool roof", () => {
    expect(CATALOG["street-trees"].label).toBe("Urban trees");
    expect(CATALOG["cool-building"].label).toBe("Cool roof");
  });

  it("green walls energy is not quantified", () => {
    expect(CATALOG["green-walls"].energy.kind).toBe("not-quantified");
  });

  it("converts per-ft² costs to per-m²", () => {
    expect(CATALOG["green-roof"].costPerUnit[0].central).toBeCloseTo(18 * 10.7639, 2);
    expect(CATALOG["street-trees"].costPerUnit[0].central).toBeCloseTo((400 / 59.5) * 0.3, 9); // $400 ÷ 59.5 m² × 0.30 canopy
  });
});
