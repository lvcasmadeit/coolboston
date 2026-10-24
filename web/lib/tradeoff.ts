/**
 * Cost-versus-effect points (Task 32). Pure. One point per action:
 *   x = capital cost (central, with the low–high range as an error bar), USD
 *   y = % heat-island reduction at the action's tile (building) or over its tiles (area), from
 *       that action alone. Null when not applicable (heat island ≤ 0.5 °F or no data).
 */
import { formatEstimate, formatUsdRange } from "@/lib/format";
import { capitalCost, type Baseline } from "@/lib/impact";
import { CATALOG } from "@/lib/interventions";
import { selectionActions, selectionMetrics } from "@/lib/metrics";
import type { Action, CellTemps, Selection } from "@/lib/types";

export interface TradeoffPoint {
  id: string;
  label: string;
  intervention: Action["intervention"];
  costCentral: number;
  /** [central − low, high − central], the shape Recharts' ErrorBar takes. */
  costError: [number, number];
  costLabel: string;
  heatIslandPct: number | null;
  /** Peak-summer roof surface change for roof actions, °F. */
  roofSurfaceF: number | null;
}

const asSelection = (a: Action): NonNullable<Selection> =>
  a.target.kind === "building" ? { kind: "building", building: a.target.building } : { kind: "area", cells: a.target.cells };

/** Actions on the current selection, or every action when nothing is selected. */
export const chartActions = (selection: Selection, actions: readonly Action[]) =>
  selection ? selectionActions(selection, actions) : [...actions];

export function tradeoffPoints(
  actions: readonly Action[],
  byId: ReadonlyMap<string, CellTemps>,
  baseline: Baseline,
): TradeoffPoint[] {
  const out: TradeoffPoint[] = [];
  for (const a of actions) {
    const cost = capitalCost(a);
    if (cost.kind !== "range") continue; // not quantified: nothing to place on the x axis
    const c = selectionMetrics(asSelection(a), [a], byId, baseline).change;
    const spec = CATALOG[a.intervention];
    out.push({
      id: a.id,
      label: spec.label,
      intervention: a.intervention,
      costCentral: cost.value.central,
      costError: [cost.value.central - cost.value.low, cost.value.high - cost.value.central],
      costLabel: formatEstimate(cost, formatUsdRange),
      heatIslandPct: c?.heatIslandPct ?? null,
      roofSurfaceF: a.target.kind === "building" && spec.roofAction ? spec.surfaceChange.deltaFPerShare || null : null,
    });
  }
  return out;
}
