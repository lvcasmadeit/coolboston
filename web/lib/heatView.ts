/**
 * What the heat tiles show (SPEC-heat-score, Map). Pure.
 *   Heat mode: each tile's Heat Score after applied actions (the base score without actions),
 *   on the fixed 0–100 colour stops; tiles without a score are neutral grey.
 *   Change mode: affected tiles coloured by the score reduction (points) on 0 → max (own scale);
 *   unaffected and no-data tiles faded.
 * The score only changes through the cooling model's air and surface deltas: always an estimate.
 */
import { changeColor, FADED, type RGBA } from "@/lib/colors";
import type { Deltas } from "@/lib/cooling";
import { category, displayScore, heatScore, scoreColor } from "@/lib/heatScore";
import type { Scores } from "@/lib/heatModel";
import type { CellTemps, ViewMode } from "@/lib/types";

export interface HeatView {
  mode: ViewMode;
  deltas: Deltas;
  /** Base scores from the heat model; never recomputed after actions. */
  scores: Scores;
  /** 0-1 */
  opacity: number;
}

/** Score changes smaller than this (points) count as no change. */
export const MIN_SCORE_CHANGE = 0.05;

/** Base Heat Score of a tile (cached in the model; computed if absent). */
export function scoreBefore(h: CellTemps, scores: Scores): number | null {
  const s = scores.get(h.id);
  return s === undefined ? heatScore(h.temp3pm, h.surface) : s;
}

/** Heat Score from the after-action inputs; the base score for untouched tiles. */
export function scoreAfter(h: CellTemps, deltas: Deltas, scores: Scores): number | null {
  const d = deltas.get(h.id);
  if (!d) return scoreBefore(h, scores);
  return heatScore(h.temp3pm === null ? null : h.temp3pm + d.air, h.surface === null ? null : h.surface + d.surface);
}

/** ΔH = after − before, unrounded (negative = cooler); null if the tile is untouched or has no score. */
export function scoreChange(h: CellTemps, deltas: Deltas, scores: Scores): number | null {
  if (!deltas.has(h.id)) return null;
  const before = scoreBefore(h, scores);
  const after = scoreAfter(h, deltas, scores);
  return before === null || after === null ? null : after - before;
}

/** Largest score reduction (points, positive) among affected tiles; 0 when none. Only touched tiles are visited. */
export function maxScoreDrop(byId: ReadonlyMap<string, CellTemps>, deltas: Deltas, scores: Scores): number {
  let max = 0;
  for (const id of deltas.keys()) {
    const h = byId.get(id);
    const d = h ? scoreChange(h, deltas, scores) : null;
    if (d !== null && -d > max) max = -d;
  }
  return max;
}

/** Faded tiles keep a quarter of the layer alpha. */
const FADE = 0.25;

export function fillColor(h: CellTemps, v: HeatView, maxDrop: number): RGBA {
  const alpha = Math.round(v.opacity * 255);
  if (v.mode === "heat") return scoreColor(scoreAfter(h, v.deltas, v.scores), alpha);
  const d = scoreChange(h, v.deltas, v.scores);
  if (d === null || d > -MIN_SCORE_CHANGE) return [...FADED, Math.round(alpha * FADE)];
  return changeColor(-d, maxDrop, alpha);
}

/** Signed points to 0.1, with a real minus sign. */
export const formatPoints = (d: number) => `${d < 0 ? "−" : d > 0 ? "+" : ""}${Math.abs(d).toFixed(1)}`;

/** Hover text: "Heat Score 62 · High", plus "after 55 (−6.8, estimate)" when the tile is treated; "No data" without a score. */
export function tileTooltip(h: CellTemps, view: Omit<HeatView, "opacity">): string {
  const before = scoreBefore(h, view.scores);
  if (before === null) return "No data";
  let text = `Heat Score ${displayScore(before)} · ${category(before)}`;
  const d = scoreChange(h, view.deltas, view.scores);
  if (d !== null) {
    const after = before + d;
    text += Math.abs(d) < MIN_SCORE_CHANGE ? `\nafter ${displayScore(after)} (no change, estimate)` : `\nafter ${displayScore(after)} (${formatPoints(d)}, estimate)`;
  }
  return text;
}
