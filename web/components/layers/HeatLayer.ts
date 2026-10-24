import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { fillColor, type HeatView } from "@/lib/heatView";
import type { Hex } from "@/lib/types";

/** Slab height: above triple-deckers and brownstones (~10–17 m), well under downtown towers. */
export const SLAB_HEIGHT_M = 18;

/**
 * The heat slab: air or surface temperature (Heat mode) or % heat-island reduction (Change mode)
 * as a translucent 18 m slab of hexes. In Standard's "middle" slot with normal depth testing,
 * low-rise buildings inside the slab show through tinted and towers rise above it (planui.md V1).
 *
 * `hexes` is the stable base data; actions arrive as `view.deltas` and only change
 * `updateTriggers`, so deck recolours in place instead of rebuilding geometry.
 */
export function createHeatLayer(hexes: Hex[], view: HeatView, maxPct: number) {
  return new H3HexagonLayer<Hex, InterleavedLayerProps>({
    id: "heat-hexes",
    slot: "middle",
    data: hexes,
    getHexagon: (d) => d.id,
    // Opacity goes in the fill alpha: deck gamma-corrects the layer `opacity` prop
    // (0.5 would composite as 0.5^(1/2.2) ≈ 0.73), but blends color alpha as-is.
    getFillColor: (d) => fillColor(d, view, maxPct),
    extruded: true,
    getElevation: SLAB_HEIGHT_M,
    elevationScale: 1,
    stroked: false,
    opacity: 1,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    updateTriggers: {
      getFillColor: [view.metric, view.mode, view.deltas, view.opacity, maxPct, view.ranges[view.metric].min, view.ranges[view.metric].max],
    },
  });
}
