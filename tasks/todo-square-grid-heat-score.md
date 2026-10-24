# Tasks: Square grid and Heat Score

Plan: `plan-square-grid-heat-score.md`. Specs: `.kiro/specs/`. The conventions are the same as in `todo.md`:
- Implement, test, verify, then commit, one task per commit.
- Stage specific files only.
- Never push or deploy unasked.
- When a task is done, append "(done)" to its header, tick its criteria, and add a "Notes:" paragraph before **Dependencies**.

Standard verification (cited as "standard" below):
- `make check`, which covers web lint, typecheck and vitest, plus pipeline pytest.
- `make build`.
- The task's e2e spec: `cd web && npx playwright test e2e/<spec>`.

---

## Phase 10: Square grid

### Task 39: Square grid in State Plane, clipped to Boston [M] (done)

**Description:** Replace the H3 cell generator in `grid.py` with a 100 m square grid in EPSG:26986.
- Origin snapped to 100 m, tile id `"{i}_{j}"`.
- Tiles are clipped to the Boston land boundary, with land area stored.
- Tiles under 100 m² of land are dropped.

The output is a GeoDataFrame with `id`, `landAreaM2`, the State Plane polygon and the WGS84 ring.

**Acceptance criteria:**
- [x] A synthetic boundary test (for example a 250 m × 150 m rectangle offset from the grid) gives the expected ids, clipped areas and sliver drop.
- [x] On the real boundary, it prints the tile count (expected about 12,000), with total land area within 1% of the boundary area.
- [x] Rings are closed, in [lng, lat] order, rounded to 6 decimals.

**Verification:**
- [x] `cd pipeline && uv run pytest -q tests/test_grid.py`
- [x] `uv run python -m coolboston.grid` prints the count and area.

Notes: `square_tiles` and `tile_coordinates` in `grid.py`, added alongside the H3 functions so the pipeline keeps working until Task 41 switches over. Real boundary: 13,562 tiles (11,168 full), 125.091 km² land vs 125.096 km² boundary. 276 tiles are split by water and 25 have holes, so the contract stores GeoJSON MultiPolygon `coords` instead of a single ring (spec updated). No new dependency: reprojection goes through geopandas, so pyproj isn't imported directly. Pytest: 35 passed (5 new).

**Dependencies:** None

**Files likely touched:** `pipeline/src/coolboston/grid.py`, `pipeline/tests/test_grid.py`, `pipeline/pyproject.toml`, `pipeline/uv.lock`

**Estimated scope:** Small–Medium

### Task 40: Surface temperature on tiles, composite raster cached [M] (done)

**Description:**
- `run_landsat` writes the composite °F raster to `pipeline/cache/surface_2019.tif` (gitignored), so later runs reuse it without the network.
- `zonal.py` assigns each valid 30 m pixel to the tile containing its centre, reprojecting pixel centres to EPSG:26986, followed by floor division and a land-polygon check for clipped edge tiles.
- The cache JSON is keyed by tile id.

**Acceptance criteria:**
- [x] A unit test assigns pixels to tiles on a synthetic transform: interior pixels, edge pixels outside the clip, and NaN pixels skipped.
- [x] The real run gives `surface` for at least 99% of tiles. It records the scene count (9) and the run date in the cache.
- [x] A second run with the `.tif` present does no network calls (checked by log line).

**Verification:**
- [x] `uv run pytest -q tests/test_zonal.py tests/test_composite.py`
- [x] `uv run python -m coolboston.run_landsat` prints the coverage. This needs network: stop and report if the SAS token or STAC fails.

Notes: The composite is cached as `pipeline/cache/surface_2019.tif` (float32, deflate, scene count in a tag). A second run logs "using cached composite … (no network)". `zonal.tile_surface_mean` uses pixels centred on a tile's land. 236 tiles, mostly coastal slivers under one 30 m pixel, had none, so they fall back to pixels centred anywhere in their full 100 m square (unit-tested). Coverage: 13,547 of 13,562 tiles (99.89%). The H3 cache `surface_2019.json` is still written for `build_hexes` until Task 41. Pytest: 38 passed.

**Dependencies:** Task 39

**Files likely touched:** `pipeline/src/coolboston/run_landsat.py`, `pipeline/src/coolboston/zonal.py`, `pipeline/tests/test_zonal.py`, `.gitignore`

