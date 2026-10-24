import { describe, expect, it } from "vitest";
import { tileIdAt } from "@/lib/grid";
import { footprintCentroid } from "@/lib/geo";
import { toSelectedBuilding } from "@/lib/buildings";

// ~30 m × 30 m near Downtown Crossing
const RING = [
  [-71.0602, 42.3554],
  [-71.05984, 42.3554],
  [-71.05984, 42.35567],
  [-71.0602, 42.35567],
  [-71.0602, 42.3554],
];
const feature = (over: object = {}) => ({
  id: 117853075,
  geometry: { type: "Polygon", coordinates: [RING] },
  properties: { group: "building-3d", height: 210.5, min_height: 0 },
  ...over,
});

describe("toSelectedBuilding", () => {
  it("maps id, footprint, height, roof area and its tiles", () => {
    const b = toSelectedBuilding(feature());
    expect(b).not.toBeNull();
    expect(b!.id).toBe(117853075);
    expect(b!.footprint).toEqual({ type: "Polygon", coordinates: [RING] });
    expect(b!.heightM).toBe(210.5);
    expect(b!.roofAreaM2).toBeGreaterThan(800);
    expect(b!.roofAreaM2).toBeLessThan(1000);
    expect(b!.primaryTile).toBe(tileIdAt(footprintCentroid({ type: "Polygon", coordinates: [RING] })));
    expect(b!.tiles).toEqual([{ id: b!.primaryTile, overlapM2: expect.closeTo(b!.roofAreaM2, -1) }]);
  });

  it.each([
    ["missing", {}],
    ["null", { height: null }],
    ["zero", { height: 0 }],
    ["a string", { height: "30" }],
  ])("a %s height becomes null, not zero", (_l, properties) => {
    expect(toSelectedBuilding(feature({ properties }))!.heightM).toBeNull();
  });

  it("null properties still map, with a null height", () => {
    expect(toSelectedBuilding(feature({ properties: null }))!.heightM).toBeNull();
  });

  it("rejects features without an id or with non-polygon geometry", () => {
    expect(toSelectedBuilding(feature({ id: undefined }))).toBeNull();
    expect(toSelectedBuilding(feature({ id: null }))).toBeNull();
    expect(toSelectedBuilding(feature({ geometry: { type: "Point", coordinates: [-71, 42] } }))).toBeNull();
  });

  it("accepts MultiPolygon footprints", () => {
    const b = toSelectedBuilding(feature({ geometry: { type: "MultiPolygon", coordinates: [[RING]] } }));
    expect(b!.footprint.type).toBe("MultiPolygon");
  });
});
