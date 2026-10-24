# Task List: Boston Urban Heat Island Dashboard

Source: `../PLAN.md` (research, architecture, scoring formulas). Overview, risks and index: `plan.md`.

Conventions
- Web commands run in `web/`: tests `npm test` (Vitest, `vitest run`), build `npm run build`, lint `npm run lint`.
- Pipeline commands run in `pipeline/`: tests `uv run pytest`.
- Time estimates are in minutes. Tier: **MVP** = must ship, **STRETCH** = cut if behind schedule.
- Every task ends with a working app (or a working pipeline script). Do not start a task with a red build.
- Scope: XS = 1 file, S = 1-2, M = 3-5. Nothing is larger than M.

---

## Phase 0: Foundation (90 min)

### Task 1: Repo scaffold [MVP, 5m, XS]
**Description:** Initialize the repo skeleton so every later task has a place to put files.

**Acceptance criteria:**
- [x] `git init` done; `web/`, `pipeline/`, `tasks/` exist.
- [x] `.gitignore` ignores `node_modules`, `.next`, `.venv`, `__pycache__`, `.env*.local`, `pipeline/cache/`, `.env`.
- [x] `.env.example` contains `NEXT_PUBLIC_MAPBOX_TOKEN=`.

**Verification:**
- [x] `git status` shows no secrets or build output tracked.

**Dependencies:** None
**Files likely touched:** `.gitignore`, `.env.example`

### Task 2: Next.js app and tooling [MVP, 20m, M]
**Description:** Create the Next.js app (App Router, TypeScript, Tailwind) and install the tooling used by every later task.

**Acceptance criteria:**
- [x] `web/` runs with `npm run dev` and shows the default page.
- [x] shadcn/ui initialised; Vitest configured with a path alias matching `tsconfig`.
- [x] Dependencies installed with pinned (exact) versions: `mapbox-gl`, `react-map-gl`, `deck.gl` (plus `@deck.gl/mapbox`, `@deck.gl/geo-layers`, `@deck.gl/layers`), `zustand`, `recharts`, `vitest`.
- [x] One trivial passing Vitest test proves the runner works.

**Verification:**
- [x] `npm test` passes
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

**Dependencies:** Task 1
**Files likely touched:** `web/package.json`, `web/vitest.config.ts`, `web/tsconfig.json`, `web/components.json`, `web/lib/smoke.test.ts`

### Task 3: Zustand store with core state [MVP, 10m, S]
**Description:** One store holds the state the whole UI shares, so later tasks only read and write it.

**Acceptance criteria:**
- [x] State: `year` (default 2025), `isPlaying` (false), `speed` (1), `intervention` (default `green-roof`), `selectedHexId` (null), `layers` (map of id → `{visible, opacity}`).
- [x] Actions: `setYear`, `play`, `pause`, `setSpeed`, `setIntervention`, `selectHex`, `toggleLayer`, `setLayerOpacity`.
- [x] `setYear` clamps to 2013-2025; `setLayerOpacity` clamps to 0-1.

**Verification:**
- [x] Tests pass: defaults, clamping, `toggleLayer`, `selectHex(null)` clears.

**Dependencies:** Task 2
**Files likely touched:** `web/lib/store.ts`, `web/lib/store.test.ts`, `web/lib/types.ts`

### Task 4: Dashboard layout shell [MVP, 20m, M]
**Description:** FireTrace-style frame: top bar, center map area, right panel with tabs, bottom timeline area, all with placeholder content.

**Acceptance criteria:**
- [x] CSS grid layout fills the viewport with no page scroll: top bar, map slot, right panel (~320px), bottom panel (~220px).
- [x] Right panel has tabs: Layers, Analysis, Simulate, Methodology (placeholders).
- [x] Top bar shows the app name and an intervention dropdown (wired to the store).
- [x] Dark theme; layout holds from 1280px up.

**Verification:**
- [x] `npm run build` succeeds
- [x] Manual check: resize the window, confirm no overflow and tabs switch.

**Dependencies:** Task 3
**Files likely touched:** `web/app/layout.tsx`, `web/app/page.tsx`, `web/components/TopBar.tsx`, `web/components/RightPanel.tsx`, `web/components/BottomPanel.tsx`

### Task 5: 3D Mapbox map, client-only [MVP, 20m, M]
**Description:** Boston in 3D inside the map slot. The map is mounted once so it is not recreated on re-render (each creation is billed as a map load).

**Acceptance criteria:**
- [x] `MapView` loaded via `dynamic(() => import(...), { ssr: false })`.
- [x] Classic dark style (not Standard), centered near `[-71.0589, 42.3601]`, pitch 60, zoom ~12.5.
- [x] A `fill-extrusion` layer extrudes buildings using `height` from the vector tiles; Mapbox attribution visible.
- [x] Missing token shows a readable error message instead of a blank page.

**Verification:**
- [x] `npm run build` succeeds (no `window is not defined`)
- [x] Manual check: pan, rotate, tilt work; reloading dev server does not spawn extra maps (check the console).

**Dependencies:** Task 4
**Files likely touched:** `web/components/MapView.tsx`, `web/components/MapClient.tsx`, `web/app/page.tsx`

