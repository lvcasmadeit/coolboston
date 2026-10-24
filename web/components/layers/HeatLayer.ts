import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { heatColor } from "@/lib/colors";
import type { Range } from "@/lib/heat";
import type { Hex } from "@/lib/types";

/** Slab height: above triple-deckers and brownstones (~10–17 m), well under downtown towers. */
export const SLAB_HEIGHT_M = 18;

/**
 * Heat Watch 3pm air temperature as a translucent 18 m slab of hexes. In Standard's "middle"
 * slot with normal depth testing, low-rise buildings inside the slab show through tinted and
 * towers rise above it (draw-order spike, planui.md V1).
 */
export function createHeatLayer(hexes: Hex[], range: Range, opacity: number) {
  return new H3HexagonLayer<Hex, InterleavedLayerProps>({
    id: "heat-hexes",
    slot: "middle",
    data: hexes,
    getHexagon: (d) => d.id,
    // Opacity goes in the fill alpha: deck gamma-corrects the layer `opacity` prop
    // (0.5 would composite as 0.5^(1/2.2) ≈ 0.73), but blends color alpha as-is.
    getFillColor: (d) => heatColor(d.temp3pm, range.min, range.max, Math.round(opacity * 255)),
    extruded: true,
    getElevation: SLAB_HEIGHT_M,
    elevationScale: 1,
    stroked: false,
    opacity: 1,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    updateTriggers: { getFillColor: [range.min, range.max, opacity] },
  });
}
