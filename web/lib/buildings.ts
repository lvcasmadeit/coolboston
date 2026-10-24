/** Mapbox Standard `buildings` featureset -> SelectedBuilding. Verified by the Task 21 spike. */
import { footprintAreaM2, footprintCentroid } from "@/lib/geo";
import { tileIdAt } from "@/lib/grid";
import type { Footprint, SelectedBuilding } from "@/lib/types";

export const BUILDINGS_TARGET = { featuresetId: "buildings", importId: "basemap" } as const;

/** The subset of a mapbox-gl TargetFeature we read. */
export interface BuildingFeatureLike {
  id?: string | number | null;
  geometry: { type: string; coordinates?: unknown };
  properties?: Record<string, unknown> | null;
}

const positiveNumber = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/**
 * Map a clicked feature to a building selection. Returns null when the feature has no id or a
 * non-polygon geometry. A missing or non-positive height is null, never zero.
 * Roof area is the footprint area (a building part with min_height > 0 counts as its own roof).
 */
export function toSelectedBuilding(f: BuildingFeatureLike): SelectedBuilding | null {
  if (f.id === undefined || f.id === null) return null;
  const g = f.geometry;
  if ((g.type !== "Polygon" && g.type !== "MultiPolygon") || !Array.isArray(g.coordinates)) return null;
  const footprint = { type: g.type, coordinates: g.coordinates } as Footprint;
  const roofAreaM2 = footprintAreaM2(footprint);
  if (!(roofAreaM2 > 0)) return null;
  return {
    id: f.id,
    footprint,
    heightM: positiveNumber(f.properties?.height),
    roofAreaM2,
    cell: tileIdAt(footprintCentroid(footprint)),
  };
}
