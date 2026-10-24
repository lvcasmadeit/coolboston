import { createHeatLayer } from "@/components/layers/HeatLayer";
import { createRoofLayer } from "@/components/layers/RoofLayer";
import { createSelectionLayer } from "@/components/layers/SelectionLayer";
import type { HeatView } from "@/lib/heatView";
import { layerSetting } from "@/lib/layers";
import type { Action, Hex, LayerId, LayerState } from "@/lib/types";

export interface DeckLayerInputs {
  hexes: Hex[] | null;
  /** Heat view without opacity; opacity comes from the store's layer state. */
  view: Omit<HeatView, "opacity"> | null;
  maxPct: number;
  actions: readonly Action[];
  areaCells: readonly string[] | null;
  layers: Record<LayerId, LayerState>;
}

/** Deck layers for the current state, bottom to top: heat slab, roof caps, area selection. */
export function buildDeckLayers(i: DeckLayerInputs) {
  const heat = layerSetting(i.layers, "heat");
  const roofs = layerSetting(i.layers, "roofs");
  return [
    i.hexes && i.view && heat.visible ? createHeatLayer(i.hexes, { ...i.view, opacity: heat.opacity }, i.maxPct) : null,
    roofs.visible && i.actions.some((a) => a.target.kind === "building") ? createRoofLayer(i.actions, roofs.opacity) : null,
    i.areaCells ? createSelectionLayer(i.areaCells) : null,
  ].filter((l) => l !== null);
}
