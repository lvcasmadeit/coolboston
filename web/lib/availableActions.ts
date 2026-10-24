/** Which actions the Act panel offers for a selection, and why some are disabled. Pure. */
import { areaActions, buildingActions, CATALOG, type InterventionSpec } from "@/lib/interventions";
import type { Action, Selection } from "@/lib/types";

export interface Offer {
  spec: InterventionSpec;
  enabled: boolean;
  /** Why the button is disabled; null when enabled. */
  reason: string | null;
}

/** Actions already applied to building `id`. */
export const actionsOnBuilding = (actions: readonly Action[], id: string | number) =>
  actions.filter((a) => a.target.kind === "building" && a.target.building.id === id);

/**
 * One roof action per building (green roof + solar counts as one). Green walls can sit alongside
 * any roof action, once. Urban trees are always available for an area.
 * A building outside the data grid (`outsideGrid`) gets no cooling actions: there is no tile to cool.
 */
export const OUTSIDE_GRID = "Outside the data grid: no tile here to cool.";

const cools = (spec: InterventionSpec) =>
  (spec.airCoefficient.deltaFPerShare ?? 0) !== 0 || (spec.surfaceChange.deltaFPerShare ?? 0) !== 0;

export function availableActions(selection: Selection, actions: readonly Action[], { outsideGrid = false } = {}): Offer[] {
  if (!selection) return [];
  if (selection.kind === "area") return areaActions().map((spec) => ({ spec, enabled: true, reason: null }));
  const applied = actionsOnBuilding(actions, selection.building.id);
  const roof = applied.find((a) => CATALOG[a.intervention].roofAction);
  return buildingActions().map((spec) => {
    if (applied.some((a) => a.intervention === spec.id)) return { spec, enabled: false, reason: "Already applied." };
    if (outsideGrid && cools(spec)) return { spec, enabled: false, reason: OUTSIDE_GRID };
    if (spec.roofAction && roof)
      return { spec, enabled: false, reason: `One roof action per building: this roof has ${CATALOG[roof.intervention].label}.` };
    return { spec, enabled: true, reason: null };
  });
}
