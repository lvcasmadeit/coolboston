import { PolygonLayer } from "@deck.gl/layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { TILE_Z_M } from "@/components/layers/HeatLayer";
import { cellPolygons } from "@/lib/grid";
import type { Cell } from "@/lib/types";

/** Sage accent (#4F7A5A). */
const SAGE: [number, number, number] = [79, 122, 90];
/** Just above the heat tiles so the outline is not hidden by them. */
const OUTLINE_Z_M = TILE_Z_M + 0.5;

interface Outline {
  id: string;
  rings: [number, number, number][][];
}

/** One outline per tile polygon, lifted just above the heat tiles. */
const toOutlines = (cell: Cell): Outline[] =>
  cellPolygons(cell).map((rings) => ({
    id: cell.id,
    rings: rings.map((ring) => ring.map(([lng, lat]) => [lng, lat, OUTLINE_Z_M] as [number, number, number])),
  }));

/** Selected area tiles: sage outline with a light sage fill, drawn on top of the heat tiles. */
export function createSelectionLayer(cells: readonly Cell[]) {
  return new PolygonLayer<Outline, InterleavedLayerProps>({
    id: "area-selection",
    slot: "middle",
    data: cells.flatMap(toOutlines),
    getPolygon: (d) => d.rings,
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
