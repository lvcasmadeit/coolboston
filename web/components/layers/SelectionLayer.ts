import { PolygonLayer } from "@deck.gl/layers";
import { cellToBoundary } from "h3-js";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { SLAB_HEIGHT_M } from "@/components/layers/HeatLayer";

/** Sage accent (#4F7A5A). */
const SAGE: [number, number, number] = [79, 122, 90];
/** Just above the heat slab's top face so the outline is not hidden by it. */
const OUTLINE_Z_M = SLAB_HEIGHT_M + 0.5;

interface Cell {
  id: string;
  ring: [number, number, number][];
}

const toCell = (id: string): Cell => ({
  id,
  // cellToBoundary(…, true) gives [lng, lat]; close the ring and lift it to the slab top.
  ring: [...cellToBoundary(id, true), cellToBoundary(id, true)[0]].map(([lng, lat]) => [lng, lat, OUTLINE_Z_M]),
});

/** Selected area cells: sage outline with a light sage fill, drawn on top of the slab. */
export function createSelectionLayer(cells: readonly string[]) {
  return new PolygonLayer<Cell, InterleavedLayerProps>({
    id: "area-selection",
    slot: "middle",
    data: cells.map(toCell),
    getPolygon: (d) => d.ring,
    filled: true,
    stroked: true,
    extruded: false,
    getFillColor: [...SAGE, 70],
    getLineColor: [...SAGE, 255],
    lineWidthUnits: "pixels",
    getLineWidth: 2,
    pickable: false,
    parameters: { depthBias: -2, depthBiasSlopeScale: -2 },
  });
}