**Estimated scope:** Medium

### Task 41: `cells.json` v4 and the web on tiles [L, mostly mechanical] (done)

**Description:** This task changes the pipeline/web contract, so both sides land in one commit.
- **Pipeline:** `build_cells.py` replaces `build_hexes.py`. It joins Heat Watch air (area-weighted onto tile land polygons) and the surface cache, and writes `web/data/cells.json` v4.
- **Web:**
  - `Cell` type and `CELLS_SCHEMA_VERSION = 4`.
  - `parseCells`, `/api/cells?v=4`, and `useCells`.
  - `heatModel` on cells.
- **Rendering:** a deck.gl `SolidPolygonLayer` replaces `H3HexagonLayer`, flat, with recolouring unchanged.
- **Building and area selection:**
  - A building gets a `primaryTile`, by point-in-tile of the footprint centroid through a bbox index in the new `lib/grid.ts`.
  - The current share rule stays for now, with tile land area replacing `HEX_AREA_M2`.
  - The area tool uses tile centroids.
- **Cleanup:** `hexes.json` and `/api/hexes` are deleted, and hex is renamed to tile in the test hook and e2e helpers.

**Acceptance criteria:**
- [ ] `cells.json` v4 validates under `parseCells`, holds about 12k tiles within 3 MB, and has at least 98% air and 99% surface coverage (counts recorded in Notes). **Air is 97.6%, below the 98% target**; everything else is met. See Notes.
- [x] The app shows tiles in Air/Surface and Heat/Change. Building select, area select, actions, cards and charts work as before.
- [x] All 9 e2e specs pass after the rename, with no console errors.

**Verification:**
- [x] `uv run pytest -q`; standard; full `cd web && npm run e2e`

Notes:
- **Counts:**
  - `cells.json` has 13,562 tiles in 2.78 MB.
  - Air: 13,237 (97.6%). That's below the 98% target because Heat Watch has no data outside its traverse routes; the hexes were at 98.3%. Left unticked for you to accept or change.
  - Surface: 13,547 (99.89%). Both: 13,222.
- **Full tiles (11,151)** ship `coords: null`, and the web rebuilds them from the id (`lib/grid.ts`, a dependency-free Lambert Conformal Conic projection matching pyproj to <1 cm). That's what fits the 3 MB budget; it was 4.06 MB with every ring.
- **Building cells:** a building's `cell` is `tileIdAt(centroid)`. `primaryTile`, `tiles` and the land-area share rule come in Task 43, so the interim cooling share uses the full tile area (10,000 m²).
- **Renderer:** heat is a deck `PolygonLayer` per tile part, with id `heat-tiles`.
- **Renames:** `Hex` became `CellTemps` (and `Cell` for the full record), `useHexes` became `useCells`, `hexColor` became `tileColor`. UI text says "tile".
- **Checks:**
  - 182 unit tests, typecheck, lint and build pass. The flaky cooling perf test now warms up `applyDeltas` too, with its threshold unchanged.
  - E2E: 9 specs, run against a test-hook production build on :3100, because the running `next dev` cached the renamed route and returns 500 until restarted. The Layers-tab spec failed once in the full run and passed on re-run.

**Dependencies:** Task 40

**Files likely touched:**
- Pipeline: `pipeline/src/coolboston/build_cells.py` (replacing `build_hexes.py`), `pipeline/tests/test_build_cells.py`.
- Data and types: `web/data/cells.json`, `web/lib/{types,data,grid,heatModel,buildings}.ts`.
- Serving: `web/app/api/cells/route.ts`.
- Components: `web/components/{useCells,layers/HeatLayer}.ts`.
- E2E: `web/e2e/helpers.ts`.

The rest are rename-only.

**Estimated scope:** Large in files but low in logic. It can't be split without breaking the app between commits, because the schema version and the renderer must change together.

## Checkpoint H: Tiles end to end
- [ ] `make check`, `make build`, full e2e pass
- [ ] Screenshot of tiles at the demo view
- [ ] Review with human before proceeding

## Phase 11: Grid rendering and model

### Task 42: Flat Mapbox fill heat layer [M]

**Description:** Replace the deck tile layer with a Mapbox GeoJSON source and a `fill` layer in Standard's `middle` slot, under the 3D buildings.
- The source is built once. Colour comes from feature-state, set from the current view (metric, mode, deltas, opacity).
- There's no outline.
- Clicking a tile is hit-tested through `lib/grid.ts`, so it works with the heat layer hidden.

