/**
 * Hex impact model (tasks/plan.md, "Impact model"). Pure.
 *
 * Each action treats a share of one or more hexes: s = treated area ÷ hex area, capped at 1.
 *   - Building action: treated area = roof area, in the building's centroid hex.
 *   - Area action: every selected hex is fully treated (s = 1).
 * ΔT (°F) = coefficient (°F per unit share, lib/interventions.ts) × s.
 * Effects stay in the treated hex (no spread to neighbours). Several actions in one hex add up;
 * if their shares sum to more than 1, every share in that hex is scaled down so the total is 1.
 * Actions with no air and no surface effect (solar, green walls) take no share.
 * A surface coefficient of null (not quantified) contributes 0 surface change.
 */
import { HEX_AREA_M2 } from "@/lib/geo";
import { CATALOG } from "@/lib/interventions";
import type { Action, Hex } from "@/lib/types";

export interface HexDelta {
  /** Air temperature change, °F (negative = cooler). */
  air: number;
  /** Surface temperature change, °F (negative = cooler). */
  surface: number;
}

/** Per-hex deltas for the hexes an action touches; hexes not in the map are unchanged. */
export type Deltas = ReadonlyMap<string, HexDelta>;

interface Contribution {
  share: number;
  air: number;
  surface: number;
}

/** Hexes and the share of each an action treats (before the per-hex cap). */
export function actionShares(action: Action): [cell: string, share: number][] {
  if (action.target.kind === "building") {
    const b = action.target.building;
    return [[b.cell, Math.min(1, b.roofAreaM2 / HEX_AREA_M2)]];
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
  const out = new Map<string, HexDelta>();
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

export interface HexAfter extends Hex {
  /** 3pm air after actions, °F; null when there is no base value. */
  temp3pmAfter: number | null;
  surfaceAfter: number | null;
}

/** Base hexes with after-action temperatures. Null base values stay null. */
export function applyDeltas(hexes: readonly Hex[], deltas: Deltas): HexAfter[] {
  return hexes.map((h) => {
    const d = deltas.get(h.id);
    return {
      ...h,
      temp3pmAfter: h.temp3pm === null ? null : h.temp3pm + (d?.air ?? 0),
      surfaceAfter: h.surface === null ? null : h.surface + (d?.surface ?? 0),
    };
  });
}
