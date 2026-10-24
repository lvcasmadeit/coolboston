/**
 * CellTemps impact model (tasks/plan.md, "Impact model"). Pure.
 *
 * Each action treats a share of one or more tiles: s = treated area ÷ tile area, capped at 1.
 *   - Building action: treated area = roof area, in the building's centroid tile.
 *   - Area action: every selected tile is fully treated (s = 1).
 * ΔT (°F) = coefficient (°F per unit share, lib/interventions.ts) × s.
 * Effects stay in the treated tile (no spread to neighbours). Several actions in one tile add up;
 * if their shares sum to more than 1, every share in that tile is scaled down so the total is 1.
 * Actions with no air and no surface effect (solar, green walls) take no share.
 * A surface coefficient of null (not quantified) contributes 0 surface change.
 */
import { TILE_AREA_M2 } from "@/lib/grid";
import { CATALOG } from "@/lib/interventions";
import type { Action, CellTemps } from "@/lib/types";

export interface CellDelta {
  /** Air temperature change, °F (negative = cooler). */
  air: number;
  /** Surface temperature change, °F (negative = cooler). */
  surface: number;
}

/** Per-tile deltas for the tiles an action touches; tiles not in the map are unchanged. */
export type Deltas = ReadonlyMap<string, CellDelta>;

interface Contribution {
  share: number;
  air: number;
  surface: number;
}

/** Tiles and the share of each an action treats (before the per-tile cap). */
export function actionShares(action: Action): [cell: string, share: number][] {
  if (action.target.kind === "building") {
    const b = action.target.building;
    return [[b.cell, Math.min(1, b.roofAreaM2 / TILE_AREA_M2)]];
  }
  return [...new Set(action.target.cells)].map((c) => [c, 1]);
}

export function computeDeltas(actions: readonly Action[]): Deltas {
  const byCell = new Map<string, Contribution[]>();
  for (const action of actions) {
    const spec = CATALOG[action.intervention];
    const air = spec.airCoefficient.deltaFPerShare ?? 0;
    const surface = spec.surfaceChange.deltaFPerShare ?? 0;
    if (air === 0 && surface === 0) continue;
    for (const [cell, share] of actionShares(action)) {
      const list = byCell.get(cell) ?? [];
      list.push({ share, air, surface });
      byCell.set(cell, list);
    }
  }
  const out = new Map<string, CellDelta>();
  for (const [cell, list] of byCell) {
    const total = list.reduce((a, c) => a + c.share, 0);
    const scale = total > 1 ? 1 / total : 1;
    let air = 0;
    let surface = 0;
    for (const c of list) {
      air += c.air * c.share * scale;
      surface += c.surface * c.share * scale;
    }
    out.set(cell, { air, surface });
  }
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