**Acceptance criteria:**
- [ ] Screenshots at pitch 0 and pitch 60 show flat tiles under the buildings, with no borders. If they sit above the buildings or flicker, stop and ask (see Risks).
- [ ] Panning, zooming or hovering doesn't call `setData` or recompute deltas. A test counts source updates: 1 on load, and 0 on pan and zoom.
- [ ] Heat/Change, the opacity slider and the area tool work, and the existing e2e specs pass.

**Verification:**
- [ ] Standard; `e2e/layers.spec.ts`, `e2e/selection.spec.ts`

**Dependencies:** Task 41

**Files likely touched:** `web/components/HeatFill.tsx` (new), `web/components/layers/buildLayers.ts`, `web/components/MapView.tsx`, `web/components/AreaSelection.tsx`, `web/lib/heatView.ts`

**Estimated scope:** Medium

### Task 43: Footprint overlap and neighbourhood share rule [M]

**Description:**
- `lib/grid.ts` gains tile id parsing, `neighbourhood(id, 2)` and `footprintTiles(footprint)`. The last clips the footprint against candidate tiles in a local metre frame and returns `{id, overlapM2}[]`.
- `SelectedBuilding` gets `tiles`.
- `lib/cooling.ts` implements the spec's share rules:
  - Air: uniform over the present neighbourhood tiles.
  - Surface: overlap ÷ land area.
  - A separate cap per kind.
- A building outside the grid disables its cooling actions, with "Outside the data grid".

**Acceptance criteria:**
- [ ] Overlap unit tests cover a footprint inside one tile, straddling 2 tiles, straddling 4 tiles, and partly outside the grid. In each case the overlaps sum to the footprint area within 0.5%.
- [ ] Cooling unit tests:
  - The worked example: a 5,164 m² green roof gives about −0.1 °F air per neighbourhood tile and about −29 °F surface on a tile it half covers.
  - Air and surface caps work separately.
  - Area actions keep share 1.
- [ ] The Act panel and cards reflect the new deltas, and the act and charts e2e specs pass. Assertions on effect sizes are updated, and none are deleted.

**Verification:**
- [ ] Standard; `e2e/act.spec.ts`, `e2e/charts.spec.ts`

**Dependencies:** Task 41. Task 42 is independent but ordered first, for a stable map.

**Files likely touched:** `web/lib/grid.ts`, `web/lib/grid.test.ts`, `web/lib/cooling.ts`, `web/lib/cooling.test.ts`, `web/lib/buildings.ts`, `web/lib/types.ts`, `web/components/ActPanel.tsx`

**Estimated scope:** Medium

### Task 44: Remove H3, update docs, straddle e2e [S]

**Description:**
- Remove `@deck.gl/geo-layers`, plus h3-js and h3 if unused. Re-run `npm audit` and record the result.
- Add an e2e check: a building straddling two tiles colours both in Change mode, and its neighbourhood shows the air change.
- Update `architecture.md`, `conventions.md`, `tech-stack.md` and `plan.md`'s architecture notes to say tiles, recording the share rule as an assumption.
- Show the selection outline as the overlapped tiles.

**Acceptance criteria:**
- [ ] No `h3`/`H3` imports remain in `web/` or `pipeline/src/`, unless one is still needed and justified in Notes.
- [ ] The straddle e2e passes, and the full suite passes (10 specs).
- [ ] The docs no longer describe hexes as the current grid.

**Verification:**
- [ ] Standard; full e2e; `npm audit` count in Notes

**Dependencies:** Tasks 42, 43

**Files likely touched:** `web/package.json`, `web/package-lock.json`, `web/e2e/selection.spec.ts`, `.kiro/steering/*.md`, `tasks/plan.md`

**Estimated scope:** Small

## Checkpoint I: `square-grid` done
- [ ] SPEC-square-grid success criteria 1–7 met (cite tests and Notes)
- [ ] Review with human before proceeding

## Phase 12: Heat Score

### Task 45: Heat Score config and pure function [S]

