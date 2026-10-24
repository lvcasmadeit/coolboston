/** The map layers the Layers tab controls. Their state lives in the store (`layers`). */
import { DEFAULT_LAYERS } from "@/lib/store";
import type { LayerId, LayerState } from "@/lib/types";

export interface LayerDef {
  id: LayerId;
  label: string;
  description: string;
  /** False for basemap layers whose opacity Mapbox Standard does not expose. */
  hasOpacity: boolean;
}

export const LAYERS: readonly LayerDef[] = [
  { id: "heat", label: "Heat tiles", description: "Heat Score, or its change in Change mode", hasOpacity: true },
  { id: "roofs", label: "Treated roofs", description: "Caps on buildings with an action", hasOpacity: true },
  { id: "buildings", label: "3D buildings", description: "Mapbox Standard basemap buildings", hasOpacity: false },
];

/** Store value for a layer, falling back to its default. */
export function layerSetting(layers: Record<LayerId, LayerState>, id: LayerId): LayerState {
  return layers[id] ?? DEFAULT_LAYERS[id] ?? { visible: true, opacity: 1 };
}
