export const MIN_YEAR = 2013;
export const MAX_YEAR = 2025;

export const INTERVENTIONS = [
  "green-roof",
  "cool-roof",
  "solar",
  "trees",
  "cool-pavement",
] as const;
export type Intervention = (typeof INTERVENTIONS)[number];

export const INTERVENTION_LABELS: Record<Intervention, string> = {
  "green-roof": "Green roofs",
  "cool-roof": "Cool roofs",
  solar: "Rooftop solar",
  trees: "Street trees",
  "cool-pavement": "Cool pavement",
};

export type PlaybackSpeed = 1 | 2 | 4;

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
export const HEXES_SCHEMA_VERSION = 1;

export interface Hex {
  /** H3 resolution-10 cell index. */
  id: string;
  /** 2019 Heat Watch mean air temperature, °F, at 6am / 3pm / 7pm. null = no traverse data. */
  temp6am: number | null;
  temp3pm: number | null;
  temp7pm: number | null;
}

export interface HexesFile {
  version: typeof HEXES_SCHEMA_VERSION;
  hexes: Hex[];
}
