/** Cooling actions. Labels, coefficients and sources live in lib/interventions.ts. */
export const BUILDING_INTERVENTIONS = [
  "solar",
  "green-roof",
  "cool-building",
  "green-walls",
  "green-roof-solar",
] as const;
export const AREA_INTERVENTIONS = ["street-trees"] as const;
export type BuildingIntervention = (typeof BUILDING_INTERVENTIONS)[number];
export type AreaIntervention = (typeof AREA_INTERVENTIONS)[number];
export type Intervention = BuildingIntervention | AreaIntervention;

/** GeoJSON footprint, [lng, lat] coordinates. */
export type Footprint =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface SelectedBuilding {
  /** Feature id from the Standard `buildings` featureset. */
  id: string | number;
  footprint: Footprint;
  /** null when the tile has no height for this building. */
  heightM: number | null;
  roofAreaM2: number;
  /** Tile id ("{i}_{j}", lib/grid.ts) containing the footprint centroid; may be outside the data grid. */
  cell: string;
}

export type Selection =
  | { kind: "building"; building: SelectedBuilding }
  | { kind: "area"; cells: string[] }
  | null;

export type ActionTarget =
  | { kind: "building"; building: SelectedBuilding }
  | { kind: "area"; cells: string[] };

export type Action =
  | { id: string; intervention: BuildingIntervention; target: Extract<ActionTarget, { kind: "building" }> }
  | { id: string; intervention: AreaIntervention; target: Extract<ActionTarget, { kind: "area" }> };

export type NewAction = Action extends infer A ? (A extends Action ? Omit<A, "id"> : never) : never;

export type ViewMode = "heat" | "change";

/** Base temperature shown on the map. */
export type Metric = "air" | "surface";

/** Map click mode: select buildings, or select tiles (area tool). */
export type SelectTool = "building" | "area";

export interface LayerState {
  visible: boolean;
  /** 0-1 */
  opacity: number;
}

export type LayerId = string;

/**
 * Contract for web/data/cells.json, written by pipeline/src/coolboston/build_cells.py.
 * Bump CELLS_SCHEMA_VERSION on both sides together when fields change.
 */
export const CELLS_SCHEMA_VERSION = 4;

/** GeoJSON MultiPolygon coordinates, [lng, lat]. */
export type MultiPolygonCoords = number[][][][];

/** The temperatures of one grid cell: all the impact model needs. */
export interface CellTemps {
  /** Tile id "{i}_{j}" (lib/grid.ts). */
  id: string;
  /** 2019 Heat Watch mean 3pm air temperature, °F, area-weighted over the tile. null = no traverse data. */
  temp3pm: number | null;
  /** Landsat summer 2019 median surface temperature, °F, MID-MORNING (~11 a.m. EDT). null = no clear pixel. */
  surface: number | null;
}

/** One 100 m tile, clipped to Boston's land. */
export interface Cell extends CellTemps {
  /** Land area after clipping, m² (10,000 for a full tile). */
  landAreaM2: number;
  /** Clipped geometry; null for a full 100 m square, rebuilt from the id (lib/grid.ts cellPolygons). */
  coords: MultiPolygonCoords | null;
}

export interface CellsFile {
  version: typeof CELLS_SCHEMA_VERSION;
  cellSizeM: 100;
  crs: "EPSG:26986";
  cells: Cell[];
}
