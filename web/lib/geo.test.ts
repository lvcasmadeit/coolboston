import { describe, expect, it } from "vitest";
import { footprintAreaM2, footprintCentroid, footprintPerimeterM } from "@/lib/geo";
import type { Footprint } from "@/lib/types";

// ~100 m × 100 m square centred near Downtown Crossing.
const LAT = 42.3555;
const LNG = -71.06;
const dLat = 100 / 111_320 / 2;
const dLng = 100 / (111_320 * Math.cos((LAT * Math.PI) / 180)) / 2;
const square = (cx: number, cy: number, hx: number, hy: number) => [
  [cx - hx, cy - hy],
  [cx + hx, cy - hy],
  [cx + hx, cy + hy],
  [cx - hx, cy + hy],
  [cx - hx, cy - hy],
];
const SQUARE: Footprint = { type: "Polygon", coordinates: [square(LNG, LAT, dLng, dLat)] };

describe("footprintAreaM2", () => {
  it("a ~100 m square is within 1% of 10,000 m²", () => {
    expect(Math.abs(footprintAreaM2(SQUARE) - 10_000) / 10_000).toBeLessThan(0.01);
  });

  it("is independent of ring winding", () => {
    const reversed: Footprint = { type: "Polygon", coordinates: [[...SQUARE.coordinates[0]].reverse()] };
    expect(footprintAreaM2(reversed)).toBeCloseTo(footprintAreaM2(SQUARE), 6);
  });

  it("subtracts a hole", () => {
    const withHole: Footprint = {
      type: "Polygon",
      coordinates: [square(LNG, LAT, dLng, dLat), square(LNG, LAT, dLng / 2, dLat / 2)],
    };
    expect(footprintAreaM2(withHole) / footprintAreaM2(SQUARE)).toBeCloseTo(0.75, 3);
  });

  it("sums a MultiPolygon", () => {
    const multi: Footprint = {
      type: "MultiPolygon",
      coordinates: [SQUARE.coordinates, [square(LNG + 0.01, LAT, dLng, dLat)]],
    };
    expect(footprintAreaM2(multi) / footprintAreaM2(SQUARE)).toBeCloseTo(2, 3);
  });
});

describe("footprintPerimeterM", () => {
  it("a ~100 m square has a ~400 m perimeter (closed ring, no double count)", () => {
    expect(footprintPerimeterM(SQUARE)).toBeGreaterThan(396);
    expect(footprintPerimeterM(SQUARE)).toBeLessThan(404);
  });
});

describe("footprintCentroid", () => {
  it("centroid of an L shape is area-weighted, not a vertex average", () => {
    const L: Footprint = {
      type: "Polygon",
      coordinates: [[[0, 0], [2, 0], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]]],
    };
    const [x, y] = footprintCentroid(L);
    // Two rectangles: 2×1 at (1, 0.5) and 1×2 at (0.5, 2) -> (0.75, 1.25)
    expect(x).toBeCloseTo(0.75, 9);
    expect(y).toBeCloseTo(1.25, 9);
  });
});
