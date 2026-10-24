/** Mean before/after Heat Score of a selection (SPEC-heat-score, ΔH). Pure; unrounded. */
import type { Deltas } from "@/lib/cooling";
import type { Scores } from "@/lib/heatModel";
import { scoreAfter, scoreBefore } from "@/lib/heatView";
import type { CellTemps, Selection } from "@/lib/types";

export interface SelectionScore {
  before: number;
  /** Estimate: the score from the after-action air and surface. */
  after: number;
  /** after − before (negative = cooler). */
  change: number;
  /** Tiles with a score that the means are over. */
  tiles: number;
}

/** Tiles a selection is scored over: a building's primary tile, or every selected tile. */
export const selectionTiles = (s: NonNullable<Selection>): string[] =>
  s.kind === "building" ? [s.building.primaryTile] : [...new Set(s.cells)];

/** Mean scores over the selection's tiles that have a score; null when none has one. */
export function selectionScore(
  selection: NonNullable<Selection>,
  byId: ReadonlyMap<string, CellTemps>,
  deltas: Deltas,
  scores: Scores,
): SelectionScore | null {
  let before = 0;
  let after = 0;
  let n = 0;
  for (const id of selectionTiles(selection)) {
    const h = byId.get(id);
    const b = h ? scoreBefore(h, scores) : null;
    const a = h ? scoreAfter(h, deltas, scores) : null;
    if (b === null || a === null) continue;
    before += b;
    after += a;
    n++;
  }
  if (n === 0) return null;
  return { before: before / n, after: after / n, change: (after - before) / n, tiles: n };
}
