import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { heatColor } from "@/lib/colors";
import type { Range } from "@/lib/heat";
import { BUILDINGS_LAYER_ID } from "@/lib/mapConfig";
import type { Hex } from "@/lib/types";

/** Ground-level hexes colored by Heat Watch 3pm air temperature, drawn beneath 3D buildings. */
export function createHeatLayer(hexes: Hex[], range: Range, opacity: number) {
  return new H3HexagonLayer<Hex, InterleavedLayerProps>({
    id: "heat-hexes",
    beforeId: BUILDINGS_LAYER_ID,
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
