/**
 * The CoolBoston Heat Score (0–100), a pure function of air and surface temperature in °F
 * (SPEC-heat-score). All numbers come from lib/heatScoreConfig.ts. Round only for display.
 */
import type { RGBA } from "@/lib/colors";
import {
  HEAT_SCORE,
  NO_DATA_COLOR,
  SCORE_CATEGORIES,
  SCORE_COLOR_STOPS,
  type AnchorRange,
  type HeatScoreConfig,
  type ScoreCategory,
} from "@/lib/heatScoreConfig";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Position of `v` in the anchor range, clamped to [0, 1]. */
export function normalize(v: number, r: AnchorRange): number {
  return r.max > r.min ? clamp01((v - r.min) / (r.max - r.min)) : 0;
}

/** Unrounded CoolBoston Heat Score, 0–100; null if either input is missing. Inputs in °F. */
export function heatScore(airF: number | null, surfaceF: number | null, cfg: HeatScoreConfig = HEAT_SCORE): number | null {
  if (airF === null || surfaceF === null || !Number.isFinite(airF) || !Number.isFinite(surfaceF)) return null;
  const a = normalize(airF, cfg.anchorsF.air);
  const s = normalize(surfaceF, cfg.anchorsF.surface);
  return 100 * (cfg.weights.air * a + cfg.weights.surface * s);
}

/** The score as shown: an integer, or null. */
export const displayScore = (h: number | null): number | null => (h === null ? null : Math.round(h));

/** Relative category of the rounded score; null without a score. */
export function category(h: number | null): ScoreCategory | null {
  const r = displayScore(h);
  if (r === null) return null;
  let label: ScoreCategory = SCORE_CATEGORIES[0].label;
  for (const c of SCORE_CATEGORIES) if (r >= c.min) label = c.label;
  return label;
}

const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const STOPS = SCORE_COLOR_STOPS.map((s) => ({ score: s.score, rgb: hexRgb(s.color) }));
const NO_DATA = hexRgb(NO_DATA_COLOR);

/** Colour for a score, linear in RGB between the config stops (clamped); neutral grey for null. */
export function scoreColor(h: number | null, alpha = 255): RGBA {
  if (h === null || !Number.isFinite(h)) return [...NO_DATA, alpha];
  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1];
  if (h <= first.score) return [...first.rgb, alpha];
  if (h >= last.score) return [...last.rgb, alpha];
  let i = 0;
  while (h > STOPS[i + 1].score) i++;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const f = (h - a.score) / (b.score - a.score);
  return [
    Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f),
    Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f),
    Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f),
    alpha,
  ];
}

/** CSS gradient of the colour stops, for the legend. */
export function scoreRampCss(): string {
  return `linear-gradient(to right, ${SCORE_COLOR_STOPS.map((s) => `${s.color} ${s.score}%`).join(", ")})`;
}
