/**
 * Metric cards for the current selection (Task 30). Pure; reads lib/cooling and lib/impact.
 * Temperatures and heat island are tile level: the building's tile, or the mean over an area's
 * tiles with data. Energy and cost cover the actions on this selection only.
 */
import { actionsOnBuilding } from "@/lib/availableActions";
import { computeDeltas } from "@/lib/cooling";
import { heatIslandChangePct, totals, actionMetrics, type Baseline, type Totals } from "@/lib/impact";
import { CATALOG } from "@/lib/interventions";
import type { Action, CellTemps, Selection } from "@/lib/types";

export interface Conditions {
  /** 3pm air, °F */
  air: number | null;
  /** surface, °F, mid-morning */
  surface: number | null;
  /** air heat island, °F above the citywide mean */
  heatIslandF: number | null;
}

export interface Change {
  airDeltaF: number | null;
  surfaceDeltaF: number | null;
  /** % air heat-island reduction; null = n/a (≤ 0.5 °F) */
  heatIslandPct: number | null;
  totals: Totals;
  /** Whether any action's energy was not quantified (kWh or $). */
  energyNotQuantified: boolean;
  /** Peak-summer roof surface change of the building's roof action, °F (building only). */
  roofSurfaceF: number | null;
}

export interface SelectionMetrics {
  level: "building tile" | "area mean";
  before: Conditions;
  after: Conditions;
  /** null when no action applies to this selection. */
  change: Change | null;
}

const meanOf = (vs: (number | null)[]) => {
  const ok = vs.filter((v): v is number => v !== null);
  return ok.length ? ok.reduce((a, v) => a + v, 0) / ok.length : null;
};

/** Actions applied to this selection: on the building, or on an area sharing a tile. */
export function selectionActions(selection: NonNullable<Selection>, actions: readonly Action[]): Action[] {
  if (selection.kind === "building") return actionsOnBuilding(actions, selection.building.id);
  const cells = new Set(selection.cells);
  return actions.filter((a) => a.target.kind === "area" && a.target.cells.some((c) => cells.has(c)));
}

export function selectionMetrics(
  selection: NonNullable<Selection>,
  actions: readonly Action[],
  byId: ReadonlyMap<string, CellTemps>,
  baseline: Baseline,
): SelectionMetrics {
  const cells = selection.kind === "building" ? [selection.building.cell] : selection.cells;
  const tiles = cells.map((c) => byId.get(c)).filter((h): h is CellTemps => !!h);
  // Every action counts towards a tile's temperature, including ones on other buildings in it.
  const deltas = computeDeltas(actions);
  const cond = (after: boolean): Conditions => {
    const air = meanOf(tiles.map((h) => (h.temp3pm === null ? null : h.temp3pm + (after ? (deltas.get(h.id)?.air ?? 0) : 0))));
    const surface = meanOf(tiles.map((h) => (h.surface === null ? null : h.surface + (after ? (deltas.get(h.id)?.surface ?? 0) : 0))));
    return { air, surface, heatIslandF: air === null ? null : air - baseline.air };
  };
  const before = cond(false);
  const after = cond(true);
  const mine = selectionActions(selection, actions);
  let change: Change | null = null;
  if (mine.length) {
    const metrics = mine.map(actionMetrics);
    const roof = mine.find((a) => CATALOG[a.intervention].roofAction);
    change = {
      airDeltaF: before.air === null || after.air === null ? null : after.air - before.air,
      surfaceDeltaF: before.surface === null || after.surface === null ? null : after.surface - before.surface,
      heatIslandPct: heatIslandChangePct(before.heatIslandF, after.heatIslandF),
      totals: totals(mine),
      energyNotQuantified: metrics.some((m) => m.energy.kwh.kind !== "range" || m.energy.usd.kind !== "range"),
      roofSurfaceF: selection.kind === "building" && roof ? (CATALOG[roof.intervention].surfaceChange.deltaFPerShare || null) : null,
    };
  }
  return { level: selection.kind === "building" ? "building tile" : "area mean", before, after, change };
}
