# Spec: heat-score

Module of `capability-map.md`. Depends on: `square-grid` (tiles, `cells.json` v4, Mapbox fill layer, tile-based cooling model).

Status: DRAFT, awaiting human review.

## Objective

Give each 100 m tile one interpretable number, the CoolBoston Heat Score (0–100). It combines air and surface temperature and shows where Boston is hotter or cooler relative to the rest of the city in summer 2019. The score replaces the Air/Surface toggle as the main map and dashboard metric.

Air and surface stay in the data and the model. Interventions change air and surface, and the score is recomputed from them. They also remain visible in a detail section.

The app must keep three things distinct, in code and in labels:
1. **Input data:** observed or composited temperatures.
2. **The score:** a custom CoolBoston index.
3. **Modelled intervention effects:** estimates.

The score is never presented as an official or validated heat-stress index.

### Formula

All configuration lives in `web/lib/heatScoreConfig.ts`. The function is pure, in `web/lib/heatScore.ts`.

```
A = clamp((T_air     − AIR.min)     / (AIR.max     − AIR.min),     0, 1)
S = clamp((T_surface − SURFACE.min) / (SURFACE.max − SURFACE.min), 0, 1)
H = 100 × (W_AIR × A + W_SURFACE × S)      // unrounded; W_AIR = 0.6, W_SURFACE = 0.4
```

- **Units:** °F throughout, as in the `cells.json` contract. The function takes °F and has no unit conversion inside.
- **Normalization anchors** are fitted to Boston 2019, decided in the capability map. Each one is the unweighted 2nd–98th percentile of that input across tiles with a non-null value in `cells.json`, rounded to 0.1 °F. The hex-era values were about air 88.9–92.9 °F and surface 74.8–108.2 °F. They are recomputed on tiles once `square-grid` lands and written into config as constants.
  - A unit test reads `cells.json` and fails if any constant drifts more than 0.2 °F from the recomputed percentile.
  - A script prints the new values: `npm run calibrate`, or a Vitest snapshot, whichever is simpler.
- **Weights:** `W_AIR` and `W_SURFACE` are config constants. A test checks they sum to 1. They are documented as preliminary design parameters, not validated coefficients.
- **Rounding:** only for display, `Math.round(H)`. Categories use the rounded score.
- **Missing data:** if either input is null, the score is `null`, never 0. It is drawn neutral grey and reads "No data".
- **Caching:** base scores are computed once per loaded `cells.json`, in `heatModel` (WeakMap-cached as today). After-scores are computed only for tiles in the current `Deltas` map, memoised on the actions array. Panning, zooming, hovering and layer opacity don't recompute either.

### Categories

These are config, not inline literals.

| Rounded score | Label |
|---|---|
| 0–24 | Low |
| 25–49 | Moderate |
| 50–74 | High |
| 75–100 | Very High |

These are relative CoolBoston categories, wherever they appear. They are never described as heat-health warning thresholds.

### Before / after

- Per tile, using the tile delta from `computeDeltas`:
  - `H_before = H(T_air, T_surface)`
  - `H_after = H(T_air + Δair, T_surface + Δsurface)`
  - `ΔH = H_after − H_before`, unrounded.
- Negative means a cooling improvement, zero means no modelled change, positive means more heat.
- Clamping applies to the after-inputs too, so ΔH is bounded where an input leaves the anchor range. This is stated in the Method tab.
- Displayed ΔH is rounded to 0.1 point, and to an integer in compact cards.
- No action changes the score directly. The score only ever reflects air and surface changes from the cooling model, and those effects are labelled "Estimate".

### Aggregation (selection and area statistics)

Weighted means skip null scores.
- **Building selection:** the mean over the overlapped tiles, weighted by `overlapM2`.
- **Area selection:** the mean over the selected tiles, weighted by `landAreaM2`.
- **No selection:** city-wide, weighted by `landAreaM2`.
- **Coverage:** the share of the selection's weight that has a score. Shown when below 100%, as "Score covers 92% of this area".

Before, after and ΔH use the same weights and the same tile set, so the after and before means differ only through the deltas.

Separately, "Affected tiles" counts every tile with |ΔH| > 0.05 from the actions on this selection. That includes the 500 m air neighbourhood, so it can exceed the selected tiles.

### Map

- **Layer:** the `square-grid` fill layer, coloured by `H_before` in Heat mode. Colours are interpolated linearly in the Mapbox expression from the config stops:

  | Score | Colour |
  |---|---|
  | 0 | `#2878B9` |
  | 25 | `#4DB8A4` |
  | 50 | `#F1D36A` |
  | 75 | `#ED8951` |
  | 100 | `#C83F49` |

  - Default opacity is 0.62 (`DEFAULT_LAYERS.heat`). The Layers slider still overrides it.
  - There are no borders.