### Task 6: deck.gl interleaved overlay spike [MVP, 15m, S]
**Description:** Prove deck.gl layers render correctly beneath/among the 3D buildings before building on it.

**Acceptance criteria:**
- [x] `MapboxOverlay` in interleaved mode attached to the map.
- [x] A test `ScatterplotLayer` or `H3HexagonLayer` with 3 hard-coded cells renders in Boston.
- [x] Layer draws below building extrusions using `beforeId`/`slot`; recorded in a code comment with the working setting.

**Verification:**
- [x] Manual check: tilt the map; hexes sit on the ground and buildings occlude them correctly.

**Dependencies:** Task 5
**Files likely touched:** `web/components/MapView.tsx`, `web/components/DeckOverlay.tsx`

### Checkpoint A: After Tasks 1-6
- [x] `npm test`, `npm run lint`, `npm run build` all pass
- [x] 3D Boston renders inside the dashboard frame with a deck.gl layer on it
- [x] Review with human before proceeding
- [x] Visual check against real Mapbox tiles (needs NEXT_PUBLIC_MAPBOX_TOKEN in web/.env.local)

Notes from Phase 0:
- Tokens are checked for the pk. prefix; sk. tokens are rejected so they never ship to the browser.
- deck.gl overlay is a per-map singleton (not react-map-gl useControl); useControl raced under React StrictMode ("WebGL context already attached") and rendered nothing in dev.
- Deck mounts only after the 3d-buildings layer exists (`WhenLayerExists`), because addLayer with a missing beforeId throws.
- Layering verified offline with a stubbed style + synthetic building tiles: hexes draw beneath extrusions and are occluded by them, in dev and prod.
- `@playwright/test` installed early (needed for Task 46; used now for screenshots).

---

## Phase 1: Heat hexes on the map (70 min)

### Task 7: Pipeline scaffold, Boston boundary, H3 grid [MVP, 15m, M]
**Description:** Python project that generates the H3 resolution-9 cells covering Boston.

**Acceptance criteria:**
- [x] `pipeline/` is a uv project (pinned versions): `geopandas`, `h3`, `shapely`, `pytest`.
- [x] `grid.py` fetches/loads the Boston boundary (Analyze Boston municipal boundary) and returns the list of H3 res-9 cell IDs whose centers fall inside it (use `h3.polygon_to_cells`).
- [x] Output ID list is deterministic and contains no duplicates.

**Verification:**
- [x] `uv run pytest`: a small fixture polygon returns the expected cell count; all IDs are valid H3 res 9.
- [x] Manual check: count is plausible (roughly 1-3k cells).

**Dependencies:** Task 1
**Files likely touched:** `pipeline/pyproject.toml`, `pipeline/src/grid.py`, `pipeline/tests/test_grid.py`, `pipeline/data/raw/boston_boundary.geojson`

### Task 8: Heat Watch ingest and area-weighted join [MVP, 20m, M]
**Description:** Bring the 2019 Heat Watch hexes (6am, 3pm, 7pm temperature and heat index) onto our H3 grid.

**Acceptance criteria:**
- [x] `heatwatch.py` loads the "Canopy Change Assessment: Heat Metrics" hex layer (MassGIS / Analyze Boston).
- [x] Each H3 cell receives an area-weighted mean of the overlapping source hexes for `temp_3pm`, `temp_6am`, `temp_7pm` (°F) in the grid CRS.
- [x] Cells with no overlap get `null`, not 0.

**Verification:**
- [x] `uv run pytest`: two overlapping fixture polygons with known values give the expected weighted mean; a non-overlapping cell is `null`.

**Dependencies:** Task 7
**Files likely touched:** `pipeline/src/heatwatch.py`, `pipeline/src/join.py`, `pipeline/tests/test_join.py`

### Task 9: hexes.json writer and /api/hexes [MVP, 15m, M]
**Description:** Define the data contract between pipeline and web, then serve it.

**Acceptance criteria:**
- [x] `build_hexes.py` writes `web/data/hexes.json`: `{ "version": 1, "hexes": [{ "id", "temp3pm", ... }] }`; field names documented in `web/lib/types.ts`.
- [x] `GET /api/hexes` returns the file with `Cache-Control` set.
- [x] Response type is validated at load time (missing/extra fields throw a clear error).

**Verification:**
- [x] `uv run pytest`: written JSON matches schema.
- [x] `npm test`: loader rejects a malformed fixture.
- [x] Manual check: `curl localhost:3000/api/hexes` returns data.

**Dependencies:** Tasks 3, 8
**Files likely touched:** `pipeline/src/build_hexes.py`, `web/app/api/hexes/route.ts`, `web/lib/data.ts`, `web/lib/data.test.ts`, `web/lib/types.ts`

### Task 10: Heat hex layer, color ramp, tooltip [MVP, 20m, M]
**Description:** Render the hexes colored by temperature.

**Acceptance criteria:**
- [x] `H3HexagonLayer` shows all hexes, colored by `temp3pm` with a continuous ramp (cool blue → hot red); `null` cells are transparent.
- [x] Hover tooltip shows the temperature in °F, rounded to 1 decimal.
- [x] Legend with min/max values in the Layers tab or map corner.

