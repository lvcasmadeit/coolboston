import { describe, expect, it } from "vitest";
import { createRoofLayer, ROOF_COLORS, ROOF_OFFSET_M, roofMarkers } from "@/components/layers/RoofLayer";
import { BUILDING_INTERVENTIONS, type Action, type BuildingIntervention, type SelectedBuilding } from "@/lib/types";

const RING = [[-71.06, 42.35], [-71.059, 42.35], [-71.059, 42.351], [-71.06, 42.35]];
const B = (heightM: number | null): SelectedBuilding => ({ id: 1, footprint: { type: "Polygon", coordinates: [RING] }, heightM, roofAreaM2: 900, cell: "c" });
const on = (intervention: BuildingIntervention, heightM: number | null = 30): Action => ({ id: intervention, intervention, target: { kind: "building", building: B(heightM) } });

describe("roof markers", () => {
  it("one marker per building action, capped at the building height; area actions have none", () => {
    const m = roofMarkers([on("green-roof"), { id: "t", intervention: "street-trees", target: { kind: "area", cells: ["c"] } }]);
    expect(m).toHaveLength(1);
    expect(m[0].intervention).toBe("green-roof");
    expect(m[0].polygon[0].every((p) => p[2] === 30 + ROOF_OFFSET_M)).toBe(true);
  });

  it("buildings with unknown height sit at ground level", () => {
    expect(roofMarkers([on("solar", null)])[0].polygon[0][0][2]).toBe(ROOF_OFFSET_M);
  });

  it("removing the action removes its marker", () => {
    const actions = [on("green-roof"), on("green-walls")];
    expect(roofMarkers(actions.slice(1)).map((m) => m.intervention)).toEqual(["green-walls"]);
  });

  it("each intervention has a distinct colour; green walls are an outline", () => {
    const keys = BUILDING_INTERVENTIONS.map((i) => ROOF_COLORS[i].join(","));
    expect(new Set(keys).size).toBe(BUILDING_INTERVENTIONS.length);
    expect(roofMarkers([on("green-walls")])[0].outlineOnly).toBe(true);
  });

  it("splits MultiPolygon footprints and carries opacity in alpha", () => {
    const multi: Action = {
      id: "m",
      intervention: "cool-building",
      target: { kind: "building", building: { ...B(10), footprint: { type: "MultiPolygon", coordinates: [[RING], [RING]] } } },
    };
    expect(roofMarkers([multi])).toHaveLength(2);
    const layer = createRoofLayer([multi], 0.5);
    const fill = (layer.props.getFillColor as unknown as (d: unknown) => number[])(roofMarkers([multi])[0]);
    expect(fill).toEqual([...ROOF_COLORS["cool-building"], 128]);
  });
});
