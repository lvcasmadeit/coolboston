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