**Verification:**
- [x] `npm test`: ramp returns the first color at min, the last at max, clamps outside the range, handles null.
- [x] Manual check: downtown/dense areas look hotter than parks.

**Dependencies:** Tasks 6, 9
**Files likely touched:** `web/lib/colors.ts`, `web/lib/colors.test.ts`, `web/components/layers/HeatLayer.ts`, `web/components/Legend.tsx`

### Checkpoint B: After Tasks 7-10
- [x] `uv run pytest` and `npm test` pass; `npm run build` succeeds
- [x] Heat hexes are visible on the 3D map with hover values
- [ ] Review with human before proceeding

---

## Phase 2: Landsat yearly heat and the timeline (125 min, highest risk)

Time-box this phase. If Task 13 is not producing composites by minute ~60 of the phase, fall back to every other year (2013, 2015, ... 2025) and note it in `plan.md`.

### Task 11: Landsat STAC search spike (one year) [MVP, 20m, S]
**Description:** Find usable summer Landsat scenes over Boston for a single year and confirm we can read the thermal band.

**Acceptance criteria:**
- [ ] `landsat.py: search_scenes(year)` queries Planetary Computer STAC (`landsat-c2-l2`) for Boston's bbox, June 1-Aug 31, `eo:cloud_cover < 20`, returns signed item hrefs.
- [ ] Confirm the exact asset names in a returned item (expected: thermal `lwir11`, QA `qa_pixel`) and record them in a constant.
- [ ] Reads a windowed (clipped) array for the thermal band without downloading the full scene.

**Verification:**
- [ ] Manual check: run for 2023, print scene count and dates; at least 2 scenes found.
- [ ] `uv run pytest`: the query-building function (bbox, date range, cloud filter) is tested without network access.

**Dependencies:** Task 7
**Files likely touched:** `pipeline/src/landsat.py`, `pipeline/tests/test_landsat_query.py`

### Task 12: Temperature conversion and cloud mask [MVP, 10m, S]
**Description:** Pure functions that turn raw Landsat values into clean °C values.

**Acceptance criteria:**
- [ ] `dn_to_celsius(dn)` = `dn * 0.00341802 + 149.0 - 273.15`; DN 0 (fill) → NaN.
- [ ] `cloud_mask(qa)` flags fill, dilated cloud, cirrus, cloud, and cloud shadow bits of QA_PIXEL as invalid (check bit positions against the Landsat C2 QA_PIXEL documentation and cite the doc in a comment).
- [ ] Masked pixels become NaN.

**Verification:**
- [ ] `uv run pytest`: known DN → known °C (DN 44000 → 44000 × 0.00341802 + 149.0 − 273.15 ≈ 26.24°C); a synthetic QA array with specific bits set masks exactly those pixels.

**Dependencies:** Task 7
**Files likely touched:** `pipeline/src/lst.py`, `pipeline/tests/test_lst.py`

### Task 13: Yearly median composites 2013-2025 [MVP, 25m, M]
**Description:** Build one cloud-masked summer median land surface temperature (°C) raster per year.

**Acceptance criteria:**
- [ ] For each year, stack the scenes from Task 11, apply Task 12, take the per-pixel `nanmedian`, clip to Boston, and save to `pipeline/cache/lst_{year}.tif`.
- [ ] Re-running skips years already cached.
- [ ] Years with fewer than 2 usable scenes are logged and written to `pipeline/cache/skipped.json`.
- [ ] Output rasters share one grid/CRS (reproject to match the first year).

**Verification:**
- [ ] `uv run pytest`: median composite of 3 synthetic arrays with NaNs gives expected values.
- [ ] Manual check: 2013-2025 rasters exist (or a documented skip list); open one and confirm values are 20-50°C.

**Dependencies:** Tasks 11, 12
**Files likely touched:** `pipeline/src/composite.py`, `pipeline/src/run_landsat.py`, `pipeline/tests/test_composite.py`

### Task 14: Zonal stats onto hexes [MVP, 15m, S]
**Description:** Average each year's raster inside each hex.

**Acceptance criteria:**
- [ ] For every hex and year, compute mean LST (°C) of valid pixels; hexes with no valid pixels get `null`.
- [ ] `hexes.json` gains `lst: { "2013": 31.2, ... }` per hex (bump `version` to 2 and update `types.ts`).

**Verification:**
- [ ] `uv run pytest`: a tiny raster with a known per-cell mean gives the expected result; all-NaN cell → null.
- [ ] `npm test`: data loader accepts v2 shape.

**Dependencies:** Tasks 9, 13
**Files likely touched:** `pipeline/src/zonal.py`, `pipeline/src/build_hexes.py`, `pipeline/tests/test_zonal.py`, `web/lib/types.ts`, `web/lib/data.ts`

### Task 15: Colorized yearly PNG overlays [STRETCH, 15m, S]
**Description:** Export a smooth, high-res raster overlay per year for the map (nicer than hexes alone).

**Acceptance criteria:**
- [ ] `web/public/lst/{year}.png` written with a color ramp matching `web/lib/colors.ts` (same min/max across all years so colors are comparable over time).
- [ ] `web/public/lst/bounds.json` holds `[west, south, east, north]` in WGS84.
- [ ] Each PNG is under ~500 KB; NaN pixels are transparent.

