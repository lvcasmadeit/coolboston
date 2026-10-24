import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { heatColor } from "@/lib/colors";
import type { Range } from "@/lib/heat";
import type { Hex } from "@/lib/types";

/** Ground-level hexes colored by Heat Watch 3pm air temperature. Standard's "middle" slot puts them above roads and below labels. */
export function createHeatLayer(hexes: Hex[], range: Range, opacity: number) {
  return new H3HexagonLayer<Hex, InterleavedLayerProps>({
    id: "heat-hexes",
    slot: "middle",
    // Standard writes depth for the ground itself, so coplanar hexes lose the depth test and
    // only ~4% draw. A small negative bias pulls them just in front of the ground while keeping
    // depth testing, so 3D buildings still occlude them (measured in planui U3).
    parameters: { depthBias: -2, depthBiasSlopeScale: -2 },
    data: hexes,
    getHexagon: (d) => d.id,
    getFillColor: (d) => heatColor(d.temp3pm, range.min, range.max),
    extruded: false,
    stroked: false,
    opacity,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    updateTriggers: { getFillColor: [range.min, range.max] },
  });
}
