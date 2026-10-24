/**
 * The fixed base model built once from the cell data: lookup by id, citywide baseline means and the
 * base Heat Score per tile. Never recomputed after actions. Pure.
 */
import { heatScore } from "@/lib/heatScore";
import { computeBaseline, type Baseline } from "@/lib/impact";
import type { Cell, CellTemps } from "@/lib/types";

/** Base (before-action) Heat Score per tile id, unrounded; null where an input is missing. */
export type Scores = ReadonlyMap<string, number | null>;

export interface HeatModel<C extends CellTemps = Cell> {
  cells: C[];
  byId: ReadonlyMap<string, C>;
  baseline: Baseline;
  scores: Scores;
}

const cache = new WeakMap<CellTemps[], HeatModel<CellTemps> | null>();

/** Model for `cells`, memoised per array so every caller shares one instance. Null if no tile has a score. */
export function heatModel<C extends CellTemps>(cells: C[]): HeatModel<C> | null {
  if (cache.has(cells)) return cache.get(cells) as HeatModel<C> | null;
  const scores = new Map(cells.map((h) => [h.id, heatScore(h.temp3pm, h.surface)]));
  const any = [...scores.values()].some((s) => s !== null);
  const model = any ? { cells, byId: new Map(cells.map((h) => [h.id, h])), baseline: computeBaseline(cells), scores } : null;
  cache.set(cells, model);
  return model;
}