**Description:**
- `lib/heatScoreConfig.ts` holds the weights (0.6/0.4), fitted anchors, categories, colour stops and input-time labels.
- `lib/heatScore.ts` holds `normalize`, `heatScore` (unrounded, null-safe), `displayScore`, `category` and `scoreColor` (linear between stops).
- `npm run calibrate` (a small `tsx` or node script, with no new dependency) prints the 2nd–98th percentiles from `cells.json`. Its values go into config.

**Acceptance criteria:**
- [ ] The tests in SPEC-heat-score "Testing Strategy, Unit" pass:
  - The minima give 0 and the maxima give 100.
  - The fixed-anchor example gives 50, and air at max with surface at min gives 60.
  - Clamping, nulls, category boundaries and colour stops behave as specified.
  - The weights sum to 1.
- [ ] The drift test against `cells.json` passes.
- [ ] Config is the only place these numbers appear (grep check in Notes).

**Verification:**
- [ ] `cd web && npx vitest run lib/heatScore.test.ts`; standard

**Dependencies:** Task 41, for the `cells.json` data

**Files likely touched:** `web/lib/heatScoreConfig.ts`, `web/lib/heatScore.ts`, `web/lib/heatScore.test.ts`, `web/scripts/calibrate.mjs`, `web/package.json` (script)

**Estimated scope:** Small

### Task 46: Heat Score layer and legend; Air/Surface toggle removed [M]

**Description:**
- `heatModel` adds base scores per tile, cached once.
- The fill colours by score in Heat mode, at the five stops interpolated in the Mapbox expression. No-data tiles are neutral grey.
- Default heat opacity is 0.62.
- The legend reads "Heat Score (0–100)" with category ticks, the index note and the non-simultaneous inputs line.
- `metric` is removed from the store, `ViewControls`, the test hook and the e2e helpers. Air and surface stay in the data and the model.

**Acceptance criteria:**
- [ ] A screenshot shows the score ramp under the buildings, and the legend text matches the spec.
- [ ] No Air/Surface control remains, and the Layers, selection and act e2e specs pass with updated assertions.
- [ ] A caching test shows `heatModel` returns the same object across unrelated store changes.

**Verification:**
- [ ] Standard; `e2e/layers.spec.ts`, `e2e/selection.spec.ts`

**Dependencies:** Tasks 42, 45

**Files likely touched:** `web/lib/heatModel.ts`, `web/lib/heatView.ts`, `web/lib/store.ts`, `web/components/Legend.tsx`, `web/components/ViewControls.tsx`

**Estimated scope:** Medium

### Task 47: Hover tooltip [S]

**Description:**
- `HeatTooltip` shows "Heat Score N · Category" for the tile under the cursor, plus "after M (−k, estimate)" when deltas apply, or "No data".
- It's throttled to animation frames, and doesn't intercept clicks or recompute scores.

**Acceptance criteria:**
- [ ] An e2e check: hovering a known tile shows its rounded score and category, matching `heatScore` from the test hook.
- [ ] After a green roof, the hovered roof tile shows the after line.
- [ ] No console errors, and clicks still select.

**Verification:**
- [ ] Standard; new `e2e/heat-score.spec.ts` (hover case)

**Dependencies:** Task 46

**Files likely touched:** `web/components/HeatTooltip.tsx`, `web/components/MapView.tsx`, `web/e2e/heat-score.spec.ts`

**Estimated scope:** Small

## Checkpoint J: Score visible
- [ ] Map, legend and tooltip match SPEC-heat-score "Map"; all tests pass
- [ ] Review with human before proceeding: check the ramp spread and the anchor choice on the real map

## Phase 13: Score in the model and dashboard

### Task 48: Before/after ΔH and Change mode [M]

