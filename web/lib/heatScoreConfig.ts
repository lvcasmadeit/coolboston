/**
 * CoolBoston Heat Score configuration (SPEC-heat-score). The only place these numbers live.
 * The score is a custom, relative CoolBoston index: not an official or validated heat-stress index.
 */

export interface AnchorRange {
  /** °F */
  min: number;
  /** °F */
  max: number;
}

export interface HeatScoreConfig {
  /** Preliminary design parameters, not validated coefficients. Sum to 1. */
  weights: { air: number; surface: number };
  /** Normalisation anchors per input, °F. */
  anchorsF: { air: AnchorRange; surface: AnchorRange };
}

export const HEAT_SCORE: HeatScoreConfig = {
  weights: { air: 0.6, surface: 0.4 },
  // Fitted: unweighted 2nd–98th percentile of non-null tiles in web/data/cells.json (v4, summer 2019),
  // rounded to 0.1 °F. Recompute with `npm run calibrate`; lib/heatScore.test.ts fails on > 0.2 °F drift.
  anchorsF: {
    air: { min: 88.8, max: 92.9 },
    surface: { min: 70.5, max: 108.6 },
  },
};

/** Relative CoolBoston categories on the rounded score; never heat-health warning levels. Ascending by `min`. */
export const SCORE_CATEGORIES = [
  { min: 0, label: "Low" },
  { min: 25, label: "Moderate" },
  { min: 50, label: "High" },
  { min: 75, label: "Very High" },
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number]["label"];

/** Map colour stops, score → hex; colours are linear between stops. Ascending by `score`. */
export const SCORE_COLOR_STOPS = [
  { score: 0, color: "#2878B9" },
  { score: 25, color: "#4DB8A4" },
  { score: 50, color: "#F1D36A" },
  { score: 75, color: "#ED8951" },
  { score: 100, color: "#C83F49" },
] as const;

/** Tiles without a score (either input missing): neutral grey. */
export const NO_DATA_COLOR = "#9E9E9E";

/** Default heat-layer opacity for the score fill. */
export const SCORE_LAYER_OPACITY = 0.62;

/** The inputs are not simultaneous; say so wherever the score is explained. */
export const SCORE_INPUT_LABELS = {
  air: "Air 3pm, July 2019",
  surface: "Surface mid-morning, summer 2019",
} as const;
