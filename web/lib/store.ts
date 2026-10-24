import { createStore, useStore } from "zustand";
import {
  MAX_YEAR,
  MIN_YEAR,
  type Intervention,
  type LayerId,
  type LayerState,
  type PlaybackSpeed,
} from "@/lib/types";

export interface DashboardState {
  year: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  intervention: Intervention;
  selectedHexId: string | null;
  layers: Record<LayerId, LayerState>;

  setYear: (year: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setIntervention: (intervention: Intervention) => void;
  selectHex: (id: string | null) => void;
  toggleLayer: (id: LayerId) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
}

// Replaced by the layer registry in Task 27.
export const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  heat: { visible: true, opacity: 0.8 },
  buildings: { visible: true, opacity: 1 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createDashboardStore(initialLayers: Record<LayerId, LayerState> = DEFAULT_LAYERS) {
  return createStore<DashboardState>()((set) => ({
    year: MAX_YEAR,
    isPlaying: false,
    speed: 1,
    intervention: "green-roof",
    selectedHexId: null,
    layers: structuredClone(initialLayers),

    setYear: (year) => set({ year: clamp(Math.round(year), MIN_YEAR, MAX_YEAR) }),
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    setSpeed: (speed) => set({ speed }),
    setIntervention: (intervention) => set({ intervention }),
    selectHex: (selectedHexId) => set({ selectedHexId }),
    toggleLayer: (id) =>
      set((s) =>
        s.layers[id]
          ? { layers: { ...s.layers, [id]: { ...s.layers[id], visible: !s.layers[id].visible } } }
          : s,
      ),
    setLayerOpacity: (id, opacity) =>
      set((s) =>
        s.layers[id]
          ? { layers: { ...s.layers, [id]: { ...s.layers[id], opacity: clamp(opacity, 0, 1) } } }
          : s,
      ),
  }));
}

/** App-wide singleton store. */
export const dashboardStore = createDashboardStore();

export function useDashboard<T>(selector: (s: DashboardState) => T): T {
  return useStore(dashboardStore, selector);
}