**Verification:**
- [ ] `uv run pytest`: ramp function matches fixture values from the TS ramp (shared constants file).
- [ ] Manual check: open one PNG, confirm it shows the Boston shape.

**Dependencies:** Task 13
**Files likely touched:** `pipeline/src/render_png.py`, `pipeline/tests/test_render.py`, `web/public/lst/*`

### Task 16: Timeline playback logic [MVP, 10m, S]
**Description:** Pure logic for stepping and auto-play, tested before any UI exists.

**Acceptance criteria:**
- [ ] `nextYear(year, dir)` wraps or stops at the bounds as specified (play loops back to 2013; manual stepping clamps).
- [ ] Tick interval = `1000 / speed` ms; speed options 1x, 2x, 4x.
- [ ] A `usePlayback` hook advances the store's year only while `isPlaying`, and cleans up its timer on pause/unmount.

**Verification:**
- [ ] `npm test`: bounds, wrap, speed math; hook test with fake timers advances N years in N ticks and stops after pause.

**Dependencies:** Task 3
**Files likely touched:** `web/lib/timeline.ts`, `web/lib/timeline.test.ts`, `web/hooks/usePlayback.ts`

### Task 17: Timeline UI [MVP, 15m, M]
**Description:** FireTrace-style timeline bar in the bottom panel.

**Acceptance criteria:**
- [ ] Play/pause, step back/forward, speed select, and a scrub slider with year ticks (2013-2025); current year label above the handle.
- [ ] Slider is keyboard operable (arrow keys), with `aria-label`s on all controls.
- [ ] Years with no data are visibly marked.

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: scrubbing updates the year label; space toggles play.

**Dependencies:** Tasks 4, 16
**Files likely touched:** `web/components/Timeline.tsx`, `web/components/BottomPanel.tsx`

### Task 18: Year-driven recolor and raster overlay [MVP, 15m, S]
**Description:** Hook the map to the selected year.

**Acceptance criteria:**
- [ ] Hex colors use `lst[year]` instead of `temp3pm` (Heat Watch stays available as a selectable metric if time allows; otherwise removed from the UI).
- [ ] If Task 15 was done, a `BitmapLayer` shows `lst/{year}.png` and swaps with the year; otherwise skip.
- [ ] Layer updates without recreating the map (use deck `updateTriggers`).

**Verification:**
- [ ] `npm test`: color accessor returns the right value for each year and handles missing years.
- [ ] Manual check: press play, hot areas visibly shift between years.

**Dependencies:** Tasks 10, 14, 17 (and 15 for the raster)
**Files likely touched:** `web/components/layers/HeatLayer.ts`, `web/components/layers/LstRasterLayer.ts`, `web/components/DeckOverlay.tsx`

### Checkpoint C: After Tasks 11-18
- [ ] All tests pass; build succeeds
- [ ] Press play: heat animates across years on the 3D map
- [ ] Note which years (if any) were skipped; decide full vs. every-other-year
- [ ] Review with human before proceeding

---

## Phase 3: Selection, metrics, charts (60 min)

### Task 19: /api/hex/[id] endpoint [MVP, 10m, S]
**Description:** Per-hex detail with the city-wide comparison series.

**Acceptance criteria:**
- [ ] Returns `{ id, lst: {year: °C}, cityAvg: {year: °C} }`.
- [ ] Invalid id (not a 15-char hex string / valid H3) → 400; unknown id → 404.
- [ ] City average computed once at load, not per request.

**Verification:**
- [ ] `npm test`: handler returns 400 for malformed id, 404 for unknown, 200 with expected shape for a fixture.

**Dependencies:** Task 14
**Files likely touched:** `web/app/api/hex/[id]/route.ts`, `web/lib/data.ts`, `web/app/api/hex/[id]/route.test.ts`

### Task 20: Series transform library [MVP, 10m, S]
**Description:** Pure functions that shape data for charts.

**Acceptance criteria:**
- [ ] `toSeries(hex, cityAvg)` → `[{year, hex, city, delta}]` sorted by year; `delta = hex - city`; missing year → `null` not 0.
- [ ] `heatIslandSummary(series)` returns mean delta and the number of years the hex was hotter than the city.

**Verification:**
- [ ] `npm test`: ordering, delta math, null handling, summary on a fixture.

**Dependencies:** Task 2
**Files likely touched:** `web/lib/series.ts`, `web/lib/series.test.ts`

### Task 21: Hex click selection and highlight [MVP, 10m, S]
**Description:** Click a hex to select it.

**Acceptance criteria:**
- [ ] Clicking a hex sets `selectedHexId`; clicking empty map clears it.
- [ ] Selected hex has a visible outline (thicker line layer).
- [ ] Selection survives a year change.

**Verification:**
- [ ] `npm test`: store interaction (select, change year, still selected, clear).
- [ ] Manual check: click highlights, Escape clears.

**Dependencies:** Task 18
**Files likely touched:** `web/components/layers/HeatLayer.ts`, `web/components/layers/SelectionLayer.ts`, `web/components/DeckOverlay.tsx`

