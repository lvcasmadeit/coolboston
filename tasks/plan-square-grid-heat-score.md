# Implementation Plan: Square grid and Heat Score

## Overview

This plan moves CoolBoston from H3 hexes (~1.5 ha) to 100 m square tiles, then replaces the Air/Surface toggle with a composite Heat Score (0–100). Air and surface stay in the model and in a detail section.

- Specs: `.kiro/specs/capability-map.md`, `SPEC-square-grid.md`, `SPEC-heat-score.md`.
- Tasks and acceptance criteria: `todo-square-grid-heat-score.md`.
- Numbering continues from `plan.md` (Tasks 39–51). The open tasks in `plan.md` are deferred until this plan is done or you reorder: 34 share URL, 35–38 polish and deploy, and the Checkpoint D and E reviews.

## Architecture Decisions

- **Two modules in order: `square-grid`, then `heat-score`.** The grid ships first and is verified with today's Air/Surface colouring. The score then sits on top without caring about cell shape.
- **Tiles are 100 m in EPSG:26986, with id `"{i}_{j}"`.** Neighbourhoods are integer arithmetic. The web never projects: geometry ships as lng/lat rings, and footprint overlap uses a local equirectangular frame. This avoids a proj4 dependency.
- **Migrate in steps that keep the app working:**
  1. Data source and a deck.gl `SolidPolygonLayer` (Task 41). Deck is already installed and keeps picking and recolouring as today.
  2. The Mapbox `fill` layer (Task 42).
  3. The footprint-overlap share rule (Task 43).

  Each step passes the existing e2e suite, with the tile rename applied.
- **`cells.json` v4 replaces `hexes.json`.** It is served at `/api/cells?v=4`. Both files coexist only within Task 41's commit.
- **Cooling shares:**
  - Air spreads uniformly over the 5 × 5 neighbourhood (`treated ÷ Σ land area`).
  - Surface goes to the overlapped tiles (`overlap ÷ land area`).
  - Air and surface each have their own cap per tile.
  - Coefficients are unchanged.
- **The score is a pure function of °F inputs and a config object.** Base scores are cached in `heatModel` (WeakMap). After-scores are computed only for tiles in `Deltas`, memoised on the actions array.
- **Anchors are fitted to the data:**
  - The 2nd–98th percentile per input, stored as constants.
  - A Vitest drift test against `cells.json` keeps them honest.
  - `npm run calibrate` prints new values.
- **Change mode colours ΔH.** It reuses the existing change ramp, scaled to the max |ΔH| (spec open question; this is the default).
- **The city-wide score shows when nothing is selected** (spec open question; this is the default).

## Dependency Graph

```
39 grid.py ──> 40 surface on tiles ──> 41 cells.json v4 + web on tiles (deck polygons)
                                            │
                                            ├──> 42 Mapbox fill layer
                                            └──> 43 footprint overlap + share rule ──> 44 cleanup, docs, straddle e2e
                                                                                         │
45 heatScore config + function (pure; can start any time after 41, needs cells.json for drift test)
   └──> 46 score on map + legend, Air/Surface removed ──> 47 hover tooltip
   └──> 48 ΔH model + Change mode ──> 49 dashboard cards ──> 50 charts
                                                           └──> 51 Method tab, docs, heat-score e2e
```

Parallelizable work: Task 45 alongside Tasks 42–44, since it is pure and only reads `cells.json`. Task 47 alongside Task 48. Everything else is sequential, because it shares types, the store and the heat layer.

## Task List

### Phase 10: Square grid (module `square-grid`)
- [ ] Task 39: Square grid in State Plane, clipped to Boston
- [ ] Task 40: Surface temperature on tiles, composite raster cached
- [ ] Task 41: `cells.json` v4 and the web on tiles

### Checkpoint H: Tiles end to end
- [ ] `make check`, `make build`, all e2e pass on tiles
- [ ] Review with human before proceeding

### Phase 11: Grid rendering and model
- [ ] Task 42: Flat Mapbox fill heat layer
- [ ] Task 43: Footprint overlap and neighbourhood share rule
- [ ] Task 44: Remove H3, update docs, straddle e2e

### Checkpoint I: `square-grid` done
- [ ] SPEC-square-grid success criteria 1–7 met
- [ ] Review with human before proceeding

### Phase 12: Heat Score (module `heat-score`)
- [ ] Task 45: Heat Score config and pure function
- [ ] Task 46: Heat Score layer and legend; Air/Surface toggle removed
- [ ] Task 47: Hover tooltip

### Checkpoint J: Score visible
- [ ] Map shows the score, legend and tooltip; all tests pass
- [ ] Review with human before proceeding

### Phase 13: Score in the model and dashboard
- [ ] Task 48: Before/after ΔH and Change mode
- [ ] Task 49: Dashboard cards and area statistics
- [ ] Task 50: Charts on the score
- [ ] Task 51: Method tab, docs, heat-score e2e

### Checkpoint K: `heat-score` done
- [ ] SPEC-heat-score success criteria 1–9 met
- [ ] Review with human before proceeding

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The Landsat re-run needs Planetary Computer (network, SAS token); scenes may fail to download | High: blocks Task 40 | Run first in Task 40, and cache the composite GeoTIFF (gitignored) so it's downloaded only once. If blocked, stop and report; there's no fallback data. |
| A Mapbox `fill` in Standard's `middle` slot may not sit under 3D buildings, or may z-fight with deck's interleaved layers | High: the core visual | Task 42 starts with a screenshot check at pitch 0 and 60. Fallback: `bottom` slot, or keep the deck polygon layer flat, and ask before choosing. |
| Mapbox building footprints are tile-clipped (~0.1% undersized, known) | Low | Overlap sums to the clipped footprint. Already a known limitation; no change. |
| Surface below the 74.8 °F anchor (parks, water edges) clamps, so cooling shows ΔH = 0 there | Medium: confusing "no change" | Show Δsurface °F next to ΔH (spec). The Method tab explains clamping. A unit test pins the behaviour. |
| Fitted air anchors span only ~4 °F, so small air changes move the score a lot | Medium | This is intended under fitted anchors and documented. Worked example in the tests: about 1.5 points per neighbourhood tile for a 5,164 m² green roof. |
| GeoJSON with ~12k polygons is slow to load or update | Medium | Build the source once and recolour via feature-state. The size budget is 3 MB. Count source updates in a test (spec criterion 6). |
| Hit-testing tiles with the heat layer hidden | Low | Point-in-tile via the bbox index in `lib/grid.ts`, not rendered-feature queries. |
| The e2e suite is slow (~4 min) and map-dependent | Low | Run the single relevant spec per task and the full suite at each checkpoint. |

## Open Questions

- The three spec open questions are taken with defaults; tell me to change any:
  1. Cache the composite GeoTIFF.
  2. Change mode scales to the max |ΔH|.
  3. The city-wide score shows with no selection.
- `pyproj` will be imported directly by `grid.py`. It is already installed through geopandas. I plan to declare it in `pyproject.toml` at its installed version, which counts as adding a dependency, so this needs a yes.
