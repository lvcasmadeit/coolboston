/**
 * The fixed base model built once from the hex data: lookup by id, citywide baseline means and
 * per-metric colour domains. Never recomputed after actions. Pure.
 */
import { quantileRange, valueRange, type Range } from "@/lib/heat";
import { computeBaseline, type Baseline } from "@/lib/impact";
import type { Hex, Metric } from "@/lib/types";

export interface HeatModel {
  hexes: Hex[];
  byId: ReadonlyMap<string, Hex>;
  baseline: Baseline;
  /** Air: min–max. Surface: 2nd–98th percentile (raw extremes wash the ramp out). */
  ranges: Record<Metric, Range>;
}

const cache = new WeakMap<Hex[], HeatModel | null>();

/** Model for `hexes`, memoised per array so every caller shares one instance. Null without data. */
export function heatModel(hexes: Hex[]): HeatModel | null {
  if (cache.has(hexes)) return cache.get(hexes)!;
  const air = valueRange(hexes.map((h) => h.temp3pm));
  const surface = quantileRange(hexes.map((h) => h.surface));
  const model =
    air && surface
      ? { hexes, byId: new Map(hexes.map((h) => [h.id, h])), baseline: computeBaseline(hexes), ranges: { air, surface } }
      : null;
  cache.set(hexes, model);
  return model;
}
