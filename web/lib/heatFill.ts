/**
 * Data for the Mapbox `fill` heat layer (SPEC-square-grid, Task 42). Pure.
 *
 * The GeoJSON is built once per cell array; feature `i` is `cells[i]`. Colours go in feature state
 * so views and actions recolour without touching the source. Colours are computed at full opacity
 * (faded tiles keep their relative alpha); the layer's opacity is the `fill-opacity` paint value.
 */
import type { FeatureCollection, MultiPolygon } from "geojson";
import type { RGBA } from "@/lib/colors";
import { cellPolygons } from "@/lib/grid";
import { fillColor, type HeatView } from "@/lib/heatView";
import type { Cell } from "@/lib/types";

export const HEAT_FILL_ID = "heat-tiles";

export interface TileProps {
  id: string;
  temp3pm: number | null;
}

const featureCache = new WeakMap<Cell[], FeatureCollection<MultiPolygon, TileProps>>();

/** Tiles as GeoJSON, feature id = index in `cells`. Memoised per array. */
export function tileFeatures(cells: Cell[]): FeatureCollection<MultiPolygon, TileProps> {
  let fc = featureCache.get(cells);
  if (!fc) {
    fc = {
      type: "FeatureCollection",
      features: cells.map((c, i) => ({
        type: "Feature",
        id: i,
        properties: { id: c.id, temp3pm: c.temp3pm },
        geometry: { type: "MultiPolygon", coordinates: cellPolygons(c) },
      })),
    };
    featureCache.set(cells, fc);
  }
  return fc;
}

export const rgbaCss = ([r, g, b, a]: RGBA) => `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;

/** CSS colour per cell (same order as `cells`) for the view, at full layer opacity. */
export function tileFillColors(cells: readonly Cell[], view: Omit<HeatView, "opacity">, maxDrop: number): string[] {
  const v = { ...view, opacity: 1 };
  return cells.map((c) => rgbaCss(fillColor(c, v, maxDrop)));
}

/** Indices whose colour differs from the last applied colours (all of them the first time). */
export function changedIndices(prev: readonly string[] | null, next: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < next.length; i++) if (!prev || prev[i] !== next[i]) out.push(i);
  return out;
}
