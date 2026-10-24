/**
 * Tile impact model (SPEC-square-grid, "Cooling model"). Pure.
 *
 * Each action treats a share of tiles, separately for air and surface. ΔT (°F) = coefficient
 * (°F per unit share, lib/interventions.ts) × share.
 *   - Building action, air: the treated (roof) area spreads evenly over the 5 × 5 tiles (~25 ha, the
 *     Heat Watch source resolution) around the building's primary tile: every tile present in the
 *     data gets share = treated area ÷ Σ land area of those present tiles.
 *   - Building action, surface: each tile the footprint overlaps gets share = overlap ÷ tile land
 *     area (capped at 1). Landsat sees the roof itself, so surface cooling stays on those tiles.
 *   - Area action: every selected tile is fully treated (share 1) for both.
 * Several actions on one tile add up. Per tile and per kind, if shares sum to more than 1 they are
 * scaled down so the total is 1. Tiles not in the data take no share.
 * Spillover: tiles around a cooled tile cool too, by less: ½ of its direct change 1 tile away and
 * ¼ 2 tiles away (square rings), per kind. A tile takes the strongest of its own direct change and
 * the spillovers reaching it, so spillover never stacks and a uniformly treated area is unchanged.
 * Actions with no air and no surface effect (solar, green walls) take no share.
 * A coefficient of null (not quantified) contributes 0.
 * This spreading rule is a modelling assumption, not a validated model.
 */
import { CATALOG } from "@/lib/interventions";
import { TILE_AREA_M2, neighbourhood, parseTileId, tileId } from "@/lib/grid";
import type { Action, CellTemps } from "@/lib/types";

/** Tiles around a building that share its air effect: 5 × 5. */
export const AIR_SPREAD_RADIUS = 2;

/** Fraction of a tile's direct change reaching tiles 1, 2, … rings away (modelling assumption). */
export const SPILLOVER: readonly number[] = [0.5, 0.25];

export interface CellDelta {
  /** Air temperature change, °F (negative = cooler). */
  air: number;
  /** Surface temperature change, °F (negative = cooler). */
  surface: number;
}

/** Per-tile deltas for the tiles an action touches; tiles not in the map are unchanged. */
export type Deltas = ReadonlyMap<string, CellDelta>;

/** Tiles by id (a byId map); a tile that is not in the map is not in the data. landAreaM2 defaults to a full tile. */
export type LandAreas = ReadonlyMap<string, Pick<CellTemps, "id"> & { landAreaM2?: number }>;

/** Without data (tests, previews): every tile exists and is a full 100 m square. */
const ALL_FULL: LandAreas = { get: (id: string) => ({ id, landAreaM2: TILE_AREA_M2 }), has: () => true } as unknown as LandAreas;

const landOf = (land: LandAreas, id: string): number | null => {
  const c = land.get(id);
  return c ? (c.landAreaM2 ?? TILE_AREA_M2) : null;
};

export interface Shares {
  air: [tile: string, share: number][];
  surface: [tile: string, share: number][];
}

/** Tiles and the share of each an action treats, per kind (before the per-tile cap). */
export function actionShares(action: Action, land: LandAreas = ALL_FULL): Shares {
  if (action.target.kind === "area") {
    const tiles = [...new Set(action.target.cells)].filter((c) => landOf(land, c) !== null);
    const all = tiles.map((c) => [c, 1] as [string, number]);
    return { air: all, surface: all };
  }
  const b = action.target.building;
  const near = neighbourhood(b.primaryTile, AIR_SPREAD_RADIUS).flatMap((id) => {
    const a = landOf(land, id);
    return a === null ? [] : [[id, a] as const];
  });
  const nearLand = near.reduce((s, [, a]) => s + a, 0);
  const air = nearLand > 0 ? near.map(([id]) => [id, Math.min(1, b.roofAreaM2 / nearLand)] as [string, number]) : [];
  const surface = b.tiles.flatMap((t) => {
    const a = landOf(land, t.id);
    return a === null ? [] : [[t.id, Math.min(1, t.overlapM2 / a)] as [string, number]];
  });
  return { air, surface };
}

/** Σ coefficient × share per tile, with each tile's shares capped to a total of 1. */
function capped(contribs: Map<string, { share: number; coef: number }[]>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [tile, list] of contribs) {
    const total = list.reduce((a, c) => a + c.share, 0);
    const scale = total > 1 ? 1 / total : 1;
    out.set(tile, list.reduce((a, c) => a + c.coef * c.share * scale, 0));
  }
  return out;
}

/** Direct changes plus spillover onto nearby tiles in the data; the strongest change per tile wins. */
function withSpillover(direct: ReadonlyMap<string, number>, land: LandAreas): Map<string, number> {
  const out = new Map(direct);
  const r = SPILLOVER.length;
  for (const [tile, d] of direct) {
    if (d === 0) continue;
    const [i, j] = parseTileId(tile);
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        const ring = Math.max(Math.abs(di), Math.abs(dj));
        if (ring === 0) continue;
        const id = tileId(i + di, j + dj);
        if (!land.has(id)) continue;
        const v = d * SPILLOVER[ring - 1];
        if (Math.abs(v) > Math.abs(out.get(id) ?? 0)) out.set(id, v);
      }
    }
  }
  return out;
}

export function computeDeltas(actions: readonly Action[], land: LandAreas = ALL_FULL): Deltas {
  const air = new Map<string, { share: number; coef: number }[]>();
  const surface = new Map<string, { share: number; coef: number }[]>();
  const push = (m: typeof air, tile: string, share: number, coef: number) => {
    const list = m.get(tile);
    if (list) list.push({ share, coef });
    else m.set(tile, [{ share, coef }]);
  };
  for (const action of actions) {
    const spec = CATALOG[action.intervention];
    const a = spec.airCoefficient.deltaFPerShare ?? 0;
    const s = spec.surfaceChange.deltaFPerShare ?? 0;
    if (a === 0 && s === 0) continue;
    const shares = actionShares(action, land);
    if (a !== 0) for (const [t, sh] of shares.air) push(air, t, sh, a);
    if (s !== 0) for (const [t, sh] of shares.surface) push(surface, t, sh, s);
  }
  const airD = withSpillover(capped(air), land);
  const surfD = withSpillover(capped(surface), land);
  const out = new Map<string, CellDelta>();
  for (const t of new Set([...airD.keys(), ...surfD.keys()])) out.set(t, { air: airD.get(t) ?? 0, surface: surfD.get(t) ?? 0 });
  return out;
}

export interface CellAfter extends CellTemps {
  /** 3pm air after actions, °F; null when there is no base value. */
  temp3pmAfter: number | null;
  surfaceAfter: number | null;
}

/** Base tiles with after-action temperatures. Null base values stay null. */
export function applyDeltas(tiles: readonly CellTemps[], deltas: Deltas): CellAfter[] {
  return tiles.map((h) => {
    const d = deltas.get(h.id);
    return {
      ...h,
      temp3pmAfter: h.temp3pm === null ? null : h.temp3pm + (d?.air ?? 0),
      surfaceAfter: h.surface === null ? null : h.surface + (d?.surface ?? 0),
    };
  });
}