### Task 22: City vs hex line chart [MVP, 15m, M]
**Description:** Recharts line chart in the bottom panel.

**Acceptance criteria:**
- [ ] Two lines: selected hex and city average by year; a vertical reference line at the current year.
- [ ] Without a selection, shows the city average with the prompt "Click a hex to compare".
- [ ] Clicking a point on the chart sets the year; axis labelled in °C.

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual check: select a hex and scrub the year; the marker moves.

**Dependencies:** Tasks 19, 20, 21
**Files likely touched:** `web/components/charts/TempChart.tsx`, `web/hooks/useHexDetail.ts`, `web/components/BottomPanel.tsx`

### Task 23: Heat-island delta chart and metric cards [MVP, 15m, M]
**Description:** Second chart and a metrics panel on the right.

**Acceptance criteria:**
- [ ] Area chart of `delta` per year (positive = hotter than city).
- [ ] Analysis tab shows cards: current-year temp, difference from city average, years hotter than city (e.g. "11 of 13").
- [ ] Empty state when nothing is selected.

**Verification:**
- [ ] `npm test`: card values derived from `heatIslandSummary` match fixtures.
- [ ] Manual check: Chinatown/Downtown hex shows a positive delta.

**Dependencies:** Task 22
**Files likely touched:** `web/components/charts/DeltaChart.tsx`, `web/components/MetricCards.tsx`, `web/components/RightPanel.tsx`

### Checkpoint D: After Tasks 19-23
- [ ] All tests pass; build succeeds
- [ ] Click a hex → charts and cards update; year scrubbing works with a selection
- [ ] Review with human before proceeding

---

## Phase 4: Context layers (73 min)

### Task 24: Canopy per hex [MVP, 15m, M]
**Description:** Add tree canopy percentage to each hex.

**Acceptance criteria:**
- [ ] Canopy source loaded (Canopy Change Assessment; choose the hex/census block layer that has canopy %, record source URL in a comment).
- [ ] `canopyPct` (0-100) joined area-weighted using the Task 8 join; written to `hexes.json`.

**Verification:**
- [ ] `uv run pytest`: join fixture; values within 0-100.
- [ ] Manual check: parks (Arnold Arboretum, Common) have high canopy.

**Dependencies:** Tasks 8, 9
**Files likely touched:** `pipeline/src/canopy.py`, `pipeline/tests/test_canopy.py`, `pipeline/src/build_hexes.py`, `web/lib/types.ts`

### Task 25: Social vulnerability per hex [MVP, 15m, M]
**Description:** Add the CDC SVI overall percentile ranking to each hex.