- **Change mode:** colours by ΔH using the existing change ramp, scaled to the max |ΔH|. The legend reads "Change in Heat Score (points), estimate".
- **Legend:**
  - Title "Heat Score (0–100)", with the gradient and the four category ticks.
  - Note: "CoolBoston index, relative to Boston, summer 2019."
  - Inputs line: "Air 3pm, July 2019 · Surface mid-morning, summer 2019 (not simultaneous)."
- **Hover and tap:** a small tooltip on the hovered tile, e.g. "Heat Score 62 · High". When actions apply, a second line reads "after 55 (−7, estimate)". A No-data tile reads "No data". The tooltip doesn't block clicks.
- **Top bar:** the Air/Surface segmented control is removed, and Heat/Change stays. `metric` is removed from the store, the test hook state and the e2e helpers.
- Map navigation, building selection, the area tool, roof markers and the Layers tab otherwise behave unchanged.

### Dashboard (Act tab, `MetricCards`)

1. **Heat Score:** the current score (rounded) for the selection, or the city when nothing is selected. Shows its category and a colour chip from the ramp, plus coverage if below 100%.
2. **Intervention impact** (only when an action applies):
   - Score before.
   - Estimated score after.
   - ΔH in points.
   - Estimated Δair (°F, 3pm).
   - Estimated Δsurface (°F, mid-morning).

   Each change figure carries the label "Estimate".
3. **Area statistics:**
   - Average Heat Score (weighted as above).
   - Affected tiles.
   - Modified buildings: buildings with at least one action whose tiles intersect the selection, or all of them with no selection.
   - Total intervention area: roof, wall and ground m², summed per action's treated area.
4. **Temperatures** (a collapsible detail section, closed by default): the air 3pm and surface mid-morning readings before and after, plus the tile air value. This is where the underlying measurements stay reachable.
5. **Unchanged:** energy, capital cost and roof-surface (EPA peak) cards. The Heat island card and `heatIslandChangePct` are removed.

### Charts (BottomPanel)

- **Cost vs effect:**
  - x axis: capital cost (low–high bar), as today.
  - y axis: "Heat Score reduction (points)", which is −ΔH. It is the overlap/land-weighted mean ΔH over the tiles that action alone touches.
  - The tooltip shows signed ΔH, cost, and roof surface (EPA peak).
  - The heat-island footnote is removed.
- **Before and after:** three small charts, Heat Score, Air (3pm) and Surface (mid-morning), each on its own scale with value labels. The empty states are unchanged.

### Method tab

The Method tab, today a placeholder, gets a short "Heat Score" section:
- The formula, weights and anchors, read from config so they can't diverge from the code.
- Categories, and the fitted-range meaning.
- The non-simultaneous inputs.
- That air is resolved at about 25 ha.
- The share and spreading assumption.
- "Not an official or validated heat-stress index."

## Tech Stack

No new dependencies. Recharts 3.10.1 and Mapbox GL 3.33.0 as installed.

## Commands

```
make check                                  # includes the new heatScore tests
make build
cd web && npm run e2e
cd web && npx vitest run lib/heatScore.test.ts
```

## Project Structure

```
web/lib/heatScoreConfig.ts     weights, anchors, categories, colour stops, input-time labels (new)
web/lib/heatScore.ts           normalize, heatScore, category, scoreColor, weightedMean (new, pure)
web/lib/heatScore.test.ts      formula, clamping, missing, categories, calibration drift (new)
web/lib/heatModel.ts           base scores per tile; ranges replaced by score domain
web/lib/heatView.ts            fill/expression inputs by score or ΔH (metric removed)
web/lib/metrics.ts             selection score stats, before/after/ΔH, coverage, affected tiles
web/lib/impact.ts              heat-island functions removed; treated-area helper
web/lib/tradeoff.ts            y = −ΔH per action
web/lib/beforeAfter.ts         rows: score, air, surface
web/lib/store.ts, types.ts     metric removed
web/components/Legend.tsx, ViewControls.tsx, MetricCards.tsx, RightPanel.tsx (Method),
  HeatTooltip.tsx (new), charts/*, layers/heat fill
web/e2e/*.spec.ts              updated; heat-score.spec.ts (new)
```

## Code Style

