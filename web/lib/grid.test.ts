import { describe, expect, it } from "vitest";
import { footprintAreaM2 } from "@/lib/geo";
import { TILE_AREA_M2, cellCentre, cellPolygons, fromStatePlane, parseTileId, tileCentre, tileId, tileIdAt, tileRing, toStatePlane } from "@/lib/grid";

// pyproj 3.8.0, EPSG:4326 -> EPSG:26986 (always_xy), as used by the pipeline.
const REFERENCE: [[number, number], [number, number]][] = [
  [[-71.0589, 42.3601], [236337.3938, 901160.6397]],
  [[-71.19, 42.23], [225590.0797, 886662.2939]],
  [[-70.99, 42.4], [241986.747, 905624.1887]],
];

describe("State Plane projection", () => {
  it.each(REFERENCE)("matches pyproj at %j to within 1 cm", (lngLat, xy) => {
    const [x, y] = toStatePlane(lngLat);
    expect(Math.abs(x - xy[0])).toBeLessThan(0.01);
    expect(Math.abs(y - xy[1])).toBeLessThan(0.01);
  });

  it.each(REFERENCE)("inverts back to %j", (lngLat, xy) => {
    const [lng, lat] = fromStatePlane(xy);
    expect(lng).toBeCloseTo(lngLat[0], 7);
    expect(lat).toBeCloseTo(lngLat[1], 7);
  });
});

describe("tile ids", () => {
  it("round-trips i and j, including negatives", () => {
    expect(tileId(2363, 9011)).toBe("2363_9011");
    expect(parseTileId("2363_9011")).toEqual([2363, 9011]);
    expect(parseTileId("-3_7")).toEqual([-3, 7]);
  });

  it("rejects anything that is not a tile id", () => {
    for (const bad of ["", "8a2a1072b59ffff", "1_", "1_2_3", "a_b"]) expect(() => parseTileId(bad)).toThrow();
  });

  it("finds the tile containing a point, and that tile's centre lies in it", () => {
    const id = tileIdAt([-71.0589, 42.3601]); // x 236337, y 901160
    expect(id).toBe("2363_9011");
    expect(tileIdAt(tileCentre(id))).toBe(id);
    const [x, y] = toStatePlane(tileCentre(id));
    expect(x).toBeCloseTo(236_350, 3);
    expect(y).toBeCloseTo(901_150, 3);
  });

  it("full tile area is 10,000 m²", () => {
    expect(TILE_AREA_M2).toBe(10_000);
  });
});

describe("cell geometry", () => {
  it("rebuilds a full tile as a closed 100 m square", () => {
    const ring = tileRing("2363_9011");
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    // geo.ts measures on a sphere of the equatorial radius, ~0.1% high at Boston's latitude.
    expect(Math.abs(footprintAreaM2({ type: "Polygon", coordinates: [ring] }) / TILE_AREA_M2 - 1)).toBeLessThan(0.002);
    expect(cellPolygons({ id: "2363_9011", coords: null })).toEqual([[ring]]);
    expect(cellCentre({ id: "2363_9011", coords: null })).toEqual(tileCentre("2363_9011"));
  });

  it("uses a clipped tile's own coords and their centroid", () => {
    const coords = [[[[-71.06, 42.36], [-71.059, 42.36], [-71.059, 42.361], [-71.06, 42.361], [-71.06, 42.36]]]];
    expect(cellPolygons({ id: "1_1", coords })).toBe(coords);
    const [lng, lat] = cellCentre({ id: "1_1", coords });
    // footprintCentroid's planar cross products lose ~1e-5° to cancellation at these magnitudes.
    expect(lng).toBeCloseTo(-71.0595, 4);
    expect(lat).toBeCloseTo(42.3605, 4);
  });
});
