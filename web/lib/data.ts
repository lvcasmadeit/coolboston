import { CELLS_SCHEMA_VERSION, type Cell, type CellsFile } from "@/lib/types";

/**
 * Cell data URL, keyed by schema version. The response is cached for an hour, so a fixed URL would
 * keep serving a cached old-schema file to new client code after a schema bump.
 */
export const CELLS_URL = `/api/cells?v=${CELLS_SCHEMA_VERSION}`;

export class CellDataError extends Error {
  override name = "CellDataError";
}

const TOP_FIELDS = ["version", "cellSizeM", "crs", "cells"] as const;
const CELL_FIELDS = ["id", "landAreaM2", "coords", "temp3pm", "surface"] as const satisfies readonly (keyof Cell)[];
const TEMP_FIELDS = ["temp3pm", "surface"] as const;
const TILE_ID = /^-?\d+_-?\d+$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Every key present, no others. */
function checkKeys(obj: Record<string, unknown>, expected: readonly string[], where: string) {
  for (const k of expected) if (!(k in obj)) throw new CellDataError(`${where}: missing field "${k}"`);
  for (const k of Object.keys(obj))
    if (!expected.includes(k)) throw new CellDataError(`${where}: unexpected field "${k}"`);
}

const isPosition = (p: unknown) =>
  Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n));

/** Closed rings of at least 4 positions, at least one polygon. */
function checkCoords(c: unknown, where: string) {
  if (!Array.isArray(c) || c.length === 0) throw new CellDataError(`${where}: expected non-empty MultiPolygon coordinates`);
  for (const poly of c) {
    if (!Array.isArray(poly) || poly.length === 0) throw new CellDataError(`${where}: expected a polygon with rings`);
    for (const ring of poly) {
      if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition))
        throw new CellDataError(`${where}: expected rings of at least 4 [lng, lat] positions`);
      const [a, b] = [ring[0], ring[ring.length - 1]];
      if (a[0] !== b[0] || a[1] !== b[1]) throw new CellDataError(`${where}: ring is not closed`);
    }
  }
}

function parseCell(v: unknown, i: number): Cell {
  const where = `cells[${i}]`;
  if (!isRecord(v)) throw new CellDataError(`${where}: expected an object`);
  checkKeys(v, CELL_FIELDS, where);
  if (typeof v.id !== "string" || !TILE_ID.test(v.id)) throw new CellDataError(`${where}.id: expected a tile id "{i}_{j}"`);
  const area = v.landAreaM2;
  if (typeof area !== "number" || !Number.isFinite(area) || area <= 0 || area > 10_000)
    throw new CellDataError(`${where}.landAreaM2: expected a number in (0, 10000], got ${JSON.stringify(area)}`);
  if (v.coords !== null) checkCoords(v.coords, `${where}.coords`);
  for (const f of TEMP_FIELDS) {
    const t = v[f];
    if (t !== null && (typeof t !== "number" || !Number.isFinite(t)))
      throw new CellDataError(`${where}.${f}: expected a finite number or null, got ${JSON.stringify(t)}`);
  }
  return v as unknown as Cell;
}

/** Validate an untrusted cells.json document. Throws CellDataError naming the first bad field. */
export function parseCells(input: unknown): CellsFile {
  if (!isRecord(input)) throw new CellDataError("cells.json: expected a JSON object");
  checkKeys(input, TOP_FIELDS, "cells.json");
  if (input.version !== CELLS_SCHEMA_VERSION)
    throw new CellDataError(`cells.json: unsupported version ${JSON.stringify(input.version)}, expected ${CELLS_SCHEMA_VERSION}`);
  if (input.cellSizeM !== 100) throw new CellDataError(`cells.json: cellSizeM must be 100`);
  if (input.crs !== "EPSG:26986") throw new CellDataError(`cells.json: crs must be "EPSG:26986"`);
  if (!Array.isArray(input.cells)) throw new CellDataError("cells.json: cells must be an array");
  return { version: CELLS_SCHEMA_VERSION, cellSizeM: 100, crs: "EPSG:26986", cells: input.cells.map(parseCell) };
}
