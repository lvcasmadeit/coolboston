/** Cooling actions. Labels, coefficients and sources live in the catalog (Task 14). */
export const BUILDING_INTERVENTIONS = ["green-roof", "cool-roof", "solar"] as const;
export const AREA_INTERVENTIONS = ["trees", "cool-pavement", "depave"] as const;
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
  /** H3 res-10 cell containing the footprint centroid. */
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

export interface LayerState {
  visible: boolean;
  /** 0-1 */
  opacity: number;
}

export type LayerId = string;

/**
 * Contract for web/data/hexes.json, written by pipeline/src/coolboston/build_hexes.py.
 * Bump HEXES_SCHEMA_VERSION on both sides together when fields change.
 */
export const HEXES_SCHEMA_VERSION = 2;

export interface Hex {
  /** H3 resolution-10 cell index. */
  id: string;
  /** 2019 Heat Watch mean 3pm air temperature, °F. null = no traverse data. */
  temp3pm: number | null;
}

export interface HexesFile {
  version: typeof HEXES_SCHEMA_VERSION;
  hexes: Hex[];
}