**Acceptance criteria:**
- [ ] SVI census tract data for Suffolk County, MA is loaded and joined to hexes area-weighted; stored as `svi` (0-1).
- [ ] Tract values of -999 (CDC's missing marker) become `null`.

**Verification:**
- [ ] `uv run pytest`: the -999 handling, weighted join, range check.

**Dependencies:** Tasks 8, 9
**Files likely touched:** `pipeline/src/svi.py`, `pipeline/tests/test_svi.py`, `pipeline/src/build_hexes.py`, `web/lib/types.ts`

### Task 26: Parking and impervious share per hex [STRETCH, 15m, M]
**Description:** Add the data needed for the cool-pavement intervention.

**Acceptance criteria:**
- [ ] OSM `amenity=parking` polygons (via `osmnx`) for Boston, cached to `pipeline/cache/`.
- [ ] `parkingShare` (0-1) = parking area / hex area, clipped to hex.

**Verification:**
- [ ] `uv run pytest`: a fixture polygon covering half a hex gives 0.5.

**Dependencies:** Tasks 8, 9
**Files likely touched:** `pipeline/src/parking.py`, `pipeline/tests/test_parking.py`, `pipeline/src/build_hexes.py`, `web/lib/types.ts`

If this task is cut, drop the cool-pavement intervention everywhere (Tasks 29-34 reference only the remaining four).

### Task 27: Layer registry and visibility logic [MVP, 8m, S]
**Description:** Single list defining every layer, used by the panel and by rendering.

**Acceptance criteria:**
- [ ] Registry entries: `id`, `label`, `swatch`, `defaultVisible`, `defaultOpacity`; includes Heat (LST), Canopy, SVI, (Parking), Buildings.
- [ ] Store's `layers` initialises from the registry.

**Verification:**
- [ ] `npm test`: every registry id appears in store defaults; toggling one layer doesn't change another.

**Dependencies:** Task 3
**Files likely touched:** `web/lib/layers.ts`, `web/lib/layers.test.ts`, `web/lib/store.ts`

### Task 28: Layers panel and context layer rendering [MVP, 20m, M]
**Description:** The right-panel Layers tab like the FireTrace screenshot, driving what's on the map.

**Acceptance criteria:**
- [ ] Each layer shows checkbox, color swatch, label, and an opacity slider with % value.
- [ ] Canopy and SVI render as hex layers with their own ramps, respecting visibility and opacity; legend updates for the top visible layer.
- [ ] Controls have labels and are keyboard operable.

**Verification:**
- [ ] `npm test`: opacity values applied to the layer props.
- [ ] Manual check: toggle canopy on, opacity to 50%, heat layer remains visible underneath.

**Dependencies:** Tasks 24, 25, 27
**Files likely touched:** `web/components/LayersPanel.tsx`, `web/components/layers/ContextLayers.ts`, `web/components/DeckOverlay.tsx`

### Checkpoint E: After Tasks 24-28
- [ ] All tests pass; build succeeds
- [ ] Low-canopy + high-SVI areas visibly line up with hot hexes
- [ ] Review with human before proceeding

---

## Phase 5: Scoring and recommendations (90 min)

### Task 29: Building roofs ingest and hex aggregation [MVP, 20m, M]
**Description:** Aggregate roof data to hexes (flat-roof area, total roof area).

**Acceptance criteria:**
- [ ] Load Boston Buildings with Roof Breaks (fallback: MassGIS Building Structures 2-D); keep footprints over ~2,000 sq ft.
- [ ] Define "flat roof" rule in code with a comment (e.g., roof-slope attribute if present, otherwise a documented proxy) and record the choice in `PLAN.md` assumptions.
- [ ] Per hex: `roofAreaSqft`, `flatRoofAreaSqft`; written to `hexes.json`.

**Verification:**
- [ ] `uv run pytest`: building fixture sums correctly per hex; building straddling two hexes is split by area (or assigned by centroid, decision documented and tested).

**Dependencies:** Tasks 7, 9
**Files likely touched:** `pipeline/src/roofs.py`, `pipeline/tests/test_roofs.py`, `pipeline/src/build_hexes.py`, `web/lib/types.ts`

### Task 30: Solar potential per hex [MVP, 20m, M]
**Description:** Estimate rooftop PV potential per hex.

**Acceptance criteria:**
- [ ] Use the NREL PV Rooftop Database for Boston if it can be loaded within the time-box; otherwise a documented proxy (roof area × a fixed suitability factor × Boston average irradiance). The choice is recorded in `PLAN.md`.
- [ ] `pvKwhYear` per hex written to `hexes.json`.

**Verification:**
- [ ] `uv run pytest`: proxy math on fixtures; values non-negative.

**Dependencies:** Task 29
**Files likely touched:** `pipeline/src/solar.py`, `pipeline/tests/test_solar.py`, `pipeline/src/build_hexes.py`

### Task 31: Scoring library [MVP, 15m, M]
**Description:** The single source of truth for intervention scores.

**Acceptance criteria:**
- [ ] `WEIGHTS` table per intervention exactly as in `PLAN.md`; each row sums to 1.
- [ ] `percentileRank(values)` → 0-1 per value; ties get the same rank; null → null.
- [ ] `scoreHexes(hexes)` → per-hex score (0-100) for each intervention; null inputs treated as missing (hex excluded for that intervention, not scored 0).
- [ ] Metadata (label, description, data sources) exported from the same module for the Methodology tab.

**Verification:**
- [ ] `npm test`: weights sum to 1; ranks on a fixture; scores in [0, 100]; hex with highest heat/vuln/roof ranks first for green roof; null handling.

**Dependencies:** Tasks 24, 25, 29, 30 (and 26 for cool pavement)
**Files likely touched:** `web/lib/scoring.ts`, `web/lib/scoring.test.ts`

### Task 32: Intervention selector recolors map [MVP, 10m, S]
**Description:** Pick an intervention and the hex layer shows its score.

**Acceptance criteria:**
- [ ] Top-bar dropdown lists interventions; selecting one sets `intervention` in the store.
- [ ] A "Score" mode colors hexes by the selected intervention's 0-100 score with its own ramp and legend; heat mode remains available.
- [ ] Scores computed once (memoized), not on every render.

**Verification:**
- [ ] `npm test`: color accessor uses score in score mode and LST in heat mode.
- [ ] Manual check: choosing Solar vs Trees visibly changes the pattern.

**Dependencies:** Tasks 31, 18
**Files likely touched:** `web/components/TopBar.tsx`, `web/components/layers/HeatLayer.ts`, `web/lib/store.ts`

### Task 33: Hex recommendation card [MVP, 15m, M]
**Description:** Explain why the selected hex ranks the way it does.

**Acceptance criteria:**
- [ ] Analysis tab: horizontal bar chart of all intervention scores for the selected hex, sorted descending, top one labelled "Best fit".
- [ ] Below, the top intervention shows a breakdown of its contributing factors (heat, vulnerability, opportunity percentile and weight).
- [ ] Estimate disclaimer shown.

**Verification:**
- [ ] `npm test`: `explainScore(hex, intervention)` contributions sum to the score (within rounding).

**Dependencies:** Tasks 23, 31
**Files likely touched:** `web/lib/scoring.ts`, `web/components/charts/ScoreBars.tsx`, `web/components/RightPanel.tsx`

### Task 34: Methodology tab [MVP, 10m, S]
**Description:** Transparent formulas and sources.

**Acceptance criteria:**
- [ ] Tab renders the weight table and per-intervention description from `scoring.ts` (no duplicated numbers).
- [ ] Lists every data source with a link and the year of the data; states known limitations (2019 Heat Watch snapshot, Landsat resolution, estimates are approximate).

**Verification:**
- [ ] `npm test`: rendered weights equal `WEIGHTS` (snapshot or text assertion).

**Dependencies:** Task 31
**Files likely touched:** `web/components/MethodologyPanel.tsx`

### Checkpoint F: After Tasks 29-34
- [ ] All tests pass; build succeeds
- [ ] Pick an intervention, see top hexes, click one, see why
- [ ] Review with human; decide whether Phase 6 or Phase 7 is next

---

## Phase 6: What-if simulator (55 min) [STRETCH, but recommended before Phase 7]

### Task 35: Cooling coefficients [STRETCH, 10m, S]
**Description:** Cited, adjustable numbers behind the simulator.

**Acceptance criteria:**
- [ ] `coefficients.ts`: for each intervention, °C air-temperature reduction per 1.0 fraction of hex area converted, with a source citation (EPA Heat Island Compendium, Smith et al. 2025) and a low/central/high range.
- [ ] Every value has a `// source:` comment; no unsourced numbers.

**Verification:**
- [ ] `npm test`: all interventions have coefficients; low ≤ central ≤ high.

**Dependencies:** Task 31
**Files likely touched:** `web/lib/coefficients.ts`, `web/lib/coefficients.test.ts`

### Task 36: What-if calculation [STRETCH, 15m, M]
**Description:** Pure function from adoption percentage to per-hex cooling.

**Acceptance criteria:**
- [ ] `simulate(hexes, scores, intervention, adoptionPct)`: choose the top `adoptionPct` of hexes by score; each converts a fraction of its available area (e.g. flat-roof area / hex area); cooling = coefficient × converted fraction.
- [ ] Returns per-hex `deltaC` plus summary: citywide mean ΔT, mean ΔT of the hottest 10% of hexes, sq ft converted.
- [ ] 0% → all zeros; capped at the available area; monotonic in adoption.

**Verification:**
- [ ] `npm test`: zero adoption → zero; increasing adoption never reduces total cooling; cap respected; 100% on fixture equals hand-computed value.

**Dependencies:** Tasks 31, 35
**Files likely touched:** `web/lib/whatif.ts`, `web/lib/whatif.test.ts`

### Task 37: Simulate panel [STRETCH, 15m, M]
**Description:** UI for the simulator.

**Acceptance criteria:**
- [ ] Simulate tab: intervention picker and adoption slider (0-100%, step 5), with an "Approximate estimates" note.
- [ ] Simulation inputs stored in the Zustand store (`simAdoptionPct`, `simActive`); debounced to avoid recomputing on every pixel of the slider.

**Verification:**
- [ ] `npm test`: store actions; debounce triggers one compute.
- [ ] Manual check: slider is smooth with all hexes.

**Dependencies:** Task 36
**Files likely touched:** `web/components/SimulatePanel.tsx`, `web/lib/store.ts`

### Task 38: Delta layer and result metrics [STRETCH, 15m, M]
**Description:** Show the cooling on the map and in numbers.

**Acceptance criteria:**
- [ ] When simulation is active, a layer colors hexes by `deltaC` (blue scale, with a legend in °C); hexes not selected for adoption are dimmed.
- [ ] Result cards: citywide mean ΔT, hottest-10% ΔT, sq ft converted, MWh/year if the intervention is solar.
- [ ] Reset button clears the simulation.

**Verification:**
- [ ] `npm test`: cards match `simulate` output for a fixture.
- [ ] Manual check: green roofs at 25% cools downtown more than the outskirts.

**Dependencies:** Tasks 18, 37
**Files likely touched:** `web/components/layers/DeltaLayer.ts`, `web/components/SimulatePanel.tsx`, `web/components/DeckOverlay.tsx`

### Checkpoint G: After Tasks 35-38
- [ ] All tests pass; build succeeds
- [ ] Drag the slider and see an estimated cooling map and numbers
- [ ] Review with human before proceeding

---

## Phase 7: Per-building scores (70 min) [STRETCH]

### Task 39: Building scores in Python plus shared fixture [STRETCH, 15m, M]
**Description:** Compute per-building scores using the same formula as the web.

**Acceptance criteria:**
- [ ] `building_scores.py` computes green roof, cool roof, solar scores per building using the parent hex's heat and vulnerability percentiles plus building-level roof opportunity.
- [ ] `shared/score_fixture.json` holds inputs and expected outputs, committed in the repo root.

**Verification:**
- [ ] `uv run pytest`: outputs match the fixture's expected values.

**Dependencies:** Tasks 29, 30, 31
**Files likely touched:** `pipeline/src/building_scores.py`, `pipeline/tests/test_building_scores.py`, `shared/score_fixture.json`

### Task 40: Python / TypeScript parity test [STRETCH, 10m, S]
**Description:** Guarantee the two scoring implementations agree.

**Acceptance criteria:**
- [ ] A Vitest test loads `shared/score_fixture.json` and checks the TS scoring against the same expected values.

**Verification:**
- [ ] `npm test` and `uv run pytest` both pass using the same fixture.

**Dependencies:** Task 39
**Files likely touched:** `web/lib/scoring.parity.test.ts`

### Task 41: Building export and delivery [STRETCH, 15m, M]
**Description:** Get the filtered buildings into the browser.

**Acceptance criteria:**
- [ ] Output file with roofs > ~2,000 sq ft, coordinates rounded to 6 decimals, properties: `id`, `height`, `roofSqft`, `scoreGreen`, `scoreCool`, `scoreSolar`, `pvKwhYear`.
- [ ] Size ≤ 15 MB gzipped, or a Mapbox tileset upload (token with `tilesets:write` kept out of the repo).
- [ ] `GET /api/buildings` (or tileset source) wired.

**Verification:**
- [ ] `uv run pytest`: rounding, property set, size check in a test on a fixture.
- [ ] Manual check: file size printed by the script.

**Dependencies:** Task 39
**Files likely touched:** `pipeline/src/export_buildings.py`, `web/app/api/buildings/route.ts`

### Task 42: Data-driven extrusion coloring [STRETCH, 15m, M]
**Description:** Color the 3D buildings by the active intervention.

**Acceptance criteria:**
- [ ] `fill-extrusion` for the filtered buildings uses an `interpolate` expression on the property matching the selected intervention; other buildings stay neutral gray.
- [ ] Buildings layer visibility and opacity controlled by the Layers panel.
- [ ] Changing intervention updates paint without removing/re-adding the layer.

**Verification:**
- [ ] `npm test`: expression builder returns the right property per intervention.
- [ ] Manual check: Solar highlights large flat downtown roofs.

**Dependencies:** Tasks 32, 41
**Files likely touched:** `web/lib/buildingStyle.ts`, `web/lib/buildingStyle.test.ts`, `web/components/MapView.tsx`

### Task 43: Building click popup [STRETCH, 15m, S]
**Description:** Details when a building is clicked.

**Acceptance criteria:**
- [ ] Popup: address if available, roof sq ft, three scores, estimated solar kWh/year with an "approximate" note.
- [ ] Clicking outside closes it; Escape closes it.

**Verification:**
- [ ] Manual check: clicking three buildings shows distinct values; no console errors.

**Dependencies:** Task 42
**Files likely touched:** `web/components/BuildingPopup.tsx`, `web/components/MapView.tsx`

### Checkpoint H: After Tasks 39-43
- [ ] All tests pass (both runners); build succeeds
- [ ] Click a building and see its numbers
- [ ] Review with human before proceeding

---

## Phase 8: Polish, test, deploy (70 min)

### Task 44: Visual polish [STRETCH, 15m, S]
**Acceptance criteria:**
- [ ] Compass/north reset, scale bar, 2D/3D toggle (pitch 0 vs 60), consistent color palette and typography with the FireTrace reference.
- [ ] Color contrast of text meets WCAG AA.

**Verification:**
- [ ] Manual check: side-by-side with the screenshot; toggle works.

**Dependencies:** Checkpoint E
**Files likely touched:** `web/components/MapControls.tsx`, `web/app/globals.css`

### Task 45: Loading, empty and error states, accessibility [MVP, 15m, M]
**Acceptance criteria:**
- [ ] Skeletons while `hexes.json` loads; clear error with a retry button if the API fails; empty states in charts/cards.
- [ ] All controls reachable by keyboard, with visible focus and `aria-label`s; charts have a text alternative (summary sentence).

**Verification:**
- [ ] Manual check: Tab through the page; block `/api/hexes` in devtools and confirm the error UI.
- [ ] `npm run lint` passes.

**Dependencies:** Checkpoint D
**Files likely touched:** `web/components/*`, `web/hooks/useHexes.ts`

### Task 46: Playwright smoke test [MVP, 15m, S]
**Acceptance criteria:**
- [ ] One test: load the page, assert map canvas appears, scrub the year, click a hex (via exposed test hook), assert chart updates, (if built) move the what-if slider.
- [ ] Test uses a Mapbox token from the environment and is skipped with a clear message when absent.

**Verification:**
- [ ] `npx playwright test` passes locally.

**Dependencies:** Checkpoint D
**Files likely touched:** `web/e2e/smoke.spec.ts`, `web/playwright.config.ts`

### Task 47: Deploy to Vercel [MVP, 15m, S]
**Acceptance criteria:**
- [ ] Deployed from the repo's `web/` directory; `NEXT_PUBLIC_MAPBOX_TOKEN` set in project settings.
- [ ] Token URL-restricted to localhost and the production domain in the Mapbox dashboard (ask the user before changing account settings).
- [ ] Production URL loads the full flow; no data file exceeds Vercel's function/response limits.

**Verification:**
- [ ] Manual check: open the production URL in a private window; run through the demo path.

**Dependencies:** Task 45
**Files likely touched:** `web/vercel.json` (if needed), `README.md`

### Task 48: Backup demo video and README [MVP, 10m, XS]
**Acceptance criteria:**
- [ ] 60-90 second screen recording of: play timeline → click hex → recommendation → simulate (if built).
- [ ] README: what it is, data sources, how to run pipeline and web, scoring summary, limitations.

**Verification:**
- [ ] Manual check: a teammate (or you, fresh clone) can run the web app from the README.

**Dependencies:** Task 47
**Files likely touched:** `README.md`

### Checkpoint Final
- [ ] All tests pass; deployed demo works end-to-end
- [ ] Backup video recorded
- [ ] All acceptance criteria for built tasks met
