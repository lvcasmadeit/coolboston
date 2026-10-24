import { PolygonLayer } from "@deck.gl/layers";
import type { InterleavedLayerProps } from "@/components/DeckOverlay";
import { cellPolygons } from "@/lib/grid";
import { fillColor, type HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

/** Tiles lie flat just above street level: high enough not to z-fight with roads, under every building. */
export const TILE_Z_M = 1;

export const HEAT_LAYER_ID = "heat-tiles";

/** One polygon of a tile (clipped tiles split by water have several). Picking returns this. */
export interface TilePart {
  cell: Cell;
  /** Rings of [lng, lat, TILE_Z_M]. */
  polygon: number[][][];
}

const partsCache = new WeakMap<Cell[], TilePart[]>();

/** Every polygon of every tile, built once per cell array. */
export function tileParts(cells: Cell[]): TilePart[] {
  let parts = partsCache.get(cells);
  if (!parts) {
    parts = cells.flatMap((cell) =>
      cellPolygons(cell).map((rings) => ({ cell, polygon: rings.map((r) => r.map(([lng, lat]) => [lng, lat, TILE_Z_M])) })),
    );
    partsCache.set(cells, parts);
  }
  return parts;
}

/**
 * The heat tiles: air or surface temperature (Heat mode) or % heat-island reduction (Change mode)
 * as translucent flat tiles 1 m above the ground. In Standard's "middle" slot with normal depth
 * testing, streets show through tinted and every building stands above the tiles.
 *
 * `cells` is the stable base data; actions arrive as `view.deltas` and only change
 * `updateTriggers`, so deck recolours in place instead of rebuilding geometry.
 */
export function createHeatLayer(cells: Cell[], view: HeatView, maxPct: number) {
  return new PolygonLayer<TilePart, InterleavedLayerProps>({
    id: HEAT_LAYER_ID,
    slot: "middle",
    data: tileParts(cells),
    getPolygon: (d) => d.polygon,
    // Opacity goes in the fill alpha: deck gamma-corrects the layer `opacity` prop
    // (0.5 would composite as 0.5^(1/2.2) ≈ 0.73), but blends color alpha as-is.
    getFillColor: (d) => fillColor(d.cell, view, maxPct),
    extruded: false,
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
