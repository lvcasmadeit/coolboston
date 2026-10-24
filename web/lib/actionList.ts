/** Rows for the applied-actions list, derived from the store's action list. Pure. */
import { formatEstimate, formatUsdRange } from "@/lib/format";
import { footprintCentroid } from "@/lib/geo";
import { tileCentre } from "@/lib/grid";
import { capitalCost } from "@/lib/impact";
import { CATALOG } from "@/lib/interventions";
import type { Action, ActionTarget } from "@/lib/types";

export interface ActionRow {
  id: string;
  label: string;
  target: string;
  cost: string;
  /** Where the map flies when the row is clicked, [lng, lat]. */
  center: [number, number];
}

export function targetCenter(t: ActionTarget): [number, number] {
  if (t.kind === "building") return footprintCentroid(t.building.footprint);
  const pts = t.cells.map(tileCentre);
  const lng = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const lat = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return [lng, lat];
}

const targetLabel = (t: ActionTarget) =>
  t.kind === "building"
    ? `Building, ${Math.round(t.building.roofAreaM2).toLocaleString("en-US")} m² roof`
    : `Area, ${t.cells.length} tile${t.cells.length === 1 ? "" : "s"}`;

/** Newest first. */
export function actionRows(actions: readonly Action[]): ActionRow[] {
  return [...actions].reverse().map((a) => ({
    id: a.id,
    label: CATALOG[a.intervention].label,
    target: targetLabel(a.target),
    cost: formatEstimate(capitalCost(a), formatUsdRange),
    center: targetCenter(a.target),
  }));
}
