/**
 * The 100 m tile grid (SPEC-square-grid). Pure.
 *
 * Tiles are squares in Massachusetts State Plane Mainland (EPSG:26986, metres): tile (i, j) covers
 * x in [100i, 100i+100), y in [100j, 100j+100), id "{i}_{j}" — the same grid the pipeline builds
 * (pipeline/src/coolboston/grid.py). The projection is a small Lambert Conformal Conic
 * implementation (Snyder 1987, eq. 15-1 to 15-11), so the web needs no proj library; it matches
 * pyproj to millimetres over Boston (lib/grid.test.ts).
 */
import { footprintCentroid } from "@/lib/geo";
import type { Cell, Footprint, MultiPolygonCoords } from "@/lib/types";

export const TILE_SIZE_M = 100;
/** Area of a full (unclipped) tile. */
export const TILE_AREA_M2 = TILE_SIZE_M * TILE_SIZE_M;

// EPSG:26986: GRS80, standard parallels 42°41'N and 41°43'N, origin 41°N 71°30'W, FE 200 km, FN 750 km.
const A = 6378137;
const F = 1 / 298.257222101;
const E = Math.sqrt(2 * F - F * F);
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const LAT1 = rad(42 + 41 / 60);
const LAT2 = rad(41 + 43 / 60);
const LAT0 = rad(41);
const LON0 = rad(-71.5);
const FE = 200_000;
const FN = 750_000;

const m = (phi: number) => Math.cos(phi) / Math.sqrt(1 - (E * Math.sin(phi)) ** 2);
const t = (phi: number) =>
  Math.tan(Math.PI / 4 - phi / 2) / ((1 - E * Math.sin(phi)) / (1 + E * Math.sin(phi))) ** (E / 2);
const N = (Math.log(m(LAT1)) - Math.log(m(LAT2))) / (Math.log(t(LAT1)) - Math.log(t(LAT2)));
const AF = (A * m(LAT1)) / (N * t(LAT1) ** N);
const RHO0 = AF * t(LAT0) ** N;

/** [lng, lat] (degrees) -> State Plane [x, y] (metres). */
export function toStatePlane([lng, lat]: readonly number[]): [number, number] {
  const rho = AF * t(rad(lat)) ** N;
  const theta = N * (rad(lng) - LON0);
  return [FE + rho * Math.sin(theta), FN + RHO0 - rho * Math.cos(theta)];
}

/** State Plane [x, y] (metres) -> [lng, lat] (degrees). */
export function fromStatePlane([x, y]: readonly number[]): [number, number] {
  const dx = x - FE;
  const dy = RHO0 - (y - FN);
  const rho = Math.hypot(dx, dy);
  const tp = (rho / AF) ** (1 / N);
  let phi = Math.PI / 2 - 2 * Math.atan(tp);
  for (let k = 0; k < 8; k++) {
    const es = E * Math.sin(phi);
    phi = Math.PI / 2 - 2 * Math.atan(tp * ((1 - es) / (1 + es)) ** (E / 2));
  }
  return [deg(Math.atan2(dx, dy) / N + LON0), deg(phi)];
}

export const tileId = (i: number, j: number) => `${i}_${j}`;

/** "{i}_{j}" -> [i, j]; throws on anything else. */
export function parseTileId(id: string): [number, number] {
  const match = /^(-?\d+)_(-?\d+)$/.exec(id);
  if (!match) throw new Error(`not a tile id: ${JSON.stringify(id)}`);
  return [Number(match[1]), Number(match[2])];
}

/** Id of the tile containing a [lng, lat] point (whether or not that tile is in the data). */
export function tileIdAt(lngLat: readonly number[]): string {
  const [x, y] = toStatePlane(lngLat);
  return tileId(Math.floor(x / TILE_SIZE_M), Math.floor(y / TILE_SIZE_M));
}

/** Centre of the full tile square, [lng, lat]. */
export function tileCentre(id: string): [number, number] {
  const [i, j] = parseTileId(id);
  return fromStatePlane([(i + 0.5) * TILE_SIZE_M, (j + 0.5) * TILE_SIZE_M]);
}

