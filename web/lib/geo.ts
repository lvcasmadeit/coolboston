/** Geometry helpers for building footprints and the H3 res-10 grid. */
import { getHexagonAreaAvg, latLngToCell } from "h3-js";
import type { Footprint } from "@/lib/types";

export const H3_RESOLUTION = 10;

/** Average res-10 hexagon area from h3 (~15,047 m²). Boston cells run ~3% larger than average. */
export const HEX_AREA_M2 = getHexagonAreaAvg(H3_RESOLUTION, "m2");

// WGS84 semi-major axis; same constant and spherical-excess method as @turf/area.
const EARTH_RADIUS_M = 6378137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Signed spherical area of a ring of [lng, lat] (positive for counter-clockwise). */
function ringAreaM2(ring: number[][]): number {
  const n = ring.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % n];
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return (total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
}

function polygonAreaM2(rings: number[][][]): number {
  const [outer, ...holes] = rings;
  if (!outer) return 0;
  return Math.max(0, Math.abs(ringAreaM2(outer)) - holes.reduce((a, h) => a + Math.abs(ringAreaM2(h)), 0));
}

const polygons = (f: Footprint): number[][][][] => (f.type === "Polygon" ? [f.coordinates] : f.coordinates);

/** Footprint area in m², holes subtracted. */
export function footprintAreaM2(f: Footprint): number {
  return polygons(f).reduce((a, p) => a + polygonAreaM2(p), 0);
}

const haversineM = ([lng1, lat1]: number[], [lng2, lat2]: number[]) => {
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/** Outer perimeter in m (holes ignored: courtyard walls are not counted). */
export function footprintPerimeterM(f: Footprint): number {
  let total = 0;
  for (const [outer] of polygons(f)) {
    if (!outer) continue;
    for (let i = 0; i < outer.length; i++) total += haversineM(outer[i], outer[(i + 1) % outer.length]);
  }
  return total;
}

/** Area-weighted planar centroid [lng, lat] (holes subtracted). Accurate enough at building scale. */
export function footprintCentroid(f: Footprint): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (const rings of polygons(f)) {
    rings.forEach((ring, i) => {
      // Outer ring adds, holes subtract, regardless of winding.
      let ra = 0;
      let rx = 0;
      let ry = 0;
      for (let j = 0; j < ring.length; j++) {
        const [x1, y1] = ring[j];
        const [x2, y2] = ring[(j + 1) % ring.length];
        const cross = x1 * y2 - x2 * y1;
        ra += cross;
        rx += (x1 + x2) * cross;
        ry += (y1 + y2) * cross;
      }
      const sign = (i === 0 ? 1 : -1) * Math.sign(ra || 1);
      a += sign * ra;
      cx += sign * rx;
      cy += sign * ry;
    });
  }
  if (a === 0) {
    // Degenerate footprint: fall back to the first vertex.
    const [x, y] = polygons(f)[0][0][0];
    return [x, y];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/** H3 res-10 cell containing the footprint centroid. */
export function buildingCell(f: Footprint): string {
  const [lng, lat] = footprintCentroid(f);
  return latLngToCell(lat, lng, H3_RESOLUTION);
}
