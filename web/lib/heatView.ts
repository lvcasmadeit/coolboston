/**
 * What the heat slab shows (Task 26). Pure.
 *   Heat mode: the after-action value of the chosen metric on that metric's fixed baseline range.
 *   Change mode: affected hexes coloured by % heat-island reduction on 0 → max (own scale);
 *   unaffected and n/a hexes faded.
 */
import { changeColor, FADED, heatColor, TRANSPARENT, type RGBA } from "@/lib/colors";
import type { Deltas } from "@/lib/cooling";
import type { Range } from "@/lib/heat";
import { heatIslandChangePct, type Baseline } from "@/lib/impact";
import type { Hex, Metric, ViewMode } from "@/lib/types";

export interface HeatView {
  metric: Metric;
  mode: ViewMode;
  deltas: Deltas;
  baseline: Baseline;
  /** Fixed baseline colour domain per metric; never recomputed after actions. */
  ranges: Record<Metric, Range>;
  /** 0-1 */
  opacity: number;
}

export const baseValue = (h: Hex, metric: Metric) => (metric === "air" ? h.temp3pm : h.surface);

export function afterValue(h: Hex, metric: Metric, deltas: Deltas): number | null {
  const base = baseValue(h, metric);
  if (base === null) return null;
  const d = deltas.get(h.id);
  return base + (d ? (metric === "air" ? d.air : d.surface) : 0);
}

const deltaOf = (h: Hex, metric: Metric, deltas: Deltas) => {
  const d = deltas.get(h.id);
  return d ? (metric === "air" ? d.air : d.surface) : 0;
};

/** % heat-island reduction for one hex; null if unaffected or n/a. */
export function changePct(h: Hex, metric: Metric, deltas: Deltas, baseline: Baseline): number | null {
  if (deltaOf(h, metric, deltas) === 0) return null;
  const base = baseValue(h, metric);
  const after = afterValue(h, metric, deltas);
  if (base === null || after === null) return null;
  const mean = baseline[metric];
  return heatIslandChangePct(base - mean, after - mean);
}

/** Largest % reduction among affected hexes (0 when none). Only touched hexes are visited. */
export function maxChangePct(byId: ReadonlyMap<string, Hex>, metric: Metric, deltas: Deltas, baseline: Baseline): number {
  let max = 0;
  for (const id of deltas.keys()) {
    const h = byId.get(id);
    const p = h ? changePct(h, metric, deltas, baseline) : null;
    if (p !== null && p > max) max = p;
  }
  return max;
}

/** Faded hexes keep a quarter of the slab's alpha. */
const FADE = 0.25;

export function fillColor(h: Hex, v: HeatView, maxPct: number): RGBA {
  const alpha = Math.round(v.opacity * 255);
  if (v.mode === "heat") {
    const r = v.ranges[v.metric];
    return heatColor(afterValue(h, v.metric, v.deltas), r.min, r.max, alpha);
  }
  if (baseValue(h, v.metric) === null) return TRANSPARENT;
  const p = changePct(h, v.metric, v.deltas, v.baseline);
  if (p === null || p <= 0) return [...FADED, Math.round(alpha * FADE)];
  return changeColor(p, maxPct, alpha);
}