**Description:**
- `lib/metrics.ts` computes, for a selection, the score before, the score after (from the deltas' after-inputs), the unrounded ΔH, Δair and Δsurface, and coverage. Weights:
  - Buildings: overlap.
  - Areas and the city: land area.
- It also counts affected tiles (|ΔH| > 0.05).
- Change mode colours tiles by ΔH, with the legend "Change in Heat Score (points), estimate".
- Heat-island % is removed from `impact.ts`, `heatView` and `metrics`.

**Acceptance criteria:**
- [ ] The before/after unit tests in the spec pass:
  - No actions gives null change.
  - ΔH equals H(after) − H(before), unrounded.
  - Clamping caps ΔH.
  - Null tiles are skipped and coverage is reported.
  - Solar gives ΔH = 0.
- [ ] Change mode colours the overlapped tiles and the neighbourhood, with the e2e assertion updated.
- [ ] No remaining reference to `heatIslandChangePct`.

**Verification:**
- [ ] Standard; `e2e/layers.spec.ts`, `e2e/act.spec.ts`

**Dependencies:** Tasks 43, 46

**Files likely touched:** `web/lib/metrics.ts`, `web/lib/metrics.test.ts`, `web/lib/impact.ts`, `web/lib/heatView.ts`, `web/components/Legend.tsx`

**Estimated scope:** Medium

### Task 49: Dashboard cards and area statistics [M]

**Description:** Rebuild `MetricCards` per the spec.
1. **Heat Score:** score, category and colour chip, plus coverage.
2. **Intervention impact:**
   - Before, after (estimate) and ΔH in points.
   - Δair (3pm) and Δsurface (mid-morning) in °F.
3. **Area statistics:**
   - Average score and affected tiles.
   - Modified buildings and total intervention area.
4. **Temperatures:** a collapsible section, closed by default, with air and surface before and after.

Energy, capital cost and roof-surface cards stay. The heat-island card is removed.

**Acceptance criteria:**
- [ ] With no selection, the cards show the city score. With a building and a green roof, the cards show before > after, negative ΔH, and every change labelled "Estimate".
- [ ] For an area with 2 buildings' actions, the area statistics count 2 modified buildings and sum their treated areas. This is covered by a unit test of the stats function.
- [ ] Opening the Temperatures section shows the air and surface values, as an e2e check.

**Verification:**
- [ ] Standard; `e2e/act.spec.ts`, `e2e/heat-score.spec.ts`

**Dependencies:** Task 48

**Files likely touched:** `web/components/MetricCards.tsx`, `web/lib/metrics.ts`, `web/lib/format.ts`, `web/e2e/act.spec.ts`, `web/e2e/heat-score.spec.ts`

**Estimated scope:** Medium

### Task 50: Charts on the score [S]

**Description:**
- The cost-vs-effect chart's y axis is "Heat Score reduction (points)" (−ΔH per action, alone, weighted over its tiles). The tooltip shows signed ΔH, cost and roof surface. The heat-island footnote is removed.
- Before-and-after rows: Heat Score, Air (3pm) and Surface (mid-morning).

**Acceptance criteria:**
- [ ] `tradeoff.test.ts` and `beforeAfter.test.ts` are updated to the score, with none deleted.
- [ ] The charts e2e spec passes with the new labels, and the empty states are unchanged.

**Verification:**
- [ ] Standard; `e2e/charts.spec.ts`

**Dependencies:** Task 48

**Files likely touched:** `web/lib/tradeoff.ts`, `web/lib/beforeAfter.ts`, their tests, `web/components/charts/*`, `web/e2e/charts.spec.ts`

**Estimated scope:** Small–Medium

### Task 51: Method tab, docs, heat-score e2e [S]

**Description:**
- The Method tab gets a "Heat Score" section that renders from config:
  - The formula, weights (preliminary) and fitted anchors.
  - Categories, described as relative and not official.
  - The non-simultaneous inputs, and that air is resolved at about 25 ha.
  - The share and spreading assumption, and clamping.
  - "Not an official or validated heat-stress index."
- Finish `e2e/heat-score.spec.ts`: no Air/Surface toggle, the legend title, the green-roof before/after and the Temperatures section.
- Update the steering docs and `PLAN.md`'s metric description.

**Acceptance criteria:**
- [ ] The Method tab shows the anchors and weights from config. A unit or e2e check reads them, so they can't diverge.
- [ ] `heat-score.spec.ts` passes, and the full e2e suite passes.
- [ ] The docs describe the score, its non-official status and the input times.

**Verification:**
- [ ] Standard; full `cd web && npm run e2e`

**Dependencies:** Tasks 47, 49, 50

**Files likely touched:** `web/components/RightPanel.tsx` (or `MethodPanel.tsx`), `web/e2e/heat-score.spec.ts`, `.kiro/steering/architecture.md`, `PLAN.md`

**Estimated scope:** Small

## Checkpoint K: `heat-score` done
- [ ] SPEC-heat-score success criteria 1–9 met (cite tests)
- [ ] `make check`, `make build`, full e2e pass; nothing deployed or pushed
- [ ] Review with human before proceeding