```ts
// web/lib/heatScoreConfig.ts — the only place these numbers live.
export const HEAT_SCORE = {
  weights: { air: 0.6, surface: 0.4 }, // preliminary design parameters, not validated
  // Fitted: 2nd–98th percentile of cells.json (2019); recompute with `npm run calibrate`.
  anchorsF: { air: { min: 88.9, max: 92.9 }, surface: { min: 74.8, max: 108.2 } },
} as const;

// web/lib/heatScore.ts
/** Unrounded CoolBoston Heat Score, 0–100; null if either input is missing. Inputs in °F. */
export function heatScore(airF: number | null, surfaceF: number | null, cfg = HEAT_SCORE): number | null {
  if (airF === null || surfaceF === null) return null;
  const a = normalize(airF, cfg.anchorsF.air);
  const s = normalize(surfaceF, cfg.anchorsF.surface);
  return 100 * (cfg.weights.air * a + cfg.weights.surface * s);
}
```

Conventions follow `.kiro/steering/conventions.md`. Every displayed change is labelled "Estimate". Surface is always "mid-morning". The config is passed as a parameter (with a default), so tests can use the spec's illustrative fixed anchors (70–105, 75–150).

## Testing Strategy

- **Unit (Vitest), `heatScore.test.ts`:**
  - Inputs at both anchor minima give 0, and at both maxima give 100.
  - Midpoints give 50.
  - Spec example with fixed anchors: air 87.5 °F and surface 112.5 °F give A = 0.5, S = 0.5, H = 50.
  - Below-min and above-max inputs clamp.
  - Mixed (air at max, surface at min) gives 60.
  - Null air, null surface, or both give null.
  - Category boundaries: 24 → Low, 24.5 → 25 → Moderate, 49/50, 74/75, 100.
  - Colour stops are exact at 0, 25, 50, 75 and 100, and interpolated at 12.5.
  - The weights sum to 1.
  - Calibration drift against `cells.json`.
- **Unit, before/after (`metrics.test.ts`, `tradeoff.test.ts`):**
  - No actions give ΔH = 0 and `change` null.
  - A cooling action gives negative ΔH equal to H(after inputs) − H(before inputs), unrounded.
  - Clamping caps ΔH when the after-input passes the min anchor.
  - Weighted means skip null tiles, and coverage is reported.
  - Overlap weights are used for buildings.
  - A no-effect action (solar) gives ΔH = 0.
- **Caching:** a test asserts that `heatModel` returns the same object for the same `cells` and doesn't recompute on unrelated store changes, using a spy or call count.
- **E2E (Playwright), `heat-score.spec.ts`:**
  - The legend title is "Heat Score (0–100)".
  - No Air/Surface toggle is shown.
  - Hovering a tile shows "Heat Score N · Category".
  - Selecting a building and applying a green roof:
    - The score card shows before > after.
    - ΔH is negative and labelled "Estimate".
    - Change mode colours the overlapped tiles.
  - The Temperatures section reveals air and surface.
- **Existing specs:** updated for the removed metric toggle and the heat-island card. None are deleted.

## Boundaries

- **Always:**
  - Read every weight, anchor, category and colour from config.
  - Round only at display.
  - Keep null distinct from 0.
  - Label estimates and the non-simultaneous inputs.
  - Run `make check` and e2e before each commit.
- **Ask first:**
  - Changing weights or the anchor method (for example back to fixed ranges, or to different percentiles).
  - Changing category cut-offs.
  - Adding dependencies.
  - Changing intervention coefficients.
- **Never:**
  - Apply a fixed score reduction for an action.
  - Call the score or categories an official heat-health index or warning level.
  - Deploy or push unasked.
  - Stage the user's skill files.

## Success Criteria

1. `heatScore` is pure, configurable and covered by the tests above. `make check` passes.
2. The map shows the Heat Score fill at 0.62 opacity, with smooth colours between the five stops, no borders, the legend titled "Heat Score (0–100)", and 3D buildings above.
3. Hovering or selecting a tile shows its score and category. No-data tiles say "No data".
4. With a green roof on a selected building, the dashboard shows the score before, the estimated after, ΔH in points, Δair and Δsurface in °F. All are labelled as estimates, and ΔH equals the recomputed score difference (unit-tested).
5. The area statistics show the weighted average score, affected tiles, modified buildings and total intervention area, with coverage when below 100%.
6. Air and surface are viewable in the Temperatures section. The Air/Surface map toggle and heat-island % are gone.
7. Both charts use the score: the cost chart's y axis is points reduced, and before/after includes the score.
8. The Method tab documents the formula, fitted anchors, weights as preliminary, categories as relative, the non-simultaneous inputs and the modelling assumptions.
9. `make build` and all e2e specs pass, with no console errors.

## Open Questions

- **Change-mode scale:** ΔH colours use the existing change ramp scaled to the max |ΔH| on screen. Should the scale be fixed instead (for example 0 to −20 points), so two scenarios can be compared visually?
- **City-wide figure:** with no selection, the score card shows the city average. That average sits near the middle of the scale by construction, because the anchors are percentiles. Should the card show the city figure at all, or just prompt the user to select?
