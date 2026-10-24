/** Area tool logic: hex click, shift-click toggle, shift-drag box. Pure; the map supplies projection. */

export interface Point {
  x: number;
  y: number;
}

export interface CellCentre {
  id: string;
  /** [lng, lat] */
  centre: [number, number];
}

/** Plain click selects only `cell`; shift-click adds it, or removes it if already selected. */
export function clickCell(current: readonly string[], cell: string, additive: boolean): string[] {
  if (!additive) return [cell];
  return current.includes(cell) ? current.filter((c) => c !== cell) : [...current, cell];
}

/** Ids of cells whose projected centre lies inside the screen box spanned by `a` and `b` (inclusive). */
export function cellsInBox(
  cells: readonly CellCentre[],
  project: (lngLat: [number, number]) => Point,
  a: Point,
  b: Point,
): string[] {
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const out: string[] = [];
  for (const c of cells) {
    const p = project(c.centre);
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) out.push(c.id);
  }
  return out;
}

/** Union, keeping existing order and appending new cells. */
export function addCells(current: readonly string[], more: readonly string[]): string[] {
  const seen = new Set(current);
  return [...current, ...more.filter((c) => !seen.has(c) && (seen.add(c), true))];
}

/** A drag shorter than this (px) is treated as a click, not a box. */
export const BOX_MIN_PX = 4;

export const isBox = (a: Point, b: Point) => Math.abs(a.x - b.x) >= BOX_MIN_PX || Math.abs(a.y - b.y) >= BOX_MIN_PX;
