/**
 * The fixed base model built once from the cell data: lookup by id, citywide baseline means and
 * per-metric colour domains. Never recomputed after actions. Pure.
 */
import { quantileRange, valueRange, type Range } from "@/lib/heat";
import { computeBaseline, type Baseline } from "@/lib/impact";
import type { Cell, CellTemps, Metric } from "@/lib/types";

export interface HeatModel<C extends CellTemps = Cell> {
  cells: C[];
  byId: ReadonlyMap<string, C>;
  baseline: Baseline;
  /** Air: min–max. Surface: 2nd–98th percentile (raw extremes wash the ramp out). */
  ranges: Record<Metric, Range>;
}

const cache = new WeakMap<CellTemps[], HeatModel<CellTemps> | null>();

/** Model for `cells`, memoised per array so every caller shares one instance. Null without data. */
export function heatModel<C extends CellTemps>(cells: C[]): HeatModel<C> | null {
  if (cache.has(cells)) return cache.get(cells) as HeatModel<C> | null;
  const air = valueRange(cells.map((h) => h.temp3pm));
  const surface = quantileRange(cells.map((h) => h.surface));
  const model =
    air && surface
      ? { cells, byId: new Map(cells.map((h) => [h.id, h])), baseline: computeBaseline(cells), ranges: { air, surface } }
      : null;
  cache.set(cells, model);
  return model;
}
