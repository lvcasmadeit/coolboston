import { createRoofLayer } from "@/components/layers/RoofLayer";
import { createSelectionLayer } from "@/components/layers/SelectionLayer";
import { layerSetting } from "@/lib/layers";
import type { Action, Cell, LayerId, LayerState } from "@/lib/types";

export interface DeckLayerInputs {
  byId: ReadonlyMap<string, Cell> | null;
  actions: readonly Action[];
  areaCells: readonly string[] | null;
  layers: Record<LayerId, LayerState>;
}

/** Deck layers for the current state, bottom to top: roof caps, area selection. The heat tiles are
 *  a Mapbox fill layer (components/HeatFill.tsx). */
export function buildDeckLayers(i: DeckLayerInputs) {
  const roofs = layerSetting(i.layers, "roofs");
  const selected = i.areaCells && i.byId ? i.areaCells.flatMap((id) => i.byId!.get(id) ?? []) : null;
  return [
    roofs.visible && i.actions.some((a) => a.target.kind === "building") ? createRoofLayer(i.actions, roofs.opacity) : null,
    selected ? createSelectionLayer(selected) : null,
  ].filter((l) => l !== null);
}
