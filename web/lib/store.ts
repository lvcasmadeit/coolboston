import { createStore, useStore } from "zustand";
import type {
  Action,
  LayerId,
  LayerState,
  NewAction,
  SelectTool,
  SelectedBuilding,
  Selection,
  ViewMode,
} from "@/lib/types";

export interface DashboardState {
  selection: Selection;
  /** Applied actions, oldest first. */
  actions: Action[];
  viewMode: ViewMode;
  tool: SelectTool;
  layers: Record<LayerId, LayerState>;

  selectBuilding: (building: SelectedBuilding) => void;
  /** Adds or removes one cell; starts a new area if a building was selected. */
  toggleAreaCell: (cell: string) => void;
  setAreaCells: (cells: string[]) => void;
  clearSelection: () => void;
  /** Returns the new action's id. */
  addAction: (action: NewAction) => string;
  removeAction: (id: string) => void;
  /** Removes the most recent action. */
  undo: () => void;
  resetActions: () => void;
  setViewMode: (mode: ViewMode) => void;
  setTool: (tool: SelectTool) => void;
  toggleLayer: (id: LayerId) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
}

// Replaced by the layer registry in Task 27.
export const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  heat: { visible: true, opacity: 0.5 },
  buildings: { visible: true, opacity: 1 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const areaOrNull = (cells: string[]): Selection =>
  cells.length ? { kind: "area", cells } : null;

export function createDashboardStore(initialLayers: Record<LayerId, LayerState> = DEFAULT_LAYERS) {
  let nextId = 1;
  return createStore<DashboardState>()((set) => ({
    selection: null,
    actions: [],
    viewMode: "heat",
    tool: "building",
    layers: structuredClone(initialLayers),

    selectBuilding: (building) => set({ selection: { kind: "building", building } }),
    toggleAreaCell: (cell) =>
      set((s) => {
        const cells = s.selection?.kind === "area" ? s.selection.cells : [];
        return {
          selection: areaOrNull(
            cells.includes(cell) ? cells.filter((c) => c !== cell) : [...cells, cell],
          ),
        };
      }),
    setAreaCells: (cells) => set({ selection: areaOrNull([...new Set(cells)]) }),
    clearSelection: () => set({ selection: null }),
    addAction: (action) => {
      const id = `a${nextId++}`;
      set((s) => ({ actions: [...s.actions, { ...action, id } as Action] }));
      return id;
    },
    removeAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
    undo: () => set((s) => ({ actions: s.actions.slice(0, -1) })),
    resetActions: () => set({ actions: [] }),
    setViewMode: (viewMode) => set({ viewMode }),
    setTool: (tool) => set({ tool }),
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