/** Corners of the full tile square as a closed, counter-clockwise ring of [lng, lat]. */
export function tileRing(id: string): number[][] {
  const [i, j] = parseTileId(id);
  const [x0, y0, x1, y1] = [i * TILE_SIZE_M, j * TILE_SIZE_M, (i + 1) * TILE_SIZE_M, (j + 1) * TILE_SIZE_M];
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ].map(fromStatePlane);
}

/** A cell's polygons (MultiPolygon coordinates): its clipped geometry, or the full square. */
export function cellPolygons(cell: Pick<Cell, "id" | "coords">): MultiPolygonCoords {
  return cell.coords ?? [[tileRing(cell.id)]];
}

/** A point to stand for the cell: the square's centre for a full tile, else its area centroid. */
export function cellCentre(cell: Pick<Cell, "id" | "coords">): [number, number] {
  return cell.coords ? footprintCentroid({ type: "MultiPolygon", coordinates: cell.coords }) : tileCentre(cell.id);
}

/** Ids of the (2r+1)² tiles centred on `id`, including `id` itself, row by row. Some may not be in the data. */
export function neighbourhood(id: string, r: number): string[] {
  const [i, j] = parseTileId(id);
  const out: string[] = [];
  for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) out.push(tileId(i + di, j + dj));
  return out;
}

export interface TileOverlap {
  id: string;
  /** Footprint area inside the tile square, m² (State Plane). */
  overlapM2: number;
}

type XY = [number, number];

/** Sutherland–Hodgman clip of a ring against an axis-aligned box (correct area for any simple ring). */
function clipToBox(ring: XY[], x0: number, y0: number, x1: number, y1: number): XY[] {
  const edges: [(p: XY) => boolean, (a: XY, b: XY) => XY][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let k = 0; k < input.length; k++) {
      const cur = input[k];
      const prev = input[(k + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (out.length === 0) break;
  }
  return out;
}

const shoelace = (ring: XY[]) => {
  let s = 0;
  for (let k = 0; k < ring.length; k++) {
    const [ax, ay] = ring[k];
    const [bx, by] = ring[(k + 1) % ring.length];
    s += ax * by - bx * ay;
  }
  return Math.abs(s) / 2;
};

/**
 * Tiles a footprint overlaps and the area in each (holes subtracted), largest first. Computed in
 * State Plane metres (conformal; scale within 0.01% of 1 over Boston). Includes tiles that may not
 * be in the data (water); callers filter.
 */
export function footprintTiles(f: Footprint): TileOverlap[] {
  const polys = (f.type === "Polygon" ? [f.coordinates] : f.coordinates).map((rings) =>
    rings.map((ring) => {
      const pts = ring.map((p) => toStatePlane(p));
      const [a, b] = [pts[0], pts[pts.length - 1]];
      return a && b && a[0] === b[0] && a[1] === b[1] ? pts.slice(0, -1) : pts; // open the ring
    }),
  );
  const all = polys.flat(2);
  if (all.length === 0) return [];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [i0, i1] = [Math.floor(Math.min(...xs) / TILE_SIZE_M), Math.floor(Math.max(...xs) / TILE_SIZE_M)];
  const [j0, j1] = [Math.floor(Math.min(...ys) / TILE_SIZE_M), Math.floor(Math.max(...ys) / TILE_SIZE_M)];
  const out: TileOverlap[] = [];
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const box = [i * TILE_SIZE_M, j * TILE_SIZE_M, (i + 1) * TILE_SIZE_M, (j + 1) * TILE_SIZE_M] as const;
      let area = 0;
      for (const [outer, ...holes] of polys) {
        if (!outer) continue;
        area += shoelace(clipToBox(outer, ...box));
        for (const h of holes) area -= shoelace(clipToBox(h, ...box));
      }
      if (area > 0.01) out.push({ id: tileId(i, j), overlapM2: area });
    }
  return out.sort((a, b) => b.overlapM2 - a.overlapM2);
}
