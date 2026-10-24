import { describe, expect, it } from "vitest";
import { CHANGE_RAMP, FADED } from "@/lib/colors";
import { computeDeltas, type Deltas } from "@/lib/cooling";
import { quantileRange } from "@/lib/heat";
import { heatScore, scoreColor } from "@/lib/heatScore";
import { heatModel } from "@/lib/heatModel";
import {
  fillColor,
  formatPoints,
  maxScoreDrop,
  scoreAfter,
  scoreBefore,
  scoreChange,
  tileTooltip,
  type HeatView,
} from "@/lib/heatView";
import type { CellTemps } from "@/lib/types";

// Real tile ids 10 tiles apart, so one tile's spillover never reaches another.
const ID = { hot: "2000_9000", mild: "2010_9000", cool: "2020_9000", none: "2030_9000" };
const tiles: CellTemps[] = [
  { id: ID.hot, temp3pm: 92.5, surface: 105 },
  { id: ID.mild, temp3pm: 90.5, surface: 90 },
  { id: ID.cool, temp3pm: 88, surface: 65 }, // below both anchors: score 0, clamps
  { id: ID.none, temp3pm: null, surface: 100 },
];
const model = heatModel(tiles)!;
const { byId, scores } = model;
const trees = (cells: string[]) => computeDeltas([{ id: "t", intervention: "street-trees", target: { kind: "area", cells } }]);
const view = (deltas: Deltas, over: Partial<HeatView> = {}): HeatView => ({ mode: "heat", deltas, scores, opacity: 0.5, ...over });

describe("scores", () => {
  it("before is the cached base score; null stays null", () => {
    expect(scoreBefore(tiles[0], scores)).toBe(scores.get(ID.hot));
    expect(scoreBefore(tiles[0], scores)).toBe(heatScore(92.5, 105));
    expect(scoreBefore(tiles[3], scores)).toBeNull();
  });

  it("after recomputes the score from the after-action inputs; ΔH is the unrounded difference", () => {
    const d = trees([ID.hot, ID.none]);
    const cd = d.get(ID.hot)!;
    const after = heatScore(92.5 + cd.air, 105 + cd.surface)!;
    expect(scoreAfter(tiles[0], d, scores)).toBe(after);
    expect(scoreChange(tiles[0], d, scores)).toBe(after - scores.get(ID.hot)!);
    expect(scoreChange(tiles[0], d, scores)!).toBeLessThan(0);
    expect(scoreAfter(tiles[3], d, scores)).toBeNull();
    expect(scoreChange(tiles[3], d, scores)).toBeNull();
  });

  it("untouched tiles keep their base score and have no change", () => {
    expect(scoreAfter(tiles[1], new Map(), scores)).toBe(scores.get(ID.mild));
    expect(scoreChange(tiles[1], new Map(), scores)).toBeNull();
  });

  it("neighbours of a treated tile get a smaller score drop (spillover)", () => {
    const next: CellTemps = { id: "2001_9000", temp3pm: 92.5, surface: 105 };
    const d = trees([ID.hot]);
    const own = scoreChange(tiles[0], d, scores)!;
    const near = scoreChange(next, d, scores)!;
    expect(near).toBeLessThan(0);
    expect(near).toBeGreaterThan(own);
  });

  it("clamping caps ΔH: a tile below both anchors cannot score lower", () => {
    expect(scoreChange(tiles[2], trees([ID.cool]), scores)).toBe(0);
  });
});

describe("heat mode", () => {
  it("colours by score on the fixed stops, recoloured after actions", () => {
    const before = fillColor(tiles[0], view(new Map()), 0);
    expect(before).toEqual(scoreColor(scores.get(ID.hot)!, 128));
    const after = fillColor(tiles[0], view(trees([ID.hot])), 0);
    expect(after).not.toEqual(before);
    expect(after[3]).toBe(128);
  });

  it("draws tiles without a score neutral grey", () => {
    expect(fillColor(tiles[3], view(new Map()), 0)).toEqual(scoreColor(null, 128));
  });
});

describe("change mode", () => {
  it("colours affected tiles by score reduction on 0 → max, and fades the rest", () => {
    const d = computeDeltas([
      { id: "a", intervention: "street-trees", target: { kind: "area", cells: [ID.hot] } },
      { id: "b", intervention: "street-trees", target: { kind: "area", cells: [ID.mild] } },
    ]);
    const max = maxScoreDrop(byId, d, scores);
    const drops = [ID.hot, ID.mild].map((id) => -scoreChange(byId.get(id)!, d, scores)!);
    expect(max).toBe(Math.max(...drops));
    const v = view(d, { mode: "change" });
    const top = drops[0] >= drops[1] ? tiles[0] : tiles[1];
    expect(fillColor(top, v, max)).toEqual([...CHANGE_RAMP[CHANGE_RAMP.length - 1], 128]);
    expect(fillColor(tiles[2], v, max)).toEqual([...FADED, 32]); // unaffected
  });

  it("fades affected tiles whose score cannot change (clamped) and tiles without a score", () => {
    expect(fillColor(tiles[2], view(trees([ID.cool]), { mode: "change" }), 1)).toEqual([...FADED, 32]);
    expect(fillColor(tiles[3], view(trees([ID.none]), { mode: "change" }), 1)).toEqual([...FADED, 32]);
  });

  it("max is 0 with no actions", () => {
    expect(maxScoreDrop(byId, new Map(), scores)).toBe(0);
  });
});

describe("quantileRange", () => {
  it("drops outliers at the 2nd and 98th percentiles and ignores nulls", () => {
    const vs = [null, ...Array.from({ length: 101 }, (_, i) => i)];
    expect(quantileRange(vs)).toEqual({ min: 2, max: 98 });
    expect(quantileRange([null])).toBeNull();
  });
});

describe("tileTooltip", () => {
  const v = { mode: "heat" as const, deltas: new Map(), scores };

  it("shows the rounded score and category", () => {
    const s = scores.get(ID.hot)!;
    expect(tileTooltip(tiles[0], v)).toBe(`Heat Score ${Math.round(s)} · ${s >= 74.5 ? "Very High" : "High"}`);
    expect(tileTooltip(tiles[2], v)).toBe("Heat Score 0 · Low");
  });

  it("adds the estimated after score and signed change once treated", () => {
    const t = tileTooltip(tiles[0], { ...v, deltas: trees([ID.hot]) });
    expect(t).toMatch(/^Heat Score \d+ · [A-Za-z ]+\nafter \d+ \(−\d+\.\d, estimate\)$/);
    expect(tileTooltip(tiles[2], { ...v, deltas: trees([ID.cool]) })).toBe("Heat Score 0 · Low\nafter 0 (no change, estimate)");
  });

  it("reads No data without a score", () => {
    expect(tileTooltip(tiles[3], v)).toBe("No data");
  });

  it("formats signed points with a real minus", () => {
    expect(formatPoints(-6.84)).toBe("−6.8");
    expect(formatPoints(2)).toBe("+2.0");
    expect(formatPoints(0)).toBe("0.0");
  });
});
